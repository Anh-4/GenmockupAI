import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// `flow-sdk` is aliased to our local adapter so the app code can keep
// `import { Flow } from 'flow-sdk'` unchanged while we back it with the
// official @google/genai SDK.
export default defineConfig({
  // Relative base so the built app loads over file:// inside Electron.
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "flow-sdk": path.resolve(__dirname, "src/flow-sdk/index.ts"),
    },
  },
  server: { port: 5173 },
});
