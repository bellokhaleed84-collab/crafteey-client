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
}

interface AuthContextType {
  user: User | null;
  client: ClientProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refetchClient: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchClient(firebaseUser: User) {
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/clients/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setClient(data.client);
      } else {
        setClient(null);
      }
    } catch (error) {
      console.error("Error fetching client profile:", error);
      setClient(null);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        await fetchClient(firebaseUser);
      } else {
        setClient(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setClient(null);
  };

  const getIdToken = async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  const refetchClient = async () => {
    if (auth.currentUser) await fetchClient(auth.currentUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, client, loading, signOut: handleSignOut, getIdToken, refetchClient }}
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
