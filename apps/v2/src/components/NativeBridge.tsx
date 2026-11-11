import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { authClient, safeLocalPath } from "../lib/client";

export function authRedirect(path: string): string {
  if (!Capacitor.isNativePlatform()) return window.location.origin + path;
  return (
    "fr.bigugliaconnect.app://auth/callback?next=" +
    encodeURIComponent(path === "/auth/callback" ? "/dashboard" : path)
  );
}

export default function NativeBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;
    const subscriptions: { remove: () => Promise<void> }[] = [];
    void import("@capacitor/app").then(async ({ App }) => {
      const urls = await App.addListener("appUrlOpen", ({ url }) => {
        let incoming: URL;
        try {
          incoming = new URL(url);
        } catch {
          return;
        }
        if (
          incoming.protocol !== "fr.bigugliaconnect.app:" ||
          incoming.hostname !== "auth" ||
          incoming.pathname !== "/callback"
        )
          return;
        const code = incoming.searchParams.get("code");
        if (!code) return;
        void authClient.auth.exchangeCodeForSession(code).then(({ error }) => {
          if (active)
            navigate(
              error
                ? "/connexion"
                : safeLocalPath(
                    incoming.searchParams.get("next"),
                    "/dashboard",
                  ),
              { replace: true },
            );
        });
      });
      if (active) subscriptions.push(urls);
      else await urls.remove();
      const appState = await App.addListener(
        "appStateChange",
        ({ isActive }) => {
          if (isActive) void authClient.auth.startAutoRefresh();
          else void authClient.auth.stopAutoRefresh();
        },
      );
      if (active) subscriptions.push(appState);
      else await appState.remove();
    });
    return () => {
      active = false;
      for (const subscription of subscriptions) void subscription.remove();
    };
  }, [navigate]);
  return null;
}
