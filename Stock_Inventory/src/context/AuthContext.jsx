import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY_TOKEN = 'token';
const STORAGE_KEY_USER = 'auth_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN) || null;
  });

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER) || sessionStorage.getItem(STORAGE_KEY_USER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse stored user:', e);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(() => {
    const storedToken = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN)) : null;
    const storedUser = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY_USER) || sessionStorage.getItem(STORAGE_KEY_USER)) : null;
    return Boolean(storedToken && !storedUser);
  });

  // Restore or validate user/token on load
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEY_USER);

    if (storedToken && !token) {
      setToken(storedToken);
    }
    if (storedUser && !user) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.warn('Error reading stored user from localStorage:', e);
      }
    }
    setIsLoading(false);
  }, [token, user]);

  const login = (userData, tokenValue) => {
    const safeUser = userData ? {
      fullName: userData.fullName || userData.name || userData.username || 'User',
      email: userData.email || '',
      username: userData.username || '',
      role: userData.role || 'USER',
      ...userData,
    } : null;

    setUser(safeUser);
    setToken(tokenValue || null);

    if (tokenValue) {
      localStorage.setItem(STORAGE_KEY_TOKEN, tokenValue);
    }
    if (safeUser) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(safeUser));
    }
  };

  const updateUser = (userData) => {
    setUser((prev) => {
      const safe = prev ? { ...prev, ...userData } : userData;
      if (safe) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(safe));
      }
      return safe;
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_USER);
  };

  // Development helper on window for manual verification
  if (typeof window !== 'undefined') {
    window.__auth = {
      user,
      token,
      login,
      updateUser,
      logout,
    };
  }

  const value = {
    user,
    token,
    isLoading,
    login,
    updateUser,
    logout,
    isAuthenticated: Boolean(user && token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
