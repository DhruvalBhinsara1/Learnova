"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { onIdTokenChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getClientCsrfToken } from "@/lib/csrf";
import { useIsMounted } from "./useIsMounted";

/**
 * Cookie utility helpers for writing/deleting client cookies
 */
const setCookie = (name, value, days = 7) => {
  if (typeof window !== "undefined") {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    const isSecure = process.env.NODE_ENV === "production";
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  }
};

const syncAuthTokenCookie = async (token) => {
  if (!token || typeof window === "undefined") return;

  await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(getClientCsrfToken() ? { "X-CSRF-Token": getClientCsrfToken() } : {}),
    },
    credentials: "same-origin",
  }).catch((error) => {
    console.warn(
      "[useAuth] Failed to sync auth session cookie:",
      error?.message
    );
  });
};

const deleteCookie = (name) => {
  if (typeof window !== "undefined") {
    const isSecure = process.env.NODE_ENV === "production";
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  }
};

const clearAuthSessionCookie = async () => {
  if (typeof window === "undefined") return;

  await fetch("/api/auth/session", {
    method: "DELETE",
    headers: {
      ...(getClientCsrfToken() ? { "X-CSRF-Token": getClientCsrfToken() } : {}),
    },
    credentials: "same-origin",
  }).catch((error) => {
    console.warn(
      "[useAuth] Failed to clear auth session cookie:",
      error?.message
    );
  });
};

const clearAuthSensitiveCaches = async () => {
  const cacheStorage = globalThis?.caches;
  if (!cacheStorage) return;
  try {
    const cacheKeys = await cacheStorage.keys();
    const sensitive = [
      /auth/i,
      /user/i,
      /session/i,
      /token/i,
      /profile/i,
      /secure/i,
    ];
    const toDelete = cacheKeys.filter((key) =>
      sensitive.some((p) => p.test(key))
    );
    await Promise.all(toDelete.map((key) => cacheStorage.delete(key)));
  } catch {
    // ignore
  }
};

function createTokenRefreshManager(firebaseUser, onSessionExpired) {
  let refreshTimer = null;
  async function attemptRefresh() {
    try {
      const freshToken = await firebaseUser.getIdToken(true);
      await syncAuthTokenCookie(freshToken);
    } catch {
      if (onSessionExpired) onSessionExpired();
    }
  }
  function start() {
    stop();
    refreshTimer = setInterval(attemptRefresh, 55 * 60 * 1000);
  }
  function stop() {
    if (refreshTimer) clearInterval(refreshTimer);
  }
  return { start, stop, refreshNow: attemptRefresh };
}

export const useAuth = () => {
  const isMounted = useIsMounted();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const refreshManagerRef = useRef(null);
  const unsubscribeSnapshotRef = useRef(null);

  const handleSessionExpired = useCallback(() => {
    if (!isMounted()) return;
    setSessionExpired(true);
    setError("Your session has expired. Please sign in again.");
  }, [isMounted]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onIdTokenChanged(auth, async (firebaseUser) => {
      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
      if (refreshManagerRef.current) refreshManagerRef.current.stop();

      setSessionExpired(false);

      if (firebaseUser) {
        setUser(firebaseUser);
        refreshManagerRef.current = createTokenRefreshManager(
          firebaseUser,
          handleSessionExpired
        );
        refreshManagerRef.current.start();

        const userDocRef = doc(db, "users", firebaseUser.uid);
        unsubscribeSnapshotRef.current = onSnapshot(
          userDocRef,
          async (userDoc) => {
            if (userDoc.exists()) {
              setUserProfile(userDoc.data());
              const token = await firebaseUser.getIdToken();
              await syncAuthTokenCookie(token);
              const idTokenResult = await firebaseUser.getIdTokenResult();
              const claimsRole = idTokenResult.claims?.role;
              if (claimsRole) setCookie("userRole", claimsRole, 7);
            } else {
              setUserProfile(null);
              await clearAuthSessionCookie();
              deleteCookie("authToken");
              deleteCookie("userRole");
            }
            setLoading(false);
          },
          (snapError) => {
            console.error("Profile snapshot error:", snapError);
            setError("Failed to sync your profile data.");
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setUserProfile(null);
        await clearAuthSessionCookie();
        deleteCookie("authToken");
        deleteCookie("userRole");
        await clearAuthSensitiveCaches();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
      if (refreshManagerRef.current) refreshManagerRef.current.stop();
    };
  }, [handleSessionExpired]);

  const signOut = async () => {
    try {
      if (refreshManagerRef.current) refreshManagerRef.current.stop();
      await clearAuthSessionCookie();
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setSessionExpired(false);
      deleteCookie("userRole");
      await clearAuthSensitiveCaches();
    } catch (err) {
      setError(err.message);
    }
  };

  const forceTokenRefresh = useCallback(async () => {
    if (refreshManagerRef.current) await refreshManagerRef.current.refreshNow();
  }, []);

  return {
    user,
    userProfile,
    loading,
    error,
    signOut,
    forceTokenRefresh,
    isAuthenticated: !!user,
    hasProfile: !!userProfile,
    sessionExpired,
  };
};
