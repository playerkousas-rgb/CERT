import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const plugins: PluginOption[] = [react(), tailwindcss()]

// https://vite.dev/config/
export default defineConfig({
  plugins,
  // 用相對路徑，build 出的 dist 可放在任何靜態網站資料夾
  base: './',
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
