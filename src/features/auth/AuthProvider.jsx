import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { bootstrapAgencyAdmin, getCurrentUser } from "./authApi.js";
import { supabase } from "./supabaseClient.js";

const AuthContext = createContext(null);
const PENDING_SIGNUP_KEY = "seo_agency_pending_signup";

function storePendingSignup(input) {
  window.localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(input));
}

function readPendingSignup(email) {
  const value = window.localStorage.getItem(PENDING_SIGNUP_KEY);
  if (!value) return null;
  const pending = JSON.parse(value);
  return pending.email?.toLowerCase() === email?.toLowerCase() ? pending : null;
}

function clearPendingSignup() {
  window.localStorage.removeItem(PENDING_SIGNUP_KEY);
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAppUser = useCallback(async (session) => {
    if (!session?.access_token) {
      setAccessToken(null);
      setUser(null);
      return null;
    }

    setAccessToken(session.access_token);
    try {
      const profile = await getCurrentUser(session.access_token);
      setUser(profile.user);
      return profile.user;
    } catch (error) {
      const pending = readPendingSignup(session.user?.email);
      if (!pending) throw error;

      const profile = await bootstrapAgencyAdmin(session.access_token, {
        agencyName: pending.agencyName,
        fullName: pending.fullName,
      });
      clearPendingSignup();
      setUser(profile.user);
      return profile.user;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      try {
        if (isMounted) await loadAppUser(data.session);
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        await loadAppUser(session);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAppUser]);

  const signIn = useCallback(
    async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      await loadAppUser(data.session);
      return data.session;
    },
    [loadAppUser],
  );

  const signUp = useCallback(async ({ agencyName, fullName, email, password }) => {
    const signup = { agencyName, fullName, email };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { agencyName, fullName } },
    });
    if (error) throw new Error(error.message);

    if (!data.session?.access_token) {
      storePendingSignup(signup);
      return { needsEmailConfirmation: true };
    }

    const profile = await bootstrapAgencyAdmin(data.session.access_token, { agencyName, fullName });
    clearPendingSignup();
    setAccessToken(data.session.access_token);
    setUser(profile.user);
    return profile;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      user,
      isAuthenticated: Boolean(accessToken && user),
      isLoading,
      signIn,
      signUp,
      signOut,
    }),
    [accessToken, isLoading, signIn, signOut, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
