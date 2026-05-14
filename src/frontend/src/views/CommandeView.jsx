// src/views/CommandeView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Toast, useToast } from '../components/Toast';
import Facture from '../components/Facture';
import { useTranslation } from '../App';
import api from '../services/api';

function formatMoney(n) { return `${Number(n || 0).toLocaleString('fr-FR')} Ar`; }
function formatDate(s) { if (!s) return '-'; return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

const STATUS_LABELS = { en_attente: 'En attente', validee: 'Validée', livree: 'Livrée', paye: 'Payée', annulee: 'Annulée' };
const STATUS_BADGES = { en_attente: 'badge-warning', validee: 'badge-info', livree: 'badge-primary', paye: 'badge-success', annulee: 'badge-danger' };

export default function CommandeView() {
  const toast = useToast();
  const { t, lang } = useTranslation();
  const [commandes, setCommandes] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statut, setStatut] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showFacture, setShowFacture] = useState(null);
  const [showPayer, setShowPayer] = useState(null);
  const [montantPaiement, setMontantPaiement] = useState('');
  const [saving, setSaving] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [form, setForm] = useState({ pharmacie_id: '', note: '', urgence: false, lignes: [] });

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

  const addLigne = () => setForm(f => ({ ...f, lignes: [...f.lignes, { medicament_id: '', quantite: 1 }] }));
  const removeLigne = i => setForm(f => ({ ...f, lignes: f.lignes.filter((_, idx) => idx !== i) }));
  const updateLigne = (i, field, val) => setForm(f => {
    const lignes = [...f.lignes]; lignes[i] = { ...lignes[i], [field]: val }; return { ...f, lignes };
  });

  const getMed = id => medicaments.find(m => m.id === parseInt(id));
  const totalCommande = form.lignes.reduce((s, l) => s + (l.quantite * (getMed(l.medicament_id)?.prix_vente || 0)), 0);
  const beneficeEstime = form.lignes.reduce((s, l) => {
    const m = getMed(l.medicament_id);
    return s + (m ? l.quantite * (m.prix_vente - m.prix_achat) : 0);
  }, 0);

  const handleCreate = async e => {
    e.preventDefault();
    if (!form.pharmacie_id || form.lignes.length === 0) { toast.error('Sélectionnez une pharmacie et au moins un médicament'); return; }
    setSaving(true);
    try {
      await api.createCommande({
        pharmacie_id: parseInt(form.pharmacie_id),
        note: form.note, urgence: form.urgence ? 1 : 0,
        lignes: form.lignes.map(l => ({ medicament_id: parseInt(l.medicament_id), quantite: parseInt(l.quantite) }))
      });
      toast.success('Commande créée avec succès');
      setShowCreate(false);
      setForm({ pharmacie_id: '', note: '', urgence: false, lignes: [] });
      loadData();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleValider = async id => {
    try { await api.validerCommande(id); toast.success('Commande validée'); loadData(); }
    catch (err) { toast.error(err.message); }
  };

  const handlePayer = async () => {
    const montant = parseFloat(montantPaiement);
    if (!montant || montant <= 0) { toast.error('Montant invalide'); return; }
    setSaving(true);
    try {
      await api.payerCommande(showPayer.id, montant);
      toast.success('Paiement enregistré');
      const updated = await api.getCommandeById(showPayer.id);
      setShowPayer(null); setShowFacture(updated.data); setMontantPaiement('');
      loadData();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async cmd => {
    if (!window.confirm(`Annuler la commande #${cmd.id} ?`)) return;
    try { await api.deleteCommande(cmd.id); toast.success('Commande annulée — stock remis'); loadData(); }
    catch (err) { toast.error(err.message); }
  };

  const openFacture = async cmd => {
    try { const res = await api.getCommandeById(cmd.id); setShowFacture(res.data); }
    catch (err) { toast.error(err.message); }
  };

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
          <div className="page-title">Commandes</div>
          <div className="page-subtitle">{commandes.length} commande{commandes.length > 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouvelle commande
        </button>
      </div>

      <div className="filters-bar">
        <select value={statut} onChange={e => setStatut(e.target.value)} style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid var(--border)', minWidth: 180 }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? <div className="loader"><div className="spinner" /></div> : (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>#</th><th>Pharmacie</th><th>Date</th><th>Montant total</th><th>Montant payé</th><th>Reste</th><th>Bénéfice</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {commandes.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune commande</td></tr>
              ) : commandes.map(cmd => {
                const reste = (cmd.montant_total || 0) - (cmd.montant_paye || 0);
                return (
                  <tr key={cmd.id}>
                    <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                      #{String(cmd.id).padStart(5, '0')}
                      {cmd.urgence === 1 && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Urgent</span>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{cmd.pharmacie_nom}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cmd.pharmacie_adresse?.substring(0, 40)}</div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{formatDate(cmd.created_at)}</td>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{formatMoney(cmd.montant_total)}</td>
                    <td className="font-mono" style={{ color: 'var(--accent)' }}>{formatMoney(cmd.montant_paye)}</td>
                    <td className="font-mono" style={{ color: reste > 0 ? 'var(--danger)' : 'var(--accent)', fontWeight: 600 }}>
                      {reste > 0 ? formatMoney(reste) : '—'}
                    </td>
                    <td className="font-mono" style={{ color: 'var(--warning)', fontSize: '.82rem' }}>
                      {['livree','paye'].includes(cmd.statut) ? '—' : <span style={{ opacity: .6 }}>En attente</span>}
                    </td>
                    <td><span className={`badge ${STATUS_BADGES[cmd.statut] || 'badge-secondary'}`}>{STATUS_LABELS[cmd.statut] || cmd.statut}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openFacture(cmd)}>Facture</button>
                        {cmd.statut === 'en_attente' && <button className="btn btn-primary btn-sm" onClick={() => handleValider(cmd.id)}>Valider</button>}
                        {['en_attente','validee','livree'].includes(cmd.statut) && reste > 0 && (
                          <button className="btn btn-success btn-sm" onClick={() => { setShowPayer(cmd); setMontantPaiement(String(reste)); }}>Payer</button>
                        )}
                        {cmd.statut === 'en_attente' && (
                          <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleDelete(cmd)} style={{ color: 'var(--danger)', borderColor: 'var(--alerte-border)' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
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

      {/* Modal Nouvelle commande */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nouvelle commande</span>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Pharmacie *</label>
                    <select value={form.pharmacie_id} onChange={e => setForm(f => ({ ...f, pharmacie_id: e.target.value }))} required>
                      <option value="">Sélectionner une pharmacie</option>
                      {pharmacies.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0, textTransform: 'none', letterSpacing: 0 }}>
                      <input type="checkbox" checked={form.urgence} onChange={e => setForm(f => ({ ...f, urgence: e.target.checked }))} style={{ width: 16, height: 16 }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: form.urgence ? 'var(--danger)' : 'var(--text-muted)' }}>Commande urgente</span>
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Note</label>
                  <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Note optionnelle..." />
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <label style={{ marginBottom: 0 }}>Médicaments *</label>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addLigne}>+ Ajouter une ligne</button>
                  </div>
                  {form.lignes.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', background: 'var(--bg-stripe)', borderRadius: 8, fontSize: '0.85rem' }}>
                      Cliquez sur "Ajouter une ligne" pour sélectionner des médicaments
                    </div>
                  )}
                  {form.lignes.map((ligne, i) => {
                    const med = getMed(ligne.medicament_id);
                    const ligneTotal = ligne.quantite * (med?.prix_vente || 0);
                    const ligneBenef = med ? ligne.quantite * (med.prix_vente - med.prix_achat) : 0;
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 100px 130px 110px auto', gap: 8, alignItems: 'end', marginBottom: 10, padding: 12, background: 'var(--bg-stripe)', borderRadius: 8 }}>
                        <div>
                          <label style={{ fontSize: '0.72rem' }}>Médicament</label>
                          <select value={ligne.medicament_id} onChange={e => updateLigne(i, 'medicament_id', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: '0.85rem' }}>
                            <option value="">Sélectionner...</option>
                            {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom} (stock: {m.quantite_stock})</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem' }}>Quantité</label>
                          <input type="number" min="1" max={med?.quantite_stock || 9999} value={ligne.quantite}
                            onChange={e => updateLigne(i, 'quantite', parseInt(e.target.value) || 1)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem' }}>Sous-total</label>
                          <div style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.82rem', color: 'var(--primary)' }}>
                            {ligneTotal ? `${ligneTotal.toLocaleString('fr-FR')} Ar` : '—'}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem' }}>Bénéfice</label>
                          <div style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: ligneBenef > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {ligneBenef ? `+${ligneBenef.toLocaleString('fr-FR')} Ar` : '—'}
                          </div>
                        </div>
                        <button type="button" className="btn btn-outline btn-sm btn-icon" onClick={() => removeLigne(i)} style={{ color: 'var(--danger)', borderColor: 'var(--alerte-border)', alignSelf: 'flex-end' }}>✕</button>
                      </div>
                    );
                  })}
                  {form.lignes.length > 0 && (
                    <div style={{ textAlign: 'right', marginTop: 12, padding: '12px 16px', background: 'var(--info-bg)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Bénéfice estimé : <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{beneficeEstime.toLocaleString('fr-FR')} Ar</span>
                        </span>
                        <span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Total : </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', fontSize: '1.05rem' }}>{totalCommande.toLocaleString('fr-FR')} Ar</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Création...' : 'Créer la commande'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Paiement */}
      {showPayer && (
        <div className="modal-overlay" onClick={() => setShowPayer(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Enregistrer un paiement</span>
              <button className="modal-close" onClick={() => setShowPayer(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: 16, background: 'var(--info-bg)', borderRadius: 10, marginBottom: 20 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Commande #{String(showPayer.id).padStart(5, '0')}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{showPayer.pharmacie_nom}</div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Total : <strong className="font-mono">{formatMoney(showPayer.montant_total)}</strong></span>
                  <span>Reste : <strong className="font-mono" style={{ color: 'var(--danger)' }}>{formatMoney((showPayer.montant_total || 0) - (showPayer.montant_paye || 0))}</strong></span>
                </div>
              </div>
              <div className="form-group">
                <label>Montant reçu en espèces (Ar) *</label>
                <input type="number" value={montantPaiement} onChange={e => setMontantPaiement(e.target.value)} min="1" required placeholder="Montant en Ariary" autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {[showPayer.montant_total, (showPayer.montant_total - showPayer.montant_paye)].filter((v, i, a) => a.indexOf(v) === i && v > 0).map(v => (
                  <button key={v} type="button" className="btn btn-outline btn-sm" onClick={() => setMontantPaiement(String(v))}>{formatMoney(v)}</button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPayer(null)}>Annuler</button>
              <button className="btn btn-success" onClick={handlePayer} disabled={saving}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                {saving ? 'Enregistrement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Facture */}
      {showFacture && (
        <div className="modal-overlay" onClick={() => setShowFacture(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Facture — CMD-{String(showFacture.id).padStart(5, '0')}</span>
              <button className="modal-close" onClick={() => setShowFacture(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}><Facture commande={showFacture} /></div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowFacture(null)}>Fermer</button>
              {['en_attente','validee','livree'].includes(showFacture.statut) && (showFacture.montant_total - showFacture.montant_paye) > 0 && (
                <button className="btn btn-success" onClick={() => { setShowPayer(showFacture); setShowFacture(null); }}>Enregistrer paiement</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
