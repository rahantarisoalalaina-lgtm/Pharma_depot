// src/views/LivraisonView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Toast, useToast } from '../components/Toast';
import Facture from '../components/Facture';
import { useTranslation } from '../App';
import api from '../services/api';

function formatMoney(n) { return `${Number(n || 0).toLocaleString('fr-FR')} Ar`; }
function formatDate(s) { if (!s) return '-'; return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

const STATUT_KEYS = {
  planifie: { fr: 'Planifié',  mg: 'Nokarakaraina' },
  en_cours: { fr: 'En cours',  mg: 'Eo am-piasana' },
  livre:    { fr: 'Livré',     mg: 'Nalefa' },
  echec:    { fr: 'Échec',     mg: 'Tsy vita' },
};
const STATUT_BADGES = { planifie: 'badge-warning', en_cours: 'badge-info', livre: 'badge-success', echec: 'badge-danger' };

const PRIORITE_KEYS = {
  1: { fr: 'Haute',    mg: 'Avo' },
  2: { fr: 'Normale',  mg: 'Mahazatra' },
  3: { fr: 'Basse',    mg: 'Ambany' },
};
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

  const sl = (fr, mg) => lang === 'mg' ? mg : fr;
  const statutLabel = s => STATUT_KEYS[s]?.[lang] || STATUT_KEYS[s]?.fr || s;
  const prioriteLabel = p => PRIORITE_KEYS[p]?.[lang] || PRIORITE_KEYS[p]?.fr || p;

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
    if (!form.commande_id) { toast.error(sl('Sélectionnez une commande', 'Mifidiana baiko')); return; }
    setSaving(true);
    try {
      await api.createLivraison({ commande_id: parseInt(form.commande_id), priorite: parseInt(form.priorite), date_livraison: form.date_livraison || null });
      toast.success(sl('Livraison planifiée avec succès', 'Voaomana ny fandefasana'));
      setShowCreate(false);
      setForm({ commande_id: '', priorite: 2, date_livraison: '' });
      loadData();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleStatut = async (id, s) => {
    try {
      await api.updateLivraisonStatut(id, s);
      toast.success(`${t('livraisons')} : ${statutLabel(s)}`);
      loadData();
      if (showDetail?.id === id) { const u = await api.getLivraisonById(id); setShowDetail(u.data); }
    } catch (err) { toast.error(err.message); }
  };

  const handleOptimiser = async id => {
    setOptimizing(true);
    try {
      const res = await api.optimiserTrajet(id);
      setTrajetInfo(res.data);
      toast.success(`${sl('Trajet optimisé', 'Lalana azo natsara')} : ${res.data.distanceTotale?.toFixed(2)} km`);
      loadData();
    } catch (err) { toast.error(err.message); }
    finally { setOptimizing(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm(sl('Supprimer cette livraison ?', 'Hamafa ity fandefasana ity?'))) return;
    try { await api.deleteLivraison(id); toast.success(t('suppressionReussie')); setShowDetail(null); loadData(); }
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

  const countLabel = lang === 'mg'
    ? `${livraisons.length} fandefasana — nomanina araka ny laharam-pahamehana (Tas binaire)`
    : `${livraisons.length} livraison${livraisons.length > 1 ? 's' : ''} — triées par priorité (Tas binaire)`;

  return (
    <div>
      <Toast toasts={toast.toasts} removeToast={toast.removeToast} />
      {fromCache && (
        <div className="offline-banner" style={{ fontSize: '.8rem' }}>
          {t('donneesCache')} — {t('horsligne')}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">{t('livraisons')}</div>
          <div className="page-subtitle">{countLabel}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t('nouvelleLivraison')}
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: sl('Planifiées', 'Nokarakaraina'), value: nbPlanifiees, color: 'var(--warning)', bg: 'var(--stat-warning-icon)' },
          { label: sl('En cours', 'Eo am-piasana'),   value: nbEnCours,    color: 'var(--primary)', bg: 'var(--info-bg)' },
          { label: sl('Livrées',  'Nalefa'),           value: nbLivrees,    color: 'var(--accent)',  bg: 'var(--badge-success-bg)' },
          { label: sl('Urgentes', 'Maika'),            value: urgentes,     color: 'var(--danger)',  bg: 'var(--alerte-bg)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px 20px', background: s.bg, borderRadius: 12, border: `1px solid ${s.color}33` }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filters-bar">
        <select value={statut} onChange={e => setStatut(e.target.value)} style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid var(--border)', minWidth: 180 }}>
          <option value="">{sl('Tous les statuts', 'Toetran\'asa rehetra')}</option>
          {Object.entries(STATUT_KEYS).map(([k, v]) => <option key={k} value={k}>{v[lang] || v.fr}</option>)}
        </select>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {sl('Trajets optimisés par algorithme Dijkstra', 'Lalana azo tsara amin\'ny Dijkstra')}
        </div>
      </div>

      {loading ? <div className="loader"><div className="spinner" /></div> : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('pharmacie')}</th>
                <th>{t('dateLivraison')}</th>
                <th>{t('priorite')}</th>
                <th>{t('distance')}</th>
                <th>{t('statut')}</th>
                <th>{sl('Actions', 'Hetsika')}</th>
              </tr>
            </thead>
            <tbody>
              {livraisons.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  {sl('Aucune livraison', 'Tsy misy fandefasana')}
                </td></tr>
              ) : livraisons.map((liv, idx) => (
                <tr key={liv.id}>
                  <td>
                    <div className="font-mono" style={{ color: 'var(--text-muted)' }}>#{String(liv.id).padStart(4, '0')}</div>
                    {idx === 0 && liv.statut === 'planifie' && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600, marginTop: 2 }}>
                        {sl('Prochain', 'Manaraka')}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{liv.pharmacie_nom}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{liv.pharmacie_adresse?.substring(0, 40)}</div>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{formatDate(liv.date_livraison)}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', fontWeight: 600, color: PRIORITE_COLORS[liv.priorite] }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITE_COLORS[liv.priorite] }} />
                      {prioriteLabel(liv.priorite)}
                      {liv.urgence === 1 && <span className="badge badge-danger" style={{ fontSize: '0.65rem', marginLeft: 4 }}>{t('urgente')}</span>}
                    </span>
                  </td>
                  <td>
                    {liv.distance_totale
                      ? <span className="font-mono" style={{ color: 'var(--primary)' }}>{Number(liv.distance_totale).toFixed(2)} km</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td><span className={`badge ${STATUT_BADGES[liv.statut] || 'badge-secondary'}`}>{statutLabel(liv.statut)}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => { setShowDetail(liv); setTrajetInfo(null); }}>
                        {t('details')}
                      </button>
                      {liv.statut === 'planifie' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleStatut(liv.id, 'en_cours')}>
                          {sl('Démarrer', 'Hanomboka')}
                        </button>
                      )}
                      <button className="btn btn-outline btn-sm" onClick={() => openFacture(liv.commande_id)}>
                        {t('facture')}
                      </button>
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
              <span className="modal-title">{t('nouvelleLivraison')}</span>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{sl('Commande à livrer *', 'Baiko ho alefa *')}</label>
                  <select value={form.commande_id} onChange={e => setForm(f => ({ ...f, commande_id: e.target.value }))} required>
                    <option value="">{sl('Sélectionner une commande validée', 'Mifidiana baiko nanamafina')}</option>
                    {commandes.map(c => (
                      <option key={c.id} value={c.id}>
                        #{String(c.id).padStart(5, '0')} — {c.pharmacie_nom} ({formatMoney(c.montant_total)})
                      </option>
                    ))}
                  </select>
                  {commandes.length === 0 && (
                    <div style={{ marginTop: 6, fontSize: '.82rem', color: 'var(--text-muted)' }}>
                      {sl('Aucune commande validée. Validez d\'abord une commande.', 'Tsy misy baiko nanamafina. Manamafy baiko aloha.')}
                    </div>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{t('priorite')}</label>
                    <select value={form.priorite} onChange={e => setForm(f => ({ ...f, priorite: e.target.value }))}>
                      <option value={1}>{sl('Haute (urgente)', 'Avo (maika)')}</option>
                      <option value={2}>{sl('Normale', 'Mahazatra')}</option>
                      <option value={3}>{sl('Basse', 'Ambany')}</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{t('dateLivraison')}</label>
                    <input type="datetime-local" value={form.date_livraison} onChange={e => setForm(f => ({ ...f, date_livraison: e.target.value }))} />
                  </div>
                </div>
                <div style={{ padding: 14, background: 'var(--info-bg)', borderRadius: 8, marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {sl(
                    "L'algorithme de Dijkstra calculera automatiquement le chemin le plus court depuis le dépôt jusqu'à la pharmacie.",
                    "Ny algorithm Dijkstra dia hanisa ny lalana fohy indrindra avy amin'ny fitehirizana ka hatramin'ny tsena fanafody."
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>{t('annuler')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving || commandes.length === 0}>
                  {saving ? sl('Planification...', 'Fanomanana...') : sl('Planifier', 'Homanina')}
                </button>
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
              <span className="modal-title">{sl('Livraison', 'Fandefasana')} #{String(showDetail.id).padStart(4, '0')}</span>
              <button className="modal-close" onClick={() => { setShowDetail(null); setTrajetInfo(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ padding: 16, background: 'var(--bg-stripe)', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                    {t('pharmacie')}
                  </div>
                  <div style={{ fontWeight: 600 }}>{showDetail.pharmacie_nom}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{showDetail.pharmacie_adresse}</div>
                  {showDetail.telephone && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{showDetail.telephone}</div>}
                  {showDetail.latitude && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      GPS: {Number(showDetail.latitude).toFixed(4)}, {Number(showDetail.longitude).toFixed(4)}
                    </div>
                  )}
                </div>
                <div style={{ padding: 16, background: 'var(--bg-stripe)', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                    {sl('Infos livraison', 'Momba ny fandefasana')}
                  </div>
                  {[
                    [t('statut'),        <span key="s" className={`badge ${STATUT_BADGES[showDetail.statut]}`}>{statutLabel(showDetail.statut)}</span>],
                    [t('priorite'),      <span key="p" style={{ fontWeight: 600, color: PRIORITE_COLORS[showDetail.priorite] }}>{prioriteLabel(showDetail.priorite)}</span>],
                    [t('distance'),      <span key="d" className="font-mono">{showDetail.distance_totale ? `${Number(showDetail.distance_totale).toFixed(2)} km` : '—'}</span>],
                    [t('dateLivraison'), formatDate(showDetail.date_livraison)],
                    [sl('Montant commande', 'Vola baiko'), <span key="m" className="font-mono">{formatMoney(showDetail.montant_total)}</span>],
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
                    <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>
                      {sl('Trajet optimisé — Dijkstra', 'Lalana azo tsara — Dijkstra')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {sl("Chemin le plus court depuis le dépôt", "Lalana fohy indrindra avy amin'ny fitehirizana")}
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => handleOptimiser(showDetail.id)} disabled={optimizing}>
                    {optimizing ? sl('Calcul...', 'Isaina...') : sl('Recalculer', 'Hisaina indray')}
                  </button>
                </div>
                {trajetInfo ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{sl('Dépôt', 'Fitehirizana')}</span>
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
                      {t('distance')} : {trajetInfo.distanceTotale?.toFixed(2)} km
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {showDetail.distance_totale
                      ? `${sl('Trajet calculé · Distance', 'Lalana voatanisa · Elanelana')} : ${Number(showDetail.distance_totale).toFixed(2)} km — ${sl('Cliquez Recalculer pour voir les noeuds.', 'Tsindrio Hisaina indray mba hahita ny teboka.')}`
                      : sl('Cliquez sur "Recalculer" pour lancer l\'optimisation.', 'Tsindrio "Hisaina indray" mba hanomboka ny fanarenana.')}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {showDetail.statut === 'planifie' && (
                  <button className="btn btn-primary" onClick={() => handleStatut(showDetail.id, 'en_cours')}>
                    {sl('Démarrer la livraison', 'Hanomboka ny fandefasana')}
                  </button>
                )}
                {showDetail.statut === 'en_cours' && (
                  <>
                    <div style={{ padding: '10px 14px', background: 'var(--info-bg)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 500, border: '1px solid var(--primary)33' }}>
                      {sl('⏳ En attente de confirmation par la pharmacie', '⏳ Miandry ny fanamafisana avy amin\'ny tsena fanafody')}
                    </div>
                    <button className="btn btn-danger" onClick={() => handleStatut(showDetail.id, 'echec')}>
                      {sl('Échec de livraison', 'Tsy vita ny fandefasana')}
                    </button>
                  </>
                )}
                {showDetail.statut === 'planifie' && (
                  <button className="btn btn-outline" onClick={() => handleDelete(showDetail.id)} style={{ color: 'var(--danger)', borderColor: 'var(--alerte-border)' }}>
                    {t('supprimer')}
                  </button>
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
              <span className="modal-title">{sl('Facture de livraison', 'Tatitra vola fandefasana')}</span>
              <button className="modal-close" onClick={() => setShowFactureLivraison(null)}>✕</button>
            </div>
            <div className="modal-body"><Facture commande={showFactureLivraison} /></div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowFactureLivraison(null)}>{t('fermer')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}