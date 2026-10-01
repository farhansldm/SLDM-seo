import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getCurrentUser, signIn as loginRequest, signOut as logoutRequest, signUp as signupRequest } from "./authApi.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const profile = await getCurrentUser();
    setUser(profile.user);
    return profile.user;
  }, []);

  useEffect(() => {
    let isMounted = true;
    getCurrentUser()
      .then((profile) => { if (isMounted) setUser(profile.user); })
      .catch(() => { if (isMounted) setUser(null); })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, []);

  const signIn = useCallback(async (input) => {
    const profile = await loginRequest(input);
    setUser(profile.user);
    return profile;
  }, []);

  const signUp = useCallback(async (input) => {
    const profile = await signupRequest(input);
    setUser(profile.user);
    return profile;
  }, []);

  const signOut = useCallback(async () => {
    try { await logoutRequest(); } finally { setUser(null); }
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    refreshUser,
    signIn,
    signUp,
    signOut,
  }), [isLoading, refreshUser, signIn, signOut, signUp, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
