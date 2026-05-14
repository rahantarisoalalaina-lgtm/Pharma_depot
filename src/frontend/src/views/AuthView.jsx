// src/views/AuthView.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import api from '../services/api';

export default function AuthView() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'pharmacie'
  const [provinces, setProvinces] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingProvinces, setLoadingProvinces] = useState(true);

  // Gestionnaire form
  const [gForm, setGForm] = useState({ email: '', mot_de_passe: '' });

  // Pharmacie form
  const [province_id, setProvinceId] = useState('');
  const [pharmacie_id, setPharmacieId] = useState('');
  const [pharmPassword, setPharmPassword] = useState('');
  const [loadingPharmas, setLoadingPharmas] = useState(false);

  useEffect(() => {
    setLoadingProvinces(true);
    api.getProvinces()
      .then(r => setProvinces(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingProvinces(false));
  }, []);

  useEffect(() => {
    if (province_id) {
      setPharmacieId('');
      setLoadingPharmas(true);
      api.getPharmaciesParProvince(province_id)
        .then(r => setPharmacies(r.data || []))
        .catch(() => setPharmacies([]))
        .finally(() => setLoadingPharmas(false));
    } else {
      setPharmacies([]);
      setPharmacieId('');
    }
  }, [province_id]);

  const handleGestionnaireLogin = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.login({ email: gForm.email, mot_de_passe: gForm.mot_de_passe });
      const userData = res.data.gestionnaire;
      login({ ...userData, role: 'gestionnaire' }, res.data.token);
    } catch(err) {
      setError(err.message || 'Vérifiez vos identifiants. Backend doit tourner sur le port 5000.');
    } finally { setLoading(false); }
  };

  const handlePharmacieLogin = async e => {
    e.preventDefault();
    if (!pharmacie_id) { setError('Sélectionnez votre pharmacie'); return; }
    if (!pharmPassword) { setError('Entrez votre mot de passe'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.pharmacieLogin({ pharmacie_id: parseInt(pharmacie_id), mot_de_passe: pharmPassword });
      const pharma = res.data.pharmacie;
      login({
        id: pharma.id,
        nom: pharma.nom,
        prenom: pharma.contact_nom || pharma.nom,
        role: 'client',
        province_id: pharma.province_id,
        province_nom: pharma.province_nom || '',
        pharmacie_id: pharma.id,
        pharmacie_nom: pharma.nom,
      }, res.data.token);
    } catch(err) {
      setError(err.message || 'Mot de passe incorrect');
    } finally { setLoading(false); }
  };

  const selectedPharma = pharmacies.find(p => p.id === parseInt(pharmacie_id));
  const selectedProvince = provinces.find(p => p.id === parseInt(province_id));

  // Province colors
  const provColors = ['#2980B9','#27AE60','#E67E22','#8E44AD','#C0392B','#16A085'];

  return (
    <div className="auth-page">
      {/* Panneau gauche — Dépôts provinciaux */}
      <div className="auth-brand">
        <div className="auth-brand-logo">+</div>
        <h1>Dépôt Pharma</h1>
        <p style={{ marginBottom: 32 }}>Gestion des stocks, commandes et livraisons — Madagascar</p>

        <div style={{ width: '100%', maxWidth: 340 }}>
          <div style={{ fontSize: '.76rem', fontWeight: 700, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
            Dépôts par province ({provinces.length})
          </div>
          {loadingProvinces ? (
            <div style={{ opacity: .5, fontSize: '.82rem' }}>Chargement...</div>
          ) : provinces.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
              padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.09)',
              cursor: 'pointer', transition: 'background .15s',
              border: `1px solid rgba(255,255,255,.08)`
            }}
              onClick={() => { setMode('pharmacie'); setProvinceId(String(p.id)); }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: provColors[i % provColors.length] + '55',
                border: `2px solid ${provColors[i % provColors.length]}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.72rem', fontWeight: 700, flexShrink: 0, color: 'white'
              }}>
                {p.code?.slice(0, 4) || p.nom.slice(0, 4).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'rgba(255,255,255,.95)' }}>{p.nom}</div>
                <div style={{ fontSize: '.72rem', opacity: .65, marginTop: 1 }}>{p.description}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '.82rem', fontWeight: 700, color: provColors[i % provColors.length], fontFamily: 'monospace' }}>
                  {p.nb_medicaments ?? '—'}
                </div>
                <div style={{ fontSize: '.65rem', opacity: .55 }}>médicaments</div>
                <div style={{ fontSize: '.7rem', opacity: .7, marginTop: 2, fontFamily: 'monospace' }}>
                  {p.nb_pharmacies ?? 0} pharm.
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,.07)', fontSize: '.74rem', opacity: .7, textAlign: 'center' }}>
          Cliquez sur un dépôt pour vous connecter en tant que pharmacie
        </div>
      </div>

      {/* Panneau droit — Formulaire */}
      <div className="auth-form-side">
        <div className="auth-form-inner">
          <h2>{mode === 'login' ? 'Connexion Gestionnaire' : 'Connexion Pharmacie'}</h2>
          <p style={{ marginBottom: 20 }}>
            {mode === 'login'
              ? 'Accédez au tableau de bord de votre dépôt provincial.'
              : 'Sélectionnez votre pharmacie et entrez votre mot de passe.'}
          </p>

          {/* Tabs */}
          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>
              Gestionnaire
            </button>
            <button className={`auth-tab ${mode === 'pharmacie' ? 'active' : ''}`} onClick={() => { setMode('pharmacie'); setError(''); }}>
              Pharmacie
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {/* Formulaire Gestionnaire */}
          {mode === 'login' && (
            <form onSubmit={handleGestionnaireLogin}>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={gForm.email}
                  onChange={e => setGForm(f => ({ ...f, email: e.target.value }))}
                  required placeholder="admin.tana@depot.mg" autoComplete="email" />
              </div>
              <div className="form-group">
                <label>Mot de passe *</label>
                <input type="password" value={gForm.mot_de_passe}
                  onChange={e => setGForm(f => ({ ...f, mot_de_passe: e.target.value }))}
                  required placeholder="••••••••" autoComplete="current-password" />
              </div>
              <button type="submit" className="btn btn-primary w-full btn-lg"
                disabled={loading} style={{ justifyContent: 'center', marginTop: 4 }}>
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>

              <div className="auth-demo">
                <div className="auth-demo-title">Comptes démo — mot de passe : Admin1234!</div>
                {provinces.map(p => (
                  <div key={p.id} className="auth-demo-item"
                    onClick={() => setGForm({ email: `admin.${(p.code||p.nom.slice(0,4)).toLowerCase()}@depot.mg`, mot_de_passe: 'Admin1234!' })}
                    style={{ cursor: 'pointer', color: 'var(--primary)', padding: '3px 0' }}>
                    → {p.nom}
                  </div>
                ))}
              </div>
            </form>
          )}

          {/* Formulaire Pharmacie */}
          {mode === 'pharmacie' && (
            <form onSubmit={handlePharmacieLogin}>
              <div className="form-group">
                <label>Province *</label>
                <select value={province_id} onChange={e => setProvinceId(e.target.value)}>
                  <option value="">— Sélectionner votre province —</option>
                  {provinces.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nom} ({p.nb_medicaments ?? '?'} médicaments · {p.nb_pharmacies ?? 0} pharmacies)
                    </option>
                  ))}
                </select>
              </div>

              {province_id && (
                <div className="form-group">
                  <label>Votre pharmacie *</label>
                  {loadingPharmas ? (
                    <div style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: '.85rem' }}>⏳ Chargement des pharmacies...</div>
                  ) : pharmacies.length === 0 ? (
                    <div style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: '.85rem' }}>Aucune pharmacie dans cette province.</div>
                  ) : (
                    <select value={pharmacie_id} onChange={e => setPharmacieId(e.target.value)} required>
                      <option value="">— Sélectionner votre pharmacie —</option>
                      {pharmacies.map(p => (
                        <option key={p.id} value={p.id}>{p.nom}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Info pharmacie sélectionnée */}
              {selectedPharma && (
                <div style={{ padding: '10px 14px', background: 'var(--info-bg)', borderRadius: 8, marginBottom: 14, fontSize: '.82rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700 }}>{selectedPharma.nom}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 3 }}>{selectedPharma.adresse}</div>
                  {selectedPharma.contact_nom && <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{selectedPharma.contact_nom}</div>}
                  {selectedPharma.telephone && <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>📞 {selectedPharma.telephone}</div>}
                </div>
              )}

              {pharmacie_id && (
                <div className="form-group">
                  <label>Mot de passe *</label>
                  <input type="password" value={pharmPassword}
                    onChange={e => setPharmPassword(e.target.value)}
                    required placeholder="••••••••" autoComplete="current-password" autoFocus />
                  <div style={{ fontSize: '.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Mot de passe par défaut : <strong>Client123</strong>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full btn-lg"
                disabled={loading || !pharmacie_id || !province_id} style={{ justifyContent: 'center', marginTop: 4 }}>
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>

              {selectedProvince && (
                <div className="auth-demo" style={{ marginTop: 12 }}>
                  <div className="auth-demo-title">Province sélectionnée</div>
                  <div className="auth-demo-item">
                    <strong>{selectedProvince.nom}</strong> — {selectedProvince.nb_medicaments} médicaments · {selectedProvince.nb_pharmacies} pharmacies
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
