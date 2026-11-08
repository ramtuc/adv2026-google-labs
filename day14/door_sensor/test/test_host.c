/*
 * ドアセンサーのホスト単体テスト（PC 上で実行）
 * - door_sensor.c の純粋関数・設定検査のテスト
 * - ESP-IDF モックを用いた main.c（app_main / Deep-sleep 状態保持 / 周辺設定）のテスト
 */

#include <stdio.h>
#include <string.h>
#include "mocks/esp_idf_mock.h"
#include "../main/door_sensor.h"

mock_esp_state_t mock_state;

#ifdef _MSC_VER
__declspec(allocate("rtcdat$a")) static int rtc_section_start = 0x11223344;
__declspec(allocate("rtcdat$z")) static int rtc_section_end   = 0x55667788;
#endif

/* main.c をモック環境下で直接取り込んでテストする */
#include "../main/main.c"

static int tests_run = 0;
static int tests_failed = 0;

static void expect_true(bool cond, const char *func, int line, const char *msg)
{
    tests_run++;
    if (!cond) {
        printf("  [FAIL] %s (line %d): %s\n", func, line, msg);
        tests_failed++;
    }
}

static void expect_int_eq(int actual, int expected, const char *func, int line, const char *msg)
{
    tests_run++;
    if (actual != expected) {
        printf("  [FAIL] %s (line %d): %s (expected %d, got %d)\n", func, line, msg, expected, actual);
        tests_failed++;
    }
}

static void expect_str_eq(const char *actual, const char *expected, const char *func, int line, const char *msg)
{
    tests_run++;
    if (actual == NULL || strcmp(actual, expected) != 0) {
        printf("  [FAIL] %s (line %d): %s (expected \"%s\", got \"%s\")\n",
               func, line, msg, expected, actual ? actual : "NULL");
        tests_failed++;
    }
}

#define EXPECT_TRUE(cond, msg)             expect_true((cond), __func__, __LINE__, (msg))
#define EXPECT_INT_EQ(actual, expected, m) expect_int_eq((actual), (expected), __func__, __LINE__, (m))
#define EXPECT_STR_EQ(actual, expected, m) expect_str_eq((actual), (expected), __func__, __LINE__, (m))

static bool is_in_rtc_memory(const void *ptr)
{
#ifdef _MSC_VER
    uintptr_t p     = (uintptr_t)ptr;
    uintptr_t start = (uintptr_t)&rtc_section_start;
    uintptr_t end   = (uintptr_t)&rtc_section_end;
    return (p > start && p < end);
#else
    (void)ptr;
    return true;
#endif
}

static void simulate_deep_sleep_wakeup(esp_sleep_wakeup_cause_t next_cause, int adc_raw, bool reed_closed)
{
    // Deep-sleep 移行時、RTC_DATA_ATTR が付いていない通常の変数は電源断で初期値に戻る
    if (!is_in_rtc_memory(&boot_count)) {
        boot_count = 0;
    }
    if (!is_in_rtc_memory(&last_door)) {
        last_door = -1;
    }
    memset(&mock_state, 0, sizeof(mock_state));
    mock_state.wakeup_cause = next_cause;
    mock_state.adc_raw_value = adc_raw;
    mock_state.reed_switch_closed = reed_closed;
}

static void test_wake_reason(void)
{
    printf("[TEST] test_wake_reason\n");
    EXPECT_STR_EQ(door_wake_reason(DOOR_WAKEUP_TIMER), "タイマー", "TIMER wakeup reason");
    EXPECT_STR_EQ(door_wake_reason(DOOR_WAKEUP_EXT0), "ボタン", "EXT0 wakeup reason");
    EXPECT_STR_EQ(door_wake_reason(DOOR_WAKEUP_TOUCHPAD), "タッチ", "TOUCHPAD wakeup reason");
    EXPECT_STR_EQ(door_wake_reason(DOOR_WAKEUP_UNDEFINED), "電源投入", "UNDEFINED wakeup reason");
    EXPECT_STR_EQ(door_wake_reason(-1), "電源投入", "negative wakeup reason defaults to power-on");
    EXPECT_STR_EQ(door_wake_reason(99), "電源投入", "unknown wakeup reason defaults to power-on");
}

