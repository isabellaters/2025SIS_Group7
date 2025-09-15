// vite.config.ts or .mjs/.cjs
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "src",
  plugins: [react()],
  build: { outDir: "../dist" },   // -> <project>/dist
  server: { port: 5173 }
});
