import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.clipsads.app",
  appName: "ClipsAds",
  webDir: "capacitor-assets",
  server: {
    url: "https://clipsads-prueba-2.vercel.app",
    cleartext: false,
    allowNavigation: ["clipsads-prueba-2.vercel.app"],
  },
};

export default config;
