idf_component_register(SRCS "main.c" "door_sensor.c"
                       INCLUDE_DIRS "."
                       PRIV_REQUIRES driver esp_adc esp_driver_gpio)
