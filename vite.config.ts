import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      port: 5173,
      host: true,
      open: true,
    },
    build: {
      outDir: "dist",
      sourcemap: mode !== "production",
      rollupOptions: {
        output: {
          manualChunks: {
            react:   ["react", "react-dom"],
            solana:  ["@solana/web3.js", "@coral-xyz/anchor"],
            spl:     ["@solana/spl-token"],
          },
        },
      },
    },
    define: {
      "process.env": JSON.stringify(env),
      global: "globalThis",
    },
    optimizeDeps: {
      include: ["react", "react-dom", "@solana/web3.js"],
      esbuildOptions: { target: "esnext" },
    },
  };
});
