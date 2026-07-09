import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import { imagetools } from "vite-imagetools"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
  base: '/',
  server: {
    // Bind all interfaces (IPv4 + IPv6). Node 17+ resolves "localhost" to ::1
    // first, and Vite's default bind is IPv6-only — so when the browser picks
    // 127.0.0.1 the connection is refused and the page hangs/blanks until a
    // refresh happens to land on ::1. Listening on both makes localhost reliable.
    host: true,
    // Local dev: forward /api/* to the Express backend (server/, default port 3000),
    // mirroring production where LiteSpeed routes /api to the Node app. Start the
    // backend with `cd server && npm run dev`. Without this, /api fetches hit Vite
    // (5173) and 404. changeOrigin avoids Host-header/CORS issues. Use 127.0.0.1
    // (not "localhost") so the proxy doesn't hit the same IPv6/IPv4 race.
    proxy: {
      // Blog always talks to the production server so localhost and prod share one DB.
      "/api/blog": {
        target: "https://gordonzhong.com",
        changeOrigin: true,
        secure: true,
      },
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    imagetools(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ["react-pdf"],
  },
})