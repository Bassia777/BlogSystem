# 个人博客系统

一个简洁美观的个人博客系统，支持动态发布和长文章写作。

## 功能特性

- 🔐 密码验证登录系统
- 📝 动态广场：发布动态、回复评论、分页浏览
- 📄 长文章：支持最多2000字的长篇写作
- 🎨 现代化UI设计，简洁美观
- 💾 JSON 文件存储（无需编译原生模块，适合 Windows）

## 技术栈

**前端**
- React 18
- React Router
- Axios
- Vite

**后端**
- Node.js
- Express
- JSON 持久化（`server/data.json`）
- bcryptjs（纯 JS，无需 node-gyp）

## 安装步骤

1. 安装所有依赖：
```bash
npm run install:all
```

2. 启动开发服务器：
```bash
npm run dev
```

这将同时启动前端（http://127.0.0.1:5173）与后端 API（http://127.0.0.1:3001）。前端在开发环境下会直连 API，不再走 Vite 代理，可避免 Windows 上端口冲突与 `ENOBUFS` 代理错误。

## 默认超管

- 账号：`root`，密码：`admin`（字母数字，均不超过 8 位）
- 超管可进入「用户管理」新增普通用户；普通用户不可进入该页

## 项目结构

```
BolgSystem/
├── client/          # 前端代码
│   ├── src/
│   │   ├── components/  # React组件
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/          # 后端代码
│   ├── server.js    # Express服务器
│   └── package.json
└── package.json     # 根项目配置
```

## 使用说明

1. 访问 http://127.0.0.1:5173
2. 使用账号与密码登录（默认超管：`root` / `admin`）
3. 在"动态广场"发布动态和回复
4. 在"长文章"页面撰写长篇文章

## 注意事项

- 文章内容限制为2000字
- 数据保存在 `server/data.json`（首次登录后自动生成）
- 账号和密码均为字母或数字，不超过8位

---

## 百度智能云部署教程（零基础）

### 步骤 1：创建云服务器实例（如果还没有）

