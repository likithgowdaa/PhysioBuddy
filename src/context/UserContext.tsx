// ============================================================
// UserContext.tsx — React Context wrapper for PhysioBuddy user state
// ============================================================

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getState, subscribe, type UserInfo } from "../utils/store";

interface UserContextValue {
  user: UserInfo | null;
}

const UserContext = createContext<UserContextValue>({ user: null });

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => getState().user);

  useEffect(() => {
    // Sync whenever the store changes
    const unsubscribe = subscribe(() => {
      setUser(getState().user);
    });
    return unsubscribe;
  }, []);

  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  return useContext(UserContext);
}
