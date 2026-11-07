/*
 * Day 7: ESP32-S3 が自分でアクセスポイントになり、管理画面と API を配信する
 *
 * - SoftAP「ESP32-ENV-PORTAL」（http://192.168.4.1/）
 *   /         … SDK（gemini-3.8-flash）で作った画面
 *   /stitch/  … Stitch の書き出しをオフライン化した画面
 * - API（day07/mock_server.py と同じ形）
 *   GET  /api/status … 温度・湿度・CO2 と履歴
 *   GET  /api/scan   … 周囲のアクセスポイント
 *   POST /api/wifi   … 接続先の SSID とパスワードを保存して接続する
 *   GET/POST /api/sleep … Deep-sleep の間隔
 *
 * センサーはつないでいないので、温度は ESP32-S3 内蔵の温度センサー（チップの温度）、
 * 湿度と CO2 は仮の値を返す。Deep-sleep の間隔は保存するだけで、実際には眠らない
 * （眠るとアクセスポイントが止まり、画面を開けなくなるため）。
 */

#include <math.h>
#include <string.h>
#include <time.h>

#include "cJSON.h"
#include "driver/temperature_sensor.h"
#include "esp_event.h"
#include "esp_http_server.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "esp_netif.h"
#include "esp_timer.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "nvs.h"
#include "nvs_flash.h"

static const char *TAG = "portal";

#define AP_SSID "ESP32-ENV-PORTAL"
#define AP_PASSWORD "esp32-s3-setup"  // 記事用の例。使うときは変える
#define HISTORY_LEN 48
#define HISTORY_PERIOD_S 60  // 記事の確認用に 1 分おき（画面の表示は「24時間」のまま）

typedef struct {
    time_t t;
    float temp_c;
    float humidity;
    int co2_ppm;
} sample_t;

static sample_t history[HISTORY_LEN];
static int history_count;
static int history_head;
static temperature_sensor_handle_t tsens;
static uint32_t sleep_interval_min = 10;

/* ---------- 画面（pack_www.py が作った gzip を埋め込む） ---------- */

#define EMBED(name) \
    extern const uint8_t name##_start[] asm("_binary_" #name "_start"); \
    extern const uint8_t name##_end[] asm("_binary_" #name "_end");
EMBED(index_html_gz)
EMBED(stitch_index_html_gz)
EMBED(stitch_wifi_html_gz)
EMBED(stitch_sleep_html_gz)
EMBED(stitch_app_css_gz)

typedef struct {
    const uint8_t *start;
    const uint8_t *end;
    const char *type;
} asset_t;

static esp_err_t asset_handler(httpd_req_t *req)
{
    const asset_t *asset = req->user_ctx;
    ESP_LOGI(TAG, "GET %s", req->uri);
    httpd_resp_set_type(req, asset->type);
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)asset->start, asset->end - asset->start);
}

/* ---------- センサー ---------- */

static sample_t read_sample(void)
{
    sample_t s = {.t = time(NULL)};
    temperature_sensor_get_celsius(tsens, &s.temp_c);
    // 湿度と CO2 のセンサーはないので、時間でゆっくり変わる仮の値にする
    double minutes = esp_timer_get_time() / 60e6;
    s.humidity = 48.0f + 6.0f * (float)cos(minutes / 10.0);
    s.co2_ppm = 650 + (int)(250 * pow(sin(minutes / 6.0), 2));
    return s;
}

static void sampling_task(void *arg)
{
    while (true) {
        history[history_head] = read_sample();
        history_head = (history_head + 1) % HISTORY_LEN;
        if (history_count < HISTORY_LEN) history_count++;
        vTaskDelay(pdMS_TO_TICKS(HISTORY_PERIOD_S * 1000));
    }
}

/* ---------- API ---------- */

static esp_err_t send_json(httpd_req_t *req, cJSON *json)
{
    char *text = cJSON_PrintUnformatted(json);
    httpd_resp_set_type(req, "application/json");
    esp_err_t err = httpd_resp_sendstr(req, text);
    cJSON_free(text);
    cJSON_Delete(json);
    return err;
}

static cJSON *recv_json(httpd_req_t *req)
{
    char body[256];
    int len = req->content_len < sizeof(body) - 1 ? req->content_len : sizeof(body) - 1;
    int got = httpd_req_recv(req, body, len);
    if (got <= 0) return NULL;
    body[got] = '\0';
    return cJSON_Parse(body);
}

static cJSON *sample_json(const sample_t *s)
{
    cJSON *o = cJSON_CreateObject();
    cJSON_AddNumberToObject(o, "t", (double)s->t);
    cJSON_AddNumberToObject(o, "temp_c", roundf(s->temp_c * 10) / 10);
    cJSON_AddNumberToObject(o, "humidity", roundf(s->humidity * 10) / 10);
    cJSON_AddNumberToObject(o, "co2_ppm", s->co2_ppm);
    return o;
}

