// src/screens/gestionnaire/GCommandes.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Modal,
  ScrollView, StyleSheet, RefreshControl, Alert,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth }  from '../../context/AuthContext';
import { useLang }  from '../../context/LanguageContext';
import api from '../../services/api';

function fmt(n) { if (n == null || isNaN(n)) return '0 Ar'; return Number(n).toLocaleString('fr-MG') + ' Ar'; }
function fmtDate(d) { if (!d) return '—'; return String(d).slice(0, 10); }

export default function GCommandes() {
  const { colors } = useTheme();
  const { user }   = useAuth();
  const { t }      = useLang();

  const [commandes,   setCommandes]   = useState([]);
  const [pharmacies,  setPharmacies]  = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [statut,      setStatut]      = useState('');
  const [detail,      setDetail]      = useState(null);
  const [showPayer,   setShowPayer]   = useState(null);
  const [montant,     setMontant]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [cPharmaId,   setCPharmaId]   = useState('');
  const [cNote,       setCNote]       = useState('');
  const [cLignes,     setCLignes]     = useState([]);
  const [creating,    setCreating]    = useState(false);
  const [showMedPick, setShowMedPick] = useState(false);

  const STATUTS = [
    { key: '', label: t('toutes') }, { key: 'en_attente', label: t('attente') },
    { key: 'validee', label: t('validees') }, { key: 'livree', label: t('livrees') },
    { key: 'paye', label: t('payees') },
  ];

  const load = useCallback(async () => {
    try {
      const params = {};
      if (statut)            params.statut      = statut;
      if (user?.province_id) params.province_id = user.province_id;
      const r = await api.getCommandes(params);
      setCommandes(r.data || []);
    } catch (e) { console.warn('GCommandes:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [statut, user]);

  useEffect(() => { load(); }, [load]);

  const openCreate = async () => {
    setCLignes([]); setCPharmaId(''); setCNote(''); setShowCreate(true);
    try {
      const [ph, med] = await Promise.all([
        api.getPharmacies({ province_id: user?.province_id }),
        api.getMedicaments({ province_id: user?.province_id }),
      ]);
      setPharmacies(ph.data || []);
      setMedicaments(med.data || []);
    } catch (e) { console.warn('openCreate:', e.message); }
  };

  const openDetail = async (cmd) => {
    setDetail(cmd);
    try { const r = await api.getCommandeById(cmd.id); setDetail(r.data); } catch {}
  };

  const valider = (id) => Alert.alert(t('valider'), t('valider_confirm'), [
    { text: t('annuler'), style: 'cancel' },
    { text: t('valider'), onPress: async () => {
      try { await api.validerCommande(id); load(); setDetail(null); }
      catch (e) { Alert.alert(t('erreur'), e.message); }
    }},
  ]);

  const supprimer = (id) => Alert.alert(t('supprimer'), t('supprimer_commande_confirm'), [
    { text: t('annuler'), style: 'cancel' },
    { text: t('supprimer'), style: 'destructive', onPress: async () => {
      try { await api.deleteCommande(id); load(); setDetail(null); }
      catch (e) { Alert.alert(t('erreur'), e.message); }
    }},
  ]);

  const payer = async () => {
    const m = parseFloat(montant);
    if (!m || m <= 0) { Alert.alert(t('erreur'), t('montant_invalide')); return; }
    setSaving(true);
    try { await api.payerCommande(showPayer.id, m); load(); setShowPayer(null); setMontant(''); }
    catch (e) { Alert.alert(t('erreur'), e.message); }
    finally { setSaving(false); }
  };

  const addLigne = (med) => {
    setCLignes(l => {
      const ex = l.find(i => i.medicament_id === med.id);
      if (ex) return l.map(i => i.medicament_id === med.id ? { ...i, quantite: i.quantite + 1 } : i);
      return [...l, { medicament_id: med.id, nom: med.nom, prix: med.prix_vente, quantite: 1 }];
    });
    setShowMedPick(false);
  };

  const updateQte = (id, q) => {
    if (q <= 0) { setCLignes(l => l.filter(i => i.medicament_id !== id)); return; }
    setCLignes(l => l.map(i => i.medicament_id === id ? { ...i, quantite: q } : i));
  };

  const creer = async () => {
    if (!cPharmaId)         { Alert.alert(t('erreur'), t('selectionner_pharmacie_msg')); return; }
    if (!cLignes.length)    { Alert.alert(t('erreur'), t('ajouter_medicament_msg')); return; }
    if (!user?.province_id) { Alert.alert(t('erreur'), t('province_introuvable')); return; }
    setCreating(true);
    try {
      const pharmacie = pharmacies.find(p => String(p.id) === String(cPharmaId));
      await api.createCommande({
        pharmacie_id:  parseInt(cPharmaId),
        province_id:   pharmacie?.province_id || user.province_id,
        note:          cNote,
        montant_total: cLignes.reduce((s, l) => s + l.prix * l.quantite, 0),
        lignes: cLignes.map(l => ({ medicament_id: l.medicament_id, quantite: l.quantite, prix_unitaire: l.prix })),
      });
      Alert.alert(t('succes'), t('commande_creee'));
      setShowCreate(false); load();
    } catch (e) { Alert.alert(t('erreur'), e.message); }
    finally { setCreating(false); }
  };

  const totalCreation = cLignes.reduce((s, i) => s + i.prix * i.quantite, 0);
  const s = styles(colors);

  const renderItem = ({ item: cmd }) => {
    const reste = Math.max(0, (cmd.montant_total || 0) - (cmd.montant_paye || 0));
    return (
      <TouchableOpacity style={[s.card, { backgroundColor: colors.card }]} onPress={() => openDetail(cmd)} activeOpacity={0.75}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.badgeGreenBg || '#e8f5e9', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>#{String(cmd.id).padStart(4, '0')}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>{cmd.pharmacie_nom}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{fmtDate(cmd.created_at)}</Text>
          </View>
          <View style={{ backgroundColor: cmd.statut === 'paye' ? '#e8f5e9' : cmd.statut === 'validee' ? '#e3f2fd' : '#fff3e0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: cmd.statut === 'paye' ? '#27ae60' : cmd.statut === 'validee' ? '#1976d2' : '#f57c00' }}>{cmd.statut}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(cmd.montant_total)}</Text>
          {reste > 0 && <Text style={{ fontSize: 11, color: '#e74c3c', fontWeight: '600' }}>{t('reste')} : {fmt(reste)}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
            {commandes.length} {commandes.length !== 1 ? t('commandes') : t('commande')}
          </Text>
          <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }} onPress={openCreate}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('nouvelle_commande')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {STATUTS.map(st => (
            <TouchableOpacity key={st.key}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: statut === st.key ? colors.primary : colors.card, borderWidth: 1.5, borderColor: statut === st.key ? colors.primary : colors.border }}
              onPress={() => setStatut(st.key)}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: statut === st.key ? '#fff' : colors.textSecondary }}>{st.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading
        ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.textMuted }}>{t('chargement')}</Text></View>
        : <FlatList
            data={commandes} keyExtractor={i => String(i.id)} renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
            ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 60 }}><Text style={{ color: colors.textMuted }}>{t('aucune_commande')}</Text></View>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          />
      }

      {/* Détail */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={[s.modalFull, { backgroundColor: colors.bg }]}>
          <View style={[s.mHeader, { backgroundColor: colors.primary }]}>
            <Text style={s.mTitle}>{t('commande_num')} #{detail && String(detail.id).padStart(4, '0')}</Text>
            <TouchableOpacity onPress={() => setDetail(null)}><Text style={{ color: '#fff', fontSize: 22 }}>✕</Text></TouchableOpacity>
          </View>
          {detail && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>{t('pharmacie')}</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>{detail.pharmacie_nom}</Text>
              </View>
              <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                {[
                  [t('statut'), detail.statut],
                  [t('total'),  fmt(detail.montant_total)],
                  [t('paye'),   fmt(detail.montant_paye)],
                  [t('reste'),  fmt(Math.max(0, detail.montant_total - detail.montant_paye))],
                  [t('date'),   fmtDate(detail.created_at)],
                ].map(([lbl, val]) => (
                  <View key={lbl} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{lbl}</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>{val}</Text>
                  </View>
                ))}
              </View>
              {(detail.lignes || []).length > 0 && (
                <View style={{ backgroundColor: colors.card, borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', padding: 14, paddingBottom: 8 }}>{t('produits_tab')}</Text>
                  {detail.lignes.map((l, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{l.medicament_nom}</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>{l.quantite} {t('crtn')} × {fmt(l.prix_unitaire)}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(l.quantite * l.prix_unitaire)}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={{ gap: 10 }}>
                {detail.statut === 'en_attente' && (
                  <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' }} onPress={() => valider(detail.id)}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{t('valider_commande')}</Text>
                  </TouchableOpacity>
                )}
                {['en_attente','validee','livree'].includes(detail.statut) && (detail.montant_total - detail.montant_paye) > 0 && (
                  <TouchableOpacity style={{ backgroundColor: '#27ae60', borderRadius: 12, padding: 14, alignItems: 'center' }}
                    onPress={() => { setShowPayer(detail); setMontant(String(Math.max(0, detail.montant_total - detail.montant_paye))); setDetail(null); }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{t('enregistrer_paiement')}</Text>
                  </TouchableOpacity>
                )}
                {detail.statut === 'en_attente' && (
                  <TouchableOpacity style={{ backgroundColor: '#e74c3c', borderRadius: 12, padding: 14, alignItems: 'center' }} onPress={() => supprimer(detail.id)}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{t('supprimer')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={{ backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }} onPress={() => setDetail(null)}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('fermer')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Paiement */}
      <Modal visible={!!showPayer} animationType="fade" transparent onRequestClose={() => setShowPayer(null)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.sheet, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>{t('paiement')}</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>{showPayer?.pharmacie_nom}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#e74c3c', marginBottom: 16 }}>
              {t('reste')} : {fmt(showPayer ? showPayer.montant_total - showPayer.montant_paye : 0)}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>{t('montant_recu')}</Text>
            <TextInput
              style={{ backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: colors.textPrimary, fontFamily: 'monospace' }}
              value={montant} onChangeText={setMontant} keyboardType="numeric" autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, padding: 13, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' }} onPress={() => setShowPayer(null)}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('annuler')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 13, borderRadius: 12, backgroundColor: '#27ae60', alignItems: 'center' }} onPress={payer}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? '...' : t('confirmer')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Créer commande */}
      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.modalFull, { backgroundColor: colors.bg }]}>
            <View style={[s.mHeader, { backgroundColor: colors.primary }]}>
              <Text style={s.mTitle}>{t('nouvelle_commande')}</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}><Text style={{ color: '#fff', fontSize: 22 }}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={s.fieldLbl(colors)}>{t('pharmacie_select')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
                {pharmacies.map(p => (
                  <TouchableOpacity key={p.id}
                    style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderColor: String(cPharmaId) === String(p.id) ? colors.primary : colors.border, backgroundColor: String(cPharmaId) === String(p.id) ? colors.badgeGreenBg || '#e8f5e9' : colors.card }}
                    onPress={() => setCPharmaId(String(p.id))}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: String(cPharmaId) === String(p.id) ? colors.primary : colors.textSecondary }}>{p.nom}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={s.fieldLbl(colors)}>{t('medicaments_select')}</Text>
                <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }} onPress={() => setShowMedPick(true)}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('ajouter_medicament')}</Text>
                </TouchableOpacity>
              </View>

              {cLignes.length === 0
                ? <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 14 }}>
                    <Text style={{ color: colors.textMuted }}>{t('aucun_medicament_ajoute')}</Text>
                  </View>
                : <View style={{ backgroundColor: colors.card, borderRadius: 14, marginBottom: 14, overflow: 'hidden' }}>
                    {cLignes.map((l, i) => (
                      <View key={l.medicament_id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.borderLight }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{l.nom}</Text>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>{fmt(l.prix)} / {t('crtn')}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity onPress={() => updateQte(l.medicament_id, l.quantite - 1)} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#fde8e8', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#e74c3c', fontWeight: '800', fontSize: 16 }}>-</Text>
                          </TouchableOpacity>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, minWidth: 24, textAlign: 'center' }}>{l.quantite}</Text>
                          <TouchableOpacity onPress={() => updateQte(l.medicament_id, l.quantite + 1)} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#27ae60', fontWeight: '800', fontSize: 16 }}>+</Text>
                          </TouchableOpacity>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, fontFamily: 'monospace', minWidth: 80, textAlign: 'right' }}>{fmt(l.prix * l.quantite)}</Text>
                        </View>
                      </View>
                    ))}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: colors.badgeGreenBg || '#e8f5e9' }}>
                      <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{t('total')}</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(totalCreation)}</Text>
                    </View>
                  </View>
              }

              <Text style={s.fieldLbl(colors)}>{t('note_optionnel')}</Text>
              <TextInput
                style={{ backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 }}
                value={cNote} onChangeText={setCNote} multiline placeholder={t('instructions')} placeholderTextColor={colors.textMuted}
              />
              <View style={{ gap: 10 }}>
                <TouchableOpacity style={{ backgroundColor: creating ? colors.border : colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' }} onPress={creer} disabled={creating}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{creating ? t('creation') : t('creer_commande')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }} onPress={() => setShowCreate(false)}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('annuler')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Picker médicaments */}
      <Modal visible={showMedPick} animationType="slide" transparent onRequestClose={() => setShowMedPick(false)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: colors.card, maxHeight: '70%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>{t('choisir_medicament')}</Text>
              <TouchableOpacity onPress={() => setShowMedPick(false)}><Text style={{ color: colors.textMuted, fontSize: 22 }}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {medicaments.map(m => (
                <TouchableOpacity key={m.id} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight }} onPress={() => addLigne(m)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{m.nom}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{m.categorie} · {t('stock')}: {m.quantite_stock} {t('crtn')}</Text>
                    </View>
                    <Text style={{ fontWeight: '700', color: colors.primary, fontFamily: 'monospace' }}>{fmt(m.prix_vente)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container:  { flex: 1 },
  card:       { borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3 },
  modalFull:  { flex: 1 },
  mHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingTop: 20 },
  mTitle:     { fontSize: 17, fontWeight: '800', color: '#fff' },
  fieldLbl:   (c) => ({ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, color: c.textMuted }),
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
});