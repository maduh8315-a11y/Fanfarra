import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fanfarra.app",
  appName: "Fanfarra",
  webDir: "dist/client", // continua obrigatório pro cap sync não reclamar, mas não é usado em runtime
  server: {
    url: "https://fanfarra-backend.fanfarra.workers.dev/", 
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SystemBars: {
      insetsHandling: "css",
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
  },
};

export default config;