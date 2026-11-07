"""Day 7: ESP32 の代わりに画面と /api を返す、確認用のサーバー

ESP32-S3 のファームウェアと同じ API（/api/status、/api/scan、/api/wifi、/api/sleep）を
仮の値で返しながら、指定したフォルダの HTML を配信する。ボードがなくても画面の動きを試せる。

実行: uv run day07/mock_server.py day07/www
      → http://127.0.0.1:8080/ を開く
"""

import json
import math
import sys
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

state = {"interval_min": 10, "ssid": ""}


def status() -> dict:
    now = int(time.time())
    # 過去 24 時間を 30 分おきに、ゆるい波で作る
    history = [
        {"t": now - i * 1800,
         "temp_c": round(24 + 2 * math.sin(i / 8), 1),
         "humidity": round(48 + 6 * math.cos(i / 10), 1),
         "co2_ppm": int(650 + 250 * math.sin(i / 6) ** 2)}
        for i in range(48, -1, -1)
    ]
    return {**history[-1], "history": history, "battery_mv": 3920, "uptime_s": 83640}


SCAN = [
    {"ssid": "Home_Network_2.4G", "rssi": -48, "auth": "WPA2_PSK"},
    {"ssid": "Lab_IoT", "rssi": -63, "auth": "WPA2_WPA3_PSK"},
    {"ssid": "Office_Guest", "rssi": -79, "auth": "OPEN"},
]


class Handler(SimpleHTTPRequestHandler):
    def send_json(self, body, code=200):
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/api/status":
            return self.send_json(status())
        if self.path == "/api/scan":
            return self.send_json(SCAN)
        if self.path == "/api/sleep":
            return self.send_json({"interval_min": state["interval_min"]})
        return super().do_GET()

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        print(f"POST {self.path} {body}")
        if self.path == "/api/wifi":
            state["ssid"] = body.get("ssid", "")
            return self.send_json({"ok": True})
        if self.path == "/api/sleep":
            state["interval_min"] = int(body.get("interval_min", state["interval_min"]))
            return self.send_json({"ok": True, "interval_min": state["interval_min"]})
        return self.send_json({"error": "not found"}, 404)


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "day07/www"
    server = ThreadingHTTPServer(("127.0.0.1", 8080), partial(Handler, directory=root))
    print(f"serving {root} on http://127.0.0.1:8080/")
    server.serve_forever()


if __name__ == "__main__":
    main()
