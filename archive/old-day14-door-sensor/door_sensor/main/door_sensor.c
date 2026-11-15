#include "door_sensor.h"
#include <stddef.h>

const char *door_wake_reason(int cause)
{
    switch (cause) {
    case DOOR_WAKEUP_TIMER:    return "タイマー";
    case DOOR_WAKEUP_EXT0:     return "ボタン";
    case DOOR_WAKEUP_TOUCHPAD: return "タッチ";
    default:                   return "電源投入";
    }
}

int door_raw_to_battery_mv(int raw)
{
    if (raw <= 0) {
        return 0;
    }
    if (raw > 4095) {
        raw = 4095;
    }
    // 12dB のおおよその換算（0〜4095 → 0〜3100 mV）。分圧の分を 2 倍で戻す
    return raw * 3100 / 4095 * 2;
}

const char *door_state_str(int door)
{
    return door ? "開" : "閉";
}

bool door_update_state(int *last_door, int current_door)
{
    if (last_door == NULL) {
        return false;
    }
    int normalized = current_door ? 1 : 0;
    bool changed = (*last_door >= 0 && normalized != *last_door);
    *last_door = normalized;
    return changed;
}

static bool is_usable_s3_n16r8_gpio(int gpio)
{
    if (gpio < 0 || gpio > 48) {
        return false;
    }
    // GPIO22〜25 は存在しない、GPIO26〜32 は SPI Flash、GPIO33〜37 は N16R8 の Octal PSRAM で使用
    if (gpio >= 22 && gpio <= 37) {
        return false;
    }
    // GPIO43, 44 は UART0（USB シリアル変換）で使用
    if (gpio == 43 || gpio == 44) {
        return false;
    }
    return true;
}

bool door_validate_s3_config(int button_gpio, int door_gpio, int battery_gpio, int battery_adc_ch,
                             int touch_gpio, int touch_pad_ch, uint32_t touch_threshold,
                             uint64_t wake_interval_us)
{
    // 各ピンが ESP32-S3-WROOM-1-N16R8 で利用可能な GPIO か
    if (!is_usable_s3_n16r8_gpio(button_gpio) ||
        !is_usable_s3_n16r8_gpio(door_gpio) ||
        !is_usable_s3_n16r8_gpio(battery_gpio) ||
        !is_usable_s3_n16r8_gpio(touch_gpio)) {
        return false;
    }

    // EXT0 ウェイクアップと RTC 内部プルアップを使うボタンは RTC GPIO（GPIO0〜21）である必要がある
    if (button_gpio < 0 || button_gpio > 21) {
        return false;
    }

    // ESP32-S3 の ADC1 チャネル 0〜9 は GPIO1〜10 に対応する
    if (battery_adc_ch < 0 || battery_adc_ch > 9 || battery_gpio != battery_adc_ch + 1) {
        return false;
    }

    // ESP32-S3 のタッチパッドは T1〜T14（GPIO1〜14）が外部ピン対応（T0 は内部デノイズ専用）
    if (touch_pad_ch < 1 || touch_pad_ch > 14 || touch_gpio != touch_pad_ch) {
        return false;
    }

    // タッチしきい値とスリープ周期の妥当性
    // ESP32-S3（Touch V2）では小さすぎるしきい値（例: 15）は環境ノイズで誤ウェイクアップするため不可
    if (touch_threshold < 500 || touch_threshold > 0x7FFFF) {
        return false;
    }
    if (wake_interval_us == 0) {
        return false;
    }

    // 4 つのピンが互いに重複していないこと
    int pins[4] = { button_gpio, door_gpio, battery_gpio, touch_gpio };
    for (int i = 0; i < 4; i++) {
        for (int j = i + 1; j < 4; j++) {
            if (pins[i] == pins[j]) {
                return false;
            }
        }
    }

    return true;
}
