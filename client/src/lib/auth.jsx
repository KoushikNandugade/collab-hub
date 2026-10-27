import React, { createContext, useContext } from "react";
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
  const setUser = (user) => cache.setQueryData(["session"], user);
  return (
    <AuthContext.Provider
      value={{
        user: session.data,
        loading: session.isPending,
        error: session.error,
        setUser,
        async logout() {
          await api("/auth/logout", "POST");
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
