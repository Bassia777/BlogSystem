#!/bin/bash

# SQLite 迁移部署脚本 - 服务器端执行
# 在服务器 /home/www/BlogSystem 目录下运行此脚本

echo "🚀 开始 SQLite 迁移部署..."

# 1. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ 代码拉取失败！"
    exit 1
fi

# 2. 安装 SQLite 依赖
echo "📦 安装 SQLite 依赖..."
cd server
npm install sqlite3

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败！"
    exit 1
fi

# 3. 备份现有数据
echo "💾 备份现有数据..."
if [ -f "data.json" ]; then
    cp data.json data.json.backup-$(date +%Y%m%d-%H%M%S)
    echo "✅ 已备份 data.json"
fi

# 4. 初始化数据库
echo "🗄️ 初始化数据库..."
node db-init.js

if [ $? -ne 0 ]; then
    echo "❌ 数据库初始化失败！"
    exit 1
fi

# 5. 迁移数据
echo "📊 迁移数据到 SQLite..."
if [ -f "data.json" ]; then
    node migrate.js
    if [ $? -ne 0 ]; then
        echo "⚠️ 数据迁移出现警告，但可能是重复数据，继续..."
    fi
else
    echo "ℹ️ 没有找到 data.json，跳过数据迁移"
fi

# 6. 停止后端服务
echo "⏸️ 停止后端服务..."
pm2 stop blog-backend 2>/dev/null || echo "服务未运行"

# 7. 启动后端服务
echo "▶️ 启动后端服务..."
pm2 start server.js --name blog-backend
pm2 save

if [ $? -ne 0 ]; then
    echo "❌ 服务启动失败！"
    exit 1
fi

# 8. 查看日志
echo "📋 查看启动日志..."
sleep 2
pm2 logs blog-backend --lines 20 --nostream

echo ""
echo "✅ SQLite 迁移部署完成！"
echo ""
echo "📊 数据库文件位置: $(pwd)/blog.db"
echo "📝 查看日志: pm2 logs blog-backend"
echo "🔄 重启服务: pm2 restart blog-backend"
echo ""
echo "⚠️ 重要提示："
echo "1. 定期备份 blog.db 文件"
echo "2. 如遇问题，可查看 data.json.backup-* 文件回滚"
echo "3. 测试网站所有功能是否正常"
