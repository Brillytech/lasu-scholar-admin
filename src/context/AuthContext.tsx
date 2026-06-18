import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AdminProfile = {
  id: string;
  email: string | null;
  username: string | null;
  role: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: AdminProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin =
    profile?.role === "admin" || profile?.role === "super_admin";

  useEffect(() => {
    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function loadSession() {
    try {
      const { data } = await supabase.auth.getSession();

      setSession(data.session);
      setUser(data.session?.user || null);

      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, username, role")
      .eq("id", userId)
      .single();

    if (error) {
      setProfile(null);
      return;
    }

    setProfile(data);
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (!data.user) {
      throw new Error("Login failed.");
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, username, role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profileData) {
      await supabase.auth.signOut();
      throw new Error("Admin profile not found.");
    }

    if (
      profileData.role !== "admin" &&
      profileData.role !== "super_admin"
    ) {
      await supabase.auth.signOut();
      throw new Error("You are not allowed to access the admin dashboard.");
    }

    setSession(data.session);
    setUser(data.user);
    setProfile(profileData);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used inside AuthProvider");
  }

  return context;
}