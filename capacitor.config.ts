import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.clipsapp.app",
  appName: "ClipsApp",
  webDir: "capacitor-assets",
  server: {
    url: "https://clipsapp.app",
    cleartext: false,
    allowNavigation: ["clipsapp.app"],
  },
};

export default config;
