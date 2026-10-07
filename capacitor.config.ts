import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crafteey.client',
  appName: 'Crafteey',
  webDir: 'public',
  backgroundColor: '#4002AF',
  server: {
    url: 'https://crafteey-client.vercel.app',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      // Hidden early by the web app once its own splash is showing.
      // 4s is only a safety net in case the web app can't load.
      launchAutoHide: true,
      launchShowDuration: 4000,
      backgroundColor: '#4002AF',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP'
    }
  }
};

export default config;