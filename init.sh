#!/bin/bash

SERVER=165.22.108.193
USERNAME=root
PASSWORD=57246Abs
LOCAL_DIR="/Users/$(whoami)/Projects/vue/viking_pay/dist"
REMOTE_DIR="/root/viking_pay"
ARCHIVE_PATH="/Users/$(whoami)/Projects/vue/viking_pay/dist.tar.gz"

echo "Creating archive excluding node_modules..."

# Arxiv yaratish
tar --exclude=".idea" --exclude="node_modules" --exclude=".git" --exclude="init.bat" --exclude="dist" -czvf "$ARCHIVE_PATH" -C "$(dirname "$LOCAL_DIR")" .

echo "Starting SCP upload..."

# Faylni SCP orqali yuklash
scp "$ARCHIVE_PATH" $USERNAME@$SERVER:$REMOTE_DIR

echo "Files uploaded. Extracting on server and starting project..."

# SSH orqali serverga ulanib arxivni ochish va xizmatni ishga tushirish
ssh $USERNAME@$SERVER << EOF
cd $REMOTE_DIR
tar -xzvf dist.tar.gz
npm install
tsc
rm dist.tar.gz
cp .env dist/.env
pm2 stop index
pm2 start /root/analizer/dist/index.js --env production
EOF

echo "✅ Project started on server."
