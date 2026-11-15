#pragma once

#include <stdbool.h>
#include <stdint.h>

/*
 * ピン番号と定数の定義（ESPr Developer S3 Type-C / ESP32-S3-WROOM-1-N16R8 用）
 */
#define WAKE_INTERVAL_US   (10ULL * 60 * 1000 * 1000)  // 10 分
#define BUTTON_GPIO_NUM    10                          // 呼び出しボタン（RTC GPIO、外付け、押すと LOW）
#define DOOR_GPIO_NUM      11                          // リードスイッチ（10kΩ で外部プルアップ、閉じると LOW）
#define BATTERY_ADC_GPIO   8                           // 電池の電圧（GPIO8 = ADC1_CH7、1/2 に分圧）
#define BATTERY_ADC_CH_NUM 7                           // ADC_CHANNEL_7（GPIO8）
#define TOUCH_PAD_GPIO     4                           // タッチパッド（GPIO4 = T4）
#define TOUCH_PAD_CH_NUM   4                           // TOUCH_PAD_NUM4（GPIO4）
#define TOUCH_THRESHOLD    1500                        // ESP32-S3 は触ると値が増える。基準値との差がこれを超えたら起きる

/*
 * ウェイクアップ要因の種別（esp_sleep_wakeup_cause_t と同じ値）
 */
#define DOOR_WAKEUP_UNDEFINED 0
#define DOOR_WAKEUP_EXT0      2
#define DOOR_WAKEUP_TIMER     4
#define DOOR_WAKEUP_TOUCHPAD  5

/* ウェイクアップ要因を日本語の文字列に変換する */
const char *door_wake_reason(int cause);

/* ADC の生値（0〜4095、12dB 減衰、1/2 分圧）を電池電圧 [mV] に換算する */
int door_raw_to_battery_mv(int raw);

/* ドアのピン入力値（1 = 開、0 = 閉）を表示文字列に変換する */
const char *door_state_str(int door);

/*
 * ドアの状態を更新し、前回から状態が変化したかを返す。
 * 初回起動時（*last_door < 0）は変化なし（false）として *last_door を初期化する。
 */
bool door_update_state(int *last_door, int current_door);

/*
 * ESP32-S3（ESP32-S3-WROOM-1-N16R8）向けにピン設定・定数が妥当か検査する。
 * すべて妥当なら true、問題があれば false を返す。
 */
bool door_validate_s3_config(int button_gpio, int door_gpio, int battery_gpio, int battery_adc_ch,
                             int touch_gpio, int touch_pad_ch, uint32_t touch_threshold,
                             uint64_t wake_interval_us);
