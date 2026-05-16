// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('user').then(u => {
      if (u) {
        try {
          const parsed = JSON.parse(u);
          // Vérifier que l'utilisateur a un rôle valide
          if (parsed && parsed.role && ['gestionnaire', 'client'].includes(parsed.role)) {
            setUser(parsed);
            if (parsed._token) api.setToken(parsed._token);
          }
        } catch { AsyncStorage.removeItem('user'); }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const login = async (userData, token, role) => {
    const u = { ...userData, role, _token: token };
    setUser(u);
    await api.setToken(token);
    await AsyncStorage.setItem('user', JSON.stringify(u));
  };

  const logout = async () => {
    setUser(null);
    await api.setToken(null);
    await AsyncStorage.removeItem('user');
    await api.clearCache();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