static esp_err_t status_handler(httpd_req_t *req)
{
    ESP_LOGI(TAG, "GET /api/status");
    sample_t now = read_sample();
    cJSON *json = sample_json(&now);
    cJSON *list = cJSON_AddArrayToObject(json, "history");
    // 古い順に並べる
    for (int i = 0; i < history_count; i++) {
        int idx = (history_head - history_count + i + HISTORY_LEN) % HISTORY_LEN;
        cJSON_AddItemToArray(list, sample_json(&history[idx]));
    }
    cJSON_AddNumberToObject(json, "battery_mv", 0);  // 電池はつないでいない
    cJSON_AddNumberToObject(json, "uptime_s", esp_timer_get_time() / 1000000);
    return send_json(req, json);
}

static const char *auth_name(wifi_auth_mode_t mode)
{
    switch (mode) {
    case WIFI_AUTH_OPEN: return "OPEN";
    case WIFI_AUTH_WEP: return "WEP";
    case WIFI_AUTH_WPA_PSK: return "WPA_PSK";
    case WIFI_AUTH_WPA2_PSK: return "WPA2_PSK";
    case WIFI_AUTH_WPA_WPA2_PSK: return "WPA_WPA2_PSK";
    case WIFI_AUTH_WPA3_PSK: return "WPA3_PSK";
    case WIFI_AUTH_WPA2_WPA3_PSK: return "WPA2_WPA3_PSK";
    default: return "OTHER";
    }
}

static esp_err_t scan_handler(httpd_req_t *req)
{
    // 2.4 GHz の全チャンネルを数秒かけて調べる（終わるまで待つ）
    ESP_ERROR_CHECK(esp_wifi_scan_start(NULL, true));
    uint16_t count = 20;
    wifi_ap_record_t records[20];
    esp_wifi_scan_get_ap_records(&count, records);

    cJSON *list = cJSON_CreateArray();
    for (int i = 0; i < count; i++) {
        cJSON *ap = cJSON_CreateObject();
        cJSON_AddStringToObject(ap, "ssid", (const char *)records[i].ssid);
        cJSON_AddNumberToObject(ap, "rssi", records[i].rssi);
        cJSON_AddStringToObject(ap, "auth", auth_name(records[i].authmode));
        cJSON_AddItemToArray(list, ap);
    }
    return send_json(req, list);
}

static void connect_sta(const char *ssid, const char *password)
{
    wifi_config_t sta = {0};
    strlcpy((char *)sta.sta.ssid, ssid, sizeof(sta.sta.ssid));
    strlcpy((char *)sta.sta.password, password, sizeof(sta.sta.password));
    esp_wifi_disconnect();
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &sta));
    esp_wifi_connect();
    ESP_LOGI(TAG, "connecting to %s", ssid);
}

static esp_err_t wifi_handler(httpd_req_t *req)
{
    cJSON *body = recv_json(req);
    const cJSON *ssid = cJSON_GetObjectItem(body, "ssid");
    const cJSON *password = cJSON_GetObjectItem(body, "password");
    if (!cJSON_IsString(ssid) || !cJSON_IsString(password)) {
        cJSON_Delete(body);
        return httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "ssid and password are required");
    }

    nvs_handle_t nvs;
    ESP_ERROR_CHECK(nvs_open("portal", NVS_READWRITE, &nvs));
    nvs_set_str(nvs, "ssid", ssid->valuestring);
    nvs_set_str(nvs, "password", password->valuestring);
    nvs_commit(nvs);
    nvs_close(nvs);
    connect_sta(ssid->valuestring, password->valuestring);
    cJSON_Delete(body);

    cJSON *res = cJSON_CreateObject();
    cJSON_AddBoolToObject(res, "ok", true);
    return send_json(req, res);
}

static esp_err_t sleep_get_handler(httpd_req_t *req)
{
    cJSON *res = cJSON_CreateObject();
    cJSON_AddNumberToObject(res, "interval_min", sleep_interval_min);
    return send_json(req, res);
}

static esp_err_t sleep_post_handler(httpd_req_t *req)
{
    cJSON *body = recv_json(req);
    const cJSON *interval = cJSON_GetObjectItem(body, "interval_min");
    if (!cJSON_IsNumber(interval) || interval->valueint < 1 || interval->valueint > 1440) {
        cJSON_Delete(body);
        return httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "interval_min must be 1-1440");
    }
    sleep_interval_min = interval->valueint;
    cJSON_Delete(body);

    nvs_handle_t nvs;
    ESP_ERROR_CHECK(nvs_open("portal", NVS_READWRITE, &nvs));
    nvs_set_u32(nvs, "interval", sleep_interval_min);
    nvs_commit(nvs);
    nvs_close(nvs);
    ESP_LOGI(TAG, "sleep interval = %lu min", (unsigned long)sleep_interval_min);
    return sleep_get_handler(req);
}

/* ---------- 起動 ---------- */

