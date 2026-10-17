/**
 * Kleiner Hinweis „Als App installieren“ (Web-App, nicht in der nativen Hülle).
 * iPhone/iPad: Safari bietet keinen Installationsknopf, daher die Anleitung „Teilen → Zum Home-Bildschirm“.
 * Android/Chrome/Edge: der Browser liefert ein Installationsereignis, das ein Knopf auslöst.
 */
import { useEffect, useState } from 'react';

const KEY = 'installHintDismissed';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

function isAppleMobile(): boolean {
  // iPadOS meldet sich als Mac, hat aber Touch
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function InstallHint() {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const native = document.documentElement.classList.contains('native');
  if (dismissed || native || isStandalone() || (!prompt && !isAppleMobile())) return null;

  const close = () => {
    setDismissed(true);
    try { localStorage.setItem(KEY, '1'); } catch { /* egal */ }
  };

  return (
    <div className="banner info small" style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
      {prompt ? (
        <span style={{ flex: 1 }}>📲 Prononciation als App auf diesem Gerät ablegen: startet im Vollbild und funktioniert offline.</span>
      ) : (
        <span style={{ flex: 1 }}>📲 Als App ablegen: in Safari auf <b>Teilen</b> <span aria-hidden="true">(□↑)</span> tippen, dann <b>„Zum Home-Bildschirm“</b>. Danach startet Prononciation im Vollbild und funktioniert offline.</span>
      )}
      <span className="row" style={{ flexWrap: 'nowrap' }}>
        {prompt && <button className="btn primary" onClick={() => void prompt.prompt().then(close)}>Installieren</button>}
        <button className="btn ghost" onClick={close} aria-label="Hinweis schließen">✕</button>
      </span>
    </div>
  );
}
