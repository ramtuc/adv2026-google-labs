# www/*.gz は pack_www.py が day07/www から作る
idf_component_register(
    SRCS "main.c"
    INCLUDE_DIRS "."
    REQUIRES esp_wifi esp_netif esp_event nvs_flash esp_http_server esp_timer json esp_driver_tsens
    EMBED_FILES
        "www/index.html.gz"
        "www/stitch_index.html.gz"
        "www/stitch_wifi.html.gz"
        "www/stitch_sleep.html.gz"
        "www/stitch_app.css.gz"
)
