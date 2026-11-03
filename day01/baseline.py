"""Day 1: API疎通・構造化出力のベースライン

利用できるモデルの一覧を表示したあと、構造化出力（JSONスキーマ強制）で
Stax / Opal の内部パイプラインを推定させる。

実行: uv run day01/baseline.py
"""

import json
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

load_dotenv()

# Google AI StudioのAPIキーでクライアントを初期化
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

MODEL = "gemini-3.1-pro-preview"


class ToolArchitecture(BaseModel):
    tool_name: str = Field(description="対象のLabsツール名")
    core_pipeline: list[str] = Field(description="内部処理パイプラインのステップ一覧")
    required_api_features: list[str] = Field(description="再現に必要なGemini APIの機能群")


def list_models():
    # 現在のAPIキーで利用できるモデルの一覧
    for m in client.models.list():
        print(m.name)


def verify_environment():
    response = client.models.generate_content(
        model=MODEL,
        contents="Google Labsの『Stax（AI評価ツールキット）』と『Opal（AIミニアプリ生成）』を自前で実装する場合の内部パイプラインを定義せよ。",
        config=types.GenerateContentConfig(
            system_instruction="あなたはLLMシステムアーキテクトです。抽象的な表現を避け、APIのプリミティブ機能に分解して回答してください。",
            temperature=0.1,
            response_mime_type="application/json",
            response_schema=list[ToolArchitecture],
        ),
    )
    # 返ってきたJSONを読みやすく整形して表示
    print(json.dumps(json.loads(response.text), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    list_models()
    print()
    verify_environment()
