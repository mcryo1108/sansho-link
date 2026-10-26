# 参照リンク (Independent)

ZoteroのPDF内の参考文献を検出し、ライブラリ内の文献・添付PDFへリンクする、Reference Linkerの独立版です。元のReference Linkerとは異なるプラグインIDを使います。

## インストールと更新

1. [配布ファイル](https://raw.githubusercontent.com/mcryo1108/sansho-link/main/dist/sansho-link-1.1.0.xpi)を保存します。
2. ZoteroのPlugins Managerで歯車 → Install Plugin From FileからXPIを選びます。
3. PDFを開き直し、参考文献のページで「参照 ↗」を押します。

1.0.2からの移行時は上記のファイルインストールが一度必要です。1.1.0以降の新しい版はPlugins ManagerのCheck for Updatesから確認できます。最初の起動時に旧版の更新停止設定を標準設定へ戻し、その後の利用者の更新設定は維持します。

同じPDFを二重に処理しないよう、元のReference Linkerは無効にして使ってください。

## 表示

- 黄色：ライブラリ内の文献と一致を確認できた参考文献。PDFボタンは添付PDFを開きます。
- グレー：参考文献は検出しましたが、一致するライブラリ文献を確定できません。マウスを重ねると理由を表示します。未登録であることを保証する表示ではありません。
- 無着色：参考文献範囲や表示位置を特定できていない可能性があります。

PDFにテキスト層が必要です。画像のみのPDFのOCRは行いません。画面に読み込まれたページへリンクを描画するため、参考文献ページまで移動して再スキャンしてください。

## 1.1.0の変更

- 本文や図説明の番号を参考文献番号と取り違える問題を修正。
- 見出しのない番号付き参考文献一覧でも、一覧の先頭から表示範囲を絞り込み。
- グレー表示に未一致理由を追加。
- 文献追加・変更時と手動再スキャン時にライブラリの索引を更新。
- HTTPSの更新情報とSHA-256付き配布ファイルに対応。

Zotero 10.0.6の更新判定コードとPDFテキストを使った回帰検証を実施しています。全てのPDF形式やZoteroの全バージョンでの動作を保証するものではありません。

## ビルド

Python 3で `python3 build.py` を実行します。追加ライブラリは不要です。`src/`からXPIと`updates.json`を生成します。新しい版を配布するときは`src/manifest.json`のversionを変更し、生成したdistファイルとupdates.jsonを同じコミットで公開してください。公開済みの版番号のXPIを別内容へ置き換えないでください。

## ライセンス

MIT。Original Reference Linker: Seungmin Park (ottersem)。元のライセンスをLICENSEに保持しています。
