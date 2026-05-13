import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './services/api';
import { translations } from './i18n/translations';
import AuthView from './views/AuthView';
import Dashboard from './views/Dashboard';
import MedicamentView from './views/MedicamentView';
import PharmacieView from './views/PharmacieView';
import CommandeView from './views/CommandeView';
import LivraisonView from './views/LivraisonView';
import ClientDashboard from './views/client/ClientDashboard';
import ClientStock from './views/client/ClientStock';
import ClientCommandes from './views/client/ClientCommandes';
import Sidebar from './components/Sidebar';
import './App.css';

export const AuthContext = createContext(null);
export const LangContext = createContext({ lang: 'fr', toggleLang: () => {} });
export const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });
export const useAuth = () => useContext(AuthContext);
export const useLang = () => useContext(LangContext);
export const useTheme = () => useContext(ThemeContext);
export const useTranslation = () => {
  const { lang } = useContext(LangContext);
  const t = (key) => translations[lang]?.[key] || translations.fr[key] || key;
  return { t, lang };
};

function loadUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u || !u.role || !['gestionnaire', 'client'].includes(u.role)) {
      localStorage.removeItem('user'); localStorage.removeItem('token'); return null;
    }
    return u;
  } catch { return null; }
}

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {children}
      </main>
    </div>
  );
}

function PrivateRoute({ children, requireRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requireRole && user.role !== requireRole) {
    return <Navigate to={user.role === 'client' ? '/client' : '/'} replace />;
  }
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  const [user, setUser] = useState(loadUser);
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'fr');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.setToken(token);
  }, []);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const login = (userData, token) => {
    const safeUser = { ...userData };
    if (!safeUser.role) safeUser.role = 'gestionnaire';
    // Pour les pharmacies (clients): prenom = contact_nom ou nom
    if (safeUser.role === 'client' && !safeUser.prenom) {
      safeUser.prenom = safeUser.nom || safeUser.pharmacie_nom || 'Pharmacie';
    }
    setUser(safeUser);
    api.setToken(token);
    localStorage.setItem('user', JSON.stringify(safeUser));
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null); api.setToken(null);
    localStorage.removeItem('user'); localStorage.removeItem('token');
    api.clearCache();
  };

  const toggleLang = () => {
    const n = lang === 'fr' ? 'mg' : 'fr';
    setLang(n); localStorage.setItem('lang', n);
  };

  const toggleTheme = () => {
    const n = theme === 'light' ? 'dark' : 'light';
    setTheme(n); localStorage.setItem('theme', n);
  };

  const isClient = user?.role === 'client';
  const defaultHome = isClient ? '/client' : '/';

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <LangContext.Provider value={{ lang, toggleLang }}>
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          <BrowserRouter>
            {!isOnline && (
              <div className="offline-banner">
                Mode hors ligne — Données mises en cache disponibles
              </div>
            )}
            <Routes>
              <Route path="/login" element={user ? <Navigate to={defaultHome} replace /> : <AuthView />} />
              <Route path="/" element={<PrivateRoute requireRole="gestionnaire"><Dashboard /></PrivateRoute>} />
              <Route path="/medicaments" element={<PrivateRoute requireRole="gestionnaire"><MedicamentView /></PrivateRoute>} />
              <Route path="/pharmacies" element={<PrivateRoute requireRole="gestionnaire"><PharmacieView /></PrivateRoute>} />
              <Route path="/commandes" element={<PrivateRoute requireRole="gestionnaire"><CommandeView /></PrivateRoute>} />
              <Route path="/livraisons" element={<PrivateRoute requireRole="gestionnaire"><LivraisonView /></PrivateRoute>} />
              <Route path="/client" element={<PrivateRoute requireRole="client"><ClientDashboard /></PrivateRoute>} />
              <Route path="/client/stock" element={<PrivateRoute requireRole="client"><ClientStock /></PrivateRoute>} />
              <Route path="/client/commandes" element={<PrivateRoute requireRole="client"><ClientCommandes /></PrivateRoute>} />
              <Route path="*" element={<Navigate to={user ? defaultHome : '/login'} replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeContext.Provider>
      </LangContext.Provider>
    </AuthContext.Provider>
  );
}
