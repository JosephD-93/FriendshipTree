import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { dailyPlannerTouchTransform } from './build/dailyPlannerTouchTransform.js'

export default defineConfig({
  plugins: [dailyPlannerTouchTransform(), react()],
  base: './',
  build: {
    outDir: 'dist',
  }
})