import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  root: "app",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app/src"),
    },
  },
  build: {
    outDir: "../dist",
  }
})
