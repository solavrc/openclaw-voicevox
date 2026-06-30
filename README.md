# OpenClaw VOICEVOX プラグイン

OpenClaw で VOICEVOX を読み上げ音声として使うためのプラグインです。

このプラグインは OpenClaw に `voicevox` という読み上げプロバイダーを追加し、別途起動している VOICEVOX Engine に音声合成リクエストを送ります。VOICEVOX Engine、音声ライブラリ、生成音声はこのパッケージには含まれません。

このプラグインは非公式の OpenClaw 連携プラグインです。VOICEVOX 公式および各音声ライブラリ・キャラクター権利者とは関係ありません。

生成音声を公開・配布・配信などで使う場合は、VOICEVOX 公式の利用規約と、利用する音声ライブラリごとの規約を必ず確認してください。

## 必要なもの

- OpenClaw Gateway からアクセスできる VOICEVOX Engine
- Docker で VOICEVOX Engine を起動する場合は Docker

## はじめかた

プラグインをインストールします。

```sh
openclaw plugins install clawhub:@solavrc/openclaw-voicevox
```

ローカルで VOICEVOX Engine を起動します。VOICEVOX Engine には認証がないため、通常は `127.0.0.1` のみに公開してください。

```sh
docker run -d --name voicevox-engine \
  --restart unless-stopped \
  -p 127.0.0.1:50021:50021 \
  voicevox/voicevox_engine:cpu-0.25.2
```

Engine が起動していることを確認します。

```sh
curl http://127.0.0.1:50021/version
```

OpenClaw の config に `voicevox` を追加します。

```json
{
  "messages": {
    "tts": {
      "provider": "voicevox",
      "providers": {
        "voicevox": {
          "enabled": true,
          "baseUrl": "http://127.0.0.1:50021",
          "defaultSpeakerVoice": "zundamon"
        }
      }
    }
  },
  "plugins": {
    "entries": {
      "voicevox": {
        "enabled": true
      }
    }
  }
}
```

設定後、Gateway を再起動します。

```sh
openclaw gateway restart
```

## 声を変える

通常は `defaultSpeakerVoice` に声の別名を指定します。たとえば春日部つむぎにしたい場合は `tsumugi` を指定します。

```json
{
  "messages": {
    "tts": {
      "provider": "voicevox",
      "providers": {
        "voicevox": {
          "baseUrl": "http://127.0.0.1:50021",
          "defaultSpeakerVoice": "tsumugi"
        }
      }
    }
  },
  "plugins": {
    "entries": {
      "voicevox": {
        "enabled": true
      }
    }
  }
}
```

メッセージごとに声を変えたい場合は、OpenClaw の TTS ディレクティブを使います。

```text
[[tts:voice=metan-tsuntsun speed=1.2]]こんにちは。
```

OpenClaw の標準的な声指定キーを使って、同じ声を次のように指定することもできます。

```text
[[tts:speakerVoice=tsumugi]]こんにちは。
[[tts:speakerVoiceId=8]]こんにちは。
```

よく使う別名は次の通りです。これらは VOICEVOX Engine 公式の文字列 ID ではなく、このプラグインが OpenClaw の設定とディレクティブ用に定義している名前です。同じ ID の別名は完全に同じ声として扱われます。短い名前と正式名称寄りの名前を併記しているものがあります。

