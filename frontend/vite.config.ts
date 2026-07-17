import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(async () => {
  const { default: frappeui } = await import('frappe-ui/vite')

  return {
    plugins: [
      frappeui({
        frontendRoute: '/flowlane',
        // Explicit build paths so the SPA builds without inferring the app name
        // from bench config. Paths are relative to this frontend/ dir; the Python
        // package sits at ../flowlane.
        buildConfig: {
          outDir: '../flowlane/public/frontend',
          indexHtmlPath: '../flowlane/www/flowlane.html',
          baseUrl: '/assets/flowlane/frontend/',
        },
      }),
      vue(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    // frappe-ui 1.0 references ~icons/lucide/* virtual modules resolved by its
    // vite plugin; excluding it from dep pre-bundling lets that source flow
    // through the plugin so the dev scanner doesn't choke on those imports.
    optimizeDeps: {
      exclude: ['frappe-ui'],
    },
  }
})
