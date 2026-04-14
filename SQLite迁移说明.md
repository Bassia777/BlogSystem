# SQLite 迁移和部署指南

## ✅ 已完成的工作

1. 安装了 `sqlite3` 依赖
2. 创建了数据库表结构（`db-init.js`）
3. 创建了数据迁移脚本（`migrate.js`）
4. 封装了数据库操作（`database.js`）
5. 重构了 `server.js` 使用 SQLite
6. 备份了原有的 JSON 数据（`data.json.backup`）

## 📦 部署到服务器步骤

### 1. 推送代码到 Gitee

```bash
# 在本地执行
git add .
git commit -m "迁移到 SQLite 数据库"
git push origin main
```

### 2. 服务器端更新代码

```bash
# SSH 登录到服务器
cd /home/www/BlogSystem
git pull origin main
```

### 3. 安装 SQLite 依赖

```bash
cd /home/www/BlogSystem/server
npm install sqlite3
```

### 4. 初始化数据库

```bash
# 初始化数据库表结构
node db-init.js

# 从 data.json 迁移数据（如果服务器上有历史数据）
node migrate.js
```

### 5. 重启后端服务

```bash
# 使用 PM2 重启
pm2 restart blog-backend

# 或者先停止再启动
pm2 stop blog-backend
pm2 start server.js --name blog-backend
pm2 save

# 查看日志确认启动成功
pm2 logs blog-backend --lines 50
```

### 6. 前端构建和部署

```bash
cd /home/www/BlogSystem/client
npm run build

# 清理旧的 dist 并解压新的（如果使用 zip 方式）
# 或者直接使用服务器上构建的 dist
```

### 7. 验证

访问网站，测试以下功能：
- [ ] 登录（admin / 123）
- [ ] 随笔发布和回复
- [ ] 博文创建、编辑、删除
- [ ] 图片上传和删除
- [ ] 文件上传和删除
- [ ] 页面配置（轮播图）
- [ ] 用户管理

## 🎯 SQLite vs JSON 对比

| 特性 | JSON | SQLite |
|------|------|--------|
| 部署复杂度 | 简单 | 简单（只需安装 sqlite3） |
| 性能 | 差（大量数据时） | 优秀 |
| 数据安全 | 差（容易损坏） | 好（事务支持） |
| 并发 | 不支持 | 支持 |
| 查询能力 | 差 | 强大（SQL） |
| 迁移到云数据库 | 困难 | 容易（SQL 通用） |

## 📊 数据库文件位置

- 数据库文件：`server/blog.db`
- 备份 JSON：`server/data.json.backup`

## 🔧 故障排查

### 如果遇到数据库锁定错误

```bash
# 检查是否有多个进程在运行
ps aux | grep node
pm2 list

# 停止所有相关进程
pm2 stop all
pm2 delete all
```

### 回滚到 JSON 方式

如果出现问题，可以使用备份文件回滚：

```bash
cp server-json.js.backup server.js
cp data.json.backup data.json
pm2 restart blog-backend
```

## 📝 注意事项

1. **数据库文件权限**：确保 `blog.db` 文件有读写权限
2. **备份**：定期备份 `blog.db` 文件
3. **迁移**：如果换服务器，只需复制 `blog.db` 文件和 `uploads/`、`carousel/`、`files/` 目录
4. **Git 忽略**：数据库文件（`*.db`）已加入 `.gitignore`，不会提交到代码仓库

## 🚀 性能优化建议

1. SQLite 已经做了索引优化
2. 会话自动清理过期记录
3. 静态文件使用了缓存头
4. 文件上传限制合理（图片5MB，文件50MB）

## 💾 未来扩展

如果数据量持续增长，可以无缝迁移到：
- **MySQL**：云服务器标配
- **PostgreSQL**：功能更强大
- **MongoDB**：文档型数据库

SQL 代码可以很容易地迁移到这些数据库。
