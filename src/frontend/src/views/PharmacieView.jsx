// src/views/PharmacieView.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Toast, useToast } from '../components/Toast';
import api from '../services/api';

export default function PharmacieView() {
  const toast = useToast();
  const [pharmacies, setPharmacies] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPassModal, setShowPassModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingAll, setResettingAll] = useState(false);
  const [form, setForm] = useState({ nom: '', adresse: '', telephone: '', email: '', contact_nom: '', mot_de_passe: '' });
  const debounceRef = useRef(null);

  // Debounce: attendre 350ms après la dernière frappe avant de lancer la recherche
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.getPharmacies({ stats: true, search: debouncedSearch }), api.getProvinces()])
      .then(([res, prov]) => {
        setPharmacies(res.data || []);
        setProvinces(prov.data || []);
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ nom: '', adresse: '', telephone: '', email: '', contact_nom: '', mot_de_passe: 'Client123' });
    setEditItem(null); setShowModal(true);
  };
  const openEdit = p => {
    setForm({ nom: p.nom || '', adresse: p.adresse || '', telephone: p.telephone || '', email: p.email || '', contact_nom: p.contact_nom || '', mot_de_passe: '' });
    setEditItem(p); setShowModal(true);
  };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (editItem) {
        await api.updatePharmacie(editItem.id, form);
        toast.success('Pharmacie mise à jour');
      } else {
        await api.createPharmacie(form);
        toast.success('Pharmacie créée — mot de passe : ' + (form.mot_de_passe || 'Client123'));
      }
      setShowModal(false); load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async p => {
    if (!window.confirm(`Supprimer "${p.nom}" ?`)) return;
    try { await api.deletePharmacie(p.id); toast.success('Supprimée'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 4) { toast.error('Mot de passe trop court (min 4 caractères)'); return; }
    try {
      await api.changePharmaciePassword(showPassModal.id, newPassword);
      toast.success(`Mot de passe changé pour ${showPassModal.nom}`);
      setShowPassModal(null); setNewPassword('');
    } catch (err) { toast.error(err.message); }
  };

  const handleResetAll = async () => {
    if (!window.confirm('Réinitialiser le mot de passe de TOUTES les pharmacies à "Client123" ?')) return;
    setResettingAll(true);
    try {
      await api.resetAllPharmaciePasswords();
      toast.success('Tous les mots de passe réinitialisés à "Client123"');
    } catch (err) { toast.error(err.message); }
    finally { setResettingAll(false); }
  };

  const fmtMoney = n => `${Number(n || 0).toLocaleString('fr-FR')} Ar`;

  return (
    <div>
      <Toast toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="page-header">
        <div>
          <div className="page-title">Pharmacies</div>
          <div className="page-subtitle">{pharmacies.length} pharmacie{pharmacies.length > 1 ? 's' : ''} dans votre province</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={handleResetAll} disabled={resettingAll}
            style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}>
            {resettingAll ? 'Réinitialisation...' : 'Reset tous les MDP → Client123'}
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Ajouter
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, adresse, contact..."
            style={{ width: '100%', padding: '9px 36px 9px 36px', borderRadius: 8, border: '1.5px solid var(--border)', boxSizing: 'border-box' }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1, padding: 2 }}>
              ✕
            </button>
          )}
        </div>
        {debouncedSearch && !loading && (
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            {pharmacies.length} résultat{pharmacies.length !== 1 ? 's' : ''} pour <strong style={{ marginLeft: 4 }}>"{debouncedSearch}"</strong>
          </div>
        )}
      </div>

      {loading ? <div className="loader"><div className="spinner" /></div> : (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Pharmacie</th><th>Contact</th><th>Téléphone</th><th>Commandes</th><th>Total achats</th><th>Accès</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {pharmacies.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune pharmacie</td></tr>
              ) : pharmacies.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.nom}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.adresse}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{p.contact_nom || '—'}</td>
                  <td style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{p.telephone || '—'}</td>
                  <td className="font-mono" style={{ fontWeight: 600, textAlign: 'center' }}>{p.nb_commandes || 0}</td>
                  <td className="font-mono" style={{ color: 'var(--accent)' }}>{fmtMoney(p.total_achats)}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => { setShowPassModal(p); setNewPassword(''); }}
                      style={{ fontSize: '.72rem' }}>MDP</button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleDelete(p)} style={{ color: 'var(--danger)', borderColor: 'var(--alerte-border)' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ajouter/Modifier pharmacie */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editItem ? 'Modifier la pharmacie' : 'Ajouter une pharmacie'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group"><label>Nom *</label><input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required /></div>
                <div className="form-group"><label>Adresse *</label><input value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} required /></div>
                <div className="form-row">
                  <div className="form-group"><label>Téléphone</label><input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} /></div>
                  <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label>Contact (nom)</label><input value={form.contact_nom} onChange={e => setForm(f => ({ ...f, contact_nom: e.target.value }))} /></div>
                {!editItem && (
                  <div className="form-group">
                    <label>Mot de passe initial</label>
                    <input type="text" value={form.mot_de_passe} onChange={e => setForm(f => ({ ...f, mot_de_passe: e.target.value }))} placeholder="Client123" />
                    <div style={{ fontSize: '.74rem', color: 'var(--text-muted)', marginTop: 4 }}>Laissez vide pour utiliser "Client123" par défaut</div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : (editItem ? 'Mettre à jour' : 'Créer')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Changer mot de passe */}
      {showPassModal && (
        <div className="modal-overlay" onClick={() => setShowPassModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Changer le mot de passe</span>
              <button className="modal-close" onClick={() => setShowPassModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '10px 14px', background: 'var(--info-bg)', borderRadius: 8, marginBottom: 16, fontSize: '.85rem' }}>
                <strong>{showPassModal.nom}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '.78rem', marginTop: 4 }}>{showPassModal.adresse}</div>
              </div>
              <div className="form-group">
                <label>Nouveau mot de passe *</label>
                <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Ex: Client123" autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setNewPassword('Client123')}>Remettre Client123</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPassModal(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleChangePassword}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
