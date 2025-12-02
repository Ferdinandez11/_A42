import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 1. TU CONFIGURACIÓN ACTUAL (Vital para Three.js)
  resolve: {
    alias: {
      // Fuerza a que cualquier import de 'three' use la misma copia de la librería
      'three': path.resolve(__dirname, './node_modules/three')
    }
  },

  // 2. CONFIGURACIÓN DE OPTIMIZACIÓN (Para quitar el aviso amarillo)
  build: {
    chunkSizeWarningLimit: 1600, // Aumentamos el límite de aviso a 1.6MB
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separa las librerías (node_modules) del código de tu app
          // Esto crea un archivo 'vendor.js' que el navegador cachea mejor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})