import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'be.servigo.app',
  appName: 'ServiGo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Configuration des plugins Capacitor
    App: {
      launchShowDuration: 0,
    },
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: false,
    backgroundColor: '#ffffff',
  },
};

export default config;