static void test_raw_to_battery_mv(void)
{
    printf("[TEST] test_raw_to_battery_mv\n");
    EXPECT_INT_EQ(door_raw_to_battery_mv(0), 0, "0 raw -> 0 mV");
    EXPECT_INT_EQ(door_raw_to_battery_mv(4095), 6200, "4095 raw -> 6200 mV (full scale * 2)");
    EXPECT_INT_EQ(door_raw_to_battery_mv(2048), 3100, "2048 raw -> 3100 mV (mid scale * 2)");
    EXPECT_INT_EQ(door_raw_to_battery_mv(1981), 2998, "1981 raw -> ~3.0V battery");

    // 範囲外の入力に対する安全性
    EXPECT_INT_EQ(door_raw_to_battery_mv(-10), 0, "negative raw clamped to 0 mV");
    EXPECT_INT_EQ(door_raw_to_battery_mv(5000), 6200, "raw > 4095 clamped to 6200 mV");

    // 0〜4095 の全域で単調増加し、オーバーフローしないこと
    int prev = 0;
    bool monotonic = true;
    for (int r = 0; r <= 4095; r++) {
        int mv = door_raw_to_battery_mv(r);
        if (mv < prev || mv < 0 || mv > 6200) {
            monotonic = false;
            break;
        }
        prev = mv;
    }
    EXPECT_TRUE(monotonic, "monotonic across 0..4095 without overflow");
}

static void test_door_state_str(void)
{
    printf("[TEST] test_door_state_str\n");
    EXPECT_STR_EQ(door_state_str(0), "閉", "0 -> 閉");
    EXPECT_STR_EQ(door_state_str(1), "開", "1 -> 開");
    EXPECT_STR_EQ(door_state_str(2), "開", "non-zero -> 開");
}

static void test_door_update_state(void)
{
    printf("[TEST] test_door_update_state\n");
    int state = -1;

    // 1回目（初回起動：開）→ 変化警告は出さず state が 1 になる
    EXPECT_TRUE(!door_update_state(&state, 1), "first boot (open) should not report change");
    EXPECT_INT_EQ(state, 1, "state initialized to 1");

    // 2回目（開 → 開）→ 変化なし
    EXPECT_TRUE(!door_update_state(&state, 1), "open -> open should not report change");
    EXPECT_INT_EQ(state, 1, "state remains 1");

    // 3回目（開 → 閉）→ 変化あり
    EXPECT_TRUE(door_update_state(&state, 0), "open -> closed should report change");
    EXPECT_INT_EQ(state, 0, "state updated to 0");

    // 4回目（閉 → 閉）→ 変化なし
    EXPECT_TRUE(!door_update_state(&state, 0), "closed -> closed should not report change");
    EXPECT_INT_EQ(state, 0, "state remains 0");

    // 5回目（閉 → 開）→ 変化あり
    EXPECT_TRUE(door_update_state(&state, 1), "closed -> open should report change");
    EXPECT_INT_EQ(state, 1, "state updated to 1");

    // 初回起動が「閉」だった場合も初回は変化なしになること
    state = -1;
    EXPECT_TRUE(!door_update_state(&state, 0), "first boot (closed) should not report change");
    EXPECT_INT_EQ(state, 0, "state initialized to 0");

    // NULL ポインタ安全性
    EXPECT_TRUE(!door_update_state(NULL, 1), "NULL pointer should return false safely");
}

