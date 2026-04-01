import { useEffect, useState, useCallback } from 'react';

const currentVersion = __APP_VERSION__;

/** Intervalo entre checagens de nova versão (ms). 1 min — ajuste se precisar menos carga em produção. */
const VERSION_CHECK_INTERVAL_MS = 60 * 1000;

async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const base = import.meta.env.BASE_URL;
    const r = await fetch(`${base}version.json`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = (await r.json()) as { v?: string };
    return typeof j.v === 'string' ? j.v : null;
  } catch {
    return null;
  }
}

/** Detecta deploy novo comparando version.json com o bundle atual; ao aplicar, limpa caches e recarrega. */
export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const check = useCallback(async () => {
    if (import.meta.env.DEV) return;
    const remote = await fetchRemoteVersion();
    if (remote && remote !== currentVersion) {
      setRemoteVersion(remote);
      setUpdateAvailable(true);
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    void check();
    const id = window.setInterval(() => void check(), VERSION_CHECK_INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [check]);

  const applyUpdate = useCallback(async () => {
    setApplying(true);
    try {
      // 1) Remove todos os SW — senão o Opera/outros podem continuar servindo HTML/JS antigo
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      if (regs?.length) {
        await Promise.all(regs.map((r) => r.unregister()));
      }
      // 2) Limpa Cache Storage (PWA)
      const keys = await caches.keys();
      if (keys.length) {
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* segue para o reload forçado */
    }
    // 3) Troca a URL com parâmetro único — força o navegador a buscar o documento na rede (cache HTTP agressivo)
    const url = new URL(window.location.href);
    url.searchParams.set('_appv', String(Date.now()));
    window.location.replace(url.toString());
  }, []);

  return {
    updateAvailable,
    remoteVersion,
    currentVersion,
    applying,
    applyUpdate,
  };
}
