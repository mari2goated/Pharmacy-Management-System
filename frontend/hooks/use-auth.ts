// hooks/use-auth.ts
import { useState, useEffect } from 'react';
import { User } from '@/types';
import { getUser, isAuthenticated, clearAuth } from '@/lib/auth';

export const useAuth = () => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getUser();
    setUserState(storedUser);
    setLoading(false);
  }, []);

  const login = (userData: User, token: string) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUserState(userData);
  };

  const logout = () => {
    clearAuth();
    setUserState(null);
    window.location.href = '/login';
  };

  return {
    user,
    loading,
    isAuthenticated: isAuthenticated(),
    isAdmin: user?.role === 'admin',
    login,
    logout,
  };
};