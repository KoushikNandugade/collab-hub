import React, { createContext, useContext, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const cache = useQueryClient();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return (await api("/auth/me")).user;
      } catch (e) {
        if (e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 60000,
  });
  useEffect(() => {
    const expired = () => {
      cache.setQueryData(["session"], null);
      cache.removeQueries({
        predicate: (query) => query.queryKey[0] !== "session",
      });
    };
    window.addEventListener("collabhub:session-expired", expired);
    return () =>
      window.removeEventListener("collabhub:session-expired", expired);
  }, [cache]);
  const setUser = (user) => cache.setQueryData(["session"], user);
  return (
    <AuthContext.Provider
      value={{
        user: session.data,
        loading: session.isPending,
        error: session.error,
        setUser,
        async logout() {
          try {
            await api("/auth/logout", "POST");
          } catch (error) {
            if (error.status !== 401) throw error;
          }
          await cache.cancelQueries();
          setUser(null);
          cache.removeQueries({
            predicate: (query) => query.queryKey[0] !== "session",
          });
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
