import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const VERSION_URL = `${import.meta.env.BASE_URL}version.json`

async function verificarNovaVersaoDeploy() {
  try {
    const r = await fetch(VERSION_URL, { cache: 'no-store' })
    if (!r.ok) return
    const j = (await r.json()) as { v?: string }
    if (j.v && j.v !== __APP_VERSION__) {
      const reg = await navigator.serviceWorker?.getRegistration?.()
      await reg?.update?.()
      window.location.reload()
    }
  } catch {
    /* rede off ou arquivo ainda não existe em deploys antigos */
  }
}

verificarNovaVersaoDeploy()
setInterval(verificarNovaVersaoDeploy, 3 * 60 * 1000)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') verificarNovaVersaoDeploy()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
