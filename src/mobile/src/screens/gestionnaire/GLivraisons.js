// src/screens/gestionnaire/GLivraisons.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView,
  StyleSheet, RefreshControl, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth }  from '../../context/AuthContext';
import { useLang }  from '../../context/LanguageContext';
import api from '../../services/api';

function fmt(n) { if (n == null || isNaN(n)) return '0 Ar'; return Number(n).toLocaleString('fr-MG') + ' Ar'; }
function fmtDate(d) { if (!d) return '—'; return String(d).slice(0, 16).replace('T', ' '); }

export default function GLivraisons() {
  const { colors } = useTheme();
  const { user }   = useAuth();
  const { t }      = useLang();

  const [livraisons, setLivraisons] = useState([]);
  const [commandes,  setCommandes]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statut,     setStatut]     = useState('');
  const [detail,     setDetail]     = useState(null);
  const [optimising, setOptimising] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [cForm,      setCForm]      = useState({ commande_id: '', priorite: 2 });
  const [creating,   setCreating]   = useState(false);

  const STATUTS_F = [
    { key: '', label: t('toutes') },
    { key: 'planifie',  label: t('planifiees') },
    { key: 'en_cours',  label: t('en_cours') },
    { key: 'livre',     label: t('livree') },
    { key: 'echec',     label: t('echec') },
  ];

  const PRIO = {
    1: ['#e74c3c', t('haute')],
    2: ['#3498db', t('normale')],
    3: ['#95a5a6', t('basse')],
  };

  const load = useCallback(async () => {
    try {
      const params = {};
      if (statut)            params.statut      = statut;
      if (user?.province_id) params.province_id = user.province_id;
      const r = await api.getLivraisons(params);
      setLivraisons(r.data || []);
    } catch (e) { console.warn('GLivraisons:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [statut, user]);

  useEffect(() => { load(); }, [load]);

  // Rafraîchissement automatique toutes les 15 secondes
  useEffect(() => {
    const interval = setInterval(() => { load(); }, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const openCreate = async () => {
    setCForm({ commande_id: '', priorite: 2 });
    setShowCreate(true);
    try {
      const r = await api.getCommandes({ statut: 'validee', province_id: user?.province_id });
      setCommandes(r.data || []);
    } catch {}
  };

  const openDetail = async (l) => {
    setDetail(l);
    try { const r = await api.getLivraisonById(l.id); setDetail(r.data); } catch {}
  };

  const changeStatut = (id, s, labelMsg) => Alert.alert(t('confirmer'), labelMsg + ' ?', [
    { text: t('annuler'), style: 'cancel' },
    { text: t('confirmer'), onPress: async () => {
      try { await api.updateLivraisonStatut(id, s); load(); setDetail(null); }
      catch (e) { Alert.alert(t('erreur'), e.message); }
    }},
  ]);

  const optimiser = async (id) => {
    setOptimising(true);
    try {
      await api.optimiserTrajet(id);
      Alert.alert(t('optimisation_trajet'), t('trajet_optimise_msg'));
      load();
      const r = await api.getLivraisonById(id);
      setDetail(r.data);
    } catch (e) { Alert.alert(t('erreur'), e.message); }
    finally { setOptimising(false); }
  };

  const supprimer = (id) => Alert.alert(t('supprimer'), t('confirmer_supprimer_livraison'), [
    { text: t('annuler'), style: 'cancel' },
    { text: t('supprimer'), style: 'destructive', onPress: async () => {
      try { await api.deleteLivraison(id); load(); setDetail(null); }
      catch (e) { Alert.alert(t('erreur'), e.message); }
    }},
  ]);

  const creer = async () => {
    if (!cForm.commande_id) { Alert.alert(t('erreur'), t('selectionner_commande_msg')); return; }
    if (!user?.province_id) { Alert.alert(t('erreur'), t('province_introuvable')); return; }
    setCreating(true);
    try {
      const commande = commandes.find(c => String(c.id) === String(cForm.commande_id));
      if (!commande) throw new Error('Commande introuvable');
      await api.createLivraison({
        commande_id:  parseInt(cForm.commande_id),
        pharmacie_id: commande.pharmacie_id,
        province_id:  commande.province_id || user.province_id,
        priorite:     cForm.priorite,
      });
      Alert.alert(t('succes'), t('livraison_creee'));
      setShowCreate(false);
      load();
    } catch (e) { Alert.alert(t('erreur'), e.message); }
    finally { setCreating(false); }
  };

  const statutColor = (s) => ({
    livre:    '#27ae60',
    en_cours: '#3498db',
    echec:    '#e74c3c',
  }[s] || '#f39c12');

  const s = styles(colors);

  const renderItem = ({ item: l }) => (
    <TouchableOpacity style={[s.card, { backgroundColor: colors.card }]} onPress={() => openDetail(l)} activeOpacity={0.75}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        <View style={[s.dot, { backgroundColor: statutColor(l.statut) }]} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>{l.pharmacie_nom}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            <View style={{ backgroundColor: `${statutColor(l.statut)}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: statutColor(l.statut) }}>{l.statut}</Text>
            </View>
            <View style={{ backgroundColor: `${PRIO[l.priorite]?.[0] || '#3498db'}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: PRIO[l.priorite]?.[0] || '#3498db' }}>{PRIO[l.priorite]?.[1] || t('normale')}</Text>
            </View>
          </View>
        </View>
        {l.distance_totale
          ? <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{Number(l.distance_totale).toFixed(1)}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>{t('km')}</Text>
            </View>
          : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
            {livraisons.length} {livraisons.length !== 1 ? t('livraisons') : t('livraison')}
          </Text>
          <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }} onPress={openCreate}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('nouvelle_livraison')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {STATUTS_F.map(st => (
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
            data={livraisons} keyExtractor={i => String(i.id)} renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
            ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 60 }}><Text style={{ color: colors.textMuted }}>{t('aucune_livraison')}</Text></View>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          />
      }

      {/* Détail */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={[s.modalFull, { backgroundColor: colors.bg }]}>
          <View style={[s.mHeader, { backgroundColor: colors.primary }]}>
            <Text style={s.mTitle}>{t('livraison')} #{detail && String(detail.id).padStart(4, '0')}</Text>
            <TouchableOpacity onPress={() => setDetail(null)}><Text style={{ color: '#fff', fontSize: 22 }}>✕</Text></TouchableOpacity>
          </View>
          {detail && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>{t('destination')}</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>{detail.pharmacie_nom}</Text>
              </View>
              <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                {[
                  [t('statut'),         detail.statut],
                  [t('priorite'),       PRIO[detail.priorite]?.[1] || t('normale')],
                  [t('date_prevue'),    fmtDate(detail.date_livraison)],
                  [t('distance_totale'), detail.distance_totale ? `${Number(detail.distance_totale).toFixed(2)} ${t('km')}` : t('non_calculee')],
                ].map(([lbl, val]) => (
                  <View key={lbl} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{lbl}</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>{val}</Text>
                  </View>
                ))}
              </View>

              {detail.statut === 'planifie' && (
                <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: colors.primary }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>{t('optimisation_trajet')}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>{t('optimisation_desc')}</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: optimising ? colors.border : colors.primary, borderRadius: 12, padding: 13, alignItems: 'center' }}
                    onPress={() => optimiser(detail.id)} disabled={optimising}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{optimising ? t('calcul_en_cours') : t('optimiser_trajet')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ gap: 10 }}>
                {detail.statut === 'planifie' && (
                  <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' }} onPress={() => changeStatut(detail.id, 'en_cours', t('demarrer_livraison'))}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{t('demarrer_livraison')}</Text>
                  </TouchableOpacity>
                )}
                {detail.statut === 'en_cours' && (
                  <>
                    <View style={{ backgroundColor: '#ebf5fb', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#3498db', alignItems: 'center' }}>
                      <Text style={{ color: '#3498db', fontWeight: '600', fontSize: 13, textAlign: 'center' }}>
                        ⏳ {t('attente_confirmation_pharmacie')}
                      </Text>
                    </View>
                    <TouchableOpacity style={{ backgroundColor: '#e74c3c', borderRadius: 12, padding: 14, alignItems: 'center' }} onPress={() => changeStatut(detail.id, 'echec', t('signaler_echec'))}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>{t('signaler_echec')}</Text>
                    </TouchableOpacity>
                  </>
                )}
                {['planifie', 'echec'].includes(detail.statut) && (
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

      {/* Créer livraison */}
      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.modalFull, { backgroundColor: colors.bg }]}>
            <View style={[s.mHeader, { backgroundColor: colors.primary }]}>
              <Text style={s.mTitle}>{t('nouvelle_livraison')}</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}><Text style={{ color: '#fff', fontSize: 22 }}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                {t('commande_validee_select')}
              </Text>
              {commandes.length === 0
                ? <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ color: colors.textMuted }}>{t('aucune_commande_validee')}</Text>
                  </View>
                : <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
                    {commandes.map(c => (
                      <TouchableOpacity key={c.id}
                        style={{ padding: 14, borderRadius: 12, borderWidth: 2, marginBottom: 8, borderColor: String(cForm.commande_id) === String(c.id) ? colors.primary : colors.border, backgroundColor: String(cForm.commande_id) === String(c.id) ? (colors.badgeGreenBg || '#e8f5e9') : colors.card }}
                        onPress={() => setCForm(f => ({ ...f, commande_id: String(c.id) }))}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontWeight: '700', color: String(cForm.commande_id) === String(c.id) ? colors.primary : colors.textPrimary }}>
                            #{String(c.id).padStart(4, '0')} — {c.pharmacie_nom}
                          </Text>
                          <Text style={{ fontWeight: '700', color: colors.primary, fontFamily: 'monospace' }}>{fmt(c.montant_total)}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
              }

              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                {t('priorite')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {[{ val: 1, label: t('haute') }, { val: 2, label: t('normale') }, { val: 3, label: t('basse') }].map(p => (
                  <TouchableOpacity key={p.val}
                    style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, alignItems: 'center', borderColor: cForm.priorite === p.val ? colors.primary : colors.border, backgroundColor: cForm.priorite === p.val ? (colors.badgeGreenBg || '#e8f5e9') : colors.card }}
                    onPress={() => setCForm(f => ({ ...f, priorite: p.val }))}>
                    <Text style={{ fontWeight: '700', color: cForm.priorite === p.val ? colors.primary : colors.textSecondary }}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ gap: 10 }}>
                <TouchableOpacity style={{ backgroundColor: creating ? colors.border : colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' }} onPress={creer} disabled={creating}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{creating ? t('creation') : t('creer_livraison')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }} onPress={() => setShowCreate(false)}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('annuler')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1 },
  card:      { borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3 },
  dot:       { width: 12, height: 12, borderRadius: 6 },
  modalFull: { flex: 1 },
  mHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingTop: 20 },
  mTitle:    { fontSize: 17, fontWeight: '800', color: '#fff' },
});