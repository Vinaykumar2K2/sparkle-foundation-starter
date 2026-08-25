import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  displayName: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  displayName: "",
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      setDisplayName("");
      return;
    }
    let active = true;
    void (async () => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
      ]);
      if (!active) return;
      setIsAdmin(Boolean(roles?.some((r) => r.role === "admin")));
      setDisplayName(profile?.display_name ?? "");
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isAdmin,
        displayName,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
