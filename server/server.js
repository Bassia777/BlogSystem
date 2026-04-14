const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { initDB, userDB, sessionDB, postDB, articleDB, imageDB, fileDB, settingDB } = require('./database');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SESSION_DAYS = 7;
const CREDENTIAL_RE = /^[a-zA-Z0-9]{1,8}$/;

// 确保uploads目录存在
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 配置multer用于图片上传
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
    fileSize: 5 * 1024 * 1024
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

function validateCredential(str, label) {
  if (!str || typeof str !== 'string') return `${label}不能为空`;
  if (!CREDENTIAL_RE.test(str)) {
    return `${label}须为字母或数字，且不超过8位`;
  }
  return null;
}

async function getSession(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  const token = h.slice(7).trim();
  if (!token) return null;
  
  // 清理过期会话
  await sessionDB.cleanExpired();
  
  // 获取会话
  const session = await sessionDB.get(token);
  if (!session) return null;
  
  // 检查是否过期
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await sessionDB.delete(token);
    return null;
  }
  
  return session;
}

async function requireSuperAdmin(req, res, next) {
  const s = await getSession(req);
  if (!s) return res.status(401).json({ message: '未登录或会话已过期' });
  if (s.role !== 'superadmin') {
    return res.status(403).json({ message: '需要超管权限' });
  }
  req.session = s;
  next();
}

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/', (req, res) => {
  res.json({ 
    message: '博客系统 API',
    docs: 'POST /api/auth/login 登录，返回 token 放入 Authorization: Bearer <token> 请求其他接口'
  });
});

// ============ 登录注册 API ============

app.post('/api/auth/login', async (req, res) => {
  const { account, password } = req.body;
  
  // 游客模式
  if (account === 'guest' && password === 'guest') {
    const guestToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    
    await sessionDB.create(guestToken, 'guest', 'guest', expiresAt);
    
    return res.json({
      token: guestToken,
      account: 'guest',
      role: 'guest',
      message: '游客登录成功'
    });
  }
  
  const errAcc = validateCredential(account, '账号');
  if (errAcc) return res.status(400).json({ message: errAcc });
  
  const errPwd = validateCredential(password, '密码');
  if (errPwd) return res.status(400).json({ message: errPwd });

  const user = await userDB.getByAccount(account);
  if (!user) {
    return res.status(401).json({ message: '账号或密码错误' });
  }

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ message: '账号或密码错误' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  
  await sessionDB.create(token, user.account, user.role, expiresAt);

  res.json({
    token,
    account: user.account,
    role: user.role,
    message: '登录成功'
  });
});

app.post('/api/auth/logout', async (req, res) => {
  const s = await getSession(req);
  if (s) {
    await sessionDB.delete(s.token);
  }
  res.json({ message: '退出成功' });
});

app.get('/api/auth/me', async (req, res) => {
  const s = await getSession(req);
  if (!s) {
    return res.status(401).json({ message: '未登录' });
  }
  res.json({ account: s.account, role: s.role });
});

// ============ 用户管理 API（超管）============

app.get('/api/users', requireSuperAdmin, async (req, res) => {
  const users = await userDB.getAll();
  res.json({ users });
});

app.post('/api/users', requireSuperAdmin, async (req, res) => {
  const { account, password, role } = req.body;
  
  const errAcc = validateCredential(account, '账号');
  if (errAcc) return res.status(400).json({ message: errAcc });
  
  const errPwd = validateCredential(password, '密码');
  if (errPwd) return res.status(400).json({ message: errPwd });

  const existing = await userDB.getByAccount(account);
  if (existing) {
    return res.status(400).json({ message: '账号已存在' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  await userDB.create(account, passwordHash, password, role || 'user');
  
  res.json({ message: '用户创建成功' });
});

app.put('/api/users/:id', requireSuperAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { account, password, role } = req.body;
  
  const errAcc = validateCredential(account, '账号');
  if (errAcc) return res.status(400).json({ message: errAcc });

  let passwordHash, passwordPlain;
  if (password) {
    const errPwd = validateCredential(password, '密码');
    if (errPwd) return res.status(400).json({ message: errPwd });
    passwordHash = bcrypt.hashSync(password, 10);
    passwordPlain = password;
  } else {
    const user = await userDB.get(userId);
    if (!user) return res.status(404).json({ message: '用户不存在' });
    passwordHash = user.password_hash;
    passwordPlain = user.password_plain;
  }

  await userDB.update(userId, account, passwordHash, passwordPlain, role || 'user');
  res.json({ message: '用户更新成功' });
});

app.delete('/api/users/:id', requireSuperAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (userId === 1) {
    return res.status(400).json({ message: '不能删除超管账号' });
  }

  await userDB.delete(userId);
  res.json({ message: '用户删除成功' });
});

// ============ 随笔 API ============

app.get('/api/posts', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 10;
  
  const result = await postDB.getPage(page, pageSize);
  res.json({ 
    posts: result.posts, 
    totalPages: result.totalPages,
    currentPage: page
  });
});

