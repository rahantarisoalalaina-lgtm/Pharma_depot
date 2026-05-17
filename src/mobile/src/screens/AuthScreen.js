// src/screens/AuthScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useAuth }    from '../context/AuthContext';
import { useTheme }   from '../context/ThemeContext';
import { useOffline } from '../context/OfflineContext';
import api, { PROVINCES_STATIQUES } from '../services/api';

export default function AuthScreen() {
  const { login }               = useAuth();
  const { colors, toggleTheme, isDark } = useTheme();
  const { isOnline }            = useOffline();

  const [role,       setRole]       = useState('gestionnaire');
  const [provinces,  setProvinces]  = useState(PROVINCES_STATIQUES);
  const [pharmacies, setPharmacies] = useState([]);
  const [loadingPh,  setLoadingPh]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [form,       setForm]       = useState({ email: '', mot_de_passe: '', province_id: '', pharmacie_id: '' });
  const [showProv,   setShowProv]   = useState(false);
  const [showPharma, setShowPharma] = useState(false);

  useEffect(() => {
    api.getProvinces()
      .then(r => { if ((r.data || []).length > 0) setProvinces(r.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (role === 'client' && form.province_id) {
      setLoadingPh(true); setPharmacies([]);
      api.getPharmaciesProvince(form.province_id)
        .then(r => setPharmacies(r.data || []))
        .catch(() => setPharmacies([]))
        .finally(() => setLoadingPh(false));
    }
  }, [role, form.province_id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selProv   = provinces.find(p  => String(p.id)  === String(form.province_id));
  const selPharma = pharmacies.find(p => String(p.id)  === String(form.pharmacie_id));

  const handleSubmit = async () => {
    setError('');
    if (role === 'gestionnaire' && !form.email)    { setError('Entrez votre email'); return; }
    if (!form.mot_de_passe)                        { setError('Entrez votre mot de passe'); return; }
    if (role === 'client' && !form.pharmacie_id)   { setError('Selectionnez votre pharmacie'); return; }
    if (!isOnline) { setError('Connexion impossible hors ligne.'); return; }
    setLoading(true);
    try {
      let res, userData;
      if (role === 'gestionnaire') {
        res = await api.loginGestionnaire({ email: form.email, mot_de_passe: form.mot_de_passe });
        userData = res.data.gestionnaire;
      } else {
        res = await api.loginClient({ pharmacie_id: parseInt(form.pharmacie_id), mot_de_passe: form.mot_de_passe });
        const ph = res.data.pharmacie;
        userData = {
          id: ph.id, nom: ph.nom, prenom: ph.contact_nom || ph.nom,
          province_id: ph.province_id, province_nom: ph.province_nom || selProv?.nom || '',
          pharmacie_id: ph.id, pharmacie_nom: ph.nom,
        };
      }
      await login(userData, res.data.token, role);
    } catch (e) { setError(e.message || 'Identifiants incorrects.'); }
    finally { setLoading(false); }
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={[s.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {!isOnline && (
          <View style={[s.banner, { backgroundColor: colors.warning }]}>
            <Text style={s.bannerTxt}>Hors ligne — les provinces sont disponibles, la connexion necessite le reseau</Text>
          </View>
        )}

        {/* Header */}
        <View style={s.hero}>
          <View style={[s.logoBox, { backgroundColor: colors.primary }]}>
            <Text style={s.logoTxt}>+</Text>
          </View>
          <Text style={[s.appName, { color: colors.textPrimary }]}>Depot de Pharmacie</Text>
          <Text style={[s.appSub,  { color: colors.textMuted }]}>Madagascar — Gestion provinciale</Text>
          <TouchableOpacity style={[s.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={toggleTheme}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{isDark ? 'Mode clair' : 'Mode sombre'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.card, { backgroundColor: colors.card }]}>
          {/* Role */}
          <Text style={[s.label, { color: colors.textMuted }]}>Je suis</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {[
              ['gestionnaire', 'Gestionnaire', 'Depot provincial'],
              ['client',       'Pharmacie',    'Client du depot'],
            ].map(([r, title, sub]) => (
              <TouchableOpacity key={r}
                style={[s.roleCard, { borderColor: role === r ? colors.primary : colors.border, backgroundColor: role === r ? colors.badgeGreenBg : colors.inputBg }]}
                onPress={() => { setRole(r); setError(''); setForm(f => ({ ...f, province_id: '', pharmacie_id: '' })); }}>
                <View style={[s.roleIcon, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{r === 'gestionnaire' ? 'G' : 'P'}</Text>
                </View>
                <Text style={[s.roleTitle, { color: role === r ? colors.primary : colors.textPrimary }]}>{title}</Text>
                <Text style={[s.roleSub,   { color: colors.textMuted }]}>{sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? (
            <View style={[s.errorBox, { backgroundColor: colors.badgeDangerBg }]}>
              <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '500' }}>{error}</Text>
            </View>
          ) : null}

          {/* Gestionnaire : email */}
          {role === 'gestionnaire' && (
            <>
              <Text style={[s.label, { color: colors.textMuted }]}>Email *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textPrimary }]}
                value={form.email} onChangeText={v => set('email', v)}
                placeholder="exemple@email.mg" placeholderTextColor={colors.textMuted}
                keyboardType="email-address" autoCapitalize="none"
              />
            </>
          )}

          {/* Client : province -> pharmacie */}
          {role === 'client' && (
            <>
              <Text style={[s.label, { color: colors.textMuted }]}>Province *</Text>
              <TouchableOpacity style={[s.picker, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => { setShowProv(!showProv); setShowPharma(false); }}>
                <Text style={{ flex: 1, fontSize: 14, color: selProv ? colors.textPrimary : colors.textMuted }}>
                  {selProv ? selProv.nom : 'Selectionner une province'}
                </Text>
                <Text style={{ color: colors.textMuted }}>v</Text>
              </TouchableOpacity>
              {showProv && (
                <View style={[s.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {provinces.map(p => (
                    <TouchableOpacity key={p.id} style={[s.dropItem, { borderBottomColor: colors.borderLight }]}
                      onPress={() => { set('province_id', String(p.id)); set('pharmacie_id', ''); setShowProv(false); }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{p.nom}</Text>
                      {p.description ? <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{p.description}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {form.province_id ? (
                <>
                  <Text style={[s.label, { color: colors.textMuted, marginTop: 12 }]}>Pharmacie *</Text>
                  <TouchableOpacity style={[s.picker, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    onPress={() => { setShowPharma(!showPharma); setShowProv(false); }}>
                    <Text style={{ flex: 1, fontSize: 14, color: selPharma ? colors.textPrimary : colors.textMuted }}>
                      {loadingPh ? 'Chargement...' : selPharma ? selPharma.nom : 'Selectionner votre pharmacie'}
                    </Text>
                    <Text style={{ color: colors.textMuted }}>v</Text>
                  </TouchableOpacity>
                  {showPharma && (
                    <View style={[s.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {pharmacies.length === 0 ? (
                        <View style={s.dropItem}>
                          <Text style={{ color: colors.textMuted }}>
                            {loadingPh ? 'Chargement...' : !isOnline ? 'Reseau requis pour charger les pharmacies' : 'Aucune pharmacie trouvee'}
                          </Text>
                        </View>
                      ) : pharmacies.map(p => (
                        <TouchableOpacity key={p.id} style={[s.dropItem, { borderBottomColor: colors.borderLight }]}
                          onPress={() => { set('pharmacie_id', String(p.id)); setShowPharma(false); }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{p.nom}</Text>
                          {p.adresse ? <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{p.adresse}</Text> : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              ) : null}
            </>
          )}

          {/* Mot de passe */}
          <Text style={[s.label, { color: colors.textMuted, marginTop: 12 }]}>Mot de passe *</Text>
          <TextInput
            style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textPrimary }]}
            value={form.mot_de_passe} onChangeText={v => set('mot_de_passe', v)}
            placeholder="Mot de passe" placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.submitBtn, { backgroundColor: isOnline ? colors.primary : colors.textMuted, marginTop: 20 }]}
            onPress={handleSubmit} disabled={loading || !isOnline}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{isOnline ? 'Se connecter' : 'Hors ligne'}</Text>}
          </TouchableOpacity>

          {/* Comptes demo */}
          <View style={[s.demo, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Comptes demo (mdp : Admin1234!)
            </Text>
            {[
              ['admin.tana@depot.mg',  'Gestionnaire Antananarivo'],
              ['admin.fiana@depot.mg', 'Gestionnaire Fianarantsoa'],
              ['admin.toam@depot.mg',  'Gestionnaire Toamasina'],
              ['admin.maha@depot.mg',  'Gestionnaire Mahajanga'],
              ['admin.toli@depot.mg',  'Gestionnaire Toliara'],
              ['admin.antsi@depot.mg', 'Gestionnaire Antsiranana'],
            ].map(([email, label]) => (
              <TouchableOpacity key={email} style={{ marginBottom: 6 }}
                onPress={() => { set('email', email); set('mot_de_passe', 'Admin1234!'); setRole('gestionnaire'); }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{label}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>{email}</Text>
              </TouchableOpacity>
            ))}
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' }}>
              Client : selectionner une province puis une pharmacie (mdp : Client123)
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1 },
  scroll:    { padding: 16, paddingTop: 48, paddingBottom: 40 },
  banner:    { borderRadius: 10, padding: 10, marginBottom: 14 },
  bannerTxt: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  hero:      { alignItems: 'center', marginBottom: 24 },
  logoBox:   { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoTxt:   { color: '#fff', fontSize: 28, fontWeight: '800' },
  appName:   { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  appSub:    { fontSize: 13, marginTop: 4 },
  themeBtn:  { marginTop: 14, paddingVertical: 7, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1.5 },
  card:      { borderRadius: 18, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  label:     { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  input:     { borderWidth: 1.5, borderRadius: 12, padding: 13, fontSize: 14 },
  roleCard:  { flex: 1, padding: 14, borderRadius: 14, borderWidth: 2, alignItems: 'center' },
  roleIcon:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  roleTitle: { fontSize: 13, fontWeight: '700' },
  roleSub:   { fontSize: 11, textAlign: 'center', marginTop: 2 },
  picker:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: 13 },
  dropdown:  { borderWidth: 1.5, borderRadius: 12, marginTop: 4, maxHeight: 220, overflow: 'hidden' },
  dropItem:  { padding: 13, borderBottomWidth: 1 },
  errorBox:  { borderRadius: 10, padding: 12, marginBottom: 12 },
  submitBtn: { borderRadius: 14, padding: 15, alignItems: 'center' },
  demo:      { marginTop: 20, padding: 14, borderRadius: 12, borderWidth: 1 },
});
