import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "./client",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
    },
  },
  build: {
    // Prevent aggressive tree-shaking for React Query
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          // Force React Query into a separate chunk to prevent tree-shaking
          'react-query': ['@tanstack/react-query']
        }
      }
    },
    // Disable minification temporarily to prevent React Query removal
    minify: false,
    // Keep all imports alive
    chunkSizeWarningLimit: 2000
  },
  optimizeDeps: {
    // Force include React Query in dependency optimization
    include: ['@tanstack/react-query'],
    force: true
  },
  define: {
    // Ensure React Query is always included
    __FORCE_REACT_QUERY__: true
  }
});