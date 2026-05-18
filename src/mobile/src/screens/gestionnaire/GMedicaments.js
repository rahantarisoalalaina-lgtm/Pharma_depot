// src/screens/gestionnaire/GMedicaments.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, RefreshControl, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Badge, Btn, Loader, Empty, CacheBadge, OfflineBanner, fmt, fmtDate } from '../../components/UI';
import api from '../../services/api';

const EMPTY_FORM = { nom: '', description: '', categorie: '', prix_achat: '', prix_vente: '', quantite_stock: '', date_expiration: '', seuil_alerte: '20' };

export default function GMedicaments() {
  const { colors } = useTheme();
  const [medicaments, setMedicaments] = useState([]);
  const [alertes, setAlertes]         = useState([]);
  const [search, setSearch]           = useState('');
  const [tab, setTab]                 = useState('all');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [fromCache, setFromCache]     = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [editItem, setEditItem]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      const [meds, alts] = await Promise.all([api.getMedicaments(params), api.getAlertes()]);
      setMedicaments(meds.data || []);
      setAlertes(alts.data || []);
      setFromCache(!!(meds.fromCache || alts.fromCache));
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); }, [load]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setForm(EMPTY_FORM); setEditItem(null); setShowModal(true); };
  const openEdit   = (m) => {
    setForm({
      nom:              m.nom || '',
      description:      m.description || '',
      categorie:        m.categorie || '',
      prix_achat:       String(m.prix_achat || ''),
      prix_vente:       String(m.prix_vente || ''),
      quantite_stock:   String(m.quantite_stock || ''),
      date_expiration:  m.date_expiration ? m.date_expiration.slice(0, 10) : '',
      seuil_alerte:     String(m.seuil_alerte || 20),
    });
    setEditItem(m); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim())         { Alert.alert('Erreur', 'Le nom est obligatoire'); return; }
    if (!form.prix_achat || !form.prix_vente) { Alert.alert('Erreur', 'Prix achat et vente obligatoires'); return; }
    setSaving(true);
    try {
      const payload = {
        nom:            form.nom.trim(),
        description:    form.description.trim(),
        categorie:      form.categorie.trim(),
        prix_achat:     parseFloat(form.prix_achat),
        prix_vente:     parseFloat(form.prix_vente),
        quantite_stock: parseInt(form.quantite_stock) || 0,
        date_expiration:form.date_expiration || null,
        seuil_alerte:   parseInt(form.seuil_alerte) || 20,
      };
      if (editItem) { await api.updateMedicament(editItem.id, payload); }
      else          { await api.createMedicament(payload); }
      setShowModal(false);
      load();
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (m) => {
    Alert.alert('Confirmer la suppression', `Supprimer "${m.nom}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await api.deleteMedicament(m.id); load(); }
        catch (e) { Alert.alert('Erreur', e.message); }
      }},
    ]);
  };

  const displayed = tab === 'alertes' ? alertes : medicaments;
  const s = styles(colors);

  const renderItem = ({ item: m }) => {
    const isAlert   = m.quantite_stock <= m.seuil_alerte;
    const beneficeU = m.prix_vente - m.prix_achat;
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderLeftColor: isAlert ? colors.danger : colors.primary }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>{m.nom}</Text>
            {m.categorie ? <Badge label={m.categorie} type="secondary" /> : null}
          </View>
          <Badge label={isAlert ? 'Stock bas' : 'OK'} type={isAlert ? 'danger' : 'success'} />
        </View>
        <View style={s.infoRow}>
          {[
            ['Stock', `${m.quantite_stock} crtn`, isAlert ? colors.danger : colors.primary],
            ['Achat',  fmt(m.prix_achat),         colors.textSecondary],
            ['Vente',  fmt(m.prix_vente),          colors.primary],
            ['Benefice', fmt(beneficeU),           beneficeU > 0 ? colors.accent : colors.danger],
          ].map(([lbl, val, color]) => (
            <View key={lbl} style={[s.infoBlock, { backgroundColor: colors.cardAlt }]}>
              <Text style={{ fontSize: 9, textTransform: 'uppercase', color: colors.textMuted, letterSpacing: 0.4, marginBottom: 3 }}>{lbl}</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color, fontFamily: 'monospace' }}>{val}</Text>
            </View>
          ))}
        </View>
        {m.date_expiration ? (
          <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>Expiration : {fmtDate(m.date_expiration)}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
          <Btn label="Modifier"   type="outline"  size="sm" onPress={() => openEdit(m)} />
          <Btn label="Supprimer"  type="danger"   size="sm" onPress={() => handleDelete(m)} />
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <OfflineBanner />
      <CacheBadge fromCache={fromCache} />

      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>{medicaments.length} produit{medicaments.length !== 1 ? 's' : ''}</Text>
          <Btn label="Ajouter" type="primary" size="sm" onPress={openCreate} />
        </View>
        <TextInput
          style={[s.search, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
          value={search} onChangeText={setSearch}
          placeholder="Rechercher..." placeholderTextColor={colors.textMuted}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {[['all', `Tous (${medicaments.length})`], ['alertes', `Alertes (${alertes.length})`]].map(([k, l]) => (
            <TouchableOpacity key={k}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: tab === k ? (k === 'alertes' ? colors.danger : colors.primary) : colors.card, alignItems: 'center', borderWidth: 1.5, borderColor: tab === k ? (k === 'alertes' ? colors.danger : colors.primary) : colors.border }}
              onPress={() => setTab(k)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === k ? '#fff' : colors.textSecondary }}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? <Loader /> : (
        <FlatList
          data={displayed} keyExtractor={i => String(i.id)} renderItem={renderItem}
          contentContainerStyle={{ padding: 14, paddingTop: 4 }}
          ListEmptyComponent={<Empty text="Aucun medicament" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        />
      )}

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.overlay}>
            <View style={[s.modal, { backgroundColor: colors.card }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
                  {editItem ? 'Modifier le medicament' : 'Nouveau medicament'}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={{ color: colors.textMuted, fontSize: 20 }}>x</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                <Field label="Nom *"         value={form.nom}          onChange={v => set('nom', v)}          colors={colors} />
                <Field label="Categorie"     value={form.categorie}    onChange={v => set('categorie', v)}    colors={colors} placeholder="Ex: Antibiotiques" />
                <Field label="Description"   value={form.description}  onChange={v => set('description', v)}  colors={colors} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><Field label="Prix achat *"  value={form.prix_achat}  onChange={v => set('prix_achat', v)}  colors={colors} kbd="numeric" /></View>
                  <View style={{ flex: 1 }}><Field label="Prix vente *"  value={form.prix_vente}  onChange={v => set('prix_vente', v)}  colors={colors} kbd="numeric" /></View>
                </View>
                {form.prix_achat && form.prix_vente ? (
                  <Text style={{ color: parseFloat(form.prix_vente) >= parseFloat(form.prix_achat) ? colors.accent : colors.danger, fontSize: 12, marginBottom: 10 }}>
                    Benefice : {fmt(parseFloat(form.prix_vente || 0) - parseFloat(form.prix_achat || 0))} / unite
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><Field label="Stock (crtn)"  value={form.quantite_stock} onChange={v => set('quantite_stock', v)} colors={colors} kbd="numeric" /></View>
                  <View style={{ flex: 1 }}><Field label="Seuil alerte"  value={form.seuil_alerte}   onChange={v => set('seuil_alerte', v)}   colors={colors} kbd="numeric" /></View>
                </View>
                <Field label="Date expiration (AAAA-MM-JJ)" value={form.date_expiration} onChange={v => set('date_expiration', v)} colors={colors} placeholder="2026-12-31" />
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <View style={{ flex: 1 }}><Btn label="Annuler"                                              type="ghost"   onPress={() => setShowModal(false)} /></View>
                <View style={{ flex: 1 }}><Btn label={saving ? 'Enregistrement...' : editItem ? 'Modifier' : 'Ajouter'} type="primary"  onPress={handleSave} loading={saving} disabled={saving} /></View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChange, kbd, placeholder, colors }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 11, fontSize: 14, color: colors.textPrimary }}
        value={value} onChangeText={onChange} keyboardType={kbd || 'default'}
        placeholder={placeholder || ''} placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  card:      { borderRadius: 14, marginBottom: 10, padding: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2 },
  infoRow:   { flexDirection: 'row', gap: 6, marginBottom: 10 },
  infoBlock: { flex: 1, borderRadius: 8, padding: 7 },
  search:    { borderWidth: 1.5, borderRadius: 10, padding: 11, fontSize: 14 },
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:     { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%' },
});
