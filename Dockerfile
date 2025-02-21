# ベースイメージとしてNode.jsを使用
FROM node:22

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# WebSocketサーバーを起動
CMD ["node", "server.mjs"]