// src/screens/gestionnaire/GLivraisons.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, StyleSheet, RefreshControl, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { StatusBadge, Badge, Btn, Pill, Loader, Empty, OfflineBanner, CacheBadge, fmt, fmtDate, Card, InfoRow } from '../../components/UI';
import api from '../../services/api';

const STATUTS_F = [
  { key: '', label: 'Toutes' }, { key: 'planifie', label: 'Planifiees' },
  { key: 'en_cours', label: 'En cours' }, { key: 'livre', label: 'Livrees' }, { key: 'echec', label: 'Echec' },
];

export default function GLivraisons() {
  const { colors } = useTheme();
  const [livraisons, setLivraisons] = useState([]);
  const [commandes,  setCommandes]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statut,     setStatut]     = useState('');
  const [detail,     setDetail]     = useState(null);
  const [fromCache,  setFromCache]  = useState(false);
  const [optimising, setOptimising] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [cForm,      setCForm]      = useState({ commande_id: '', priorite: 2, note: '' });
  const [creating,   setCreating]   = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (statut) params.statut = statut;
      const r = await api.getLivraisons(params);
      setLivraisons(r.data || []); setFromCache(!!r.fromCache);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [statut]);

  useEffect(() => { load(); }, [load]);

  const openCreate = async () => {
    setCForm({ commande_id: '', priorite: 2, note: '' }); setShowCreate(true);
    try { const r = await api.getCommandes({ statut: 'validee' }); setCommandes(r.data || []); } catch {}
  };

  const openDetail = async (l) => {
    setDetail(l);
    try { const r = await api.getLivraisonById(l.id); setDetail(r.data); } catch {}
  };

  const changeStatut = (id, s, label) => Alert.alert('Confirmer', label + ' ?', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Confirmer', onPress: async () => {
      try { await api.updateLivraisonStatut(id, s); load(); setDetail(null); }
      catch (e) { Alert.alert('Erreur', e.message); }
    }},
  ]);

  const optimiser = async (id) => {
    setOptimising(true);
    try {
      await api.optimiserTrajet(id);
      Alert.alert('Trajet optimise', "L'algorithme de Dijkstra a calcule le meilleur itineraire.");
      load(); const r = await api.getLivraisonById(id); setDetail(r.data);
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setOptimising(false); }
  };

  const supprimer = (id) => Alert.alert('Supprimer', 'Supprimer cette livraison ?', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => {
      try { await api.deleteLivraison(id); load(); setDetail(null); }
      catch (e) { Alert.alert('Erreur', e.message); }
    }},
  ]);

  const creer = async () => {
    if (!cForm.commande_id) { Alert.alert('Erreur', 'Selectionnez une commande'); return; }
    setCreating(true);
    try {
      await api.createLivraison({ commande_id: parseInt(cForm.commande_id), priorite: cForm.priorite, note: cForm.note });
      Alert.alert('Succes', 'Livraison creee !'); setShowCreate(false); load();
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setCreating(false); }
  };

  const PRIO = { 1: ['danger', 'Haute'], 2: ['info', 'Normale'], 3: ['secondary', 'Basse'] };
  const s = styles(colors);

  const renderItem = ({ item: l }) => {
    const [pt] = PRIO[l.priorite] || PRIO[2];
    return (
      <TouchableOpacity style={[s.card, { backgroundColor: colors.card }]} onPress={() => openDetail(l)} activeOpacity={0.75}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          <View style={[s.statusDot, { backgroundColor: l.statut === 'livre' ? colors.accent : l.statut === 'en_cours' ? colors.primary : l.statut === 'echec' ? colors.danger : colors.warning }]} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>{l.pharmacie_nom}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>{l.pharmacie_adresse}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <StatusBadge statut={l.statut} />
              <Badge label={PRIO[l.priorite]?.[1] || 'Normale'} type={pt} />
            </View>
          </View>
          {l.distance_totale ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{Number(l.distance_totale).toFixed(1)}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>km</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <OfflineBanner />
      <CacheBadge fromCache={fromCache} />
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>{livraisons.length} livraison{livraisons.length !== 1 ? 's' : ''}</Text>
          <Btn label="Nouvelle livraison" type="primary" size="sm" onPress={openCreate} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {STATUTS_F.map(st => <Pill key={st.key} label={st.label} active={statut === st.key} onPress={() => setStatut(st.key)} />)}
        </ScrollView>
      </View>

      {loading ? <Loader /> : (
        <FlatList
          data={livraisons} keyExtractor={i => String(i.id)} renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
          ListEmptyComponent={<Empty text="Aucune livraison" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        />
      )}

      {/* Detail */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={[s.modalFull, { backgroundColor: colors.bg }]}>
          <View style={[s.mHeader, { backgroundColor: colors.primary }]}>
            <Text style={s.mTitle}>Livraison #{detail && String(detail.id).padStart(4, '0')}</Text>
            <TouchableOpacity onPress={() => setDetail(null)}><Text style={{ color: '#fff', fontSize: 22 }}>x</Text></TouchableOpacity>
          </View>
          {detail && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Card style={{ padding: 16, marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Destination</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>{detail.pharmacie_nom}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{detail.pharmacie_adresse}</Text>
              </Card>
              <Card style={{ padding: 16, marginBottom: 12 }}>
                <InfoRow label="Statut"          value={detail.statut}                  valueColor={colors.primary} />
                <InfoRow label="Priorite"         value={PRIO[detail.priorite]?.[1] || 'Normale'} />
                <InfoRow label="Date prevue"      value={fmtDate(detail.date_livraison)} />
                <InfoRow label="Distance totale"  value={detail.distance_totale ? `${Number(detail.distance_totale).toFixed(2)} km` : 'Non calculee'} valueColor={colors.primary} />
              </Card>

              {detail.statut === 'planifie' && (
                <Card style={{ padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: colors.primary }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>Optimisation du trajet (Dijkstra)</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>Calcule le chemin le plus court entre le depot et la pharmacie.</Text>
                  <Btn label={optimising ? 'Calcul en cours...' : 'Optimiser le trajet'} type="primary" onPress={() => optimiser(detail.id)} loading={optimising} />
                </Card>
              )}

              <View style={{ gap: 10 }}>
                {detail.statut === 'planifie'  && <Btn label="Demarrer la livraison"  type="primary"  onPress={() => changeStatut(detail.id, 'en_cours', 'Demarrer la livraison')} />}
                {detail.statut === 'en_cours'  && <Btn label="Confirmer livraison"    type="success"  onPress={() => changeStatut(detail.id, 'livre',    'Confirmer la livraison')} />}
                {detail.statut === 'en_cours'  && <Btn label="Signaler un echec"      type="danger"   onPress={() => changeStatut(detail.id, 'echec',    'Signaler un echec')} />}
                {['planifie','echec'].includes(detail.statut) && <Btn label="Supprimer" type="danger"  onPress={() => supprimer(detail.id)} />}
                <Btn label="Fermer" type="ghost" onPress={() => setDetail(null)} />
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Creer livraison */}
      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.modalFull, { backgroundColor: colors.bg }]}>
            <View style={[s.mHeader, { backgroundColor: colors.primary }]}>
              <Text style={s.mTitle}>Nouvelle livraison</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}><Text style={{ color: '#fff', fontSize: 22 }}>x</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={[s.fieldLbl, { color: colors.textMuted }]}>Commande validee *</Text>
              {commandes.length === 0 ? (
                <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ color: colors.textMuted }}>Aucune commande validee disponible</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
                  {commandes.map(c => (
                    <TouchableOpacity key={c.id}
                      style={{ padding: 14, borderRadius: 12, borderWidth: 2, marginBottom: 8, borderColor: String(cForm.commande_id) === String(c.id) ? colors.primary : colors.border, backgroundColor: String(cForm.commande_id) === String(c.id) ? colors.badgeGreenBg : colors.card }}
                      onPress={() => setCForm(f => ({ ...f, commande_id: String(c.id) }))}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: '700', color: String(cForm.commande_id) === String(c.id) ? colors.primary : colors.textPrimary }}>#{String(c.id).padStart(4,'0')} — {c.pharmacie_nom}</Text>
                        <Text style={{ fontWeight: '700', color: colors.primary, fontFamily: 'monospace' }}>{fmt(c.montant_total)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={[s.fieldLbl, { color: colors.textMuted }]}>Priorite</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[{ val: 1, label: 'Haute' }, { val: 2, label: 'Normale' }, { val: 3, label: 'Basse' }].map(p => (
                  <TouchableOpacity key={p.val}
                    style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, alignItems: 'center', borderColor: cForm.priorite === p.val ? colors.primary : colors.border, backgroundColor: cForm.priorite === p.val ? colors.badgeGreenBg : colors.card }}
                    onPress={() => setCForm(f => ({ ...f, priorite: p.val }))}>
                    <Text style={{ fontWeight: '700', color: cForm.priorite === p.val ? colors.primary : colors.textSecondary }}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.fieldLbl, { color: colors.textMuted }]}>Note (optionnel)</Text>
              <TextInput
                style={{ backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 }}
                value={cForm.note} onChangeText={v => setCForm(f => ({ ...f, note: v }))}
                multiline placeholder="Instructions..." placeholderTextColor={colors.textMuted}
              />
              <View style={{ gap: 10 }}>
                <Btn label={creating ? 'Creation...' : 'Creer la livraison'} type="primary" onPress={creer} loading={creating} disabled={creating} />
                <Btn label="Annuler" type="ghost" onPress={() => setShowCreate(false)} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container:  { flex: 1 },
  card:       { borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3 },
  statusDot:  { width: 12, height: 12, borderRadius: 6 },
  modalFull:  { flex: 1 },
  mHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingTop: 20 },
  mTitle:     { fontSize: 17, fontWeight: '800', color: '#fff' },
  fieldLbl:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
});