static void test_s3_config_validation(void)
{
    printf("[TEST] test_s3_config_validation\n");

    // 現在の本番設定が ESP32-S3（N16R8）の制約をすべて満たすこと
    EXPECT_TRUE(WAKE_INTERVAL_US == 600000000ULL, "WAKE_INTERVAL_US is 10 minutes (600,000,000 us) without 32-bit overflow");
    EXPECT_TRUE(door_validate_s3_config(
        BUTTON_GPIO_NUM, DOOR_GPIO_NUM,
        BATTERY_ADC_GPIO, BATTERY_ADC_CH_NUM,
        TOUCH_PAD_GPIO, TOUCH_PAD_CH_NUM,
        TOUCH_THRESHOLD, WAKE_INTERVAL_US
    ), "production ESP32-S3 pin configuration is valid");

    // タッチしきい値が 15 のように低すぎる値に下げられた場合に検出できること
    EXPECT_TRUE(!door_validate_s3_config(
        BUTTON_GPIO_NUM, DOOR_GPIO_NUM, BATTERY_ADC_GPIO, BATTERY_ADC_CH_NUM,
        TOUCH_PAD_GPIO, TOUCH_PAD_CH_NUM, 15, WAKE_INTERVAL_US
    ), "reject overly low TOUCH_THRESHOLD (15 causes false wakeups on ESP32-S3)");

    // 初代 ESP32 用のピン（GPIO33/34/35、TOUCH_PAD_NUM0）に戻してしまった場合に検出できること
    EXPECT_TRUE(!door_validate_s3_config(
        33, DOOR_GPIO_NUM, BATTERY_ADC_GPIO, BATTERY_ADC_CH_NUM,
        TOUCH_PAD_GPIO, TOUCH_PAD_CH_NUM, TOUCH_THRESHOLD, WAKE_INTERVAL_US
    ), "reject GPIO33 for button (not RTC GPIO & used by Octal PSRAM)");

    EXPECT_TRUE(!door_validate_s3_config(
        BUTTON_GPIO_NUM, 34, BATTERY_ADC_GPIO, BATTERY_ADC_CH_NUM,
        TOUCH_PAD_GPIO, TOUCH_PAD_CH_NUM, TOUCH_THRESHOLD, WAKE_INTERVAL_US
    ), "reject GPIO34 for door (used by Octal PSRAM on N16R8)");

    EXPECT_TRUE(!door_validate_s3_config(
        BUTTON_GPIO_NUM, DOOR_GPIO_NUM, 35, 7,
        TOUCH_PAD_GPIO, TOUCH_PAD_CH_NUM, TOUCH_THRESHOLD, WAKE_INTERVAL_US
    ), "reject GPIO35 for battery ADC (used by Octal PSRAM & not ADC1 on S3)");

    EXPECT_TRUE(!door_validate_s3_config(
        BUTTON_GPIO_NUM, DOOR_GPIO_NUM, BATTERY_ADC_GPIO, BATTERY_ADC_CH_NUM,
        4, 0, TOUCH_THRESHOLD, WAKE_INTERVAL_US
    ), "reject TOUCH_PAD_NUM0 on ESP32-S3 (internal denoise channel)");

    // RTC GPIO ではないピン（GPIO38）をボタンに使った場合
    EXPECT_TRUE(!door_validate_s3_config(
        38, DOOR_GPIO_NUM, BATTERY_ADC_GPIO, BATTERY_ADC_CH_NUM,
        TOUCH_PAD_GPIO, TOUCH_PAD_CH_NUM, TOUCH_THRESHOLD, WAKE_INTERVAL_US
    ), "reject non-RTC GPIO38 for EXT0 button wakeup");

    // ADC1 のピンとチャネル番号が食い違っている場合
    EXPECT_TRUE(!door_validate_s3_config(
        BUTTON_GPIO_NUM, DOOR_GPIO_NUM, 8, 0,
        TOUCH_PAD_GPIO, TOUCH_PAD_CH_NUM, TOUCH_THRESHOLD, WAKE_INTERVAL_US
    ), "reject mismatched ADC GPIO8 and ADC_CHANNEL_0");

    // ピン番号が重複している場合
    EXPECT_TRUE(!door_validate_s3_config(
        10, 10, BATTERY_ADC_GPIO, BATTERY_ADC_CH_NUM,
        TOUCH_PAD_GPIO, TOUCH_PAD_CH_NUM, TOUCH_THRESHOLD, WAKE_INTERVAL_US
    ), "reject duplicate GPIO assignment (button == door)");
}

