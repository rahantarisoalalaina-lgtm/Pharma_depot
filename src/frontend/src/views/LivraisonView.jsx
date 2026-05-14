// src/views/LivraisonView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Toast, useToast } from '../components/Toast';
import Facture from '../components/Facture';
import { useTranslation } from '../App';
import api from '../services/api';

function formatMoney(n) { return `${Number(n || 0).toLocaleString('fr-FR')} Ar`; }
function formatDate(s) { if (!s) return '-'; return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

const STATUT_LABELS = { planifie: 'Planifié', en_cours: 'En cours', livre: 'Livré', echec: 'Échec' };
const STATUT_BADGES = { planifie: 'badge-warning', en_cours: 'badge-info', livre: 'badge-success', echec: 'badge-danger' };
const PRIORITE_LABELS = { 1: 'Haute', 2: 'Normale', 3: 'Basse' };
const PRIORITE_COLORS = { 1: 'var(--danger)', 2: 'var(--primary)', 3: 'var(--text-muted)' };

export default function LivraisonView() {
  const toast = useToast();
  const { t, lang } = useTranslation();
  const [livraisons, setLivraisons] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statut, setStatut] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [trajetInfo, setTrajetInfo] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [form, setForm] = useState({ commande_id: '', priorite: 2, date_livraison: '' });
  const [saving, setSaving] = useState(false);
  const [showFactureLivraison, setShowFactureLivraison] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statut) params.statut = statut;
    Promise.all([api.getLivraisons(params), api.getCommandes({ statut: 'validee' })])
      .then(([liv, cmd]) => {
        setLivraisons(liv.data || []);
        setCommandes(cmd.data || []);
        setFromCache(liv.fromCache || cmd.fromCache);
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [statut]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async e => {
    e.preventDefault();
    if (!form.commande_id) { toast.error('Sélectionnez une commande'); return; }
    setSaving(true);
    try {
      await api.createLivraison({ commande_id: parseInt(form.commande_id), priorite: parseInt(form.priorite), date_livraison: form.date_livraison || null });
      toast.success('Livraison planifiée avec succès');
      setShowCreate(false);
      setForm({ commande_id: '', priorite: 2, date_livraison: '' });
      loadData();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleStatut = async (id, s) => {
    try {
      await api.updateLivraisonStatut(id, s);
      toast.success(`Livraison : ${STATUT_LABELS[s]}`);
      loadData();
      if (showDetail?.id === id) { const u = await api.getLivraisonById(id); setShowDetail(u.data); }
    } catch (err) { toast.error(err.message); }
  };

  const handleOptimiser = async id => {
    setOptimizing(true);
    try {
      const res = await api.optimiserTrajet(id);
      setTrajetInfo(res.data);
      toast.success(`Trajet optimisé : ${res.data.distanceTotale?.toFixed(2)} km`);
      loadData();
    } catch (err) { toast.error(err.message); }
    finally { setOptimizing(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Supprimer cette livraison ?')) return;
    try { await api.deleteLivraison(id); toast.success('Livraison supprimée'); setShowDetail(null); loadData(); }
    catch (err) { toast.error(err.message); }
  };

  const openFacture = async commande_id => {
    try { const res = await api.getCommandeById(commande_id); setShowFactureLivraison(res.data); }
    catch (err) { toast.error(err.message); }
  };

  const nbPlanifiees = livraisons.filter(l => l.statut === 'planifie').length;
  const nbEnCours = livraisons.filter(l => l.statut === 'en_cours').length;
  const nbLivrees = livraisons.filter(l => l.statut === 'livre').length;
  const urgentes = livraisons.filter(l => l.urgence === 1 || l.priorite === 1).length;

  return (
    <div>
      <Toast toasts={toast.toasts} removeToast={toast.removeToast} />
      {fromCache && <div className="offline-banner" style={{ fontSize: '.8rem' }}>{t('donneesCache')} — {t('horsligne')}</div>}

      <div className="page-header">
        <div>
          <div className="page-title">Livraisons</div>
          <div className="page-subtitle">{livraisons.length} livraison{livraisons.length > 1 ? 's' : ''} — triées par priorité (Tas binaire)</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Planifier une livraison
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Planifiées', value: nbPlanifiees, color: 'var(--warning)', bg: 'var(--stat-warning-icon)' },
          { label: 'En cours', value: nbEnCours, color: 'var(--primary)', bg: 'var(--info-bg)' },
          { label: 'Livrées', value: nbLivrees, color: 'var(--accent)', bg: 'var(--badge-success-bg)' },
          { label: 'Urgentes', value: urgentes, color: 'var(--danger)', bg: 'var(--alerte-bg)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px 20px', background: s.bg, borderRadius: 12, border: `1px solid ${s.color}33` }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filters-bar">
        <select value={statut} onChange={e => setStatut(e.target.value)} style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid var(--border)', minWidth: 180 }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          Trajets optimisés par algorithme Dijkstra
        </div>
      </div>

      {loading ? <div className="loader"><div className="spinner" /></div> : (
        <div className="table-container">
          <table>
            <thead><tr><th>#</th><th>Pharmacie</th><th>Date prévue</th><th>Priorité</th><th>Distance</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {livraisons.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune livraison</td></tr>
              ) : livraisons.map((liv, idx) => (
                <tr key={liv.id}>
                  <td>
                    <div className="font-mono" style={{ color: 'var(--text-muted)' }}>#{String(liv.id).padStart(4, '0')}</div>
                    {idx === 0 && liv.statut === 'planifie' && <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600, marginTop: 2 }}>Prochain</div>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{liv.pharmacie_nom}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{liv.pharmacie_adresse?.substring(0, 40)}</div>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{formatDate(liv.date_livraison)}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', fontWeight: 600, color: PRIORITE_COLORS[liv.priorite] }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITE_COLORS[liv.priorite] }} />
                      {PRIORITE_LABELS[liv.priorite] || 'Normale'}
                      {liv.urgence === 1 && <span className="badge badge-danger" style={{ fontSize: '0.65rem', marginLeft: 4 }}>Urgent</span>}
                    </span>
                  </td>
                  <td>{liv.distance_totale ? <span className="font-mono" style={{ color: 'var(--primary)' }}>{Number(liv.distance_totale).toFixed(2)} km</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td><span className={`badge ${STATUT_BADGES[liv.statut] || 'badge-secondary'}`}>{STATUT_LABELS[liv.statut] || liv.statut}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => { setShowDetail(liv); setTrajetInfo(null); }}>Détail</button>
                      {liv.statut === 'planifie' && <button className="btn btn-primary btn-sm" onClick={() => handleStatut(liv.id, 'en_cours')}>Démarrer</button>}
                      {liv.statut === 'en_cours' && <button className="btn btn-success btn-sm" onClick={() => handleStatut(liv.id, 'livre')}>Livré ✓</button>}
                      <button className="btn btn-outline btn-sm" onClick={() => openFacture(liv.commande_id)}>Facture</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nouvelle livraison */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Planifier une livraison</span>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Commande à livrer *</label>
                  <select value={form.commande_id} onChange={e => setForm(f => ({ ...f, commande_id: e.target.value }))} required>
                    <option value="">Sélectionner une commande validée</option>
                    {commandes.map(c => (
                      <option key={c.id} value={c.id}>#{String(c.id).padStart(5, '0')} — {c.pharmacie_nom} ({formatMoney(c.montant_total)})</option>
                    ))}
                  </select>
                  {commandes.length === 0 && <div style={{ marginTop: 6, fontSize: '.82rem', color: 'var(--text-muted)' }}>Aucune commande validée. Validez d'abord une commande.</div>}
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Priorité</label>
                    <select value={form.priorite} onChange={e => setForm(f => ({ ...f, priorite: e.target.value }))}>
                      <option value={1}>Haute (urgente)</option>
                      <option value={2}>Normale</option>
                      <option value={3}>Basse</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Date de livraison prévue</label>
                    <input type="datetime-local" value={form.date_livraison} onChange={e => setForm(f => ({ ...f, date_livraison: e.target.value }))} />
                  </div>
                </div>
                <div style={{ padding: 14, background: 'var(--info-bg)', borderRadius: 8, marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  L'algorithme de Dijkstra calculera automatiquement le chemin le plus court depuis le dépôt jusqu'à la pharmacie.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving || commandes.length === 0}>{saving ? 'Planification...' : 'Planifier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détail livraison */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => { setShowDetail(null); setTrajetInfo(null); }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Livraison #{String(showDetail.id).padStart(4, '0')}</span>
              <button className="modal-close" onClick={() => { setShowDetail(null); setTrajetInfo(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ padding: 16, background: 'var(--bg-stripe)', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Pharmacie</div>
                  <div style={{ fontWeight: 600 }}>{showDetail.pharmacie_nom}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{showDetail.pharmacie_adresse}</div>
                  {showDetail.telephone && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{showDetail.telephone}</div>}
                  {showDetail.latitude && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>GPS: {Number(showDetail.latitude).toFixed(4)}, {Number(showDetail.longitude).toFixed(4)}</div>}
                </div>
                <div style={{ padding: 16, background: 'var(--bg-stripe)', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Infos livraison</div>
                  {[
                    ['Statut', <span key="s" className={`badge ${STATUT_BADGES[showDetail.statut]}`}>{STATUT_LABELS[showDetail.statut]}</span>],
                    ['Priorité', <span key="p" style={{ fontWeight: 600, color: PRIORITE_COLORS[showDetail.priorite] }}>{PRIORITE_LABELS[showDetail.priorite]}</span>],
                    ['Distance', <span key="d" className="font-mono">{showDetail.distance_totale ? `${Number(showDetail.distance_totale).toFixed(2)} km` : '—'}</span>],
                    ['Date prévue', formatDate(showDetail.date_livraison)],
                    ['Montant commande', <span key="m" className="font-mono">{formatMoney(showDetail.montant_total)}</span>],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trajet Dijkstra */}
              <div style={{ padding: 16, background: 'var(--info-bg)', borderRadius: 10, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>Trajet optimisé — Dijkstra</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Chemin le plus court depuis le dépôt</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => handleOptimiser(showDetail.id)} disabled={optimizing}>
                    {optimizing ? 'Calcul...' : 'Recalculer'}
                  </button>
                </div>
                {trajetInfo ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Dépôt</span>
                      {(trajetInfo.noeuds || []).slice(1, -1).map(n => (
                        <React.Fragment key={n.id}>
                          <span style={{ color: 'var(--text-muted)' }}>→</span>
                          <div style={{ padding: '2px 10px', background: 'white', borderRadius: 12, fontSize: '0.78rem', border: '1px solid var(--border)' }}>{n.nom}</div>
                        </React.Fragment>
                      ))}
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{showDetail.pharmacie_nom}</span>
                    </div>
                    <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 700 }}>
                      Distance : {trajetInfo.distanceTotale?.toFixed(2)} km
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {showDetail.distance_totale
                      ? `Trajet calculé · Distance : ${Number(showDetail.distance_totale).toFixed(2)} km — Cliquez Recalculer pour voir les noeuds.`
                      : 'Cliquez sur "Recalculer" pour lancer l\'optimisation.'}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {showDetail.statut === 'planifie' && <button className="btn btn-primary" onClick={() => handleStatut(showDetail.id, 'en_cours')}>Démarrer la livraison</button>}
                {showDetail.statut === 'en_cours' && (
                  <>
                    <button className="btn btn-success" onClick={() => handleStatut(showDetail.id, 'livre')}>Marquer comme livré ✓</button>
                    <button className="btn btn-danger" onClick={() => handleStatut(showDetail.id, 'echec')}>Échec de livraison</button>
                  </>
                )}
                {showDetail.statut === 'planifie' && (
                  <button className="btn btn-outline" onClick={() => handleDelete(showDetail.id)} style={{ color: 'var(--danger)', borderColor: 'var(--alerte-border)' }}>Supprimer</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Facture livraison */}
      {showFactureLivraison && (
        <div className="modal-overlay" onClick={() => setShowFactureLivraison(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Facture de livraison</span>
              <button className="modal-close" onClick={() => setShowFactureLivraison(null)}>✕</button>
            </div>
            <div className="modal-body"><Facture commande={showFactureLivraison} /></div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowFactureLivraison(null)}>Fermer</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
