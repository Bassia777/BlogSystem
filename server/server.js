const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SESSION_DAYS = 7;
const CREDENTIAL_RE = /^[a-zA-Z0-9]{1,8}$/;

// 确保uploads目录存在
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'image-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 PNG、JPG、GIF、WEBP 格式的图片'));
    }
  }
});

function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(items) {
  if (!items.length) return 1;
  return Math.max(...items.map((x) => x.id)) + 1;
}

function normalizeData(d) {
  if (!Array.isArray(d.users)) d.users = [];
  if (!Array.isArray(d.sessions)) d.sessions = [];
  if (!Array.isArray(d.posts)) d.posts = [];
  if (!Array.isArray(d.replies)) d.replies = [];
  if (!Array.isArray(d.articles)) d.articles = [];
  if (!Array.isArray(d.images)) d.images = [];
  if (!d.settings || typeof d.settings !== 'object') d.settings = {};

  const now = Date.now();
  d.sessions = d.sessions.filter((s) => new Date(s.expiresAt).getTime() > now);

  if (!d.users.some((u) => u.account === 'admin')) {
    const plain = '123';
    d.users.push({
      id: nextId(d.users),
      account: 'admin',
      passwordHash: bcrypt.hashSync(plain, 10),
      passwordPlain: plain,
      role: 'superadmin'
    });
  } else {
    const adminUser = d.users.find((u) => u.account === 'admin');
    if (adminUser && adminUser.passwordPlain !== '123') {
      const plain = '123';
      adminUser.passwordPlain = plain;
      adminUser.passwordHash = bcrypt.hashSync(plain, 10);
      adminUser.role = 'superadmin';
    }
  }

  // 明文与哈希不一致时（改库、损坏、旧 bug），以 passwordPlain 为准重算并落盘
  let repairedUserSecrets = false;
  for (const u of d.users) {
    if (u.passwordPlain && CREDENTIAL_RE.test(u.passwordPlain)) {
      const ok =
        u.passwordHash &&
        bcrypt.compareSync(u.passwordPlain, u.passwordHash);
      if (!ok) {
        u.passwordHash = bcrypt.hashSync(u.passwordPlain, 10);
        repairedUserSecrets = true;
      }
    }
  }
  if (repairedUserSecrets) {
    saveData(d);
  }

  delete d.settings.password;
  return d;
}

function validateCredential(str, label) {
  if (!str || typeof str !== 'string') return `${label}不能为空`;
  if (!CREDENTIAL_RE.test(str)) {
    return `${label}须为字母或数字，且不超过8位`;
  }
  return null;
}

function getSession(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  const token = h.slice(7).trim();
  if (!token) return null;
  const data = normalizeData(loadData());
  const s = data.sessions.find(
    (x) => x.token === token && new Date(x.expiresAt).getTime() > Date.now()
  );
  return s || null;
}

function requireSuperAdmin(req, res, next) {
  const s = getSession(req);
  if (!s) return res.status(401).json({ message: '未登录或会话已过期' });
  if (s.role !== 'superadmin') {
    return res.status(403).json({ message: '需要超管权限' });
  }
  req.session = s;
  next();
}

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(UPLOADS_DIR)); // 静态文件服务

app.post('/api/auth/login', (req, res) => {
  const { account, password } = req.body || {};
  const errA = validateCredential(account, '账号');
  const errP = validateCredential(password, '密码');
  if (errA) return res.status(400).json({ success: false, message: errA });
  if (errP) return res.status(400).json({ success: false, message: errP });

  let data = normalizeData(loadData());
  const user = data.users.find((u) => u.account === account);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ success: false, message: '账号或密码错误' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  data.sessions.push({
    token,
    account: user.account,
    role: user.role,
    expiresAt
  });
  saveData(data);

  res.json({
    success: true,
    token,
    account: user.account,
    role: user.role
  });
});

app.post('/api/auth/logout', (req, res) => {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) {
    const token = h.slice(7).trim();
    let data = normalizeData(loadData());
    data.sessions = data.sessions.filter((s) => s.token !== token);
    saveData(data);
  }
  res.json({ ok: true });
});

app.get('/api/users', requireSuperAdmin, (req, res) => {
  const data = normalizeData(loadData());
  const list = data.users.map((u) => ({
    id: u.id,
    account: u.account,
    role: u.role,
    password: u.passwordPlain || ''
  }));
  res.json(list);
});

app.post('/api/users', requireSuperAdmin, (req, res) => {
  const { account, password } = req.body || {};
  const errA = validateCredential(account, '账号');
  const errP = validateCredential(password, '密码');
  if (errA) return res.status(400).json({ message: errA });
  if (errP) return res.status(400).json({ message: errP });

  let data = normalizeData(loadData());
  if (data.users.some((u) => u.account === account)) {
    return res.status(400).json({ message: '该账号已存在' });
  }

  const id = nextId(data.users);
  const row = {
    id,
    account,
    passwordHash: bcrypt.hashSync(password, 10),
    passwordPlain: password,
    role: 'user'
  };
  data.users.push(row);
  saveData(data);
  res.json({
    id: row.id,
    account: row.account,
    role: row.role,
    password: row.passwordPlain
  });
});

