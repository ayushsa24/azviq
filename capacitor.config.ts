import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ayush.azviq',
  appName: 'Azviq',
  webDir: 'public',
  server: {
    url: 'https://azviq.in',
    cleartext: true,
    errorPath: 'offline.html'
  },
  android: {
    appendUserAgent: 'AzviqCapacitorApp'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false
    }
  }
};

export default config;
