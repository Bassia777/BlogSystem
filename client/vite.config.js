import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 前端固定 5173，后端固定 3001，避免 3000 被占用时 Vite 抢到 3001 与 API 端口冲突（会导致代理/登录异常）
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
})
