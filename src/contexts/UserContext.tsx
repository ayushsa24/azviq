"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User } from "@/types/user";
import { useSession } from "next-auth/react";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      // Prioritize session ID (for Google Auth), then localStorage (for manual login)
      // @ts-ignore
      const userId = session?.user?.id || localStorage.getItem("userId");
      
      if (!userId) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Sync ID to localStorage if it came from session
      if (session?.user && !localStorage.getItem("userId")) {
        // @ts-ignore
        localStorage.setItem("userId", session.user.id);
      }

      const res = await fetch("/api/profile", {
        headers: { "x-user-id": userId }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile, session]);

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser: fetchProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