<!-- voice-alias-table:start -->
| 別名 | 声 | ID |
| --- | --- | --- |
| `zundamon` | ずんだもん ノーマル | `3` |
| `zundamon-normal` | ずんだもん ノーマル | `3` |
| `zundamon-ama` | ずんだもん あまあま | `1` |
| `zundamon-tsuntsun` | ずんだもん ツンツン | `7` |
| `zundamon-sexy` | ずんだもん セクシー | `5` |
| `zundamon-sasayaki` | ずんだもん ささやき | `22` |
| `zundamon-hisohiso` | ずんだもん ヒソヒソ | `38` |
| `zundamon-herohero` | ずんだもん ヘロヘロ | `75` |
| `zundamon-namidame` | ずんだもん なみだめ | `76` |
| `metan` | 四国めたん ノーマル | `2` |
| `metan-normal` | 四国めたん ノーマル | `2` |
| `metan-ama` | 四国めたん あまあま | `0` |
| `metan-tsuntsun` | 四国めたん ツンツン | `6` |
| `metan-sexy` | 四国めたん セクシー | `4` |
| `metan-sasayaki` | 四国めたん ささやき | `36` |
| `metan-hisohiso` | 四国めたん ヒソヒソ | `37` |
| `tsumugi` | 春日部つむぎ ノーマル | `8` |
| `hau` | 雨晴はう ノーマル | `10` |
| `takehiro` | 玄野武宏 ノーマル | `11` |
| `himari` | 冥鳴ひまり ノーマル | `14` |
| `tobari` | 夜語トバリ ノーマル | `118` |
| `tobari-normal` | 夜語トバリ ノーマル | `118` |
| `yogatari-tobari` | 夜語トバリ ノーマル | `118` |
| `yogatari-tobari-normal` | 夜語トバリ ノーマル | `118` |
| `tobari-akarui` | 夜語トバリ 明るい | `119` |
| `yogatari-tobari-akarui` | 夜語トバリ 明るい | `119` |
| `tobari-kanashimi` | 夜語トバリ 哀しみ | `120` |
| `yogatari-tobari-kanashimi` | 夜語トバリ 哀しみ | `120` |
| `tobari-akire` | 夜語トバリ 呆れ | `121` |
| `yogatari-tobari-akire` | 夜語トバリ 呆れ | `121` |
| `mitama` | 暁記ミタマ ノーマル | `122` |
| `mitama-normal` | 暁記ミタマ ノーマル | `122` |
| `akatsuki-mitama` | 暁記ミタマ ノーマル | `122` |
| `akatsuki-mitama-normal` | 暁記ミタマ ノーマル | `122` |
| `mitama-ikari` | 暁記ミタマ 怒り | `123` |
| `akatsuki-mitama-ikari` | 暁記ミタマ 怒り | `123` |
| `mitama-kanashimi` | 暁記ミタマ 哀しみ | `124` |
| `akatsuki-mitama-kanashimi` | 暁記ミタマ 哀しみ | `124` |
| `mitama-sasayaki` | 暁記ミタマ ささやき | `125` |
| `akatsuki-mitama-sasayaki` | 暁記ミタマ ささやき | `125` |
| `yuka` | 里石ユカ つぼみ | `126` |
| `yuka-tsubomi` | 里石ユカ つぼみ | `126` |
| `satoishi-yuka` | 里石ユカ つぼみ | `126` |
| `satoishi-yuka-tsubomi` | 里石ユカ つぼみ | `126` |
<!-- voice-alias-table:end -->

この別名表は OpenClaw から VOICEVOX のスタイル ID を指定しやすくするための対応表です。生成音声の利用権や商用利用可否を保証するものではありません。`defaultSpeakerVoice` や `[[tts:voiceid=...]]` で数値 ID を直接指定した場合を含め、生成音声の公開・配布・配信・商用利用は、VOICEVOX 公式規約および当該音声ライブラリ・キャラクターごとの規約に従ってください。

## 動作確認

Gateway から見えている TTS provider を確認します。

```sh
openclaw capability tts providers --gateway
```

Gateway 経由でテスト音声を生成します。

```sh
openclaw capability tts convert --gateway \
  --text "こんにちは。VOICEVOX のテストです。" \
  --output /tmp/openclaw-voicevox-test.wav
```

生成される音声は WAV です。専用の音声メッセージ形式が必要な連携先では、別途変換処理がない限り通常の音声添付として扱われます。

## 設定項目

`messages.tts.provider` は、OpenClaw の読み上げプロバイダーとして VOICEVOX を選ぶ設定です。読み上げ専用プラグインは、この設定から参照されているときに Gateway の読み上げ処理へ読み込まれるため、この設定は重要です。

`messages.tts.providers.voicevox` は読み上げプロバイダーとしての設定です。通常はこちらに設定します。

`plugins.entries.voicevox.enabled` は、このプラグイン自体を有効化する設定です。`plugins.entries.voicevox.config` は任意の fallback 設定です。たとえば複数の Talk / TTS 設定から同じ VOICEVOX Engine を使いたい場合に、共通の `baseUrl` や `timeoutMs` を置く用途に向いています。特定の読み上げ用途だけ声を変えたい場合は、`messages.tts.providers.voicevox.defaultSpeakerVoice` 側で上書きしてください。

同じ項目が複数箇所にある場合の優先順位は次の通りです。

1. メッセージ内の TTS ディレクティブや Talk の明示的な声指定
2. `messages.tts.providers.voicevox`
3. `plugins.entries.voicevox.config`
4. プラグイン内蔵のデフォルト値

