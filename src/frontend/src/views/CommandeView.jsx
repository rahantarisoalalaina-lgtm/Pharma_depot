// src/views/CommandeView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Toast, useToast } from '../components/Toast';
import Facture from '../components/Facture';
import { useTranslation } from '../App';
import api from '../services/api';

function formatMoney(n) { return `${Number(n || 0).toLocaleString('fr-FR')} Ar`; }
function formatDate(s) {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_KEYS = {
  en_attente: { fr: 'En attente',  mg: 'Miandry' },
  validee:    { fr: 'Validée',     mg: 'Nanamafina' },
  livree:     { fr: 'Livrée',      mg: 'Nalefa' },
  paye:       { fr: 'Payée',       mg: 'Naloa' },
  annulee:    { fr: 'Annulée',     mg: 'Nofoànana' },
};
const STATUS_BADGES = {
  en_attente: 'badge-warning',
  validee:    'badge-info',
  livree:     'badge-primary',
  paye:       'badge-success',
  annulee:    'badge-danger',
};

/* ─── Styles injectés une seule fois ──────────────────────────────────────── */
const CSS = `
.cmd-table-wrap { overflow-x: auto; border-radius: 16px; box-shadow: var(--shadow-sm); background: var(--bg-card); border: 1px solid var(--border-light); }
.cmd-table { width: 100%; border-collapse: collapse; min-width: 820px; }
.cmd-table thead th {
  padding: 11px 12px; text-align: left; font-size: .67rem; font-weight: 700;
  color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em;
  background: var(--bg-stripe); border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}
.cmd-table tbody tr { border-bottom: 1px solid var(--border-light); transition: background .15s; }
.cmd-table tbody tr:last-child { border-bottom: none; }
.cmd-table tbody tr:hover { background: linear-gradient(90deg, var(--bg-hover), var(--bg-card)); }
.cmd-table tbody td { padding: 11px 12px; font-size: .84rem; color: var(--text-primary); vertical-align: middle; }

/* Colonne actions : empile les boutons verticalement quand texte long */
.cmd-actions { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.cmd-actions .btn { width: 100%; justify-content: center; }

/* Ligne médicament dans le modal : responsive */
.med-ligne {
  display: grid;
  grid-template-columns: 1fr 80px 1fr auto;
  gap: 8px;
  align-items: end;
  margin-bottom: 10px;
  padding: 12px;
  background: var(--bg-stripe);
  border-radius: 8px;
}
@media (max-width: 600px) {
  .med-ligne { grid-template-columns: 1fr 70px; }
  .med-ligne-totals { display: none; }
}
.med-ligne-totals { display: contents; }

/* Résumé total commande */
.cmd-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 12px 16px;
  background: var(--info-bg);
  border-radius: 8px;
}
.cmd-summary-item { font-size: .82rem; color: var(--text-muted); }
.cmd-summary-val  { font-family: var(--font-mono); font-weight: 700; }

/* Info box paiement */
.paiement-info {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: .85rem;
  margin-top: 10px;
}
`;

function injectCSS() {
  if (!document.getElementById('cmd-view-css')) {
    const s = document.createElement('style');
    s.id = 'cmd-view-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
}

/* ─── Composant principal ─────────────────────────────────────────────────── */
export default function CommandeView() {
  injectCSS();

  const toast = useToast();
  const { t, lang } = useTranslation();
  const sl = (fr, mg) => lang === 'mg' ? mg : fr;

  const [commandes, setCommandes]         = useState([]);
  const [pharmacies, setPharmacies]       = useState([]);
  const [medicaments, setMedicaments]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [statut, setStatut]               = useState('');
  const [showCreate, setShowCreate]       = useState(false);
  const [showFacture, setShowFacture]     = useState(null);
  const [showPayer, setShowPayer]         = useState(null);
  const [montantPaiement, setMontantPaiement] = useState('');
  const [saving, setSaving]               = useState(false);
  const [fromCache, setFromCache]         = useState(false);
  const [form, setForm] = useState({ pharmacie_id: '', note: '', urgence: false, lignes: [] });

  /* ── Chargement ── */
  const loadData = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statut) params.statut = statut;
    Promise.all([api.getCommandes(params), api.getPharmacies(), api.getMedicaments()])
      .then(([cmd, pha, med]) => {
        setCommandes(cmd.data || []);
        setPharmacies(pha.data || []);
        setMedicaments(med.data || []);
        setFromCache(cmd.fromCache || pha.fromCache || med.fromCache);
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [statut]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Lignes médicaments ── */
  const addLigne    = () => setForm(f => ({ ...f, lignes: [...f.lignes, { medicament_id: '', quantite: 1 }] }));
  const removeLigne = i  => setForm(f => ({ ...f, lignes: f.lignes.filter((_, idx) => idx !== i) }));
  const updateLigne = (i, field, val) => setForm(f => {
    const lignes = [...f.lignes]; lignes[i] = { ...lignes[i], [field]: val }; return { ...f, lignes };
  });

  const getMed          = id  => medicaments.find(m => m.id === parseInt(id));
  const totalCommande   = form.lignes.reduce((s, l) => s + (l.quantite * (getMed(l.medicament_id)?.prix_vente || 0)), 0);
  const beneficeEstime  = form.lignes.reduce((s, l) => {
    const m = getMed(l.medicament_id);
    return s + (m ? l.quantite * (m.prix_vente - m.prix_achat) : 0);
  }, 0);

  /* ── Actions ── */
  const handleCreate = async e => {
    e.preventDefault();
    if (!form.pharmacie_id || form.lignes.length === 0) {
      toast.error(sl('Sélectionnez une pharmacie et au moins un médicament', 'Mifidiana tsena fanafody sy fanafody iray'));
      return;
    }
    setSaving(true);
    try {
      await api.createCommande({
        pharmacie_id: parseInt(form.pharmacie_id),
        note: form.note,
        urgence: form.urgence ? 1 : 0,
        lignes: form.lignes.map(l => ({ medicament_id: parseInt(l.medicament_id), quantite: parseInt(l.quantite) })),
      });
      toast.success(sl('Commande créée avec succès', 'Voaforona ny baiko'));
      setShowCreate(false);
      setForm({ pharmacie_id: '', note: '', urgence: false, lignes: [] });
      loadData();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleValider = async id => {
    try { await api.validerCommande(id); toast.success(sl('Commande validée', 'Nanamafina ny baiko')); loadData(); }
    catch (err) { toast.error(err.message); }
  };

  const handlePayer = async () => {
    const montant = parseFloat(montantPaiement);
    if (!montant || montant <= 0) { toast.error(sl('Montant invalide', 'Tsy mety ny vola')); return; }
    setSaving(true);
    try {
      await api.payerCommande(showPayer.id, montant);
      toast.success(sl('Paiement enregistré', 'Voatahiry ny fandoavana'));
      const updated = await api.getCommandeById(showPayer.id);
      setShowPayer(null); setShowFacture(updated.data); setMontantPaiement('');
      loadData();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async cmd => {
    if (!window.confirm(`${sl('Annuler la commande', 'Foànana ny baiko')} #${cmd.id} ?`)) return;
    try {
      await api.deleteCommande(cmd.id);
      toast.success(sl('Commande annulée — stock remis', 'Nofoànana ny baiko — averina ny fitahirizana'));
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const openFacture = async cmd => {
    try { const res = await api.getCommandeById(cmd.id); setShowFacture(res.data); }
    catch (err) { toast.error(err.message); }
  };

  const statusLabel = s => STATUS_KEYS[s]?.[lang] || STATUS_KEYS[s]?.fr || s;

  const countLabel = lang === 'mg'
    ? `${commandes.length} baiko`
    : `${commandes.length} commande${commandes.length > 1 ? 's' : ''}`;

  /* ─── Colonnes du tableau adaptées à la langue ─────────────────────────── */
  // En malagasy les libellés de colonnes sont plus longs → on masque 2 colonnes
  // peu critiques (benefice, montant_paye) dans un tooltip / colonne compacte
  const isMg = lang === 'mg';

  return (
    <div>
      <Toast toasts={toast.toasts} removeToast={toast.removeToast} />
      {fromCache && (
        <div className="offline-banner" style={{ fontSize: '.8rem' }}>
          {t('donneesCache')} — {t('horsligne')}
        </div>
      )}

      {/* ── En-tête ── */}
      <div className="page-header">
        <div>
          <div className="page-title">{t('commandes')}</div>
          <div className="page-subtitle">{countLabel}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('nouvelleCommande')}
        </button>
      </div>

      {/* ── Filtre statut ── */}
      <div className="filters-bar">
        <select
          value={statut}
          onChange={e => setStatut(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid var(--border)', minWidth: isMg ? 210 : 180 }}
        >
          <option value="">{sl('Tous les statuts', 'Toetran\'asa rehetra')}</option>
          {Object.entries(STATUS_KEYS).map(([k, v]) =>
            <option key={k} value={k}>{v[lang] || v.fr}</option>
          )}
        </select>
      </div>

      {/* ── Tableau ── */}
      {loading ? <div className="loader"><div className="spinner" /></div> : (
        <div className="cmd-table-wrap">
          <table className="cmd-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>#</th>
                <th>{t('pharmacie')}</th>
                <th style={{ width: isMg ? 110 : 130 }}>{t('date')}</th>
                <th style={{ width: isMg ? 130 : 120 }}>{t('montantTotal')}</th>
                {/* En français : 2 colonnes séparées. En malagasy : 1 seule colonne groupée pour gagner de la place */}
                {!isMg && <th style={{ width: 110 }}>{t('montantPaye')}</th>}
                <th style={{ width: isMg ? 130 : 110 }}>
                  {isMg ? (
                    <span title={`${t('montantPaye')} / ${t('resteAPayer')}`}>
                      {t('montantPaye')} / {t('resteAPayer')}
                    </span>
                  ) : t('resteAPayer')}
                </th>
                <th style={{ width: 100 }}>{t('statut')}</th>
                <th style={{ width: isMg ? 110 : 140 }}>{sl('Actions', 'Hetsika')}</th>
              </tr>
            </thead>
            <tbody>
              {commandes.length === 0 ? (
                <tr>
                  <td colSpan={isMg ? 7 : 8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    {t('aucunResultat')}
                  </td>
                </tr>
              ) : commandes.map(cmd => {
                const reste = (cmd.montant_total || 0) - (cmd.montant_paye || 0);
                return (
                  <tr key={cmd.id}>
                    {/* # + badge urgence */}
                    <td>
                      <div className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>
                        #{String(cmd.id).padStart(5, '0')}
                      </div>
                      {cmd.urgence === 1 && (
                        <span className="badge badge-danger" style={{ marginTop: 3, display: 'inline-block', fontSize: '.65rem' }}>
                          {t('urgente')}
                        </span>
                      )}
                    </td>

                    {/* Pharmacie */}
                    <td>
                      <div style={{ fontWeight: 500, lineHeight: 1.3 }}>{cmd.pharmacie_nom}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {cmd.pharmacie_adresse?.substring(0, 35)}
                      </div>
                    </td>

                    {/* Date */}
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(cmd.created_at)}
                    </td>

                    {/* Montant total */}
                    <td className="font-mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatMoney(cmd.montant_total)}
                    </td>

                    {/* Montant payé (visible seulement en français) */}
                    {!isMg && (
                      <td className="font-mono" style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                        {formatMoney(cmd.montant_paye)}
                      </td>
                    )}

                    {/* Reste à payer — en malagasy : payé + reste sur 2 lignes */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isMg ? (
                        <div style={{ lineHeight: 1.6 }}>
                          <div className="font-mono" style={{ fontSize: '.78rem', color: 'var(--accent)' }}>
                            ↑ {formatMoney(cmd.montant_paye)}
                          </div>
                          <div className="font-mono" style={{ fontSize: '.82rem', fontWeight: 700, color: reste > 0 ? 'var(--danger)' : 'var(--accent)' }}>
                            {reste > 0 ? `↓ ${formatMoney(reste)}` : '✓'}
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono" style={{ color: reste > 0 ? 'var(--danger)' : 'var(--accent)', fontWeight: 600 }}>
                          {reste > 0 ? formatMoney(reste) : '—'}
                        </span>
                      )}
                    </td>

                    {/* Statut */}
                    <td>
                      <span className={`badge ${STATUS_BADGES[cmd.statut] || 'badge-secondary'}`}>
                        {statusLabel(cmd.statut)}
                      </span>
                    </td>

                    {/* Actions — colonne verticale, boutons pleine largeur */}
                    <td style={{ padding: '8px 10px' }}>
                      <div className="cmd-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => openFacture(cmd)}>
                          {t('facture')}
                        </button>
                        {cmd.statut === 'en_attente' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleValider(cmd.id)}>
                            {t('valider')}
                          </button>
                        )}
                        {['en_attente', 'validee', 'livree'].includes(cmd.statut) && reste > 0 && (
                          <button className="btn btn-success btn-sm" onClick={() => { setShowPayer(cmd); setMontantPaiement(String(reste)); }}>
                            {t('payer')}
                          </button>
                        )}
                        {cmd.statut === 'en_attente' && (
                          <button
                            className="btn btn-outline btn-sm btn-icon"
                            onClick={() => handleDelete(cmd)}
                            style={{ color: 'var(--danger)', borderColor: 'var(--alerte-border)', padding: '5px 8px' }}
                            title={sl('Annuler la commande', 'Foànana ny baiko')}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Modal — Nouvelle commande
      ══════════════════════════════════════════════════════════════════════ */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{t('nouvelleCommande')}</span>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {/* Pharmacie + Urgence */}
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{t('pharmacie')} *</label>
                    <select
                      value={form.pharmacie_id}
                      onChange={e => setForm(f => ({ ...f, pharmacie_id: e.target.value }))}
                      required
                    >
                      <option value="">{sl('Sélectionner une pharmacie', 'Mifidiana tsena fanafody')}</option>
                      {pharmacies.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      marginBottom: 0, textTransform: 'none', letterSpacing: 0,
                    }}>
                      <input
                        type="checkbox"
                        checked={form.urgence}
                        onChange={e => setForm(f => ({ ...f, urgence: e.target.checked }))}
                        style={{ width: 16, height: 16, flexShrink: 0 }}
                      />
                      <span style={{
                        fontSize: '0.86rem', fontWeight: 600,
                        color: form.urgence ? 'var(--danger)' : 'var(--text-muted)',
                        whiteSpace: isMg ? 'normal' : 'nowrap',
                        lineHeight: 1.3,
                      }}>
                        {sl('Commande urgente', 'Baiko maika')}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Note */}
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label>{sl('Note', 'Fanamarihana')}</label>
                  <input
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    placeholder={sl('Note optionnelle...', 'Fanamarihana tsy voatery...')}
                  />
                </div>

                {/* Lignes médicaments */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <label style={{ marginBottom: 0 }}>{sl('Médicaments *', 'Fanafody *')}</label>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addLigne}>
                      + {sl('Ajouter une ligne', 'Hanampy andalana')}
                    </button>
                  </div>

                  {form.lignes.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', background: 'var(--bg-stripe)', borderRadius: 8, fontSize: '0.84rem', lineHeight: 1.5 }}>
                      {sl(
                        'Cliquez sur "Ajouter une ligne" pour sélectionner des médicaments',
                        'Tsindrio "+ Hanampy andalana" mba hifidy fanafody'
                      )}
                    </div>
                  )}

                  {form.lignes.map((ligne, i) => {
                    const med        = getMed(ligne.medicament_id);
                    const ligneTotal = ligne.quantite * (med?.prix_vente || 0);
                    const ligneBenef = med ? ligne.quantite * (med.prix_vente - med.prix_achat) : 0;
                    return (
                      <div key={i} className="med-ligne">
                        {/* Sélecteur médicament */}
                        <div>
                          <label style={{ fontSize: '0.7rem', marginBottom: 4 }}>
                            {sl('Médicament', 'Fanafody')}
                          </label>
                          <select
                            value={ligne.medicament_id}
                            onChange={e => updateLigne(i, 'medicament_id', e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: '0.84rem' }}
                          >
                            <option value="">{t('selectionner')}…</option>
                            {medicaments.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.nom} ({sl('stock', 'fitahiriz.')}: {m.quantite_stock})
                              </option>
                            ))}
                          </select>
                          {/* Prix unitaire sous le select */}
                          {med && (
                            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                              {sl('Prix', 'Vidiny')}: {med.prix_vente.toLocaleString('fr-FR')} Ar
                            </div>
                          )}
                        </div>

                        {/* Quantité */}
                        <div>
                          <label style={{ fontSize: '0.7rem', marginBottom: 4 }}>{t('quantite')}</label>
                          <input
                            type="number" min="1" max={med?.quantite_stock || 9999}
                            value={ligne.quantite}
                            onChange={e => updateLigne(i, 'quantite', parseInt(e.target.value) || 1)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: '0.84rem' }}
                          />
                        </div>

                        {/* Sous-total + Bénéfice (masqués sur mobile) */}
                        <div className="med-ligne-totals">
                          <div>
                            <label style={{ fontSize: '0.7rem', marginBottom: 4 }}>{t('sousTotal')}</label>
                            <div style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.82rem', color: 'var(--primary)' }}>
                              {ligneTotal ? `${ligneTotal.toLocaleString('fr-FR')} Ar` : '—'}
                            </div>
                          </div>
                        </div>

                        {/* Bouton supprimer */}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm btn-icon"
                          onClick={() => removeLigne(i)}
                          style={{ color: 'var(--danger)', borderColor: 'var(--alerte-border)', alignSelf: 'flex-end', marginBottom: 2 }}
                          title={sl('Supprimer', 'Hamafa')}
                        >✕</button>
                      </div>
                    );
                  })}

                  {/* Résumé total */}
                  {form.lignes.length > 0 && (
                    <div className="cmd-summary">
                      <div className="cmd-summary-item">
                        {sl('Bénéfice estimé', 'Tombony voataona')} :&nbsp;
                        <span className="cmd-summary-val" style={{ color: 'var(--accent)' }}>
                          +{beneficeEstime.toLocaleString('fr-FR')} Ar
                        </span>
                      </div>
                      <div className="cmd-summary-item">
                        {t('total')} :&nbsp;
                        <span className="cmd-summary-val" style={{ color: 'var(--primary)', fontSize: '1.05rem' }}>
                          {totalCommande.toLocaleString('fr-FR')} Ar
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>
                  {t('annuler')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? sl('Création…', 'Famoronana…')
                    : sl('Créer la commande', 'Hamorona baiko')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Modal — Paiement
      ══════════════════════════════════════════════════════════════════════ */}
      {showPayer && (
        <div className="modal-overlay" onClick={() => setShowPayer(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {sl('Enregistrer un paiement', 'Tahirizana ny fandoavana')}
              </span>
              <button className="modal-close" onClick={() => setShowPayer(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Récap commande */}
              <div style={{ padding: 14, background: 'var(--info-bg)', borderRadius: 10, marginBottom: 18 }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  {sl('Commande', 'Baiko')} #{String(showPayer.id).padStart(5, '0')}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{showPayer.pharmacie_nom}</div>
                <div className="paiement-info">
                  <span>
                    {t('total')} :&nbsp;
                    <strong className="font-mono">{formatMoney(showPayer.montant_total)}</strong>
                  </span>
                  <span>
                    {t('resteAPayer')} :&nbsp;
                    <strong className="font-mono" style={{ color: 'var(--danger)' }}>
                      {formatMoney((showPayer.montant_total || 0) - (showPayer.montant_paye || 0))}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>{sl('Montant reçu (Ar) *', 'Vola noraisina (Ar) *')}</label>
                <input
                  type="number"
                  value={montantPaiement}
                  onChange={e => setMontantPaiement(e.target.value)}
                  min="1"
                  required
                  placeholder={sl('Montant en Ariary', 'Vola amin\'ny Ariary')}
                  autoFocus
                />
              </div>

              {/* Raccourcis montant */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {[showPayer.montant_total, (showPayer.montant_total - showPayer.montant_paye)]
                  .filter((v, i, a) => a.indexOf(v) === i && v > 0)
                  .map(v => (
                    <button key={v} type="button" className="btn btn-outline btn-sm" onClick={() => setMontantPaiement(String(v))}>
                      {formatMoney(v)}
                    </button>
                  ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPayer(null)}>{t('annuler')}</button>
              <button className="btn btn-success" onClick={handlePayer} disabled={saving}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {saving
                  ? sl('Enregistrement…', 'Tahirizana…')
                  : sl('Confirmer le paiement', 'Hanamafy ny fandoavana')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Modal — Facture
      ══════════════════════════════════════════════════════════════════════ */}
      {showFacture && (
        <div className="modal-overlay" onClick={() => setShowFacture(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {t('facture')} — CMD-{String(showFacture.id).padStart(5, '0')}
              </span>
              <button className="modal-close" onClick={() => setShowFacture(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <Facture commande={showFacture} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowFacture(null)}>{t('fermer')}</button>
              {['en_attente', 'validee', 'livree'].includes(showFacture.statut) &&
                (showFacture.montant_total - showFacture.montant_paye) > 0 && (
                  <button className="btn btn-success" onClick={() => { setShowPayer(showFacture); setShowFacture(null); }}>
                    {sl('Enregistrer paiement', 'Tahirizana fandoavana')}
                  </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}