// src/views/MedicamentView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Toast, useToast } from '../components/Toast';
import { useTranslation } from '../App';
import api from '../services/api';

const fmt = (n) => `${Number(n || 0).toLocaleString('fr-FR')} Ar`;
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('fr-FR') : '-';
const EMPTY = { nom: '', description: '', categorie: '', prix_achat: '', prix_vente: '', quantite_stock: '', date_expiration: '', seuil_alerte: 20 };

function joursAvantExpiration(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ExpirationBadge({ date }) {
  if (!date) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const j = joursAvantExpiration(date);
  const color = j < 0 ? 'var(--danger)' : j <= 30 ? 'var(--danger)' : j <= 90 ? 'var(--warning)' : 'var(--accent)';
  const bg = j < 0 ? 'var(--alerte-exp-bg)' : j <= 30 ? 'var(--alerte-exp-bg)' : j <= 90 ? 'var(--alerte-exp-bg)' : 'var(--badge-success-bg)';
  const label = j < 0 ? `Expiré (${-j}j)` : j <= 90 ? `${j}j restants` : fmtDate(date);
  return <span style={{ padding: '2px 8px', borderRadius: 6, background: bg, color, fontWeight: j <= 90 ? 700 : 400, fontSize: '.78rem', fontFamily: j <= 90 ? 'var(--font-mono)' : 'inherit' }}>{label}</span>;
}

export default function MedicamentView() {
  const toast = useToast();
  const { t, lang } = useTranslation();
  const [medicaments, setMedicaments] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showAlertes, setShowAlertes] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (categorie) params.categorie = categorie;
    Promise.all([api.getMedicaments(params), api.getAlertes()])
      .then(([res, alt]) => {
        setMedicaments(res.data || []);
        setAlertes(alt.data || []);
        const cats = [...new Set((res.data || []).map(m => m.categorie).filter(Boolean))].sort();
        setCategories(cats);
        setFromCache(res.fromCache || alt.fromCache);
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [search, categorie]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setShowModal(true); };
  const openEdit = (m) => {
    setForm({ nom: m.nom || '', description: m.description || '', categorie: m.categorie || '',
      prix_achat: m.prix_achat || '', prix_vente: m.prix_vente || '',
      quantite_stock: m.quantite_stock || '', date_expiration: m.date_expiration?.slice(0, 10) || '',
      seuil_alerte: m.seuil_alerte || 20 });
    setEditItem(m); setShowModal(true);
  };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (editItem) { await api.updateMedicament(editItem.id, form); toast.success('Médicament mis à jour'); }
      else { await api.createMedicament(form); toast.success('Médicament ajouté'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Supprimer "${m.nom}" ?`)) return;
    try { await api.deleteMedicament(m.id); toast.success('Supprimé'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const alertesStock = alertes.filter(a => a.alerte_stock);
  const alertesExpiration = alertes.filter(a => a.alerte_expiration);
  const beneficePotentiel = medicaments.reduce((s, m) => s + m.quantite_stock * (m.prix_vente - m.prix_achat), 0);

  return (
    <div>
      <Toast toasts={toast.toasts} removeToast={toast.removeToast} />
      {fromCache && <div className="offline-banner" style={{ fontSize: '.8rem' }}>{t('donneesCache')} — {t('horsligne')}</div>}

      {/* Alertes stock bas */}
      {alertesStock.length > 0 && (
        <div className="alert-strip" onClick={() => setShowAlertes(v => !v)} style={{ cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div className="alert-text">
            <strong>{alertesStock.length} médicament{alertesStock.length > 1 ? 's' : ''}</strong> en stock faible —
            <span style={{ textDecoration: 'underline', marginLeft: 4 }}>{showAlertes ? 'Masquer' : 'Voir'}</span>
          </div>
        </div>
      )}

      {/* Alertes expiration */}
      {alertesExpiration.length > 0 && (
        <div className="alert-strip alert-strip-warning">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--alerte-exp-bdr)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <div className="alert-text">
            <strong>{alertesExpiration.length} médicament{alertesExpiration.length > 1 ? 's' : ''}</strong> expire{alertesExpiration.length > 1 ? 'nt' : ''} dans moins de 90 jours !
            {alertesExpiration.filter(a => joursAvantExpiration(a.date_expiration) < 0).length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', padding: '1px 6px', borderRadius: 4, fontSize: '.72rem', fontWeight: 700 }}>
                {alertesExpiration.filter(a => joursAvantExpiration(a.date_expiration) < 0).length} déjà expiré(s) !
              </span>
            )}
          </div>
        </div>
      )}

      {/* Panel alertes déroulant */}
      {showAlertes && alertes.length > 0 && (
        <div className="card mb-24" style={{ border: '1px solid var(--alerte-border)', marginBottom: 20 }}>
          <div className="card-header" style={{ background: 'var(--alerte-bg)' }}>
            <span className="card-title" style={{ color: 'var(--danger)' }}>Alertes — {alertes.length} produit(s)</span>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{alertesStock.length} stock bas · {alertesExpiration.length} exp. proche</span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-stripe)' }}>
                  {['Médicament', 'Catégorie', 'Stock', 'Seuil', 'Expiration', 'Type alerte'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.72rem', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alertes.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '.87rem' }}>{m.nom}</td>
                    <td style={{ padding: '10px 14px' }}><span className="badge badge-secondary">{m.categorie || '—'}</span></td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ color: m.alerte_stock ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 700, fontFamily: 'monospace' }}>{m.quantite_stock} crtn</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{m.seuil_alerte}</td>
                    <td style={{ padding: '10px 14px' }}><ExpirationBadge date={m.date_expiration} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {m.alerte_stock && <span className="badge badge-danger">Stock bas</span>}
                        {m.alerte_expiration && <span style={{ padding: '2px 8px', borderRadius: 10, background: 'var(--alerte-exp-bg)', color: 'var(--alerte-exp-txt)', fontWeight: 700, fontSize: '.72rem' }}>Expiration proche</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Médicaments</div>
          <div className="page-subtitle">{medicaments.length} produit{medicaments.length > 1 ? 's' : ''} · Bénéfice potentiel : <strong style={{ color: 'var(--accent)' }}>{fmt(beneficePotentiel)}</strong></div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter
        </button>
      </div>

      <div className="filters-bar">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un médicament..." style={{ flex: 1, maxWidth: 300, padding: '9px 14px', borderRadius: 8, border: '1.5px solid var(--border)' }} />
        <select value={categorie} onChange={e => setCategorie(e.target.value)} style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid var(--border)', minWidth: 180 }}>
          <option value="">Toutes les catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <div className="loader"><div className="spinner" /></div> : (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Médicament</th><th>Catégorie</th><th>Prix achat</th><th>Prix vente</th><th>Bénéfice/u</th><th>Stock</th><th>Expiration</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {medicaments.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun médicament trouvé</td></tr>
              ) : medicaments.map(m => {
                const j = joursAvantExpiration(m.date_expiration);
                const isAlerte = m.quantite_stock <= m.seuil_alerte;
                const isExpSoon = j !== null && j <= 90;
                const benef = m.prix_vente - m.prix_achat;
                return (
                  <tr key={m.id} style={{ background: (isAlerte || isExpSoon) ? 'var(--alerte-row, rgba(231,76,60,.03))' : '' }}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{m.nom}</div>
                      {m.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.description.substring(0, 50)}</div>}
                    </td>
                    <td><span className="badge badge-secondary">{m.categorie || '—'}</span></td>
                    <td className="font-mono" style={{ color: 'var(--text-muted)' }}>{fmt(m.prix_achat)}</td>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{fmt(m.prix_vente)}</td>
                    <td className="font-mono" style={{ color: benef > 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 600 }}>+{fmt(benef)}</td>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 700, color: isAlerte ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        {m.quantite_stock}
                      </span>
                      {isAlerte && <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: '.65rem' }}>Bas</span>}
                    </td>
                    <td><ExpirationBadge date={m.date_expiration} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleDelete(m)} style={{ color: 'var(--danger)', borderColor: 'var(--alerte-border)' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ajouter/Modifier */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editItem ? 'Modifier le médicament' : 'Ajouter un médicament'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Nom *</label><input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required /></div>
                  <div className="form-group">
                    <label>Catégorie</label>
                    <input list="cats" value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} placeholder="Ex: Antibiotiques" />
                    <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                </div>
                <div className="form-group"><label>Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Prix d'achat (Ar) *</label>
                    <input type="number" min="0" value={form.prix_achat} onChange={e => setForm(f => ({ ...f, prix_achat: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Prix de vente (Ar) *</label>
                    <input type="number" min="0" value={form.prix_vente} onChange={e => setForm(f => ({ ...f, prix_vente: e.target.value }))} required />
                    {form.prix_achat && form.prix_vente && (
                      <div style={{ fontSize: '.75rem', marginTop: 4, color: form.prix_vente > form.prix_achat ? 'var(--accent)' : 'var(--danger)' }}>
                        Bénéfice : {fmt(form.prix_vente - form.prix_achat)} / unité
                        ({form.prix_achat > 0 ? Math.round((form.prix_vente - form.prix_achat) / form.prix_achat * 100) : 0}% marge)
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Stock (cartons)</label>
                    <input type="number" min="0" value={form.quantite_stock} onChange={e => setForm(f => ({ ...f, quantite_stock: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Seuil d'alerte (cartons)</label>
                    <input type="number" min="0" value={form.seuil_alerte} onChange={e => setForm(f => ({ ...f, seuil_alerte: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Date d'expiration</label>
                  <input type="date" value={form.date_expiration} onChange={e => setForm(f => ({ ...f, date_expiration: e.target.value }))} />
                  {form.date_expiration && (
                    <div style={{ marginTop: 4 }}>
                      <ExpirationBadge date={form.date_expiration} />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : (editItem ? 'Mettre à jour' : 'Ajouter')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
