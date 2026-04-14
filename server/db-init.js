const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'blog.db');

function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('数据库连接失败:', err);
        reject(err);
        return;
      }
      console.log('数据库连接成功');
    });

    db.serialize(() => {
      // 用户表
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_plain TEXT,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`);

      // 会话表
      db.run(`CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        account TEXT NOT NULL,
        role TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`);

      // 随笔表
      db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`);

      // 随笔回复表
      db.run(`CREATE TABLE IF NOT EXISTS replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )`);

      // 博文表
      db.run(`CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`);

      // 图片表
      db.run(`CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        filename TEXT NOT NULL,
        uploader TEXT NOT NULL,
        uploaded_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`);

      // 文件表
      db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_name TEXT NOT NULL,
        filename TEXT NOT NULL,
        url TEXT NOT NULL,
        mimetype TEXT NOT NULL,
        size INTEGER NOT NULL,
        uploader TEXT NOT NULL,
        uploaded_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`);

      // 设置表（键值对）
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`, (err) => {
        if (err) {
          console.error('创建表失败:', err);
          reject(err);
        } else {
          console.log('✅ 所有表创建完成');
          db.close();
          resolve();
        }
      });
    });
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('✅ 数据库初始化成功！');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ 数据库初始化失败:', err);
      process.exit(1);
    });
}

module.exports = { initDatabase, DB_PATH };
