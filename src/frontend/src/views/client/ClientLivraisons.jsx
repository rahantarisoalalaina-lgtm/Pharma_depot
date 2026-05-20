import React, { useState, useEffect, useCallback } from 'react';
import { Toast, useToast } from '../../components/Toast';
import { useTranslation } from '../../App';
import api from '../../services/api';

const fmtDate = (s) =>
  s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
const fmtMoney = (n) => `${Number(n || 0).toLocaleString('fr-FR')} Ar`;

const STATUT_CONFIG = {
  planifie: { badge: 'badge-warning',   keyFr: 'planifiee',  keyMg: 'Nokarakaraina' },
  en_cours: { badge: 'badge-info',      keyFr: 'enCours',    keyMg: 'Eo am-piasana' },
  livre:    { badge: 'badge-success',   keyFr: 'livre',      keyMg: 'Nalefa' },
  echec:    { badge: 'badge-danger',    keyFr: 'echec',      keyMg: 'Tsy vita' },
};

export default function ClientLivraisons() {
  const toast              = useToast();
  const { t, lang }        = useTranslation();

  const [livraisons, setLivraisons] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [confirming, setConfirming] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.clientGetLivraisons()
      .then(r => setLivraisons(r.data || []))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConfirmer = async (liv) => {
    if (!window.confirm(t('confirmerReceptionMsg'))) return;
    setConfirming(liv.id);
    try {
      await api.clientConfirmerLivraison(liv.id);
      toast.success(t('livraisonConfirmee'));
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirming(null);
    }
  };

  const statutLabel = (statut) => {
    const cfg = STATUT_CONFIG[statut];
    if (!cfg) return statut;
    // Utilise t() pour les statuts connus, fallback MG littéral si clé absente
    const translated = t(cfg.keyFr);
    return translated !== cfg.keyFr ? translated : cfg.keyMg;
  };

  const nbPlanif  = livraisons.filter(l => l.statut === 'planifie').length;
  const nbEnCours = livraisons.filter(l => l.statut === 'en_cours').length;
  const nbLivrees = livraisons.filter(l => l.statut === 'livre').length;

  return (
    <div>
      <Toast toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="page-header">
        <div>
          <div className="page-title">{t('mesLivraisons')}</div>
          <div className="page-subtitle">
            {livraisons.length} {livraisons.length > 1 ? t('livraisons') : t('livraison')}
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        {[
          { label: t('livraisonsEnAttente'), value: nbPlanif,  color: 'var(--warning)', bg: 'var(--stat-warning-icon)' },
          { label: t('enCours'),             value: nbEnCours, color: 'var(--primary)', bg: 'var(--info-bg)'           },
          { label: t('livraisonsRecues'),    value: nbLivrees, color: 'var(--accent)',  bg: 'var(--badge-success-bg)'  },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px 20px', background: s.bg, borderRadius: 12, border: `1px solid ${s.color}33` }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bannière livraison en cours */}
      {nbEnCours > 0 && (
        <div style={{
          padding: '14px 18px', marginBottom: 20,
          background: 'var(--info-bg)', borderRadius: 10,
          border: '1.5px solid var(--primary)', fontSize: '0.88rem',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13" rx="1"/>
            <path d="M16 8h4l3 3v5h-7V8z"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
            {nbEnCours} {t('banniereLivraison')}
          </span>
        </div>
      )}

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('dateLivraison')}</th>
                <th>{t('totalVentes')}</th>
                <th>{t('distanceTotale')}</th>
                <th>{t('statut')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {livraisons.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    {t('aucuneLivraison')}
                  </td>
                </tr>
              ) : livraisons.map(liv => {
                const cfg       = STATUT_CONFIG[liv.statut] || { badge: 'badge-secondary' };
                const isEnCours = liv.statut === 'en_cours';
                return (
                  <tr key={liv.id}>
                    <td>
                      <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                        #{String(liv.id).padStart(4, '0')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {fmtDate(liv.date_livraison)}
                    </td>
                    <td className="font-mono" style={{ color: 'var(--accent)' }}>
                      {fmtMoney(liv.montant_total)}
                    </td>
                    <td>
                      {liv.distance_totale
                        ? <span className="font-mono" style={{ color: 'var(--primary)' }}>{Number(liv.distance_totale).toFixed(2)} km</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      <span className={`badge ${cfg.badge}`}>{statutLabel(liv.statut)}</span>
                    </td>
                    <td>
                      {isEnCours && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleConfirmer(liv)}
                          disabled={confirming === liv.id}
                          style={{ fontWeight: 600 }}
                        >
                          {confirming === liv.id ? `${t('chargement')}` : t('recu')}
                        </button>
                      )}
                      {liv.statut === 'planifie' && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {t('enAttenteDepart')}
                        </span>
                      )}
                      {liv.statut === 'livre' && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
                          ✓ {t('confirmerReception')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}