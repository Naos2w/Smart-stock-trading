import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Stringify the key so it inserts as a string literal in the code: "your-key-here"
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.FINNHUB_API_KEY': JSON.stringify(env.FINNHUB_API_KEY),
      'process.env.FINMIND_API_KEY': JSON.stringify(env.FINMIND_API_KEY),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});