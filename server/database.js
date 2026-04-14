const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'blog.db');
let db;

// 初始化数据库连接
function initDB() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('✅ 数据库连接成功');
      
      // 确保默认超管存在
      ensureDefaultAdmin().then(resolve).catch(reject);
    });
  });
}

// 确保默认超管账号存在
async function ensureDefaultAdmin() {
  return new Promise((resolve) => {
    db.get('SELECT * FROM users WHERE account = ?', ['admin'], (err, row) => {
      if (err || !row) {
        const passwordHash = bcrypt.hashSync('123', 10);
        db.run(
          'INSERT INTO users (account, password_hash, password_plain, role) VALUES (?, ?, ?, ?)',
          ['admin', passwordHash, '123', 'superadmin'],
          () => {
            console.log('✅ 创建默认超管账号: admin / 123');
            resolve();
          }
        );
      } else {
        resolve();
      }
    });
  });
}

// Promise 版本的数据库操作
const dbAsync = {
  // 查询所有
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  // 查询单条
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // 执行插入/更新/删除
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

// 用户相关
const userDB = {
  // 获取所有用户
  getAll: () => dbAsync.all('SELECT * FROM users ORDER BY id'),
  
  // 根据账号获取用户
  getByAccount: (account) => dbAsync.get('SELECT * FROM users WHERE account = ?', [account]),
  
  // 根据ID获取用户
  get: (id) => dbAsync.get('SELECT * FROM users WHERE id = ?', [id]),
  
  // 创建用户
  create: async (account, passwordHash, passwordPlain, role = 'user') => {
    const result = await dbAsync.run(
      'INSERT INTO users (account, password_hash, password_plain, role) VALUES (?, ?, ?, ?)',
      [account, passwordHash, passwordPlain, role]
    );
    return result.id;
  },
  
  // 更新用户
  update: async (id, account, passwordHash, passwordPlain, role) => {
    await dbAsync.run(
      'UPDATE users SET account = ?, password_hash = ?, password_plain = ?, role = ? WHERE id = ?',
      [account, passwordHash, passwordPlain, role, id]
    );
  },
  
  // 删除用户
  delete: async (id) => {
    await dbAsync.run('DELETE FROM users WHERE id = ?', [id]);
  }
};

// 会话相关
const sessionDB = {
  // 获取会话
  get: (token) => dbAsync.get('SELECT * FROM sessions WHERE token = ?', [token]),
  
  // 创建会话
  create: async (token, account, role, expiresAt) => {
    await dbAsync.run(
      'INSERT INTO sessions (token, account, role, expires_at) VALUES (?, ?, ?, ?)',
      [token, account, role, expiresAt]
    );
  },
  
  // 删除会话
  delete: async (token) => {
    await dbAsync.run('DELETE FROM sessions WHERE token = ?', [token]);
  },
  
  // 清理过期会话
  cleanExpired: async () => {
    const now = new Date().toISOString();
    await dbAsync.run('DELETE FROM sessions WHERE expires_at < ?', [now]);
  }
};

// 随笔相关
const postDB = {
  // 获取随笔列表（分页）
  getPage: async (page = 1, pageSize = 10) => {
    const offset = (page - 1) * pageSize;
    const posts = await dbAsync.all(
      'SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );
    
    // 获取每条随笔的回复
    for (let post of posts) {
      post.replies = await dbAsync.all(
        'SELECT * FROM replies WHERE post_id = ? ORDER BY created_at ASC',
        [post.id]
      );
    }
    
    const countResult = await dbAsync.get('SELECT COUNT(*) as total FROM posts');
    const totalPages = Math.ceil(countResult.total / pageSize);
    
    return { posts, totalPages, total: countResult.total };
  },
  
  // 创建随笔
  create: async (content, author) => {
    const result = await dbAsync.run(
      'INSERT INTO posts (content, author) VALUES (?, ?)',
      [content, author]
    );
    return result.id;
  },
  
  // 删除随笔
  delete: async (id) => {
    await dbAsync.run('DELETE FROM posts WHERE id = ?', [id]);
  },
  
  // 添加回复
  addReply: async (postId, content, author) => {
    const result = await dbAsync.run(
      'INSERT INTO replies (post_id, content, author) VALUES (?, ?, ?)',
      [postId, content, author]
    );
    return result.id;
  },
  
  // 删除回复
  deleteReply: async (replyId) => {
    await dbAsync.run('DELETE FROM replies WHERE id = ?', [replyId]);
  }
};

// 博文相关
const articleDB = {
  // 获取所有博文
  getAll: () => dbAsync.all('SELECT * FROM articles ORDER BY created_at DESC'),
  
  // 获取单篇博文
  get: (id) => dbAsync.get('SELECT * FROM articles WHERE id = ?', [id]),
  
  // 创建博文
  create: async (title, content, author) => {
    const result = await dbAsync.run(
      'INSERT INTO articles (title, content, author) VALUES (?, ?, ?)',
      [title, content, author]
    );
    return result.id;
  },
  
  // 更新博文
  update: async (id, title, content) => {
    await dbAsync.run(
      'UPDATE articles SET title = ?, content = ?, updated_at = datetime("now", "localtime") WHERE id = ?',
      [title, content, id]
    );
  },
  
  // 删除博文
  delete: async (id) => {
    await dbAsync.run('DELETE FROM articles WHERE id = ?', [id]);
  }
};

// 图片相关
const imageDB = {
  // 获取所有图片
  getAll: () => dbAsync.all('SELECT * FROM images ORDER BY uploaded_at DESC'),
  
  // 创建图片记录
  create: async (url, filename, uploader) => {
    const result = await dbAsync.run(
      'INSERT INTO images (url, filename, uploader) VALUES (?, ?, ?)',
      [url, filename, uploader]
    );
    return result.id;
  },
  
  // 删除图片
  delete: async (id) => {
    await dbAsync.run('DELETE FROM images WHERE id = ?', [id]);
  },
  
  // 根据ID获取图片
  get: (id) => dbAsync.get('SELECT * FROM images WHERE id = ?', [id])
};

// 文件相关
const fileDB = {
  // 获取所有文件
  getAll: () => dbAsync.all('SELECT * FROM files ORDER BY uploaded_at DESC'),
  
  // 创建文件记录
  create: async (originalName, filename, url, mimetype, size, uploader) => {
    const result = await dbAsync.run(
      'INSERT INTO files (original_name, filename, url, mimetype, size, uploader) VALUES (?, ?, ?, ?, ?, ?)',
      [originalName, filename, url, mimetype, size, uploader]
    );
    return result.id;
  },
  
  // 删除文件
  delete: async (id) => {
    await dbAsync.run('DELETE FROM files WHERE id = ?', [id]);
  },
  
  // 根据ID获取文件
  get: (id) => dbAsync.get('SELECT * FROM files WHERE id = ?', [id])
};

// 设置相关
const settingDB = {
  // 获取设置
  get: async (key) => {
    const row = await dbAsync.get('SELECT value FROM settings WHERE key = ?', [key]);
    if (row) {
      try {
        return JSON.parse(row.value);
      } catch {
        return row.value;
      }
    }
    return null;
  },
  
  // 设置值
  set: async (key, value) => {
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
    await dbAsync.run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, jsonValue]
    );
  }
};

module.exports = {
  initDB,
  userDB,
  sessionDB,
  postDB,
  articleDB,
  imageDB,
  fileDB,
  settingDB,
  db: () => db
};
