import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // ESTO ES LA MAGIA:
      // Fuerza a que cualquier import de 'three' use la misma copia de la librería
      'three': path.resolve(__dirname, './node_modules/three')
    }
  }
})