import React, { useState, useEffect } from 'react';
import { useToast, Toast } from '../../components/Toast';
import Facture from '../../components/Facture';
import api from '../../services/api';
const fmt = (n) => `${Number(n||0).toLocaleString('fr-FR')} Ar`;
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-';
const BADGE = { en_attente:'badge-warning', validee:'badge-info', livree:'badge-primary', paye:'badge-success' };
const LABEL = { en_attente:'En attente', validee:'Validée — En cours de livraison', livree:'Livrée', paye:'Payée' };

export default function ClientCommandes() {
  const toast = useToast();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFacture, setShowFacture] = useState(null);

  useEffect(() => {
    api.clientGetCommandes().then(r => setCommandes(r.data||[])).catch(e=>toast.error(e.message)).finally(()=>setLoading(false));
  }, []);

  const openFacture = async (cmd) => {
    if (!['validee','livree','paye'].includes(cmd.statut)) { toast.info('La facture sera disponible une fois la commande validée'); return; }
    try { const r = await api.clientGetCommandeDetail(cmd.id); setShowFacture(r.data); }
    catch(e) { toast.error(e.message); }
  };

  return (
    <div>
      <Toast toasts={toast.toasts} removeToast={toast.removeToast} />
      <div className="page-header">
        <div>
          <div className="page-title">Mes commandes</div>
          <div className="page-subtitle">{commandes.length} commande{commandes.length>1?'s':''} au total</div>
        </div>
      </div>

      {loading ? <div className="loader"><div className="spinner"/></div> : (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {commandes.length===0 ? (
            <div className="card">
              <div className="card-body" style={{textAlign:'center',padding:40}}>
                <div style={{fontSize:'2rem',marginBottom:12}}>📋</div>
                <div style={{fontWeight:600,color:'var(--text-secondary)'}}>Aucune commande pour le moment</div>
                <div style={{color:'var(--text-muted)',fontSize:'.85rem',marginTop:6}}>Consultez le stock et passez votre première commande</div>
              </div>
            </div>
          ) : commandes.map(cmd => {
            const reste = (cmd.montant_total||0) - (cmd.montant_paye||0);
            const canViewFacture = ['validee','livree','paye'].includes(cmd.statut);
            return (
              <div key={cmd.id} className="card">
                <div className="card-header">
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <span className="font-mono" style={{color:'var(--text-muted)',fontSize:'.84rem'}}>#{String(cmd.id).padStart(5,'0')}</span>
                    <span className={`badge ${BADGE[cmd.statut]||'badge-secondary'}`}>{LABEL[cmd.statut]||cmd.statut}</span>
                    {cmd.urgence===1 && <span className="badge badge-danger">Urgente</span>}
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    {canViewFacture && (
                      <button className="btn btn-outline btn-sm" onClick={()=>openFacture(cmd)}>
                        Voir le bon de commande
                      </button>
                    )}
                  </div>
                </div>
                <div className="card-body" style={{padding:'16px 22px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20}}>
                    <div>
                      <div style={{fontSize:'.73rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:4}}>Date</div>
                      <div style={{fontSize:'.87rem'}}>{fmtDate(cmd.created_at)}</div>
                    </div>
                    <div>
                      <div style={{fontSize:'.73rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:4}}>Montant total</div>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:'var(--primary)'}}>{fmt(cmd.montant_total)}</div>
                    </div>
                    <div>
                      <div style={{fontSize:'.73rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:4}}>Reste à payer</div>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:reste>0?'var(--danger)':'var(--accent)'}}>
                        {reste>0 ? fmt(reste) : '✓ Soldé'}
                      </div>
                    </div>
                  </div>

                  {/* Message de statut */}
                  {cmd.statut==='en_attente' && (
                    <div style={{marginTop:14,padding:'10px 14px',background:'var(--warning-bg)',borderRadius:8,fontSize:'.84rem',color:'var(--warning)',fontWeight:500}}>
                      Votre commande est en attente de validation par le gestionnaire du dépôt.
                    </div>
                  )}
                  {cmd.statut==='validee' && (
                    <div style={{marginTop:14,padding:'10px 14px',background:'var(--info-bg)',borderRadius:8,fontSize:'.84rem',color:'var(--info)',fontWeight:500}}>
                      Commande validée — La livraison est en cours de préparation.
                    </div>
                  )}
                  {cmd.statut==='livree' && (
                    <div style={{marginTop:14,padding:'10px 14px',background:'var(--badge-success-bg)',borderRadius:8,fontSize:'.84rem',color:'var(--accent)',fontWeight:500}}>
                      Commande livrée — En attente de règlement au dépôt.
                    </div>
                  )}
                  {cmd.statut==='paye' && (
                    <div style={{marginTop:14,padding:'10px 14px',background:'var(--badge-success-bg)',borderRadius:8,fontSize:'.84rem',color:'var(--accent)',fontWeight:500}}>
                      Commande entièrement soldée. Merci !
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Facture */}
      {showFacture && (
        <div className="modal-overlay" onClick={()=>setShowFacture(null)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Bon de commande</span>
              <button className="modal-close" onClick={()=>setShowFacture(null)}>✕</button>
            </div>
            <div className="modal-body"><Facture commande={showFacture} /></div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowFacture(null)}>Fermer</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
