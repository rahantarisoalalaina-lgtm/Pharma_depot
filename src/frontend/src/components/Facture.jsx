import React from 'react';
const fmt = (n) => `${Number(n||0).toLocaleString('fr-FR')} Ar`;
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-';
const STATUS = { en_attente:['badge-warning','En attente'], validee:['badge-info','Validée'], livree:['badge-primary','Livrée'], paye:['badge-success','Payée'], annulee:['badge-danger','Annulée'] };

export default function Facture({ commande }) {
  if (!commande) return null;
  const reste = (commande.montant_total||0) - (commande.montant_paye||0);
  const [cls, label] = STATUS[commande.statut] || ['badge-secondary', commande.statut];
  return (
    <div className="facture">
      <div className="facture-header">
        <div>
          <h3>BON DE COMMANDE</h3>
          <div className="facture-num">N° CMD-{String(commande.id).padStart(5,'0')}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontWeight:600,fontSize:'.92rem'}}>Dépôt de Pharmacie</div>
          <div style={{opacity:.7,fontSize:'.76rem',marginTop:2}}>{commande.province_nom || 'Madagascar'}</div>
          <div style={{marginTop:6}}><span className={`badge ${cls}`}>{label}</span></div>
        </div>
      </div>
      <div className="facture-info">
        <div className="facture-info-block">
          <div className="facture-info-label">Client / Pharmacie</div>
          <div className="facture-info-value">{commande.pharmacie_nom}</div>
          <div style={{fontSize:'.76rem',color:'var(--text-muted)',marginTop:3}}>{commande.pharmacie_adresse}</div>
          {commande.client_nom && <div style={{fontSize:'.76rem',color:'var(--text-muted)',marginTop:2}}>{commande.client_prenom} {commande.client_nom}</div>}
        </div>
        <div className="facture-info-block">
          <div className="facture-info-label">Date de commande</div>
          <div className="facture-info-value">{fmtDate(commande.created_at)}</div>
          {commande.urgence===1 && <div style={{marginTop:6}}><span className="badge badge-danger">Urgente</span></div>}
          {commande.source==='client' && <div style={{marginTop:4}}><span className="badge badge-info">Commande client</span></div>}
        </div>
      </div>
      <table className="facture-table">
        <thead><tr><th>Produit</th><th>Catégorie</th><th style={{textAlign:'right'}}>Qté</th><th style={{textAlign:'right'}}>Prix unit.</th><th style={{textAlign:'right'}}>Total</th></tr></thead>
        <tbody>
          {(commande.lignes||[]).map((l,i) => (
            <tr key={i}>
              <td style={{fontWeight:500}}>{l.medicament_nom}</td>
              <td><span className="badge badge-secondary" style={{fontSize:'.68rem'}}>{l.categorie||'-'}</span></td>
              <td style={{textAlign:'right',fontFamily:'var(--font-mono)'}}>{l.quantite} crtn</td>
              <td style={{textAlign:'right',fontFamily:'JetBrains Mono,monospace'}}>{fmt(l.prix_unitaire)}</td>
              <td style={{textAlign:'right',fontFamily:'JetBrains Mono,monospace',fontWeight:600}}>{fmt(l.quantite*l.prix_unitaire)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="facture-totals">
        <div className="facture-total-row"><span style={{color:'var(--text-secondary)'}}>Sous-total</span><span style={{fontFamily:'JetBrains Mono,monospace'}}>{fmt(commande.montant_total)}</span></div>
        <div className="facture-total-row"><span style={{color:'var(--text-secondary)'}}>Payé</span><span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--accent)'}}>{fmt(commande.montant_paye)}</span></div>
        {reste > 0 && <div className="facture-total-row" style={{color:'var(--danger)'}}><span>Reste à payer</span><span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>{fmt(reste)}</span></div>}
        <div style={{width:'100%',height:1,background:'var(--border-light)',margin:'6px 0'}}/>
        <div className="facture-total-row main"><span>TOTAL</span><span style={{fontFamily:'JetBrains Mono,monospace'}}>{fmt(commande.montant_total)}</span></div>
      </div>
      <div style={{padding:'12px 22px',background:'var(--facture-bg)',borderTop:'1px solid var(--facture-border)',textAlign:'center'}}>
        <p style={{fontSize:'.73rem',color:'var(--text-muted)'}}>Paiement en espèces uniquement — Merci de votre confiance</p>
        {commande.note && <p style={{fontSize:'.76rem',color:'var(--text-secondary)',marginTop:4,fontStyle:'italic'}}>Note : {commande.note}</p>}
      </div>
    </div>
  );
}