| 項目 | 推奨値 | 説明 |
| --- | --- | --- |
| `baseUrl` | `http://127.0.0.1:50021` | VOICEVOX Engine の URL。`https://example.com/voicevox/` のようなリバースプロキシのパス付き URL も使えます。 |
| `defaultSpeakerVoice` | `zundamon`, `tsumugi`, `76` など | 通常使う声。上の表の別名、または VOICEVOX の生のスタイルIDを指定します。 |
| `timeoutMs` | `30000` | VOICEVOX Engine への HTTP リクエストのタイムアウト。 |
| `speedScale` | 任意 | デフォルトの話速。省略すると VOICEVOX Engine 側のデフォルトになります。 |

## VOICEVOX の生のスタイルIDを使う

VOICEVOX Engine の `/speakers` API は話者とスタイルを返します。合成 API に渡す `speaker` パラメーターは数値ですが、実際には「話者 + スタイル」の組み合わせを表すスタイルIDです。

ローカルの Engine が持っている話者とスタイルIDは次のコマンドで確認できます。

```sh
curl http://127.0.0.1:50021/speakers
```

見やすくする場合は `jq` を使います。

```sh
curl -s http://127.0.0.1:50021/speakers \
  | jq '.[] | {name, styles}'
```

特定の声だけ確認する例:

```sh
curl -s http://127.0.0.1:50021/speakers \
  | jq '.[] | select(.name == "夜語トバリ" or .name == "暁記ミタマ" or .name == "里石ユカ") | {name, styles}'
```

このプラグインの別名表にまだない新しい声・スタイルや、ローカルで追加した音声ライブラリを使う場合だけ、生のIDを指定してください。

```json
{
  "messages": {
    "tts": {
      "provider": "voicevox",
      "providers": {
        "voicevox": {
          "baseUrl": "http://127.0.0.1:50021",
          "defaultSpeakerVoice": 76
        }
      }
    }
  }
}
```

メッセージ単位で生のIDを指定することもできます。

```text
[[tts:voiceid=76]]こんにちは。
```

## ネットワーク公開に関する注意

VOICEVOX Engine には認証がありません。ローカル利用では、この README の例のように Docker のポートを `127.0.0.1` に限定して公開してください。

`-p 50021:50021` のように全インターフェイスへ公開すると、環境によっては LAN や外部から VOICEVOX Engine にアクセスできてしまいます。サーバー上で公開する場合は、必ず信頼できるネットワーク制御やリバースプロキシの認証を用意してください。

## ライセンスとクレジット

このプラグインのコードは MIT License です。

VOICEVOX Engine、VOICEVOX の音声ライブラリ、生成音声はこのパッケージには含まれません。生成音声を使う場合は、VOICEVOX 公式の利用規約と、選択した音声ライブラリごとの規約に従ってください。

## 開発メモ

VOICEVOX upstream の話者・スタイル更新を取り込む手順は [docs/voicevox-upstream.md](docs/voicevox-upstream.md) にまとめています。短い別名は `data/voices.json` を単一ソースとして管理し、`npm run sync:voices` で plugin schema と README の表へ反映します。

Release Please、ClawHub publish、公開版 install 確認などの保守者向け運用手順は [docs/maintainer.md](docs/maintainer.md) にまとめています。

VOICEVOX の生成音声にはクレジット表記が必要です。代表的な表記例:

- `VOICEVOX:ずんだもん`
- `VOICEVOX:四国めたん`
- `VOICEVOX:春日部つむぎ`
- `VOICEVOX:雨晴はう`
- `VOICEVOX:玄野武宏`
- `VOICEVOX:冥鳴ひまり`
- `VOICEVOX:夜語トバリ`
- `VOICEVOX:暁記ミタマ`
- `VOICEVOX:里石ユカ（つぼみ）`

音声のみの利用、電話、音声アナウンスなどでは、動画概要欄のような表示場所がないため、音声の最初または最後にクレジットを入れる、または利用環境の近くにクレジットを表示するなどの対応が必要になる場合があります。必ず公式 Q&A を確認してください。

公式情報:

- https://voicevox.hiroshiba.jp/term/
- https://voicevox.hiroshiba.jp/qa/
- https://github.com/VOICEVOX/voicevox_vvm/blob/main/TERMS.txt

## 開発

プラグイン本体は `src/` 以下の TypeScript で実装されています。OpenClaw が読み込む入口ファイルはビルド後の `dist/index.js` です。

```sh
npm install
npm run build
npm run check
```