app.patch('/api/users/:id/password', requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { password } = req.body || {};
  const errP = validateCredential(password, '密码');
  if (errP) return res.status(400).json({ message: errP });

  let data = normalizeData(loadData());
  const user = data.users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ message: '用户不存在' });

  user.passwordHash = bcrypt.hashSync(password, 10);
  user.passwordPlain = password;
  saveData(data);
  res.json({ ok: true });
});

app.delete('/api/users/:id', requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  let data = normalizeData(loadData());
  const user = data.users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ message: '用户不存在' });
  if (user.account === 'root') {
    return res.status(403).json({ message: '不能删除超管账号 root' });
  }
  data.users = data.users.filter((u) => u.id !== id);
  data.sessions = data.sessions.filter((s) => s.account !== user.account);
  saveData(data);
  res.json({ ok: true });
});

app.get('/api/posts', (req, res) => {
  let data = normalizeData(loadData());
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const sorted = [...data.posts].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const total = sorted.length;
  const pagePosts = sorted.slice(offset, offset + limit);

  const postsWithReplies = pagePosts.map((post) => {
    const replies = data.replies
      .filter((r) => r.post_id === post.id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return { ...post, replies };
  });

  res.json({
    posts: postsWithReplies,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit))
  });
});

app.post('/api/posts', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ message: '未登录' });
  
  const { content } = req.body;
  let data = normalizeData(loadData());
  const id = nextId(data.posts);
  const created_at = new Date().toISOString();
  const post = { 
    id, 
    content, 
    created_at,
    author: session.account  // 添加作者信息
  };
  data.posts.push(post);
  saveData(data);
  res.json({ ...post, replies: [] });
});

app.post('/api/posts/:id/replies', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ message: '未登录' });
  
  const postId = parseInt(req.params.id, 10);
  const { content } = req.body;
  let data = normalizeData(loadData());
  if (!data.posts.some((p) => p.id === postId)) {
    return res.status(404).json({ message: '动态不存在' });
  }
  const id = nextId(data.replies);
  const created_at = new Date().toISOString();
  const reply = { 
    id, 
    post_id: postId, 
    content, 
    created_at,
    author: session.account
  };
  data.replies.push(reply);
  saveData(data);
  res.json(reply);
});

// 删除评论 - 超管或评论作者可删除
app.delete('/api/posts/:postId/replies/:replyId', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ message: '未登录' });
  
  const postId = parseInt(req.params.postId, 10);
  const replyId = parseInt(req.params.replyId, 10);
  let data = normalizeData(loadData());
  
  const replyIndex = data.replies.findIndex((r) => r.id === replyId && r.post_id === postId);
  if (replyIndex === -1) {
    return res.status(404).json({ message: '评论不存在' });
  }
  
  const reply = data.replies[replyIndex];
  if (session.role !== 'superadmin' && reply.author !== session.account) {
    return res.status(403).json({ message: '只能删除自己的评论' });
  }
  
  data.replies.splice(replyIndex, 1);
  saveData(data);
  res.json({ success: true, message: '删除成功' });
});

// 删除帖子 - 仅超管可删除
app.delete('/api/posts/:id', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ message: '未登录' });
  if (session.role !== 'superadmin') {
    return res.status(403).json({ message: '只有超管才能删除帖子' });
  }
  
  const postId = parseInt(req.params.id, 10);
  let data = normalizeData(loadData());
  
  const postIndex = data.posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) {
    return res.status(404).json({ message: '帖子不存在' });
  }
  
  // 删除帖子和相关回复
  data.posts.splice(postIndex, 1);
  data.replies = data.replies.filter((r) => r.post_id !== postId);
  
  saveData(data);
  res.json({ success: true, message: '删除成功' });
});

app.get('/api/articles', (req, res) => {
  let data = normalizeData(loadData());
  const articles = [...data.articles].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  res.json(articles);
});

app.get('/api/articles/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  let data = normalizeData(loadData());
  const article = data.articles.find((a) => a.id === id);
  if (!article) return res.status(404).json({ message: '文章不存在' });
  res.json(article);
});

app.post('/api/articles', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ message: '未登录' });
  
  const { title, content } = req.body;
  if (content && content.length > 2000) {
    return res.status(400).json({ message: '文章内容不能超过2000字' });
  }
  let data = normalizeData(loadData());
  const id = nextId(data.articles);
  const created_at = new Date().toISOString();
  const article = { 
    id, 
    title, 
    content, 
    created_at,
    author: session.account
  };
  data.articles.push(article);
  saveData(data);
  res.json(article);
});

// 编辑文章 - 超管或作者本人可编辑
app.put('/api/articles/:id', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ message: '未登录' });
  
  const articleId = parseInt(req.params.id, 10);
  const { title, content } = req.body;
  
  if (content && content.length > 2000) {
    return res.status(400).json({ message: '文章内容不能超过2000字' });
  }
  
  let data = normalizeData(loadData());
  const article = data.articles.find((a) => a.id === articleId);
  
  if (!article) {
    return res.status(404).json({ message: '文章不存在' });
  }
  
  if (session.role !== 'superadmin' && article.author !== session.account) {
    return res.status(403).json({ message: '只能编辑自己的文章' });
  }
  
  article.title = title;
  article.content = content;
  article.updated_at = new Date().toISOString();
  
  saveData(data);
  res.json(article);
});

