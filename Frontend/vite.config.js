import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(() => {
  if (
    process.env.VERCEL === '1' &&
    !process.env.VITE_AUTH_API_URL?.trim()
  ) {
    throw new Error(
      'VITE_AUTH_API_URL is required on Vercel. Set it to the deployed authentication service URL ending in /api/auth, then redeploy.'
    )
  }

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 9430,
      strictPort: true,
      proxy: {
        '/api/auth': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/api': {
          target: 'http://localhost:6000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:6000',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 9430,
      strictPort: true,
    },
  }
})
