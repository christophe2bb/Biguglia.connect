import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "fr.bigugliaconnect.app",
  appName: "Biguglia Connect",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
    backgroundColor: "#f7f8f5",
    preferredContentMode: "mobile",
  },
};
export default config;
