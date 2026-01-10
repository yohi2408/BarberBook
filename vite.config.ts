
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // הקדמה חשובה: base חייב להתאים בדיוק לשם ה-Repo ב-GitHub
  base: '/BarberBook/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // מוודא שה-Manifest וה-SW יועתקו לשורש של dist
    copyPublicDir: true 
  }
});
