import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Safely expose API_KEY if available in build environment
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});