import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  authClient,
  configured,
  errorText,
  request,
  setBearer,
  type Row,
} from "./client";

type AuthState = {
  session: Session | null;
  profile: Row | null;
  loading: boolean;
  profileError: string;
  reloadProfile: () => void;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [profile, setProfile] = useState<Row | null>(null);
  const [profileError, setProfileError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!configured) return;
    let active = true;
    let eventSeen = false;
    const accept = (next: Session | null) => {
      if (active) {
        setBearer(next?.access_token);
        setSession(next);
        setLoading(false);
      }
    };
    const { data } = authClient.auth.onAuthStateChange((event, next) => {
      eventSeen = true;
      accept(next);
      if (event === "PASSWORD_RECOVERY")
        window.history.replaceState(null, "", "/mot-de-passe?recovery=1");
    });
    void authClient.auth
      .getSession()
      .then(({ data, error }) => {
        if (!eventSeen) accept(error ? null : data.session);
      })
      .catch(() => {
        if (!eventSeen) accept(null);
      });
    const deadline = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 14000);
    return () => {
      active = false;
      clearTimeout(deadline);
      data.subscription.unsubscribe();
    };
  }, []);
  const userId = session?.user.id;
  useEffect(() => {
    setProfile(null);
    setProfileError("");
    if (!userId || !session) return;
    const controller = new AbortController();
    const load = async () => {
      const fields =
        "id,email,full_name,avatar_url,phone,role,status,home_sector_id,legal_consent,is_active,created_at";
      let rows = await request<Row[]>("profiles", {
        query: { select: fields, id: `eq.${userId}`, limit: 1 },
        signal: controller.signal,
      });
      if (!rows.length) {
        const result = await request<Row[]>("profiles", {
          method: "POST",
          body: {
            id: userId,
            email: session.user.email,
            full_name: String(session.user.user_metadata.full_name ?? ""),
            role: "resident",
            status: "active",
          },
          signal: controller.signal,
          prefer: "resolution=ignore-duplicates,return=representation",
        });
        rows = result.length
          ? result
          : await request<Row[]>("profiles", {
              query: { select: fields, id: `eq.${userId}` },
              signal: controller.signal,
            });
      }
      if (!controller.signal.aborted) {
        if (!rows[0]) throw new Error("Votre profil ne peut pas être chargé.");
        setProfile(rows[0]);
      }
    };
    void load().catch((e) => {
      if (!controller.signal.aborted) setProfileError(errorText(e));
    });
    return () => controller.abort();
  }, [userId, revision]);
  const reloadProfile = useCallback(() => setRevision((x) => x + 1), []);
  const signOut = async () => {
    const { error } = await authClient.auth.signOut({ scope: "local" });
    if (error) throw error;
    setBearer();
    setSession(null);
    setProfile(null);
  };
  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        profileError,
        reloadProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider manquant");
  return context;
}
export const isStaff = (profile: Row | null) =>
  ["admin", "moderator"].includes(String(profile?.role));
