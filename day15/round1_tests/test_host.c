/*
 * ドアセンサーのホスト単体テスト（PC 上で実行）
 */

#include <stdio.h>
#include <string.h>
#include "../main/door_sensor.h"

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
    int last_door = -1;

    // 1回目（初回起動：開）→ 変化警告は出さず last_door が 1 になる
    EXPECT_TRUE(!door_update_state(&last_door, 1), "first boot (open) should not report change");
    EXPECT_INT_EQ(last_door, 1, "last_door initialized to 1");

    // 2回目（開 → 開）→ 変化なし
    EXPECT_TRUE(!door_update_state(&last_door, 1), "open -> open should not report change");
    EXPECT_INT_EQ(last_door, 1, "last_door remains 1");

    // 3回目（開 → 閉）→ 変化あり
    EXPECT_TRUE(door_update_state(&last_door, 0), "open -> closed should report change");
    EXPECT_INT_EQ(last_door, 0, "last_door updated to 0");

    // 4回目（閉 → 閉）→ 変化なし
    EXPECT_TRUE(!door_update_state(&last_door, 0), "closed -> closed should not report change");
    EXPECT_INT_EQ(last_door, 0, "last_door remains 0");

    // 5回目（閉 → 開）→ 変化あり
    EXPECT_TRUE(door_update_state(&last_door, 1), "closed -> open should report change");
    EXPECT_INT_EQ(last_door, 1, "last_door updated to 1");

    // 初回起動が「閉」だった場合も初回は変化なしになること
    last_door = -1;
    EXPECT_TRUE(!door_update_state(&last_door, 0), "first boot (closed) should not report change");
    EXPECT_INT_EQ(last_door, 0, "last_door initialized to 0");

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

int main(void)
{
    printf("=== Door Sensor Host Unit Tests ===\n");
    test_wake_reason();
    test_raw_to_battery_mv();
    test_door_state_str();
    test_door_update_state();
    test_s3_config_validation();

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
