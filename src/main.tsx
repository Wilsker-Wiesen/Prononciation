import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { setAudioSession } from './audio/audioSession';
import { installAudioUnlock } from './audio/player';
import './ui/styles.css';

// In der nativen App (iPhone/iPad/Android) liefert die Hülle die Dateien; kein Service Worker.
if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true });
  // Daten (Fortschritt, Aufnahmen, Modell) vor automatischem Löschen durch den Browser schützen
  void navigator.storage?.persist?.().catch(() => undefined);
} else {
  document.documentElement.classList.add('native');
}
setAudioSession('playback');
installAudioUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
