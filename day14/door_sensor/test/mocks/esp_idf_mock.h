#pragma once

#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdarg.h>
#include <string.h>

#ifdef _MSC_VER
#pragma section("rtcdat$a", read, write)
#pragma section("rtcdat$m", read, write)
#pragma section("rtcdat$z", read, write)
#define RTC_DATA_ATTR __declspec(allocate("rtcdat$m"))
#else
#define RTC_DATA_ATTR
#endif

typedef int esp_err_t;
#define ESP_OK 0

#define pdMS_TO_TICKS(ms) (ms)

typedef enum {
    ESP_SLEEP_WAKEUP_UNDEFINED = 0,
    ESP_SLEEP_WAKEUP_EXT0      = 2,
    ESP_SLEEP_WAKEUP_TIMER     = 4,
    ESP_SLEEP_WAKEUP_TOUCHPAD  = 5,
} esp_sleep_wakeup_cause_t;

typedef int gpio_num_t;
typedef int adc_channel_t;
typedef int touch_pad_t;
typedef void *adc_oneshot_unit_handle_t;

#define ADC_UNIT_1      0
#define ADC_ATTEN_DB_12 3
#define ADC_BITWIDTH_12 12

typedef struct {
    int unit_id;
} adc_oneshot_unit_init_cfg_t;

typedef struct {
    int atten;
    int bitwidth;
} adc_oneshot_chan_cfg_t;

#define GPIO_MODE_INPUT        1
#define GPIO_PULLUP_DISABLE    0
#define GPIO_PULLUP_ENABLE     1
#define GPIO_PULLDOWN_DISABLE  0
#define GPIO_PULLDOWN_ENABLE   1

typedef struct {
    uint64_t pin_bit_mask;
    int mode;
    int pull_up_en;
    int pull_down_en;
    int intr_type;
} gpio_config_t;

#define TOUCH_HVOLT_2V7           2
#define TOUCH_LVOLT_0V5           0
#define TOUCH_HVOLT_ATTEN_1V      1
#define TOUCH_PAD_FILTER_IIR_16   2
#define TOUCH_PAD_SMOOTH_IIR_2    1
#define TOUCH_PAD_INTR_MASK_ACTIVE (1 << 0)
#define TOUCH_FSM_MODE_TIMER      0

typedef struct {
    int mode;
    uint32_t debounce_cnt;
    uint32_t noise_thr;
    uint32_t jitter_step;
    int smh_lvl;
} touch_filter_config_t;

typedef struct {
    int error_check_failed;
    esp_sleep_wakeup_cause_t wakeup_cause;
    int adc_raw_value;
    bool reed_switch_closed;  // true = 閉 (GND 接続), false = 開 (スイッチ開放)

    // 記録されたハードウェア設定状態
    bool adc_initialized;
    bool adc_deleted;
    adc_channel_t adc_channel;
    adc_oneshot_chan_cfg_t adc_chan_cfg;

    bool door_gpio_configured;
    gpio_config_t door_gpio_cfg;

    bool button_pulldown_disabled;
    bool button_pullup_enabled;
    bool ext0_wakeup_enabled;
    gpio_num_t ext0_gpio;
    int ext0_level;

    bool timer_wakeup_enabled;
    uint64_t timer_wakeup_us;

    bool touch_inited;
    bool touch_configured;
    touch_pad_t touch_pad;
    bool touch_filter_configured;
    bool touch_filter_enabled;
    bool touch_thresh_set;
    uint32_t touch_thresh;
    bool touch_intr_enabled;
    bool touch_fsm_timer_mode;
    bool touch_fsm_started;
    bool touchpad_wakeup_enabled;

    bool entered_deep_sleep;
    char log_buf[2048];
} mock_esp_state_t;

extern mock_esp_state_t mock_state;

static inline void mock_esp_error_check(esp_err_t err)
{
    if (err != ESP_OK) {
        mock_state.error_check_failed++;
    }
}

#define ESP_ERROR_CHECK(x) mock_esp_error_check(x)

static inline void mock_log_append(const char *level, const char *tag, const char *fmt, ...)
{
    char line[256];
    va_list args;
    va_start(args, fmt);
    vsnprintf(line, sizeof(line), fmt, args);
    va_end(args);

    size_t cur = strlen(mock_state.log_buf);
    snprintf(mock_state.log_buf + cur, sizeof(mock_state.log_buf) - cur, "%s (%s): %s\n", level, tag, line);
}

#define ESP_LOGI(tag, ...) mock_log_append("I", (tag), __VA_ARGS__)
#define ESP_LOGW(tag, ...) mock_log_append("W", (tag), __VA_ARGS__)

static inline void vTaskDelay(int ticks) { (void)ticks; }

static inline esp_sleep_wakeup_cause_t esp_sleep_get_wakeup_cause(void)
{
    return mock_state.wakeup_cause;
}

