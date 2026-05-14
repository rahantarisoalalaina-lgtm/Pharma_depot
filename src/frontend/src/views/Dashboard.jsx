import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useTranslation } from '../App';
import { useToast, Toast } from '../components/Toast';
import api from '../services/api';
const fmt = (n) => `${Number(n || 0).toLocaleString('fr-FR')} Ar`;

export default function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const toast = useToast();
  const [stats, setStats] = useState({ commandes: null, medicaments: null, livraisons: null });
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getCommandeStats(),
      api.getMedicamentStats(),
      api.getLivraisonStats(),
      api.getAlertes(),
    ]).then(([cmd, med, liv, alt]) => {
      setStats({ commandes: cmd.data, medicaments: med.data, livraisons: liv.data });
      setAlertes(alt.data || []);
      setFromCache(cmd.fromCache || med.fromCache);
    }).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  const heure = new Date().getHours();
  const salutFr = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';
  const salutMg = heure < 12 ? 'Manao ahoana' : heure < 18 ? 'Salama' : 'Mba mandry soa';
  const salut = lang === 'mg' ? salutMg : salutFr;
  const { commandes: cmd, medicaments: med } = stats;

  const alertesStock = alertes.filter(a => a.alerte_stock);
  const alertesExp   = alertes.filter(a => a.alerte_expiration);
  const beneficePotentiel = (med?.valeur_stock_vente || 0) - (med?.valeur_stock_achat || 0);
  const beneficeReel = cmd?.benefice_reel || 0;

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div>
      <Toast toasts={toast.toasts} removeToast={toast.removeToast} />

      {fromCache && (
        <div className="offline-banner" style={{ fontSize: '.8rem' }}>
          {t('donneesCache')} — {t('horsligne')}
        </div>
      )}

      {/* ── Bandeaux d'alerte ── */}
      {alertesStock.length > 0 && (
        <div className="alert-strip alert-strip-danger">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div className="alert-text">
            <strong>{alertesStock.length} {t('medicaments')}</strong>{' '}
            {lang === 'mg' ? 'mafy ny fitahirizana.' : 'en stock critique.'}
            <Link to="/medicaments" className="alert-link">{lang === 'mg' ? 'Hijery' : 'Voir'}</Link>
          </div>
        </div>
      )}

      {alertesExp.length > 0 && (
        <div className="alert-strip alert-strip-warning">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <div className="alert-text">
            <strong>{alertesExp.length} {t('medicaments')}</strong>{' '}
            {lang === 'mg' ? 'mety ho lany daty !' : 'expirent dans moins de 90 jours !'}
            <Link to="/medicaments" className="alert-link alert-link-warning">{lang === 'mg' ? 'Hijery' : 'Voir'}</Link>
          </div>
        </div>
      )}

      {/* ── En-tête ── */}
      <div className="page-header">
        <div>
          <div className="page-title">{salut}, {user?.prenom}</div>
          <div className="page-subtitle">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="province-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            {t('province')} {user?.province_nom}
          </div>
        </div>
        <Link to="/commandes" className="btn btn-primary">{t('nouvelleCommande')}</Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="stats-grid">
        {[
          { label: lang === 'mg' ? 'Baiko rehetra' : 'Commandes totales',          value: cmd?.total || 0,              type: 'primary' },
          { label: lang === 'mg' ? 'Vola niditra'  : "Chiffre d'affaires",          value: fmt(cmd?.chiffre_affaires),   type: 'success', mono: true },
          { label: lang === 'mg' ? 'Vola voaray'   : 'Montant encaissé',            value: fmt(cmd?.montant_encaisse),   type: 'info',    mono: true },
          { label: lang === 'mg' ? 'Tombony azo'   : 'Bénéfice réel',              value: fmt(beneficeReel),            type: 'success', mono: true },
          { label: lang === 'mg' ? 'Fanafody'      : 'Médicaments en stock',        value: med?.total || 0,              type: 'warning' },
          { label: lang === 'mg' ? 'Fampitandremana': 'Alertes stock + expiration', value: alertes.length,              type: 'danger'  },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.type}`}>
            <div className="stat-value" style={s.mono ? { fontSize: '1.1rem' } : {}}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Activité + Alertes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 4 }}>

        {/* Commandes */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">{lang === 'mg' ? "Asan'ny baiko" : 'Activité des commandes'}</span>
            <Link to="/commandes" className="btn btn-outline btn-sm">{lang === 'mg' ? 'Hijery rehetra' : 'Voir tout'}</Link>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { l: lang==='mg'?'Miandry':'En attente', v: cmd?.en_attente,  cls: 'mini-stat-warning' },
                { l: lang==='mg'?'Nanamafina':'Validées',v: cmd?.validees,    cls: 'mini-stat-info'    },
                { l: lang==='mg'?'Nalefa':'Livrées',      v: cmd?.livrees,    cls: 'mini-stat-success' },
                { l: lang==='mg'?'Naloa':'Payées',        v: cmd?.payees,     cls: 'mini-stat-primary' },
              ].map(({ l, v, cls }) => (
                <div key={l} className={`mini-stat ${cls}`}>
                  <div className="mini-stat-value">{v || 0}</div>
                  <div className="mini-stat-label">{l}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="benefice-block">
                <div className="benefice-block-label">{t('beneficePotentiel')}</div>
                <div className="benefice-block-value benefice-potential">{fmt(beneficePotentiel)}</div>
              </div>
              <div className="benefice-block">
                <div className="benefice-block-label">{t('beneficeReel')}</div>
                <div className="benefice-block-value benefice-real">{fmt(beneficeReel)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Alertes médicaments */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">{lang === 'mg' ? 'Fampitandremana' : 'Alertes'}</span>
            <span className="badge badge-danger">{alertes.length}</span>
          </div>
          <div className="card-body" style={{ padding: '12px' }}>
            {alertes.length === 0 ? (
              <div className="alerte-empty">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <div>{lang === 'mg' ? 'Tsara ny fitahirizana rehetra' : 'Tous les stocks sont bons'}</div>
              </div>
            ) : (
              <div className="alerte-list">
                {alertes.slice(0, 7).map(m => (
                  <div key={m.id} className={`alerte-item ${m.alerte_expiration ? 'alerte-item-exp' : 'alerte-item-stock'}`}>
                    <div className="alerte-item-body">
                      <div className="alerte-item-nom">{m.nom}</div>
                      <div className="alerte-item-detail">
                        {m.alerte_stock && `${t('stock')}: ${m.quantite_stock}`}
                        {m.alerte_expiration && ` · Exp: ${m.date_expiration?.slice(0, 10)}`}
                      </div>
                    </div>
                    <div className="alerte-item-badges">
                      {m.alerte_stock      && <span className="badge badge-danger"  style={{ fontSize: '.6rem' }}>{t('stock')}</span>}
                      {m.alerte_expiration && <span className="badge badge-warning" style={{ fontSize: '.6rem' }}>Exp.</span>}
                    </div>
                  </div>
                ))}
                {alertes.length > 7 && (
                  <Link to="/medicaments" className="alerte-more">
                    {lang === 'mg' ? `Hijery ny ${alertes.length-7} hafa` : `Voir les ${alertes.length-7} autres`} →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Valeur stock ── */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <span className="card-title">
            {lang === 'mg'
              ? `Sandan'ny fitahirizana — Faritany ${user?.province_nom}`
              : `Valeur du stock — Province ${user?.province_nom}`}
          </span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { l: t('prixAchat'),         v: fmt(med?.valeur_stock_achat), cls: 'stock-block-primary'  },
              { l: t('prixVente'),         v: fmt(med?.valeur_stock_vente), cls: 'stock-block-success'  },
              { l: t('beneficePotentiel'), v: fmt(beneficePotentiel),       cls: 'stock-block-warning'  },
              { l: t('beneficeReel'),      v: fmt(beneficeReel),            cls: 'stock-block-real'     },
            ].map(({ l, v, cls }) => (
              <div key={l} className={`stock-block ${cls}`}>
                <div className="stock-block-label">{l}</div>
                <div className="stock-block-value">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
