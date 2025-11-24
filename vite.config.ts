import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Manually filter env vars to avoid exposing system variables or causing build errors
// with circular references in process.env
const envKeys = [
  'API_KEY',
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
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