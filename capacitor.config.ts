import type { CapacitorConfig } from '@capacitor/cli';

// Native Hülle für iPhone/iPad (und Android) um dieselbe Web-App.
// Bau: npm run native:sync (setzt BASE_PATH=/ und bündelt das französische Modell)
const config: CapacitorConfig = {
  appId: 'de.wilskerwiesen.prononciation',
  appName: 'Prononciation',
  webDir: 'dist',
  backgroundColor: '#eaf4fc',
  ios: {
    contentInset: 'never',
    // Wiedergabe ohne Vollbild-Player, Mikrofon im WebView
    allowsLinkPreview: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
