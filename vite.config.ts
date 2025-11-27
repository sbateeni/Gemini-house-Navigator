
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually filter env vars to avoid exposing system variables
const envKeys = [
  'API_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

const processEnv: Record<string, string | undefined> = {};
envKeys.forEach(key => {
  if (process.env[key]) {
    processEnv[key] = process.env[key];
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'), 
      '@components': path.resolve(__dirname, './components'),
      '@services': path.resolve(__dirname, './services')
    },
  },
  define: {
    'process.env': processEnv
  }
});
