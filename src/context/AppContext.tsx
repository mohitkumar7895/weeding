'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeMode, User } from '@/models';

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
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
