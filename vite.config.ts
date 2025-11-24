import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Pass Vercel environment variables to the client-side code
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});