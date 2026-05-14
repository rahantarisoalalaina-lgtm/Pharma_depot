import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../App';
import { useToast, Toast } from '../../components/Toast';
import api from '../../services/api';
const fmt = (n) => `${Number(n||0).toLocaleString('fr-FR')} Ar`;

export default function ClientStock() {
  const { user } = useAuth();
  const toast = useToast();
  const [medicaments, setMedicaments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [panier, setPanier] = useState([]); // [{medicament, quantite}]
  const [showPanier, setShowPanier] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const loadStock = useCallback(() => {
    const params = { province_id: user?.province_id };
    if (search) params.search = search;
    if (categorie) params.categorie = categorie;
    api.clientGetStock(params).then(r => {
      const data = r.data || [];
      setMedicaments(data);
      const cats = [...new Set(data.map(m=>m.categorie).filter(Boolean))].sort();
      setCategories(cats);
    }).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [search, categorie, user?.province_id]);

  useEffect(() => { loadStock(); }, [loadStock]);

  const ajouterAuPanier = (med) => {
    setPanier(p => {
      const existing = p.find(i => i.medicament.id === med.id);
      if (existing) return p.map(i => i.medicament.id===med.id ? {...i, quantite:i.quantite+1} : i);
      return [...p, { medicament:med, quantite:1 }];
    });
    toast.success(`${med.nom} ajouté au panier`);
  };

  const updateQte = (id, qte) => {
    if (qte <= 0) { setPanier(p => p.filter(i=>i.medicament.id!==id)); return; }
    const med = panier.find(i=>i.medicament.id===id)?.medicament;
    if (med && qte > med.quantite_stock) { toast.warning('Stock insuffisant'); return; }
    setPanier(p => p.map(i => i.medicament.id===id ? {...i, quantite:qte} : i));
  };

  const total = panier.reduce((s,i)=>s+(i.quantite*i.medicament.prix_vente),0);

  const envoyerCommande = async () => {
    if (!user?.id) { toast.error('Erreur: compte pharmacie invalide'); return; }
    if (panier.length===0) { toast.error('Le panier est vide'); return; }
    setSending(true);
    try {
      await api.clientCreerCommande({ lignes: panier.map(i=>({medicament_id:i.medicament.id,quantite:i.quantite})), note });
      toast.success('Commande envoyée au dépôt avec succès !');
      setPanier([]); setNote(''); setShowPanier(false);
      loadStock();
    } catch(err) { toast.error(err.message); }
    finally { setSending(false); }
  };

  return (
    <div>
      <Toast toasts={toast.toasts} removeToast={toast.removeToast} />
      <div className="page-header">
        <div>
          <div className="page-title">Stock disponible</div>
          <div className="page-subtitle">Médicaments du dépôt — Province {user?.province_nom}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowPanier(true)} disabled={panier.length===0}>
          Panier ({panier.length}) — {fmt(total)}
        </button>
      </div>

      <div className="filters-bar">
        <input className="search-input" placeholder="Rechercher un médicament..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select value={categorie} onChange={e=>setCategorie(e.target.value)} style={{padding:'8px 12px',borderRadius:8,border:'1.5px solid var(--border-input)',background:'var(--bg-input)',color:'var(--text-primary)'}}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <div className="loader"><div className="spinner"/></div> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Médicament</th><th>Catégorie</th><th>Stock</th><th>Prix</th><th>Action</th></tr></thead>
            <tbody>
              {medicaments.length===0 ? (
                <tr><td colSpan={5} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Aucun médicament disponible</td></tr>
              ) : medicaments.map(m => {
                const enPanier = panier.find(i=>i.medicament.id===m.id);
                const dispo = m.quantite_stock > 0;
                return (
                  <tr key={m.id} style={{opacity:dispo?1:.5}}>
                    <td>
                      <div style={{fontWeight:600}}>{m.nom}</div>
                      {m.description && <div style={{fontSize:'.73rem',color:'var(--text-muted)'}}>{m.description}</div>}
                    </td>
                    <td><span className="badge badge-secondary">{m.categorie||'-'}</span></td>
                    <td>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:m.quantite_stock<=20?'var(--danger)':'var(--accent)'}}>
                        {m.quantite_stock}
                      </span>
                      <span style={{color:'var(--text-muted)',fontSize:'.76rem'}}> crtn</span>
                      {m.quantite_stock<=20 && m.quantite_stock>0 && <span className="badge badge-warning" style={{marginLeft:6,fontSize:'.65rem'}}>Faible</span>}
                      {m.quantite_stock===0 && <span className="badge badge-danger" style={{marginLeft:6,fontSize:'.65rem'}}>Rupture</span>}
                    </td>
                    <td className="font-mono">{fmt(m.prix_vente)}</td>
                    <td>
                      {enPanier ? (
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <button className="btn btn-outline btn-sm" onClick={()=>updateQte(m.id,enPanier.quantite-1)}>−</button>
                          <span style={{fontFamily:'JetBrains Mono,monospace',minWidth:24,textAlign:'center'}}>{enPanier.quantite}</span>
                          <button className="btn btn-outline btn-sm" onClick={()=>updateQte(m.id,enPanier.quantite+1)} disabled={enPanier.quantite>=m.quantite_stock}>+</button>
                        </div>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={()=>ajouterAuPanier(m)} disabled={!dispo}>
                          {dispo ? 'Ajouter' : 'Rupture'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showPanier && (
        <div className="modal-overlay" onClick={()=>setShowPanier(false)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Mon panier</span>
              <button className="modal-close" onClick={()=>setShowPanier(false)}>✕</button>
            </div>
            <div className="modal-body">
              {panier.map(i => (
                <div key={i.medicament.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border-light)'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:'.9rem'}}>{i.medicament.nom}</div>
                    <div style={{fontSize:'.78rem',color:'var(--text-muted)'}}>{fmt(i.medicament.prix_vente)} / crtn</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button className="btn btn-outline btn-sm" onClick={()=>updateQte(i.medicament.id,i.quantite-1)}>−</button>
                    <span style={{fontFamily:'JetBrains Mono,monospace',minWidth:28,textAlign:'center'}}>{i.quantite}</span>
                    <button className="btn btn-outline btn-sm" onClick={()=>updateQte(i.medicament.id,i.quantite+1)}>+</button>
                    <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--primary)',fontWeight:700,minWidth:100,textAlign:'right'}}>{fmt(i.quantite*i.medicament.prix_vente)}</span>
                  </div>
                </div>
              ))}
              <div style={{padding:'14px 0 0',display:'flex',justifyContent:'flex-end',fontSize:'1.05rem',fontWeight:700,color:'var(--primary)',fontFamily:'JetBrains Mono,monospace'}}>
                Total : {fmt(total)}
              </div>
              <div className="form-group" style={{marginTop:16}}>
                <label>Note (optionnel)</label>
                <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Instructions, précisions..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowPanier(false)}>Continuer les achats</button>
              <button className="btn btn-success" onClick={envoyerCommande} disabled={sending||panier.length===0}>
                {sending ? 'Envoi...' : 'Envoyer la commande au dépôt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
