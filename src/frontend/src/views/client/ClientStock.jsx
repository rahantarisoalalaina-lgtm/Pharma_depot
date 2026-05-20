import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useTranslation } from '../../App';
import { useToast, Toast } from '../../components/Toast';
import api from '../../services/api';

const fmt = (n) => `${Number(n||0).toLocaleString('fr-FR')} Ar`;

export default function ClientStock() {
  const { user }   = useAuth();
  const { t }      = useTranslation();
  const toast      = useToast();

  const [medicaments, setMedicaments] = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [categorie,   setCategorie]   = useState('');
  const [panier,      setPanier]      = useState([]);
  const [showPanier,  setShowPanier]  = useState(false);
  const [note,        setNote]        = useState('');
  const [sending,     setSending]     = useState(false);

  const loadStock = useCallback(() => {
    const params = { province_id: user?.province_id };
    if (search)   params.search   = search;
    if (categorie) params.categorie = categorie;
    api.clientGetStock(params)
      .then(r => {
        const data = r.data || [];
        setMedicaments(data);
        const cats = [...new Set(data.map(m => m.categorie).filter(Boolean))].sort();
        setCategories(cats);
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [search, categorie, user?.province_id]);

  useEffect(() => { loadStock(); }, [loadStock]);

  const ajouterAuPanier = (med) => {
    setPanier(p => {
      const ex = p.find(i => i.medicament.id === med.id);
      if (ex) return p.map(i => i.medicament.id === med.id ? {...i, quantite: i.quantite+1} : i);
      return [...p, { medicament: med, quantite: 1 }];
    });
    toast.success(`${med.nom} ${t('panierAjoute')}`);
  };

  const updateQte = (id, qte) => {
    if (qte <= 0) { setPanier(p => p.filter(i => i.medicament.id !== id)); return; }
    const med = panier.find(i => i.medicament.id === id)?.medicament;
    if (med && qte > med.quantite_stock) { toast.warning(t('stockInsuffisant')); return; }
    setPanier(p => p.map(i => i.medicament.id === id ? {...i, quantite: qte} : i));
  };

  const total = panier.reduce((s,i) => s + (i.quantite * i.medicament.prix_vente), 0);

  const envoyerCommande = async () => {
    if (!user?.id) { toast.error(t('erreurCompte')); return; }
    if (panier.length === 0) { toast.error(t('panierEstVide')); return; }
    setSending(true);
    try {
      await api.clientCreerCommande({
        lignes: panier.map(i => ({ medicament_id: i.medicament.id, quantite: i.quantite })),
        note,
      });
      toast.success(t('commandeEnvoyee'));
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
          <div className="page-title">{t('stockDisponible')}</div>
          <div className="page-subtitle">{t('stockDisponibleSub')} {user?.province_nom}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowPanier(true)} disabled={panier.length === 0}>
          {t('panierVide')} ({panier.length}) — {fmt(total)}
        </button>
      </div>

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder={t('rechercherMedicament')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          value={categorie}
          onChange={e => setCategorie(e.target.value)}
          style={{padding:'8px 12px',borderRadius:8,border:'1.5px solid var(--border-input)',background:'var(--bg-input)',color:'var(--text-primary)'}}
        >
          <option value="">{t('toutesCategories')}</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <div className="loader"><div className="spinner"/></div> : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('medicament')}</th>
                <th>{t('categorie')}</th>
                <th>{t('stockCol')}</th>
                <th>{t('prix')}</th>
                <th>{t('action')}</th>
              </tr>
            </thead>
            <tbody>
              {medicaments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>
                    {t('aucunMedicamentDispo')}
                  </td>
                </tr>
              ) : medicaments.map(m => {
                const enPanier = panier.find(i => i.medicament.id === m.id);
                const dispo    = m.quantite_stock > 0;
                return (
                  <tr key={m.id} style={{opacity: dispo ? 1 : .5}}>
                    <td>
                      <div style={{fontWeight:600}}>{m.nom}</div>
                      {m.description && (
                        <div style={{fontSize:'.73rem',color:'var(--text-muted)'}}>{m.description}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-secondary">{m.categorie || '-'}</span>
                    </td>
                    <td>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:m.quantite_stock<=20?'var(--danger)':'var(--accent)'}}>
                        {m.quantite_stock}
                      </span>
                      <span style={{color:'var(--text-muted)',fontSize:'.76rem'}}> crtn</span>
                      {m.quantite_stock <= 20 && m.quantite_stock > 0 && (
                        <span className="badge badge-warning" style={{marginLeft:6,fontSize:'.65rem'}}>{t('stockFaibleBadge')}</span>
                      )}
                      {m.quantite_stock === 0 && (
                        <span className="badge badge-danger" style={{marginLeft:6,fontSize:'.65rem'}}>{t('ruptureBadge')}</span>
                      )}
                    </td>
                    <td className="font-mono">{fmt(m.prix_vente)}</td>
                    <td>
                      {enPanier ? (
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <button className="btn btn-outline btn-sm" onClick={() => updateQte(m.id, enPanier.quantite-1)}>−</button>
                          <span style={{fontFamily:'JetBrains Mono,monospace',minWidth:24,textAlign:'center'}}>{enPanier.quantite}</span>
                          <button className="btn btn-outline btn-sm" onClick={() => updateQte(m.id, enPanier.quantite+1)} disabled={enPanier.quantite >= m.quantite_stock}>+</button>
                        </div>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => ajouterAuPanier(m)} disabled={!dispo}>
                          {dispo ? t('ajouter') : t('rupture')}
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

      {/* Modal panier */}
      {showPanier && (
        <div className="modal-overlay" onClick={() => setShowPanier(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{t('monPanier')}</span>
              <button className="modal-close" onClick={() => setShowPanier(false)}>✕</button>
            </div>
            <div className="modal-body">
              {panier.map(i => (
                <div key={i.medicament.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border-light)'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:'.9rem'}}>{i.medicament.nom}</div>
                    <div style={{fontSize:'.78rem',color:'var(--text-muted)'}}>
                      {fmt(i.medicament.prix_vente)} {t('parCarton')}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button className="btn btn-outline btn-sm" onClick={() => updateQte(i.medicament.id, i.quantite-1)}>−</button>
                    <span style={{fontFamily:'JetBrains Mono,monospace',minWidth:28,textAlign:'center'}}>{i.quantite}</span>
                    <button className="btn btn-outline btn-sm" onClick={() => updateQte(i.medicament.id, i.quantite+1)}>+</button>
                    <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--primary)',fontWeight:700,minWidth:100,textAlign:'right'}}>
                      {fmt(i.quantite * i.medicament.prix_vente)}
                    </span>
                  </div>
                </div>
              ))}
              <div style={{padding:'14px 0 0',display:'flex',justifyContent:'flex-end',fontSize:'1.05rem',fontWeight:700,color:'var(--primary)',fontFamily:'JetBrains Mono,monospace'}}>
                {t('totalEstime')} : {fmt(total)}
              </div>
              <div className="form-group" style={{marginTop:16}}>
                <label>{t('noteOptionnel')}</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder={t('instructionsPrecisions')} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPanier(false)}>{t('continuerAchats')}</button>
              <button className="btn btn-success" onClick={envoyerCommande} disabled={sending || panier.length === 0}>
                {sending ? t('envoiEnCours') : t('envoyerCommande')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}