// src/screens/gestionnaire/GCommandes.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, StyleSheet, RefreshControl, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { StatusBadge, Badge, Btn, Pill, Loader, Empty, OfflineBanner, CacheBadge, fmt, fmtDate, Card, InfoRow } from '../../components/UI';
import api from '../../services/api';

const STATUTS = [
  { key: '', label: 'Toutes' }, { key: 'en_attente', label: 'Attente' },
  { key: 'validee', label: 'Validees' }, { key: 'livree', label: 'Livrees' }, { key: 'paye', label: 'Payees' },
];

export default function GCommandes() {
  const { colors } = useTheme();
  const [commandes,   setCommandes]   = useState([]);
  const [pharmacies,  setPharmacies]  = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [statut,      setStatut]      = useState('');
  const [detail,      setDetail]      = useState(null);
  const [fromCache,   setFromCache]   = useState(false);
  const [showPayer,   setShowPayer]   = useState(null);
  const [montant,     setMontant]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [cPharmaId,   setCPharmaId]   = useState('');
  const [cNote,       setCNote]       = useState('');
  const [cLignes,     setCLignes]     = useState([]);
  const [creating,    setCreating]    = useState(false);
  const [showMedPick, setShowMedPick] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (statut) params.statut = statut;
      const r = await api.getCommandes(params);
      setCommandes(r.data || []); setFromCache(!!r.fromCache);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [statut]);

  useEffect(() => { load(); }, [load]);

  const openCreate = async () => {
    setCLignes([]); setCPharmaId(''); setCNote(''); setShowCreate(true);
    try {
      const [ph, med] = await Promise.all([api.getPharmacies(), api.getMedicaments()]);
      setPharmacies(ph.data || []); setMedicaments(med.data || []);
    } catch {}
  };

  const openDetail = async (cmd) => {
    setDetail(cmd);
    try { const r = await api.getCommandeById(cmd.id); setDetail(r.data); } catch {}
  };

  const valider = (id) => Alert.alert('Valider', 'Confirmer la validation ?', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Valider', onPress: async () => {
      try { await api.validerCommande(id); load(); setDetail(null); }
      catch (e) { Alert.alert('Erreur', e.message); }
    }},
  ]);

  const supprimer = (id) => Alert.alert('Supprimer', 'Supprimer cette commande ?', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => {
      try { await api.deleteCommande(id); load(); setDetail(null); }
      catch (e) { Alert.alert('Erreur', e.message); }
    }},
  ]);

  const payer = async () => {
    const m = parseFloat(montant);
    if (!m || m <= 0) { Alert.alert('Erreur', 'Montant invalide'); return; }
    setSaving(true);
    try { await api.payerCommande(showPayer.id, m); load(); setShowPayer(null); setMontant(''); }
    catch (e) { Alert.alert('Erreur', e.message); }
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

  const updateQteLigne = (id, q) => {
    if (q <= 0) { setCLignes(l => l.filter(i => i.medicament_id !== id)); return; }
    setCLignes(l => l.map(i => i.medicament_id === id ? { ...i, quantite: q } : i));
  };

  const creer = async () => {
    if (!cPharmaId)        { Alert.alert('Erreur', 'Selectionnez une pharmacie'); return; }
    if (!cLignes.length)   { Alert.alert('Erreur', 'Ajoutez au moins un medicament'); return; }
    setCreating(true);
    try {
      await api.createCommande({
        pharmacie_id: parseInt(cPharmaId), note: cNote,
        lignes: cLignes.map(l => ({ medicament_id: l.medicament_id, quantite: l.quantite })),
      });
      Alert.alert('Succes', 'Commande creee !'); setShowCreate(false); load();
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setCreating(false); }
  };

  const totalCreation = cLignes.reduce((s, i) => s + i.prix * i.quantite, 0);
  const s = styles(colors);

  const renderItem = ({ item: cmd }) => {
    const reste = Math.max(0, (cmd.montant_total || 0) - (cmd.montant_paye || 0));
    return (
      <TouchableOpacity style={[s.card, { backgroundColor: colors.card }]} onPress={() => openDetail(cmd)} activeOpacity={0.75}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          <View style={[s.numBox, { backgroundColor: colors.badgeGreenBg }]}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>#{String(cmd.id).padStart(4, '0')}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>{cmd.pharmacie_nom}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>{cmd.pharmacie_adresse}</Text>
          </View>
          <StatusBadge statut={cmd.statut} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 10 }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(cmd.montant_total)}</Text>
            {reste > 0 && <Text style={{ fontSize: 11, color: colors.danger, fontWeight: '600', marginTop: 2 }}>Reste : {fmt(reste)}</Text>}
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted, alignSelf: 'flex-end' }}>{fmtDate(cmd.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <OfflineBanner />
      <CacheBadge fromCache={fromCache} />

      <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>{commandes.length} commande{commandes.length !== 1 ? 's' : ''}</Text>
          <Btn label="Nouvelle commande" type="primary" size="sm" onPress={openCreate} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {STATUTS.map(st => <Pill key={st.key} label={st.label} active={statut === st.key} onPress={() => setStatut(st.key)} />)}
        </ScrollView>
      </View>

      {loading ? <Loader /> : (
        <FlatList
          data={commandes} keyExtractor={i => String(i.id)} renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
          ListEmptyComponent={<Empty text="Aucune commande" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        />
      )}

      {/* Detail */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={[s.modalFull, { backgroundColor: colors.bg }]}>
          <View style={[s.mHeader, { backgroundColor: colors.primary }]}>
            <Text style={s.mTitle}>Commande #{detail && String(detail.id).padStart(4, '0')}</Text>
            <TouchableOpacity onPress={() => setDetail(null)}><Text style={{ color: '#fff', fontSize: 22 }}>x</Text></TouchableOpacity>
          </View>
          {detail && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Card style={{ padding: 16, marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Pharmacie</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>{detail.pharmacie_nom}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{detail.pharmacie_adresse}</Text>
              </Card>
              <Card style={{ padding: 16, marginBottom: 12 }}>
                <InfoRow label="Statut"  value={detail.statut}                                          valueColor={colors.primary} />
                <InfoRow label="Total"   value={fmt(detail.montant_total)}                              valueColor={colors.primary} />
                <InfoRow label="Paye"    value={fmt(detail.montant_paye)}                               valueColor={colors.accent} />
                <InfoRow label="Reste"   value={fmt(Math.max(0, detail.montant_total - detail.montant_paye))} valueColor={colors.danger} />
                <InfoRow label="Date"    value={fmtDate(detail.created_at)} />
              </Card>
              {(detail.lignes || []).length > 0 && (
                <>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Produits</Text>
                  <Card style={{ marginBottom: 12 }}>
                    {detail.lignes.map((l, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: i < detail.lignes.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{l.medicament_nom}</Text>
                          <Text style={{ fontSize: 12, color: colors.textMuted }}>{l.quantite} crtn x {fmt(l.prix_unitaire)}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(l.quantite * l.prix_unitaire)}</Text>
                      </View>
                    ))}
                  </Card>
                </>
              )}
              <View style={{ gap: 10 }}>
                {detail.statut === 'en_attente' && <Btn label="Valider la commande" type="primary" onPress={() => valider(detail.id)} />}
                {['en_attente','validee','livree'].includes(detail.statut) && (detail.montant_total - detail.montant_paye) > 0 && (
                  <Btn label="Enregistrer un paiement" type="success"
                    onPress={() => { setShowPayer(detail); setMontant(String(Math.max(0, detail.montant_total - detail.montant_paye))); setDetail(null); }} />
                )}
                {detail.statut === 'en_attente' && <Btn label="Supprimer" type="danger" onPress={() => supprimer(detail.id)} />}
                <Btn label="Fermer" type="ghost" onPress={() => setDetail(null)} />
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Paiement */}
      <Modal visible={!!showPayer} animationType="fade" transparent onRequestClose={() => setShowPayer(null)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.paySheet, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>Paiement</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>{showPayer?.pharmacie_nom}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.danger, marginBottom: 16 }}>
              Reste : {fmt(showPayer ? showPayer.montant_total - showPayer.montant_paye : 0)}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>Montant recu (Ar)</Text>
            <TextInput
              style={{ backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: colors.textPrimary, fontFamily: 'monospace' }}
              value={montant} onChangeText={setMontant} keyboardType="numeric" autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Btn label="Annuler"   type="ghost"   onPress={() => setShowPayer(null)} /></View>
              <View style={{ flex: 1 }}><Btn label="Confirmer" type="success" onPress={payer} loading={saving} /></View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Creer commande */}
      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.modalFull, { backgroundColor: colors.bg }]}>
            <View style={[s.mHeader, { backgroundColor: colors.primary }]}>
              <Text style={s.mTitle}>Nouvelle commande</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}><Text style={{ color: '#fff', fontSize: 22 }}>x</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={[s.fieldLbl, { color: colors.textMuted }]}>Pharmacie *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
                {pharmacies.map(p => (
                  <TouchableOpacity key={p.id}
                    style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderColor: String(cPharmaId) === String(p.id) ? colors.primary : colors.border, backgroundColor: String(cPharmaId) === String(p.id) ? colors.badgeGreenBg : colors.card }}
                    onPress={() => setCPharmaId(String(p.id))}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: String(cPharmaId) === String(p.id) ? colors.primary : colors.textSecondary }}>{p.nom}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{p.province_nom}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[s.fieldLbl, { color: colors.textMuted, marginBottom: 0 }]}>Medicaments *</Text>
                <Btn label="Ajouter un medicament" type="outline" size="sm" onPress={() => setShowMedPick(true)} />
              </View>
              {cLignes.length === 0 ? (
                <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 14 }}>
                  <Text style={{ color: colors.textMuted }}>Aucun medicament ajoute</Text>
                </View>
              ) : (
                <Card style={{ marginBottom: 14 }}>
                  {cLignes.map((l, i) => (
                    <View key={l.medicament_id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: i < cLignes.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{l.nom}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>{fmt(l.prix)} / crtn</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity onPress={() => updateQteLigne(l.medicament_id, l.quantite - 1)}
                          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.badgeDangerBg, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 16 }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, minWidth: 24, textAlign: 'center' }}>{l.quantite}</Text>
                        <TouchableOpacity onPress={() => updateQteLigne(l.medicament_id, l.quantite + 1)}
                          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.badgeGreenBg, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>+</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, fontFamily: 'monospace', minWidth: 80, textAlign: 'right' }}>{fmt(l.prix * l.quantite)}</Text>
                      </View>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: colors.badgeGreenBg }}>
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Total</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(totalCreation)}</Text>
                  </View>
                </Card>
              )}

              <Text style={[s.fieldLbl, { color: colors.textMuted }]}>Note (optionnel)</Text>
              <TextInput
                style={{ backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 }}
                value={cNote} onChangeText={setCNote} multiline placeholder="Instructions..." placeholderTextColor={colors.textMuted}
              />
              <View style={{ gap: 10 }}>
                <Btn label={creating ? 'Creation...' : 'Creer la commande'} type="primary" onPress={creer} loading={creating} disabled={creating} />
                <Btn label="Annuler" type="ghost" onPress={() => setShowCreate(false)} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Picker medicaments */}
      <Modal visible={showMedPick} animationType="slide" transparent onRequestClose={() => setShowMedPick(false)}>
        <View style={s.overlay}>
          <View style={[s.pickerSheet, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>Choisir un medicament</Text>
              <TouchableOpacity onPress={() => setShowMedPick(false)}><Text style={{ color: colors.textMuted, fontSize: 20 }}>x</Text></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {medicaments.map(m => (
                <TouchableOpacity key={m.id} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight }} onPress={() => addLigne(m)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{m.nom}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{m.categorie} · Stock: {m.quantite_stock} crtn</Text>
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
  numBox:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalFull:  { flex: 1 },
  mHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingTop: 20 },
  mTitle:     { fontSize: 17, fontWeight: '800', color: '#fff' },
  fieldLbl:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  paySheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  pickerSheet:{ borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
});