static void test_main_app_and_deep_sleep(void)
{
    printf("[TEST] test_main_app_and_deep_sleep\n");

    // 1. boot_count と last_door に RTC_DATA_ATTR が付与され、RTC メモリセクションに配置されていること
    EXPECT_TRUE(is_in_rtc_memory(&boot_count), "boot_count must have RTC_DATA_ATTR (placed in RTC memory)");
    EXPECT_TRUE(is_in_rtc_memory(&last_door), "last_door must have RTC_DATA_ATTR (placed in RTC memory)");

    // 初期状態にリセットして 1 回目の起動（電源投入、リードスイッチ開放 = 開）を実行
    boot_count = 0;
    last_door = -1;
    memset(&mock_state, 0, sizeof(mock_state));
    mock_state.wakeup_cause = ESP_SLEEP_WAKEUP_UNDEFINED;
    mock_state.adc_raw_value = 1981;      // 2998 mV
    mock_state.reed_switch_closed = false; // スイッチ開放（内部プルアップがあれば HIGH = 開）

    app_main();

    EXPECT_INT_EQ(mock_state.error_check_failed, 0, "no ESP_ERROR_CHECK failure during boot 1");
    EXPECT_INT_EQ((int)boot_count, 1, "boot_count is 1 on first boot");

    // ドアピン（GPIO11）の内部プルアップが有効であり、「ドア 開」と判定されること
    EXPECT_TRUE(mock_state.door_gpio_configured, "door GPIO configured");
    EXPECT_INT_EQ(mock_state.door_gpio_cfg.mode, GPIO_MODE_INPUT, "door GPIO mode is INPUT");
    EXPECT_INT_EQ(mock_state.door_gpio_cfg.pull_up_en, GPIO_PULLUP_ENABLE,
                  "door GPIO (GPIO11) internal pull-up must be enabled (GPIO_PULLUP_ENABLE)");
    EXPECT_TRUE(strstr(mock_state.log_buf, "起動 1 回目（電源投入）") != NULL, "log contains 起動 1 回目（電源投入）");
    EXPECT_TRUE(strstr(mock_state.log_buf, "電池 2998 mV、ドア 開") != NULL, "log contains 電池 2998 mV、ドア 開");
    EXPECT_TRUE(strstr(mock_state.log_buf, "ドアの状態が変わった") == NULL, "no door state change warning on boot 1");

    // 3 系統のウェイクアップ（タイマー・ボタン EXT0・タッチパッド）とタッチしきい値の検査
    EXPECT_TRUE(mock_state.timer_wakeup_enabled && mock_state.timer_wakeup_us == WAKE_INTERVAL_US,
                "timer wakeup enabled with WAKE_INTERVAL_US");
    EXPECT_TRUE(mock_state.button_pullup_enabled && mock_state.button_pulldown_disabled,
                "button RTC GPIO pull-up enabled and pull-down disabled");
    EXPECT_TRUE(mock_state.ext0_wakeup_enabled && mock_state.ext0_gpio == BUTTON_GPIO_NUM && mock_state.ext0_level == 0,
                "EXT0 wakeup enabled on BUTTON_GPIO with level 0");
    EXPECT_TRUE(mock_state.touch_inited && mock_state.touch_configured && mock_state.touch_pad == TOUCH_PAD_CH_NUM,
                "touch pad initialized and configured on TOUCH_PAD_CH_NUM");
    EXPECT_TRUE(mock_state.touch_thresh_set && mock_state.touch_thresh >= 500 && mock_state.touch_thresh <= 0x7FFFF,
                "touch threshold set to valid S3 value (>= 500)");
    EXPECT_TRUE(mock_state.touch_fsm_started && mock_state.touch_intr_enabled,
                "touch FSM started and active interrupt enabled");
    EXPECT_TRUE(mock_state.touchpad_wakeup_enabled,
                "esp_sleep_enable_touchpad_wakeup() must be called before deep sleep");
    EXPECT_TRUE(mock_state.entered_deep_sleep, "entered deep sleep at end of app_main");

    // 2. Deep-sleep からタッチで起きた場合（2 回目の起動）：
    //    RTC_DATA_ATTR が外れていると boot_count がリセットされて「起動 1 回目」になってしまうバグを検出
    simulate_deep_sleep_wakeup(ESP_SLEEP_WAKEUP_TOUCHPAD, 1981, false);
    app_main();

    EXPECT_INT_EQ((int)boot_count, 2, "boot_count must increment to 2 after Deep-sleep wakeup");
    EXPECT_TRUE(strstr(mock_state.log_buf, "起動 2 回目（タッチ）") != NULL,
                "log must report 起動 2 回目（タッチ） after Deep-sleep wakeup");
    EXPECT_TRUE(strstr(mock_state.log_buf, "ドアの状態が変わった") == NULL,
                "no door state change warning when door remains open");

    // 3. Deep-sleep からボタンで起き、かつドアが「閉」に変わった場合（3 回目の起動）：
    simulate_deep_sleep_wakeup(ESP_SLEEP_WAKEUP_EXT0, 1900, true);
    app_main();

    EXPECT_INT_EQ((int)boot_count, 3, "boot_count must increment to 3 on third wakeup");
    EXPECT_TRUE(strstr(mock_state.log_buf, "起動 3 回目（ボタン）") != NULL,
                "log must report 起動 3 回目（ボタン）");
    EXPECT_TRUE(strstr(mock_state.log_buf, "ドアの状態が変わった（開 → 閉）") != NULL,
                "log must warn ドアの状態が変わった（開 → 閉）");
}

int main(void)
{
    printf("=== Door Sensor Host Unit Tests ===\n");
    test_wake_reason();
    test_raw_to_battery_mv();
    test_door_state_str();
    test_door_update_state();
    test_s3_config_validation();
    test_main_app_and_deep_sleep();

    printf("===================================\n");
    printf("Total assertions: %d, Failed: %d\n", tests_run, tests_failed);
    if (tests_failed == 0) {
        printf("RESULT: ALL HOST TESTS PASSED\n");
        return 0;
    } else {
        printf("RESULT: %d TEST(S) FAILED\n", tests_failed);
        return 1;
    }
}