// 删除文章 - 超管或作者本人可删除
app.delete('/api/articles/:id', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ message: '未登录' });
  
  const articleId = parseInt(req.params.id, 10);
  let data = normalizeData(loadData());
  
  const articleIndex = data.articles.findIndex((a) => a.id === articleId);
  if (articleIndex === -1) {
    return res.status(404).json({ message: '文章不存在' });
  }
  
  const article = data.articles[articleIndex];
  if (session.role !== 'superadmin' && article.author !== session.account) {
    return res.status(403).json({ message: '只能删除自己的文章' });
  }
  
  data.articles.splice(articleIndex, 1);
  saveData(data);
  res.json({ success: true, message: '删除成功' });
});

// ============ 图片长廊 API ============

// 获取所有图片
app.get('/api/gallery', (req, res) => {
  let data = normalizeData(loadData());
  const images = [...data.images].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  res.json({ images });
});

// 上传图片
app.post('/api/gallery', upload.single('image'), (req, res) => {
  const session = getSession(req);
  if (!session) {
    // 删除已上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(401).json({ message: '未登录' });
  }

  if (!req.file) {
    return res.status(400).json({ message: '请选择图片文件' });
  }

  let data = normalizeData(loadData());
  const id = nextId(data.images);
  const created_at = new Date().toISOString();
  const image = {
    id,
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    author: session.account,
    created_at
  };

  data.images.push(image);
  saveData(data);
  res.json({ success: true, image });
});

// 删除图片 - 超管或上传者本人可删除
app.delete('/api/gallery/:id', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ message: '未登录' });

  const imageId = parseInt(req.params.id, 10);
  let data = normalizeData(loadData());

  const imageIndex = data.images.findIndex((img) => img.id === imageId);
  if (imageIndex === -1) {
    return res.status(404).json({ message: '图片不存在' });
  }

  const image = data.images[imageIndex];

  // 检查权限：超管或上传者本人
  if (session.role !== 'superadmin' && session.account !== image.author) {
    return res.status(403).json({ message: '只有超管和上传者本人可以删除图片' });
  }

  // 删除文件
  const filepath = path.join(UPLOADS_DIR, image.filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }

  // 从数据库删除
  data.images.splice(imageIndex, 1);
  saveData(data);

  res.json({ success: true, message: '删除成功' });
});

// ============ 页面配置 API ============

// 确保carousel目录存在
const CAROUSEL_DIR = path.join(__dirname, 'carousel');
if (!fs.existsSync(CAROUSEL_DIR)) {
  fs.mkdirSync(CAROUSEL_DIR, { recursive: true });
}

// 配置轮播图上传
const carouselStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, CAROUSEL_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'carousel-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});

const carouselUpload = multer({
  storage: carouselStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 PNG、JPG、GIF、WEBP 格式的图片'));
    }
  }
});

// 静态文件服务 - 轮播图
// 静态文件服务 - 轮播图（长期缓存）
app.use('/carousel', express.static(CAROUSEL_DIR, {
  maxAge: '7d', // 图片缓存7天
  etag: true,
  lastModified: true
}));

// 获取轮播图配置
app.get('/api/settings/carousel', (req, res) => {
  let data = normalizeData(loadData());
  const carouselImages = data.settings.carouselImages || [];
  
  // 设置缓存控制头：浏览器可缓存24小时
  res.set({
    'Cache-Control': 'public, max-age=86400', // 24小时 = 86400秒
    'ETag': `"carousel-${Date.now()}"` // 添加ETag用于验证
  });
  
  res.json({ images: carouselImages });
});

// 上传轮播图
app.post('/api/settings/carousel/upload', requireSuperAdmin, carouselUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请选择图片文件' });
  }

  const url = `/carousel/${req.file.filename}`;
  res.json({ 
    success: true, 
    url,
    filename: req.file.filename 
  });
});

// 保存轮播图配置
app.post('/api/settings/carousel', requireSuperAdmin, (req, res) => {
  const { images } = req.body;
  
  if (!Array.isArray(images)) {
    return res.status(400).json({ message: '图片列表格式错误' });
  }

  let data = normalizeData(loadData());
  data.settings.carouselImages = images.filter(img => img);
  saveData(data);

  res.json({ success: true, message: '保存成功' });
});

// 生产环境：构建后的前端放在 client/dist，与 API 同端口同源（axios 生产环境不写 baseURL）
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

let boot = normalizeData(loadData());
saveData(boot);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://0.0.0.0:${PORT} （公网请用云服务器公网 IP + 端口访问）`);
  console.log(
    '[blog-api] 多用户模式：登录 POST /api/auth/login 需 JSON { account, password }，超管 admin / 123'
  );
});
