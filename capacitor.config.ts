import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.GeoNotifyApp',
  appName: 'GeoNotifyApp',
  webDir: 'dist',
  server: {
    url: 'http://192.168.68.100:4200', // Replace with your actual local IP
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  },
  plugins: {
    Geolocation: {
      enabled: true
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
