"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/clientApp";

export interface ClientProfile {
  _id: string;
  firebaseUid: string;
  name: string;
  email: string;
  phone: string;
  notifyEmail?: boolean;
  notifyPush?: boolean;
  language?: string;
}

interface AuthContextType {
  user: User | null;
  client: ClientProfile | null;
  loading: boolean;
  profileError: boolean;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refetchClient: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ProfileResult = { client: ClientProfile | null; error: boolean };

async function loadProfile(firebaseUser: User): Promise<ProfileResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/clients/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        return { client: data.client ?? null, error: false };
      }
      // A real "no profile yet" answer: send them to register.
      if (response.status === 404) return { client: null, error: false };
    } catch (error) {
      console.error("Error fetching client profile:", error);
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
  }
  // Slow or failed server: do NOT treat this as "no profile".
  return { client: null, error: true };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setClient(null);
        setProfileError(false);
        setLoading(false);
        return;
      }
      // Stay in "loading" until the profile is known, so nothing redirects early.
      setLoading(true);
      const result = await loadProfile(firebaseUser);
      setUser(firebaseUser);
      setClient(result.client);
      setProfileError(result.error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setClient(null);
    setProfileError(false);
  };

  const getIdToken = async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  const refetchClient = async () => {
    if (!auth.currentUser) return;
    const result = await loadProfile(auth.currentUser);
    setClient(result.client);
    setProfileError(result.error);
  };

  return (
    <AuthContext.Provider
      value={{ user, client, loading, profileError, signOut: handleSignOut, getIdToken, refetchClient }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};