// スマートフォンがつながった・IP を受け取ったことをログに出す（つながらないときの切り分け用）
static void wifi_event_handler(void *arg, esp_event_base_t base, int32_t id, void *data)
{
    if (base == WIFI_EVENT && id == WIFI_EVENT_AP_STACONNECTED) {
        wifi_event_ap_staconnected_t *e = data;
        ESP_LOGI(TAG, "client joined: " MACSTR, MAC2STR(e->mac));
    } else if (base == WIFI_EVENT && id == WIFI_EVENT_AP_STADISCONNECTED) {
        wifi_event_ap_stadisconnected_t *e = data;
        ESP_LOGI(TAG, "client left: " MACSTR " reason=%d", MAC2STR(e->mac), e->reason);
    } else if (base == IP_EVENT && id == IP_EVENT_AP_STAIPASSIGNED) {
        ip_event_ap_staipassigned_t *e = data;
        ESP_LOGI(TAG, "client got IP: " IPSTR, IP2STR(&e->ip));
    }
}

static void start_wifi(void)
{
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_ap();
    esp_netif_create_default_wifi_sta();
    wifi_init_config_t init = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&init));
    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, wifi_event_handler, NULL));
    ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_AP_STAIPASSIGNED, wifi_event_handler, NULL));

    wifi_config_t ap = {
        .ap = {
            .ssid = AP_SSID,
            .ssid_len = strlen(AP_SSID),
            .password = AP_PASSWORD,
            .channel = 1,
            .max_connection = 4,
            .authmode = WIFI_AUTH_WPA2_PSK,
        },
    };
    // アクセスポイントになりながら、保存した接続先にもつなぎに行けるようにする
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &ap));
    ESP_ERROR_CHECK(esp_wifi_start());
    ESP_LOGI(TAG, "SoftAP %s started: http://192.168.4.1/", AP_SSID);

    nvs_handle_t nvs;
    if (nvs_open("portal", NVS_READONLY, &nvs) == ESP_OK) {
        char ssid[33] = "", password[65] = "";
        size_t ssid_len = sizeof(ssid), password_len = sizeof(password);
        if (nvs_get_str(nvs, "ssid", ssid, &ssid_len) == ESP_OK &&
            nvs_get_str(nvs, "password", password, &password_len) == ESP_OK) {
            connect_sta(ssid, password);
        }
        nvs_get_u32(nvs, "interval", &sleep_interval_min);
        nvs_close(nvs);
    }
}

static void start_http(void)
{
    static const asset_t assets[] = {
        {index_html_gz_start, index_html_gz_end, "text/html; charset=utf-8"},
        {stitch_index_html_gz_start, stitch_index_html_gz_end, "text/html; charset=utf-8"},
        {stitch_wifi_html_gz_start, stitch_wifi_html_gz_end, "text/html; charset=utf-8"},
        {stitch_sleep_html_gz_start, stitch_sleep_html_gz_end, "text/html; charset=utf-8"},
        {stitch_app_css_gz_start, stitch_app_css_gz_end, "text/css"},
    };
    static const char *paths[] = {"/", "/stitch/", "/stitch/wifi.html", "/stitch/sleep.html", "/stitch/app.css"};

    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.max_uri_handlers = 16;
    config.stack_size = 8192;  // スキャン結果の JSON を作るので少し大きめ
    config.lru_purge_enable = true;  // スマートフォンは接続を多く開くので、古いものから閉じる
    httpd_handle_t server;
    ESP_ERROR_CHECK(httpd_start(&server, &config));

    for (int i = 0; i < sizeof(paths) / sizeof(paths[0]); i++) {
        httpd_uri_t uri = {.uri = paths[i], .method = HTTP_GET, .handler = asset_handler, .user_ctx = (void *)&assets[i]};
        httpd_register_uri_handler(server, &uri);
    }
    const httpd_uri_t api[] = {
        {.uri = "/api/status", .method = HTTP_GET, .handler = status_handler},
        {.uri = "/api/scan", .method = HTTP_GET, .handler = scan_handler},
        {.uri = "/api/wifi", .method = HTTP_POST, .handler = wifi_handler},
        {.uri = "/api/sleep", .method = HTTP_GET, .handler = sleep_get_handler},
        {.uri = "/api/sleep", .method = HTTP_POST, .handler = sleep_post_handler},
    };
    for (int i = 0; i < sizeof(api) / sizeof(api[0]); i++) {
        httpd_register_uri_handler(server, &api[i]);
    }
}

void app_main(void)
{
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ESP_ERROR_CHECK(nvs_flash_init());
    }

    temperature_sensor_config_t tsens_config = TEMPERATURE_SENSOR_CONFIG_DEFAULT(10, 50);
    ESP_ERROR_CHECK(temperature_sensor_install(&tsens_config, &tsens));
    ESP_ERROR_CHECK(temperature_sensor_enable(tsens));

    start_wifi();
    start_http();
    xTaskCreate(sampling_task, "sampling", 4096, NULL, 5, NULL);
}
