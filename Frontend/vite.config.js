import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import {
  DEFAULT_AUTH_API_URL,
  DEFAULT_CRM_API_URL,
  DEFAULT_SOCKET_URL,
} from './src/config/deploymentDefaults.js'

const validateProductionUrl = (name, value, pathSuffix) => {
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

  return url
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  if (process.env.VERCEL === '1') {
    const authUrl = validateProductionUrl(
      'VITE_AUTH_API_URL',
      env.VITE_AUTH_API_URL?.trim() || DEFAULT_AUTH_API_URL,
      '/api/auth'
    )
    const crmUrl = validateProductionUrl(
      'VITE_CRM_API_URL',
      env.VITE_CRM_API_URL?.trim() || DEFAULT_CRM_API_URL,
      '/api'
    )
    validateProductionUrl(
      'VITE_SOCKET_URL',
      env.VITE_SOCKET_URL?.trim() || DEFAULT_SOCKET_URL
    )

    if (authUrl.origin === crmUrl.origin) {
      throw new Error(
        'VITE_AUTH_API_URL must point to the separately deployed auth service, not the CRM service.'
      )
    }
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
