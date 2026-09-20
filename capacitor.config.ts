import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crafteey.client',
  appName: 'Crafteey',
  webDir: 'public',
  server: {
    url: 'https://crafteey-client.vercel.app',
    cleartext: false
  }
};

export default config;