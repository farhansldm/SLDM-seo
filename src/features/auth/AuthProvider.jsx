import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { bootstrapAgencyAdmin, getCurrentUser } from "./authApi.js";
import { supabase } from "./supabaseClient.js";

const AuthContext = createContext(null);
const PENDING_SIGNUP_KEY = "seo_agency_pending_signup";

function storePendingSignup(input) {
  window.localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(input));
}

function readPendingSignup(email) {
  try {
    const pending = JSON.parse(window.localStorage.getItem(PENDING_SIGNUP_KEY));
    return pending?.email?.toLowerCase() === email?.toLowerCase() ? pending : null;
  } catch {
    return null;
  }
}

function clearPendingSignup() {
  window.localStorage.removeItem(PENDING_SIGNUP_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const loadAppUser = useCallback(async (session) => {
    if (!session?.access_token) {
      setUser(null);
      return null;
    }
    setAuthError("");
    try {
      const profile = await getCurrentUser(session.access_token);
      setUser(profile.user);
      return profile.user;
    } catch (error) {
      const pending = readPendingSignup(session.user?.email);
      if (!pending) throw error;
      const profile = await bootstrapAgencyAdmin(
        { agencyName: pending.agencyName, fullName: pending.fullName },
        session.access_token,
      );
      clearPendingSignup();
      setUser(profile.user);
      return profile.user;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      try {
        if (error) throw error;
        if (mounted) await loadAppUser(data.session);
      } catch (error) {
        if (mounted) {
          setUser(null);
          setAuthError(error.message ?? "Your session could not be restored");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      setTimeout(async () => {
        try {
          if (mounted) await loadAppUser(session);
        } catch (error) {
          if (mounted) {
            setUser(null);
            setAuthError(error.message ?? "Your session could not be verified");
          }
        } finally {
          if (mounted) setIsLoading(false);
        }
      }, 0);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAppUser]);

  const signIn = useCallback(async ({ email, password }) => {
    setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await loadAppUser(data.session);
    return data.session;
  }, [loadAppUser]);

  const signUp = useCallback(async ({ agencyName, fullName, email, password }) => {
    setAuthError("");
    const pending = { agencyName, fullName, email };
    storePendingSignup(pending);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { agencyName, fullName } },
    });
    if (error) {
      clearPendingSignup();
      throw new Error(error.message);
    }
    if (!data.session) return { needsEmailConfirmation: true };
    const userProfile = await loadAppUser(data.session);
    return { user: userProfile };
  }, [loadAppUser]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    setUser(null);
    setAuthError("");
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    setIsPasswordRecovery(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await getCurrentUser();
    setUser(profile.user);
    return profile.user;
  }, []);

  const value = useMemo(() => ({
    user,
    authError,
    isAuthenticated: Boolean(user),
    isLoading,
    isPasswordRecovery,
    requestPasswordReset,
    refreshUser,
    signIn,
    signUp,
    signOut,
    updatePassword,
  }), [authError, isLoading, isPasswordRecovery, refreshUser, requestPasswordReset, signIn, signOut, signUp, updatePassword, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
