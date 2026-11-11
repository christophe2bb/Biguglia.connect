import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
createRoot(document.getElementById("root")!).render(<App />);

if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  window.location.protocol === "https:"
) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
