// src/screens/client/CStock.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, Alert, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge, Btn, Loader, Empty, OfflineBanner, CacheBadge, fmt } from '../../components/UI';
import api from '../../services/api';

export default function CStock() {
  const { user }   = useAuth();
  const { colors } = useTheme();
  const [medicaments, setMedicaments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [panier,      setPanier]      = useState([]);
  const [showPanier,  setShowPanier]  = useState(false);
  const [note,        setNote]        = useState('');
  const [sending,     setSending]     = useState(false);
  const [fromCache,   setFromCache]   = useState(false);

  const load = useCallback(async () => {
    try {
      const p = { province_id: user?.province_id };
      if (search) p.search = search;
      const r = await api.clientGetStock(p);
      setMedicaments(r.data || []); setFromCache(!!r.fromCache);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [search, user]);

  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); }, [load]);

  const ajouter = (med) => setPanier(p => {
    const ex = p.find(i => i.medicament.id === med.id);
    if (ex) return p.map(i => i.medicament.id === med.id ? { ...i, quantite: i.quantite + 1 } : i);
    return [...p, { medicament: med, quantite: 1 }];
  });

  const updateQte = (id, qte) => {
    if (qte <= 0) { setPanier(p => p.filter(i => i.medicament.id !== id)); return; }
    const max = medicaments.find(m => m.id === id)?.quantite_stock || 999;
    if (qte > max) { Alert.alert('Stock insuffisant', `Maximum : ${max} cartons`); return; }
    setPanier(p => p.map(i => i.medicament.id === id ? { ...i, quantite: qte } : i));
  };

  const envoyer = async () => {
    setSending(true);
    try {
      await api.clientCreerCommande({ lignes: panier.map(i => ({ medicament_id: i.medicament.id, quantite: i.quantite })), note });
      Alert.alert('Commande envoyee', 'Le depot va traiter votre commande.');
      setPanier([]); setNote(''); setShowPanier(false);
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setSending(false); }
  };

  const total      = panier.reduce((s, i) => s + i.quantite * i.medicament.prix_vente, 0);
  const panierCount = panier.reduce((s, i) => s + i.quantite, 0);
  const s = styles(colors);

  const renderItem = ({ item: m }) => {
    const dispo      = m.quantite_stock > 0;
    const stockFaible = m.quantite_stock > 0 && m.quantite_stock <= 20;
    const enPanier   = panier.find(i => i.medicament.id === m.id);
    return (
      <View style={[s.card, { backgroundColor: colors.card, opacity: dispo ? 1 : 0.6 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>{m.nom}</Text>
            {m.categorie ? <Badge label={m.categorie} type="secondary" /> : null}
            {m.description ? <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 18 }} numberOfLines={2}>{m.description}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(m.prix_vente)}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: m.quantite_stock === 0 ? colors.danger : stockFaible ? colors.warning : colors.accent, marginTop: 4 }}>
              {m.quantite_stock === 0 ? 'Rupture' : stockFaible ? `Stock faible : ${m.quantite_stock} crtn` : `${m.quantite_stock} crtn`}
            </Text>
          </View>
        </View>
        <View style={[s.cardFoot, { borderTopColor: colors.borderLight }]}>
          {enPanier ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={() => updateQte(m.id, enPanier.quantite - 1)}
                style={[s.qBtn, { backgroundColor: colors.badgeDangerBg }]}>
                <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 18 }}>-</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary, minWidth: 28, textAlign: 'center' }}>{enPanier.quantite}</Text>
              <TouchableOpacity onPress={() => updateQte(m.id, enPanier.quantite + 1)}
                style={[s.qBtn, { backgroundColor: colors.badgeGreenBg }]}>
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 18 }}>+</Text>
              </TouchableOpacity>
              <Text style={{ flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(enPanier.quantite * m.prix_vente)}</Text>
            </View>
          ) : (
            <TouchableOpacity style={[s.addBtn, { backgroundColor: dispo ? colors.primary : colors.border }]}
              onPress={() => dispo && ajouter(m)} disabled={!dispo}>
              <Text style={{ color: dispo ? '#fff' : colors.textMuted, fontWeight: '700', fontSize: 13 }}>
                {dispo ? 'Ajouter au panier' : 'Rupture de stock'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <OfflineBanner />
      <CacheBadge fromCache={fromCache} />

      <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
        <View style={[s.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[s.searchInput, { color: colors.textPrimary }]}
            value={search} onChangeText={setSearch}
            placeholder="Rechercher un medicament..." placeholderTextColor={colors.textMuted}
          />
          {panier.length > 0 && (
            <TouchableOpacity style={[s.panierBtn, { backgroundColor: colors.primary }]} onPress={() => setShowPanier(true)}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Panier ({panierCount})</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
          {medicaments.length} produit{medicaments.length !== 1 ? 's' : ''} · Province {user?.province_nom}
        </Text>
      </View>

      {loading ? <Loader /> : (
        <FlatList
          data={medicaments} keyExtractor={i => String(i.id)} renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: panier.length > 0 ? 90 : 20 }}
          ListEmptyComponent={<Empty text="Aucun medicament disponible" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        />
      )}

      {panier.length > 0 && (
        <TouchableOpacity onPress={() => setShowPanier(true)} style={[s.fab, { backgroundColor: colors.primary }]}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Voir le panier ({panierCount}) — {fmt(total)}</Text>
        </TouchableOpacity>
      )}

      {/* Panier modal */}
      <Modal visible={showPanier} animationType="slide" onRequestClose={() => setShowPanier(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.modalFull, { backgroundColor: colors.bg }]}>
            <View style={[s.mHeader, { backgroundColor: colors.primary }]}>
              <Text style={s.mTitle}>Mon panier ({panierCount} article{panierCount !== 1 ? 's' : ''})</Text>
              <TouchableOpacity onPress={() => setShowPanier(false)}><Text style={{ color: '#fff', fontSize: 22 }}>x</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {panier.map((item) => (
                <View key={item.medicament.id} style={[s.panierItem, { backgroundColor: colors.card }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{item.medicament.nom}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>{fmt(item.medicament.prix_vente)} / crtn</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(item.quantite * item.medicament.prix_vente)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity onPress={() => updateQte(item.medicament.id, item.quantite - 1)}
                        style={[s.qBtn, { backgroundColor: colors.badgeDangerBg, width: 28, height: 28 }]}>
                        <Text style={{ color: colors.danger, fontWeight: '800' }}>-</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, minWidth: 24, textAlign: 'center' }}>{item.quantite}</Text>
                      <TouchableOpacity onPress={() => updateQte(item.medicament.id, item.quantite + 1)}
                        style={[s.qBtn, { backgroundColor: colors.badgeGreenBg, width: 28, height: 28 }]}>
                        <Text style={{ color: colors.primary, fontWeight: '800' }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
              <View style={{ backgroundColor: colors.badgeGreenBg, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: colors.primary }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Total estime ({panierCount} crtn)</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(total)}</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Note pour le depot</Text>
              <TextInput
                style={{ backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 }}
                value={note} onChangeText={setNote} multiline placeholder="Instructions, precisions..." placeholderTextColor={colors.textMuted}
              />
              <View style={{ gap: 10 }}>
                <Btn label={sending ? 'Envoi en cours...' : 'Envoyer la commande au depot'} type="primary" onPress={envoyer} loading={sending} disabled={sending} />
                <Btn label="Continuer les achats" type="ghost" onPress={() => setShowPanier(false)} />
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
  searchRow:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  searchInput:{ flex: 1, fontSize: 14 },
  panierBtn:  { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  card:       { borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2 },
  cardFoot:   { borderTopWidth: 1, padding: 12 },
  qBtn:       { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  addBtn:     { borderRadius: 10, padding: 11, alignItems: 'center' },
  fab:        { position: 'absolute', bottom: 20, left: 14, right: 14, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, elevation: 8 },
  panierItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2 },
  modalFull:  { flex: 1 },
  mHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingTop: 20 },
  mTitle:     { fontSize: 17, fontWeight: '800', color: '#fff' },
});