1. 登录 [百度智能云控制台](https://console.bce.baidu.com/)
2. 进入 **云服务器 BCC** → **实例列表**
3. 点击 **创建实例**
   - **地域**：选离你近的（如华北-北京）
   - **镜像**：选 **Ubuntu 22.04** 或 **CentOS 7+** 百度智能云 
   - **规格**：最低 1核2G 即可（个人博客够用）
   - **网络**：使用默认 VPC，勾选 **公网IP**
   - **带宽**：按需选择（1Mbps 起步即可）
   - **安全组**：先选默认，稍后配置
   - **密码**：设置 root 密码（记住这个密码，后面 SSH 登录要用）
4. 确认并购买（按量或包年包月）

### 步骤 2：配置安全组（必做）

1. 在 **实例列表** 里，找到你刚创建的实例
2. 点击实例名称，进入详情页
3. 找到 **安全组** 标签页
4. 点击安全组名称，进入安全组规则配置
5. 选择 **入站规则** → **添加规则**
6. 添加以下规则：
   - **协议**：TCP
   - **端口范围**：3001-3001（或写 3001）
   - **授权对象**：0.0.0.0/0（允许所有人访问）
   - **策略**：允许
7. 点击 **保存**

> 如果想只允许自己访问，把 `0.0.0.0/0` 改成你家宽带的公网 IP（百度搜"我的IP"可查）

### 步骤 3：登录到服务器

#### 方法 1：网页终端（最简单）
1. 回到 **实例列表**
2. 点击实例右侧的 **远程登录** 按钮
3. 在弹出的网页终端里输入 **用户名**（通常是 `root`）和你设置的密码

#### 方法 2：本地 SSH（推荐，更流畅）
在你的 **Windows** 电脑上：

1. 打开 **PowerShell** 或 **Windows Terminal**
2. 执行：
   ```powershell
   ssh root@你的服务器公网IP
   ```
   例如：`ssh root@106.12.166.136`

3. 首次连接会提示是否信任，输入 `yes`
4. 输入你在百度云设置的 root 密码

成功后你会看到类似：
```
Welcome to Ubuntu 22.04.x LTS ...
root@instance-xxx:~#
```

### 步骤 4：在服务器上安装 Node.js

登录成功后，在服务器终端里执行：

#### Ubuntu 系统：
```bash
# 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node -v
npm -v
```

#### CentOS 系统：
```bash
# 安装 Node.js 20 LTS
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node -v
npm -v
```

看到版本号（如 `v20.x.x`）就说明装好了。

### 步骤 5：上传代码到服务器

你有两种方式：

#### 方式 1：本地打包上传（简单，推荐新手）

**在你的 Windows 电脑上：**

1. 打开项目目录：
   ```powershell
   cd C:\Users\Administrator\Desktop\Code\BolgSystem
   ```

2. 删除 node_modules 减小体积：
   ```powershell
   Remove-Item -Recurse -Force client\node_modules, server\node_modules -ErrorAction SilentlyContinue
   ```

3. 压缩整个项目文件夹为 `BolgSystem.zip`（右键 → 发送到 → 压缩文件）

4. 用 **WinSCP** 或 **scp** 上传到服务器：

   **用 WinSCP（图形界面，推荐）：**
   - 下载 [WinSCP](https://winscp.net/eng/download.php)
   - 主机名：你的公网 IP，用户名 `root`，密码：你设的密码
   - 连接后，把 `BolgSystem.zip` 拖到服务器的 `/root` 或 `/var/www`

   **或用 PowerShell scp：**
   ```powershell
   scp BolgSystem.zip root@你的公网IP:/root/
   ```

5. 回到服务器 SSH 终端，解压：
   ```bash
   cd /root
   unzip BolgSystem.zip
   cd BolgSystem
   ```

#### 方式 2：Git 上传（需先把代码提交到 GitHub/Gitee）

**在服务器上：**

```bash
# 安装 git
sudo apt-get install -y git  # Ubuntu
# 或 sudo yum install -y git   # CentOS

# 克隆你的仓库
cd /var/www
git clone https://github.com/你的用户名/BolgSystem.git
cd BolgSystem
```

### 步骤 6：构建和启动

在服务器的项目目录里：

```bash
# 1. 安装所有依赖
npm run install:all

# 2. 构建前端（生成 client/dist）
npm run build

# 3. 启动生产服务器
PORT=3001 npm run start:prod
```

如果看到：
```
服务器运行在 http://0.0.0.0:3001 （公网请用云服务器公网 IP + 端口访问）
[blog-api] 多用户模式：...
```

就说明启动成功了！

### 步骤 7：浏览器访问

打开浏览器，输入：

```
http://你的公网IP:3001
```

例如：`http://106.12.166.136:3001`

应该能看到登录页，用 **`root` / `admin`** 登录。

### 步骤 8：保持服务常驻（重要）

上面的启动方式，一旦你关闭 SSH 终端，Node 进程就会停。要让它一直运行，用 **PM2**：

```bash
# 1. 安装 PM2
sudo npm install -g pm2

# 2. 用 PM2 启动
cd /root/BolgSystem  # 或你的项目路径
PORT=3001 pm2 start server/server.js --name blog

# 3. 查看状态
pm2 status

# 4. 保存配置，开机自启
pm2 save
pm2 startup
# 👆 会输出一条 sudo 命令，复制粘贴执行即可

# 5. 常用 PM2 命令
pm2 logs blog      # 查看日志
pm2 restart blog   # 重启
pm2 stop blog      # 停止
pm2 delete blog    # 删除
```

---

## 常见问题排查

### 1. 访问 IP:3001 显示"无法访问此网站"
- 检查安全组是否放行 3001
- 检查服务器防火墙：`sudo ufw status`，若启用需 `sudo ufw allow 3001/tcp`
- 检查服务是否在运行：`pm2 status` 或 `netstat -tuln | grep 3001`

### 2. 页面空白或 404
- 确认执行了 `npm run build`
- 检查 `client/dist/index.html` 是否存在

### 3. 登录后数据为空
- 首次启动后，`server/data.json` 会自动创建
- 可以手动查看：`cat server/data.json`

### 4. 想用 80 端口（不用输入 :3001）
- 启动时改 `PORT=80 pm2 start ...`
- 安全组放行 80
- **注意**：Linux 上绑定 80 需 root 权限，或用 Nginx 反向代理

---

## 文件清单（上传前检查）

确保服务器上有这些文件：
- `package.json`（根目录）
- `server/package.json`、`server/server.js`
- `client/package.json`、`client/src/`、`client/index.html`、`client/vite.config.js`
- **不要上传** `node_modules`（太大，到服务器再 `npm install`）

---

需要我把这个教程单独写成 `DEPLOY.md` 文件吗？还是放在 `README.md` 里就够用了（我先更新 README）？
