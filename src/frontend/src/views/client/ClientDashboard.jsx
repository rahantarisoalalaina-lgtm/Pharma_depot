import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useTranslation } from '../../App';
import { useToast, Toast } from '../../components/Toast';
import api from '../../services/api';

const fmt = (n) => `${Number(n||0).toLocaleString('fr-FR')} Ar`;

export default function ClientDashboard() {
  const { user }     = useAuth();
  const { t }        = useTranslation();
  const toast        = useToast();
  const [commandes, setCommandes] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    api.clientGetCommandes()
      .then(r => setCommandes(r.data || []))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total:      commandes.length,
    en_attente: commandes.filter(c => c.statut === 'en_attente').length,
    validees:   commandes.filter(c => c.statut === 'validee').length,
    livrees:    commandes.filter(c => ['livree','paye'].includes(c.statut)).length,
  };

  const BADGE = { en_attente:'badge-warning', validee:'badge-info', livree:'badge-primary', paye:'badge-success' };
  const LABEL = () => ({
    en_attente: t('labelEnAttente'),
    validee:    t('labelValidee'),
    livree:     t('labelLivree'),
    paye:       t('labelPayee'),
  });

  return (
    <div>
      <Toast toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="client-banner">
        <div className="client-banner-icon"></div>
        <div className="client-banner-text">
          <h3>{t('bienvenue')}, {user?.prenom} {user?.nom}</h3>
          <p>{user?.pharmacie_nom || t('pharmacies')} — {t('province')} {user?.province_nom || ''}</p>
        </div>
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">{t('monEspace')}</div>
          <div className="page-subtitle">{t('monEspaceSub')}</div>
        </div>
        <Link to="/client/stock" className="btn btn-primary">{t('commanderMedicaments')}</Link>
      </div>

      <div className="stats-grid">
        {[
          { label: t('commandesTotales'),    value: stats.total,      type: 'primary' },
          { label: t('enAttenteValidation'), value: stats.en_attente, type: 'warning' },
          { label: t('valideesEnLivraison'), value: stats.validees,   type: 'info'    },
          { label: t('livreesPayees'),       value: stats.livrees,    type: 'success' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.type}`}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">{t('mesCommandesRecentes')}</span>
          <Link to="/client/commandes" className="btn btn-outline btn-sm">{t('voirTout')}</Link>
        </div>
        {loading ? <div className="loader"><div className="spinner"/></div> : (
          <div className="table-container" style={{border:'none',boxShadow:'none'}}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('date')}</th>
                  <th>{t('montantTotal')}</th>
                  <th>{t('statut')}</th>
                </tr>
              </thead>
              <tbody>
                {commandes.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>
                      {t('aucuneCommande')} —{' '}
                      <Link to="/client/stock" style={{color:'var(--primary)'}}>{t('commanderMaintenant')}</Link>
                    </td>
                  </tr>
                ) : commandes.slice(0, 8).map(c => (
                  <tr key={c.id}>
                    <td className="font-mono" style={{color:'var(--text-muted)'}}>#{String(c.id).padStart(5,'0')}</td>
                    <td style={{fontSize:'.82rem'}}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="font-mono" style={{fontWeight:600}}>{fmt(c.montant_total)}</td>
                    <td>
                      <span className={`badge ${BADGE[c.statut]||'badge-secondary'}`}>
                        {LABEL()[c.statut] || c.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}