static inline esp_err_t adc_oneshot_new_unit(const adc_oneshot_unit_init_cfg_t *cfg, adc_oneshot_unit_handle_t *ret)
{
    if (!cfg || !ret || cfg->unit_id != ADC_UNIT_1) return -1;
    mock_state.adc_initialized = true;
    *ret = (void *)0x1;
    return ESP_OK;
}

static inline esp_err_t adc_oneshot_config_channel(adc_oneshot_unit_handle_t h, adc_channel_t ch, const adc_oneshot_chan_cfg_t *cfg)
{
    if (!h || !cfg) return -1;
    mock_state.adc_channel = ch;
    mock_state.adc_chan_cfg = *cfg;
    return ESP_OK;
}

static inline esp_err_t adc_oneshot_read(adc_oneshot_unit_handle_t h, adc_channel_t ch, int *out_raw)
{
    if (!h || !out_raw || ch != mock_state.adc_channel) return -1;
    *out_raw = mock_state.adc_raw_value;
    return ESP_OK;
}

static inline esp_err_t adc_oneshot_del_unit(adc_oneshot_unit_handle_t h)
{
    if (!h) return -1;
    mock_state.adc_deleted = true;
    return ESP_OK;
}

static inline esp_err_t gpio_config(const gpio_config_t *cfg)
{
    if (!cfg) return -1;
    mock_state.door_gpio_configured = true;
    mock_state.door_gpio_cfg = *cfg;
    return ESP_OK;
}

static inline int gpio_get_level(gpio_num_t gpio_num)
{
    if (!mock_state.door_gpio_configured) return 0;
    if ((mock_state.door_gpio_cfg.pin_bit_mask & (1ULL << gpio_num)) == 0) return 0;
    if (mock_state.door_gpio_cfg.mode != GPIO_MODE_INPUT) return 0;
    if (mock_state.reed_switch_closed) {
        return 0;  // リードスイッチ閉 = GND 接続で LOW
    }
    // リードスイッチ開（開放）のとき、内部プルアップが有効なら HIGH (1)、無効なら LOW (0)
    return (mock_state.door_gpio_cfg.pull_up_en == GPIO_PULLUP_ENABLE) ? 1 : 0;
}

static inline esp_err_t esp_sleep_enable_timer_wakeup(uint64_t time_in_us)
{
    mock_state.timer_wakeup_enabled = true;
    mock_state.timer_wakeup_us = time_in_us;
    return ESP_OK;
}

static inline esp_err_t rtc_gpio_pulldown_dis(gpio_num_t gpio_num)
{
    (void)gpio_num;
    mock_state.button_pulldown_disabled = true;
    return ESP_OK;
}

static inline esp_err_t rtc_gpio_pullup_en(gpio_num_t gpio_num)
{
    (void)gpio_num;
    mock_state.button_pullup_enabled = true;
    return ESP_OK;
}

static inline esp_err_t esp_sleep_enable_ext0_wakeup(gpio_num_t gpio_num, int level)
{
    mock_state.ext0_wakeup_enabled = true;
    mock_state.ext0_gpio = gpio_num;
    mock_state.ext0_level = level;
    return ESP_OK;
}

static inline esp_err_t touch_pad_init(void)
{
    mock_state.touch_inited = true;
    return ESP_OK;
}

static inline esp_err_t touch_pad_set_voltage(int refh, int refl, int atten)
{
    (void)refh; (void)refl; (void)atten;
    return ESP_OK;
}

static inline esp_err_t touch_pad_config(touch_pad_t touch_num)
{
    mock_state.touch_configured = true;
    mock_state.touch_pad = touch_num;
    return ESP_OK;
}

static inline esp_err_t touch_pad_filter_set_config(const touch_filter_config_t *info)
{
    if (!info) return -1;
    mock_state.touch_filter_configured = true;
    return ESP_OK;
}

static inline esp_err_t touch_pad_filter_enable(void)
{
    mock_state.touch_filter_enabled = true;
    return ESP_OK;
}

static inline esp_err_t touch_pad_set_thresh(touch_pad_t touch_num, uint32_t threshold)
{
    if (touch_num != mock_state.touch_pad) return -1;
    mock_state.touch_thresh_set = true;
    mock_state.touch_thresh = threshold;
    return ESP_OK;
}

static inline esp_err_t touch_pad_intr_enable(int mask)
{
    if (mask & TOUCH_PAD_INTR_MASK_ACTIVE) {
        mock_state.touch_intr_enabled = true;
    }
    return ESP_OK;
}

static inline esp_err_t touch_pad_set_fsm_mode(int mode)
{
    if (mode == TOUCH_FSM_MODE_TIMER) {
        mock_state.touch_fsm_timer_mode = true;
    }
    return ESP_OK;
}

static inline esp_err_t touch_pad_fsm_start(void)
{
    mock_state.touch_fsm_started = true;
    return ESP_OK;
}

static inline esp_err_t esp_sleep_enable_touchpad_wakeup(void)
{
    mock_state.touchpad_wakeup_enabled = true;
    return ESP_OK;
}

static inline void esp_deep_sleep_start(void)
{
    mock_state.entered_deep_sleep = true;
}
