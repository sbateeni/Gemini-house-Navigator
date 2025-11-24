import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
  define: {
    'process.env': processEnv
  }
});