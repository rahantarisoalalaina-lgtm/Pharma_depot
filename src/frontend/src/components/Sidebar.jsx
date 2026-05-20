import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useLang, useTheme, useTranslation } from '../App';
import api from '../services/api';

const Icon = ({ name }) => {
  const icons = {
    dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    medicaments: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 7.5v-3a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><rect x="2" y="7.5" width="20" height="13" rx="2"/><path d="M12 12v4M10 14h4"/></svg>,
    pharmacies: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    commandes: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 12h6M9 16h4"/></svg>,
    livraisons: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    stock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    mescommandes: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
    logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    globe: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    moon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    sun: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  };
  return icons[name] || null;
};

export default function Sidebar({ isOpen, onToggle }) {
  const { user, logout } = useAuth();
  const { lang, toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);
  const isClient = user?.role === 'client';

  useEffect(() => {
    if (!isClient) api.getAlertes().then(r => setAlertCount(r.data?.length||0)).catch(()=>{});
  }, [isClient]);

  const gestionnaireNav = [
    { to:'/', label: t('dashboard'), icon:'dashboard', end:true },
    { to:'/medicaments', label: t('medicaments'), icon:'medicaments', badge: alertCount||null },
    { to:'/pharmacies', label: t('pharmacies'), icon:'pharmacies' },
    { to:'/commandes', label: t('commandes'), icon:'commandes' },
    { to:'/livraisons', label: t('livraisons'), icon:'livraisons' },
  ];
  const clientNav = [
    { to:'/client', label: lang === 'fr' ? 'Mon espace' : 'Ny efitrano', icon:'dashboard', end:true },
    { to:'/client/stock', label: lang === 'fr' ? 'Stocks disponibles' : 'Fitahirizana misy', icon:'stock' },
    { to:'/client/commandes', label: lang === 'fr' ? 'Mes commandes' : 'Ny baiko', icon:'mescommandes' },
    { to:'/client/livraisons', label: lang === 'fr' ? 'Mes livraisons' : 'Ny fandefasana', icon:'livraisons' },
  ];
  const navItems = isClient ? clientNav : gestionnaireNav;
  const initials = user ? `${(user.prenom||'')[0]||''}${(user.nom||'')[0]||''}`.toUpperCase() : 'U';

  const themeLabelFr = theme === 'dark' ? 'Mode sombre' : 'Mode clair';
  const themeLabelMg = theme === 'dark' ? 'Maizina' : 'Mazava';
  const themeLabel = lang === 'fr' ? themeLabelFr : themeLabelMg;

  return (
    <nav className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={onToggle}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div className="sidebar-header">
        <div className="sidebar-logo">{isClient ? 'P' : 'D'}</div>
        {isOpen && (
          <div className="sidebar-title">
            <span>
              {isClient
                ? (lang === 'fr' ? 'Espace Client' : 'Efitrano Client')
                : (lang === 'fr' ? 'Depot Pharma' : 'Fitahirizana Fanafody')}
            </span>
            <small>
              {isClient
                ? user?.pharmacie_nom || 'Pharmacie'
                : `${lang === 'fr' ? 'Province' : 'Faritany'} ${user?.province_nom||''}`}
            </small>
          </div>
        )}
      </div>
      <div className="sidebar-nav">
        {isOpen && <div className="nav-section">{lang === 'fr' ? 'Navigation' : 'Fikarohana'}</div>}
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({isActive}) => `nav-item ${isActive?'active':''}`}>
            <span className="nav-icon"><Icon name={item.icon} /></span>
            {isOpen && <span className="nav-label">{item.label}</span>}
            {isOpen && item.badge && <span className="nav-badge">{item.badge}</span>}
          </NavLink>
        ))}
      </div>
      <div className="sidebar-footer">
        {isOpen && (
          <>
            <div className="theme-toggle">
              <div style={{display:'flex',alignItems:'center',gap:8,color:'rgba(255,255,255,.6)'}}>
                <Icon name={theme==='dark'?'moon':'sun'} />
                <span style={{fontSize:'.8rem'}}>{themeLabel}</span>
              </div>
              <button className={`toggle-switch ${theme==='dark'?'on':''}`} onClick={toggleTheme} />
            </div>
            <button onClick={toggleLang} className="nav-item" style={{marginBottom:4}}>
              <span className="nav-icon"><Icon name="globe" /></span>
              <span className="nav-label">{lang==='fr'?'Malagasy':'Français'}</span>
            </button>
          </>
        )}
        <div className="sidebar-user">
          <div className={`user-avatar ${isClient?'client':'gestionnaire'}`}>{initials}</div>
          {isOpen && (
            <div className="user-info">
              <div className="user-name">{user?.prenom} {user?.nom}</div>
              <span className={`user-role ${isClient?'client':'gestionnaire'}`}>
                {isClient
                  ? (lang === 'fr' ? 'Client pharmacie' : 'Mpanjifa fanafody')
                  : (lang === 'fr' ? 'Gestionnaire' : 'Mpitantana')}
              </span>
            </div>
          )}
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} className="nav-item" style={{marginTop:6}}>
          <span className="nav-icon"><Icon name="logout" /></span>
          {isOpen && <span className="nav-label">{t('logout')}</span>}
        </button>
      </div>
    </nav>
  );
}