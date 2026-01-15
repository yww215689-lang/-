
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // 使用相对路径，确保在 Android WebView/Capacitor 中通过 file:// 协议运行时能找到资源
  base: './', 
  
  plugins: [react()],

  // 强制 esbuild 使用 esnext 目标，确保开发阶段支持 top-level await
  esbuild: {
    target: 'esnext',
    supported: { 
      'top-level-await': true 
    },
  },
  
  build: {
    // 现代浏览器目标
    target: 'esnext',
    
    // 调大包大小警告阈值
    chunkSizeWarningLimit: 2000,

    rollupOptions: {
      // 关键修复：将 pdfjs-dist 设为外部依赖
      // 这样 Vite/Rollup 就不会尝试打包它，从而避开 Top-Level Await 的转译错误
      // 运行时会直接使用 index.html 中 importmap 定义的 CDN 地址
      external: ['pdfjs-dist'],
      
      output: {
        // 为兼容性配置路径映射（虽然主要依赖 index.html 的 importmap）
        paths: {
          'pdfjs-dist': 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs'
        }
      }
    }
  },
  
  optimizeDeps: {
    // 预构建时排除 pdfjs-dist
    exclude: ['pdfjs-dist'],
    esbuildOptions: {
      target: 'esnext',
      supported: { 
        'top-level-await': true 
      },
    },
  },
});
