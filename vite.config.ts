import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'emit-version-json',
      closeBundle() {
        writeFileSync(
          path.join(__dirname, 'dist', 'version.json'),
          JSON.stringify({ v: pkg.version }),
        )
      },
    },
  ],
  base: '/estoque/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
