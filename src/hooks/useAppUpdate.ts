import { useEffect, useState, useCallback } from 'react';

const currentVersion = __APP_VERSION__;

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
    const id = window.setInterval(() => void check(), 5 * 60 * 1000);
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
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      /* ainda assim recarrega */
    }
    window.location.reload();
  }, []);

  return {
    updateAvailable,
    remoteVersion,
    currentVersion,
    applying,
    applyUpdate,
  };
}
