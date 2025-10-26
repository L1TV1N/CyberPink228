import os

class Config:
    # Yandex API key (you provided one; replace here or set env var YANDEX_API_KEY)
    YANDEX_API_KEY = os.getenv("YANDEX_API_KEY", "eda4655c-123d-4bff-bd11-db8cddf99055")
    ROUTING_PROFILE = "auto"  # 'auto' == car
    MAX_POINTS = 100
    # Timezone in input data
    TIMEZONE = "Europe/Moscow"
