import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import { imagetools } from "vite-imagetools"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
  base: '/',
  server: {
    // Local dev: forward /api/* to the Express backend (server/, default port 3000),
    // mirroring production where LiteSpeed routes /api to the Node app. Start the
    // backend with `cd server && npm run dev`. Without this, /api fetches hit Vite
    // (5173) and 404. changeOrigin avoids Host-header/CORS issues.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
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