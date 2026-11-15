/*
 * 電池で動くドアセンサー（ESP32-DevKitC 用）
 *
 * ふだんは Deep-sleep で寝ていて、次のどれかで起きる。
 *   - 10 分ごとのタイマー（電池の電圧とドアの状態を記録する）
 *   - 呼び出しボタン（GPIO33、押すと LOW）
 *   - タッチパッド T0（GPIO4、ドアノブに貼った銅箔）
 *
 * 起きたら、電池の電圧（GPIO35、1/2 の分圧）とドアのリードスイッチ（GPIO34）を読み、
 * ログに出してまた寝る。起きた回数とドアの前回の状態は RTC メモリに残す。
 *
 * Deep-sleep 中の消費電流は、データシートで約 10 µA（RTC タイマーと RTC メモリだけ動かした場合）。
 * 単三電池 2 本（約 2000 mAh）なら、起きている時間を除けば計算上は 20 年以上もつ。
 */

#include <stdio.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_sleep.h"
#include "esp_log.h"
#include "esp_adc/adc_oneshot.h"
#include "driver/gpio.h"
#include "driver/rtc_io.h"
#include "driver/touch_pad.h"

static const char *TAG = "door";

#define WAKE_INTERVAL_US   (10ULL * 60 * 1000 * 1000)  // 10 分
#define BUTTON_GPIO        GPIO_NUM_33                 // 呼び出しボタン（外付け、押すと LOW）
#define DOOR_GPIO          GPIO_NUM_34                 // リードスイッチ（入力専用ピン。10kΩ で外部プルアップ）
#define BATTERY_ADC_CH     ADC_CHANNEL_7               // GPIO35。電池の電圧を 1/2 に分圧して入れる
#define TOUCH_PAD          TOUCH_PAD_NUM0              // GPIO4
#define TOUCH_THRESHOLD    400                         // 触ると値が下がる。下回ったら起きる

RTC_DATA_ATTR static uint32_t boot_count = 0;
RTC_DATA_ATTR static int last_door = -1;

static const char *wake_reason(esp_sleep_wakeup_cause_t cause)
{
    switch (cause) {
    case ESP_SLEEP_WAKEUP_TIMER:    return "タイマー";
    case ESP_SLEEP_WAKEUP_EXT0:     return "ボタン";
    case ESP_SLEEP_WAKEUP_TOUCHPAD: return "タッチ";
    default:                        return "電源投入";
    }
}

static int read_battery_mv(void)
{
    adc_oneshot_unit_handle_t adc;
    adc_oneshot_unit_init_cfg_t unit_cfg = { .unit_id = ADC_UNIT_1 };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&unit_cfg, &adc));
    adc_oneshot_chan_cfg_t chan_cfg = { .atten = ADC_ATTEN_DB_12, .bitwidth = ADC_BITWIDTH_12 };
    ESP_ERROR_CHECK(adc_oneshot_config_channel(adc, BATTERY_ADC_CH, &chan_cfg));
    int raw = 0;
    ESP_ERROR_CHECK(adc_oneshot_read(adc, BATTERY_ADC_CH, &raw));
    ESP_ERROR_CHECK(adc_oneshot_del_unit(adc));
    // 12dB のおおよその換算（0〜4095 → 0〜3100 mV）。分圧の分を 2 倍で戻す
    return raw * 3100 / 4095 * 2;
}

static int read_door(void)
{
    gpio_config_t io = {
        .pin_bit_mask = 1ULL << DOOR_GPIO,
        .mode = GPIO_MODE_INPUT,
    };
    ESP_ERROR_CHECK(gpio_config(&io));
    return gpio_get_level(DOOR_GPIO);  // 1 = 開（スイッチが離れている）
}

static void setup_touch_wakeup(void)
{
    ESP_ERROR_CHECK(touch_pad_init());
    ESP_ERROR_CHECK(touch_pad_set_voltage(TOUCH_HVOLT_2V7, TOUCH_LVOLT_0V5, TOUCH_HVOLT_ATTEN_1V));
    ESP_ERROR_CHECK(touch_pad_config(TOUCH_PAD, TOUCH_THRESHOLD));
    ESP_ERROR_CHECK(esp_sleep_enable_touchpad_wakeup());
}

void app_main(void)
{
    boot_count++;
    esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
    ESP_LOGI(TAG, "起動 %" PRIu32 " 回目（%s）", boot_count, wake_reason(cause));

    int battery = read_battery_mv();
    int door = read_door();
    ESP_LOGI(TAG, "電池 %d mV、ドア %s", battery, door ? "開" : "閉");
    if (last_door >= 0 && door != last_door) {
        ESP_LOGW(TAG, "ドアの状態が変わった（%s → %s）", last_door ? "開" : "閉", door ? "開" : "閉");
    }
    last_door = door;

    // 起きる条件を 3 つ設定して、Deep-sleep に入る
    ESP_ERROR_CHECK(esp_sleep_enable_timer_wakeup(WAKE_INTERVAL_US));
    ESP_ERROR_CHECK(rtc_gpio_pullup_en(BUTTON_GPIO));
    ESP_ERROR_CHECK(esp_sleep_enable_ext0_wakeup(BUTTON_GPIO, 0));
    setup_touch_wakeup();

    ESP_LOGI(TAG, "Deep-sleep に入る（約 10 µA）");
    vTaskDelay(pdMS_TO_TICKS(100));  // ログを出し切る
    esp_deep_sleep_start();
}
