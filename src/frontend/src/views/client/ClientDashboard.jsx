import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../App';
import { useToast, Toast } from '../../components/Toast';
import api from '../../services/api';
const fmt = (n) => `${Number(n||0).toLocaleString('fr-FR')} Ar`;

export default function ClientDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.clientGetCommandes().then(r => setCommandes(r.data||[])).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  const stats = {
    total: commandes.length,
    en_attente: commandes.filter(c=>c.statut==='en_attente').length,
    validees: commandes.filter(c=>c.statut==='validee').length,
    livrees: commandes.filter(c=>['livree','paye'].includes(c.statut)).length,
    total_ar: commandes.reduce((s,c)=>s+(c.montant_total||0),0),
  };

  const BADGE = { en_attente:'badge-warning', validee:'badge-info', livree:'badge-primary', paye:'badge-success' };
  const LABEL = { en_attente:'En attente', validee:'Validée', livree:'Livrée', paye:'Payée' };

  return (
    <div>
      <Toast toasts={toast.toasts} removeToast={toast.removeToast} />
      <div className="client-banner">
        <div className="client-banner-icon"></div>
        <div className="client-banner-text">
          <h3>Bienvenue, {user?.prenom} {user?.nom}</h3>
          <p>{user?.pharmacie_nom || 'Pharmacie'} — Province {user?.province_nom || ''}</p>
        </div>
      </div>
      <div className="page-header">
        <div>
          <div className="page-title">Mon espace</div>
          <div className="page-subtitle">Consultez vos commandes et le stock disponible</div>
        </div>
        <Link to="/client/stock" className="btn btn-primary">Commander des médicaments</Link>
      </div>

      <div className="stats-grid">
        {[
          { label:'Commandes totales', value:stats.total, type:'primary' },
          { label:'En attente de validation', value:stats.en_attente, type:'warning' },
          { label:'Validées / En livraison', value:stats.validees, type:'info' },
          { label:'Livrées / Payées', value:stats.livrees, type:'success' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.type}`}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Mes commandes récentes</span>
          <Link to="/client/commandes" className="btn btn-outline btn-sm">Voir tout</Link>
        </div>
        {loading ? <div className="loader"><div className="spinner"/></div> : (
          <div className="table-container" style={{border:'none',boxShadow:'none'}}>
            <table>
              <thead><tr><th>#</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
              <tbody>
                {commandes.length===0 ? (
                  <tr><td colSpan={4} style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>
                    Aucune commande — <Link to="/client/stock" style={{color:'var(--primary)'}}>Commander maintenant</Link>
                  </td></tr>
                ) : commandes.slice(0,8).map(c => (
                  <tr key={c.id}>
                    <td className="font-mono" style={{color:'var(--text-muted)'}}>#{String(c.id).padStart(5,'0')}</td>
                    <td style={{fontSize:'.82rem'}}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="font-mono" style={{fontWeight:600}}>{fmt(c.montant_total)}</td>
                    <td><span className={`badge ${BADGE[c.statut]||'badge-secondary'}`}>{LABEL[c.statut]||c.statut}</span></td>
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
