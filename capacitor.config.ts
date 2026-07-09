import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fanfarra.app",
  appName: "Fanfarra",
  webDir: "dist/client",
  server: {
    url: "http://192.168.1.67:8080",
    cleartext: true,
  },
 android: {
    allowMixedContent: true,
  },
  plugins: {
    SystemBars: {
      insetsHandling: "css",
    },
  },
};

export default config;