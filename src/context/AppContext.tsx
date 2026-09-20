'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeMode, User } from '@/models';
import { persistStaffSession } from '@/lib/roleHome';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setUser = (next: User | null) => {
    persistStaffSession(next);
    setUserState(next);
  };

  React.useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          persistStaffSession(null);
          setUserState(null);
        }
      })
      .catch((err) => console.error('Session restore error:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        theme,
        setTheme,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
