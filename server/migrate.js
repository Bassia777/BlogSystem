const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'blog.db');
const JSON_PATH = path.join(__dirname, 'data.json');

async function migrateFromJSON() {
  return new Promise((resolve, reject) => {
    // 读取 JSON 数据
    let jsonData;
    try {
      const raw = fs.readFileSync(JSON_PATH, 'utf8');
      jsonData = JSON.parse(raw);
      console.log('✅ 成功读取 data.json');
    } catch (err) {
      console.error('❌ 读取 data.json 失败:', err);
      reject(err);
      return;
    }

    // 连接数据库
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ 数据库连接失败:', err);
        reject(err);
        return;
      }
      console.log('✅ 数据库连接成功');
    });

    db.serialize(() => {
      let migrationError = null;

      // 迁移用户
      console.log('\n📝 开始迁移用户...');
      const users = jsonData.users || [];
      users.forEach(user => {
        db.run(
          `INSERT INTO users (id, account, password_hash, password_plain, role) 
           VALUES (?, ?, ?, ?, ?)`,
          [user.id, user.account, user.passwordHash, user.passwordPlain, user.role],
          (err) => {
            if (err && !err.message.includes('UNIQUE constraint')) {
              console.error(`  ❌ 用户 ${user.account} 迁移失败:`, err.message);
              migrationError = err;
            } else {
              console.log(`  ✅ 用户 ${user.account} 迁移成功`);
            }
          }
        );
      });

      // 迁移会话
      console.log('\n📝 开始迁移会话...');
      const sessions = jsonData.sessions || [];
      sessions.forEach(session => {
        db.run(
          `INSERT INTO sessions (token, account, role, expires_at) 
           VALUES (?, ?, ?, ?)`,
          [session.token, session.account, session.role, session.expiresAt],
          (err) => {
            if (err && !err.message.includes('UNIQUE constraint')) {
              console.error(`  ❌ 会话迁移失败:`, err.message);
            } else {
              console.log(`  ✅ 会话 ${session.account} 迁移成功`);
            }
          }
        );
      });

      // 迁移随笔
      console.log('\n📝 开始迁移随笔...');
      const posts = jsonData.posts || [];
      posts.forEach(post => {
        const author = post.author || '匿名';
        db.run(
          `INSERT INTO posts (id, content, author, created_at) 
           VALUES (?, ?, ?, ?)`,
          [post.id, post.content, author, post.created_at],
          (err) => {
            if (err) {
              console.error(`  ❌ 随笔 ${post.id} 迁移失败:`, err.message);
            } else {
              console.log(`  ✅ 随笔 ${post.id} 迁移成功`);
              
              // 迁移该随笔的回复
              if (post.replies && post.replies.length > 0) {
                post.replies.forEach(reply => {
                  db.run(
                    `INSERT INTO replies (id, post_id, content, author, created_at) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [reply.id, post.id, reply.content, reply.author || '匿名', reply.created_at],
                    (err) => {
                      if (err) {
                        console.error(`    ❌ 回复 ${reply.id} 迁移失败:`, err.message);
                      } else {
                        console.log(`    ✅ 回复 ${reply.id} 迁移成功`);
                      }
                    }
                  );
                });
              }
            }
          }
        );
      });

      // 迁移博文
      console.log('\n📝 开始迁移博文...');
      const articles = jsonData.articles || [];
      articles.forEach(article => {
        const author = article.author || '匿名';
        db.run(
          `INSERT INTO articles (id, title, content, author, created_at) 
           VALUES (?, ?, ?, ?, ?)`,
          [article.id, article.title, article.content, author, article.created_at],
          (err) => {
            if (err) {
              console.error(`  ❌ 博文 ${article.id} 迁移失败:`, err.message);
            } else {
              console.log(`  ✅ 博文 "${article.title}" 迁移成功`);
            }
          }
        );
      });

      // 迁移图片
      console.log('\n📝 开始迁移图片...');
      const images = jsonData.images || [];
      images.forEach(image => {
        const uploader = image.author || image.uploader || 'admin';
        db.run(
          `INSERT INTO images (id, url, filename, uploader, uploaded_at) 
           VALUES (?, ?, ?, ?, ?)`,
          [image.id, image.url, image.filename, uploader, image.created_at || image.uploaded_at],
          (err) => {
            if (err) {
              console.error(`  ❌ 图片 ${image.id} 迁移失败:`, err.message);
            } else {
              console.log(`  ✅ 图片 ${image.id} 迁移成功`);
            }
          }
        );
      });

      // 迁移文件
      console.log('\n📝 开始迁移文件...');
      const files = jsonData.files || [];
      files.forEach(file => {
        db.run(
          `INSERT INTO files (id, original_name, filename, url, mimetype, size, uploader, uploaded_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [file.id, file.originalName, file.filename, file.url, file.mimetype, file.size, file.uploader, file.uploadedAt],
          (err) => {
            if (err) {
              console.error(`  ❌ 文件 ${file.id} 迁移失败:`, err.message);
            } else {
              console.log(`  ✅ 文件 "${file.originalName}" 迁移成功`);
            }
          }
        );
      });

      // 迁移设置
      console.log('\n📝 开始迁移设置...');
      if (jsonData.settings) {
        if (jsonData.settings.carouselImages) {
          db.run(
            `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
            ['carouselImages', JSON.stringify(jsonData.settings.carouselImages)],
            (err) => {
              if (err) {
                console.error('  ❌ 轮播图配置迁移失败:', err.message);
              } else {
                console.log('  ✅ 轮播图配置迁移成功');
              }
            }
          );
        }
      }

      // 等待所有操作完成
      setTimeout(() => {
        if (migrationError) {
          console.error('\n❌ 迁移过程中出现错误');
          db.close();
          reject(migrationError);
        } else {
          console.log('\n✅ 所有数据迁移完成！');
          
          // 统计数据
          db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
            if (!err) console.log(`📊 用户总数: ${row.count}`);
          });
          db.get('SELECT COUNT(*) as count FROM posts', (err, row) => {
            if (!err) console.log(`📊 随笔总数: ${row.count}`);
          });
          db.get('SELECT COUNT(*) as count FROM articles', (err, row) => {
            if (!err) console.log(`📊 博文总数: ${row.count}`);
          });
          db.get('SELECT COUNT(*) as count FROM images', (err, row) => {
            if (!err) console.log(`📊 图片总数: ${row.count}`);
          });
          db.get('SELECT COUNT(*) as count FROM files', (err, row) => {
            if (!err) console.log(`📊 文件总数: ${row.count}`);
          });

          setTimeout(() => {
            db.close();
            resolve();
          }, 500);
        }
      }, 2000);
    });
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  console.log('🚀 开始从 data.json 迁移数据到 SQLite...\n');
  
  migrateFromJSON()
    .then(() => {
      console.log('\n✅ 迁移完成！可以启动服务器了。');
      console.log('💡 建议：备份 data.json 后再删除');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ 迁移失败:', err);
      process.exit(1);
    });
}

module.exports = { migrateFromJSON };
