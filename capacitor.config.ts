import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kazpian.swiftsecurethreads',
  appName: 'Swift Secure Threads',
  webDir: 'dist', // This is the directory where your `npm run build` output goes
  server: {
    androidScheme: 'https'
  }
};

export default config;