app.post('/api/posts', async (req, res) => {
  const s = await getSession(req);
  if (!s) return res.status(401).json({ message: '请先登录' });
  if (s.role === 'guest') return res.status(403).json({ message: '游客不能发布' });
  
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ message: '内容不能为空' });
  }

  await postDB.create(content, s.account);
  res.json({ message: '发布成功' });
});

app.delete('/api/posts/:id', requireSuperAdmin, async (req, res) => {
  const postId = parseInt(req.params.id);
  await postDB.delete(postId);
  res.json({ message: '删除成功' });
});

app.post('/api/posts/:id/replies', async (req, res) => {
  const s = await getSession(req);
  if (!s) return res.status(401).json({ message: '请先登录' });
  if (s.role === 'guest') return res.status(403).json({ message: '游客不能回复' });
  
  const postId = parseInt(req.params.id);
  const { content } = req.body;
  
  if (!content || !content.trim()) {
    return res.status(400).json({ message: '回复内容不能为空' });
  }

  await postDB.addReply(postId, content, s.account);
  res.json({ message: '回复成功' });
});

app.delete('/api/posts/:postId/replies/:replyId', async (req, res) => {
  const s = await getSession(req);
  if (!s) return res.status(401).json({ message: '请先登录' });
  
  const replyId = parseInt(req.params.replyId);
  await postDB.deleteReply(replyId);
  res.json({ message: '删除成功' });
});

// ============ 博文 API ============

app.get('/api/articles', async (req, res) => {
  const articles = await articleDB.getAll();
  res.json({ articles });
});

app.get('/api/articles/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const article = await articleDB.get(id);
  
  if (!article) {
    return res.status(404).json({ message: '博文不存在' });
  }
  
  res.json({ article });
});

app.post('/api/articles', async (req, res) => {
  const s = await getSession(req);
  if (!s) return res.status(401).json({ message: '请先登录' });
  if (s.role === 'guest') return res.status(403).json({ message: '游客不能发布' });
  
  const { title, content } = req.body;
  
  if (!title || !title.trim()) {
    return res.status(400).json({ message: '标题不能为空' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ message: '内容不能为空' });
  }

  await articleDB.create(title, content, s.account);
  res.json({ message: '博文创建成功' });
});

app.put('/api/articles/:id', async (req, res) => {
  const s = await getSession(req);
  if (!s) return res.status(401).json({ message: '请先登录' });
  if (s.role === 'guest') return res.status(403).json({ message: '游客不能编辑' });
  
  const id = parseInt(req.params.id);
  const { title, content } = req.body;
  
  const article = await articleDB.get(id);
  if (!article) {
    return res.status(404).json({ message: '博文不存在' });
  }
  
  if (s.role !== 'superadmin' && article.author !== s.account) {
    return res.status(403).json({ message: '只能编辑自己的博文' });
  }

  await articleDB.update(id, title, content);
  res.json({ message: '博文更新成功' });
});

app.delete('/api/articles/:id', async (req, res) => {
  const s = await getSession(req);
  if (!s) return res.status(401).json({ message: '请先登录' });
  if (s.role === 'guest') return res.status(403).json({ message: '游客不能删除' });
  
  const id = parseInt(req.params.id);
  const article = await articleDB.get(id);
  
  if (!article) {
    return res.status(404).json({ message: '博文不存在' });
  }
  
  if (s.role !== 'superadmin' && article.author !== s.account) {
    return res.status(403).json({ message: '只能删除自己的博文' });
  }

  await articleDB.delete(id);
  res.json({ message: '博文删除成功' });
});

// ============ 图片长廊 API ============

app.get('/api/images', async (req, res) => {
  const images = await imageDB.getAll();
  res.json({ images });
});

