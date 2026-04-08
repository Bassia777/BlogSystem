# 个人博客系统

一个简洁美观的个人博客系统，支持动态发布和长文章写作。

> 💡 **扩展项目**: 如需了解 CloudBase 多语言后端服务，请查看 [CloudBase-MultiLang-Services](./CloudBase-MultiLang-Services/) 目录。

---

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

