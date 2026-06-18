import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readFileSync } from "node:fs";

// Đọc version từ package.json + đóng dấu ngày build, inject vào app để
// hiển thị ở UI (phân biệt bản cũ/mới ngay cả khi quên bump version).
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));
const buildDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// `flow-sdk` is aliased to our local adapter so the app code can keep
// `import { Flow } from 'flow-sdk'` unchanged while we back it with the
// official @google/genai SDK.
export default defineConfig({
  // Relative base so the built app loads over file:// inside Electron.
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "flow-sdk": path.resolve(__dirname, "src/flow-sdk/index.ts"),
    },
  },
  server: { port: 5173 },
});