app.post('/api/images/upload', async (req, res, next) => {
  const s = await getSession(req);
  if (!s) return res.status(401).json({ message: '请先登录' });
  if (s.role === 'guest') return res.status(403).json({ message: '游客不能上传' });
  
  upload.single('image')(req, res, async function(err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: '请选择图片' });
    }

    const url = `/uploads/${req.file.filename}`;
    await imageDB.create(url, req.file.filename, s.account);
    
    res.json({ 
      message: '上传成功',
      url,
      filename: req.file.filename
    });
  });
});

app.delete('/api/images/:id', async (req, res) => {
  const s = await getSession(req);
  if (!s) return res.status(401).json({ message: '请先登录' });
  
  const imageId = parseInt(req.params.id);
  const image = await imageDB.get(imageId);
  
  if (!image) {
    return res.status(404).json({ message: '图片不存在' });
  }
  
  if (s.role !== 'superadmin' && image.uploader !== s.account) {
    return res.status(403).json({ message: '只能删除自己上传的图片' });
  }

  const filePath = path.join(UPLOADS_DIR, image.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await imageDB.delete(imageId);
  res.json({ message: '删除成功' });
});

// ============ 页面配置 API ============

const CAROUSEL_DIR = path.join(__dirname, 'carousel');
if (!fs.existsSync(CAROUSEL_DIR)) {
  fs.mkdirSync(CAROUSEL_DIR, { recursive: true });
}

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

app.use('/carousel', express.static(CAROUSEL_DIR, {
  maxAge: '7d',
  etag: true,
  lastModified: true
}));

app.get('/api/settings/carousel', async (req, res) => {
  const carouselImages = await settingDB.get('carouselImages') || [];
  
  res.set({
    'Cache-Control': 'public, max-age=86400',
    'ETag': `"carousel-${Date.now()}"`
  });
  
  res.json({ images: carouselImages });
});

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

app.post('/api/settings/carousel', requireSuperAdmin, async (req, res) => {
  const { images } = req.body;
  
  if (!Array.isArray(images)) {
    return res.status(400).json({ message: '图片列表格式错误' });
  }

  await settingDB.set('carouselImages', images.filter(img => img));
  res.json({ success: true, message: '保存成功' });
});

// ============ 文件管理 API ============

const FILES_DIR = path.join(__dirname, 'files');
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, FILES_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    cb(null, `file-${timestamp}-${random}${ext}`);
  }
});

const fileUpload = multer({
  storage: fileStorage,
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown',
      'text/csv',
      'text/x-markdown',
      'application/octet-stream',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/json',
      'application/xml'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.md' || ext === '.markdown') {
      cb(null, true);
      return;
    }
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型：' + file.mimetype));
    }
  }
});

app.use('/files', express.static(FILES_DIR, {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

app.get('/api/files', async (req, res) => {
  const files = await fileDB.getAll();
  res.json({ files });
});

app.post('/api/files/upload', requireSuperAdmin, fileUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请选择文件' });
  }

  const { originalname, filename, mimetype, size } = req.file;
  const url = `/files/${filename}`;
  
  let decodedOriginalName = originalname;
  try {
    decodedOriginalName = Buffer.from(originalname, 'latin1').toString('utf8');
  } catch (e) {
    decodedOriginalName = originalname;
  }
  
  const fileId = await fileDB.create(decodedOriginalName, filename, url, mimetype, size, req.session.account);
  const newFile = await fileDB.get(fileId);
  
  res.json({ 
    success: true, 
    file: newFile,
    message: '文件上传成功'
  });
});

app.delete('/api/files/:id', requireSuperAdmin, async (req, res) => {
  const fileId = parseInt(req.params.id);
  
  const file = await fileDB.get(fileId);
  if (!file) {
    return res.status(404).json({ message: '文件不存在' });
  }
  
  const filePath = path.join(FILES_DIR, file.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('删除文件失败:', err);
    }
  }
  
  await fileDB.delete(fileId);
  res.json({ success: true, message: '文件删除成功' });
});

// 生产环境：静态前端
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 启动服务器
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT} （公网请用云服务器公网 IP + 端口访问）`);
    console.log('[blog-api] 多用户模式：登录 POST /api/auth/login 需 JSON { account, password }，超管 admin / 123');
  });
}).catch((err) => {
  console.error('❌ 数据库初始化失败:', err);
  process.exit(1);
});
