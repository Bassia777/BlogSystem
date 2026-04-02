const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const DATA_FILE = path.join(__dirname, 'data.json');
const SESSION_DAYS = 7;
const CREDENTIAL_RE = /^[a-zA-Z0-9]{1,8}$/;

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
  if (!d.settings || typeof d.settings !== 'object') d.settings = {};

  const now = Date.now();
  d.sessions = d.sessions.filter((s) => new Date(s.expiresAt).getTime() > now);

  if (!d.users.some((u) => u.account === 'root')) {
    const plain = 'admin';
    d.users.push({
      id: nextId(d.users),
      account: 'root',
      passwordHash: bcrypt.hashSync(plain, 10),
      passwordPlain: plain,
      role: 'superadmin'
    });
  } else {
    const rootUser = d.users.find((u) => u.account === 'root');
    if (rootUser && !rootUser.passwordPlain) {
      const plain = 'admin';
      rootUser.passwordPlain = plain;
      rootUser.passwordHash = bcrypt.hashSync(plain, 10);
      rootUser.role = 'superadmin';
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
  const { content } = req.body;
  let data = normalizeData(loadData());
  const id = nextId(data.posts);
  const created_at = new Date().toISOString();
  const post = { id, content, created_at };
  data.posts.push(post);
  saveData(data);
  res.json({ ...post, replies: [] });
});

app.post('/api/posts/:id/replies', (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const { content } = req.body;
  let data = normalizeData(loadData());
  if (!data.posts.some((p) => p.id === postId)) {
    return res.status(404).json({ message: '动态不存在' });
  }
  const id = nextId(data.replies);
  const created_at = new Date().toISOString();
  const reply = { id, post_id: postId, content, created_at };
  data.replies.push(reply);
  saveData(data);
  res.json(reply);
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
  const { title, content } = req.body;
  if (content && content.length > 2000) {
    return res.status(400).json({ message: '文章内容不能超过2000字' });
  }
  let data = normalizeData(loadData());
  const id = nextId(data.articles);
  const created_at = new Date().toISOString();
  const article = { id, title, content, created_at };
  data.articles.push(article);
  saveData(data);
  res.json(article);
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
    '[blog-api] 多用户模式：登录 POST /api/auth/login 需 JSON { account, password }，超管 root / admin'
  );
});
