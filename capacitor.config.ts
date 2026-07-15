import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fanfarra.app",
  appName: "Fanfarra",
  webDir: "dist/client",
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