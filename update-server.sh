#!/bin/bash
# BlogSystem 服务器代码更新脚本
# 使用方法：在服务器上执行此脚本

set -e

echo "=== 开始更新 BlogSystem ==="

# 备份数据
echo "1. 备份数据..."
cd /home/www/BlogSystem/server
BACKUP_TIME=$(date +%Y%m%d-%H%M%S)
cp data.json data.json.backup-$BACKUP_TIME
echo "✓ 备份完成: data.json.backup-$BACKUP_TIME"

# 停止服务
echo "2. 停止服务..."
pm2 stop blog-backend

# 更新代码文件（从本地上传后会覆盖）
echo "3. 代码已通过其他方式更新"

# 安装依赖
echo "4. 安装依赖..."
cd /home/www/BlogSystem/server
npm install
echo "✓ 后端依赖安装完成"

# 创建 uploads 目录
mkdir -p /home/www/BlogSystem/server/uploads
chmod 755 /home/www/BlogSystem/server/uploads

# 重启服务
echo "5. 重启服务..."
pm2 restart blog-backend
sleep 2
pm2 status

# 查看日志
echo "6. 查看日志..."
pm2 logs blog-backend --lines 15

echo "=== 更新完成 ==="
echo "提示：前端需要从本地构建后上传 dist 文件夹"
