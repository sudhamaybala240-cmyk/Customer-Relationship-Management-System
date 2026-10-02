import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const validateProductionUrl = (name, pathSuffix) => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(
      `${name} is required on Vercel. Set it to the public deployed service URL, then redeploy.`
    )
  }

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be an absolute HTTPS URL.`)
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must be a public HTTPS URL without credentials or query parameters.`)
  }

  const pathname = url.pathname.replace(/\/+$/, '')
  if (pathSuffix ? !pathname.endsWith(pathSuffix) : pathname !== '') {
    const expected = pathSuffix
      ? `ending in ${pathSuffix}`
      : 'without a path'
    throw new Error(`${name} must be an HTTPS URL ${expected}.`)
  }
}

export default defineConfig(() => {
  if (process.env.VERCEL === '1') {
    validateProductionUrl('VITE_AUTH_API_URL', '/api/auth')
    validateProductionUrl('VITE_CRM_API_URL', '/api')
    validateProductionUrl('VITE_SOCKET_URL')
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
