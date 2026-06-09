import { useEffect, useMemo, useState } from 'react';
import api, { clearSession } from '../api';
import AuthContext from './auth-context';

function readSavedUser() {
  const savedUser = localStorage.getItem('user');
  if (!savedUser) return null;
  try {
    return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSavedUser);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me/');
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  useEffect(() => {
    let ignore = false;

    const hydrate = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        if (!ignore) setLoading(false);
        return;
      }

      try {
        const data = await refreshUser();
        if (!ignore) setUser(data);
      } catch {
        clearSession();
        if (!ignore) setUser(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void hydrate();
    return () => { ignore = true; };
  }, []);

  const login = async (username, password) => {
    try {
      const { data } = await api.post('/auth/login/', { username, password });
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.detail || 'Identifiant ou mot de passe incorrect.',
      };
    }
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    login,
    logout,
    loading,
    refreshUser,
    isAuthenticated: Boolean(user),
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
