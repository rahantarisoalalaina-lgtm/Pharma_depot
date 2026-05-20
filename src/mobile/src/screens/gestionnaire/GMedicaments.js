// src/screens/gestionnaire/GMedicaments.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Modal,
  ScrollView, StyleSheet, RefreshControl, Alert,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth }  from '../../context/AuthContext';
import { useLang }  from '../../context/LanguageContext';
import api from '../../services/api';

function fmt(n) {
  if (n == null || isNaN(n)) return '0 Ar';
  return Number(n).toLocaleString('fr-MG') + ' Ar';
}
function fmtDate(d) {
  if (!d) return '—';
  return String(d).slice(0, 10);
}

const EMPTY = { nom: '', description: '', categorie: '', prix_achat: '', prix_vente: '', quantite_stock: '', date_expiration: '', seuil_alerte: '20' };

export default function GMedicaments() {
  const { colors } = useTheme();
  const { user }   = useAuth();
  const { t }      = useLang();

  const [medicaments, setMedicaments] = useState([]);
  const [alertes,     setAlertes]     = useState([]);
  const [search,      setSearch]      = useState('');
  const [tab,         setTab]         = useState('all');
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [form,        setForm]        = useState(EMPTY);
  const [saving,      setSaving]      = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (user?.province_id) params.province_id = user.province_id;
      if (search) params.search = search;
      const [meds, alts] = await Promise.all([
        api.getMedicaments(params),
        api.getAlertes(user?.province_id),
      ]);
      setMedicaments(meds.data || []);
      setAlertes(alts.data || []);
    } catch (e) { console.warn('GMedicaments:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, user]);

  useEffect(() => {
    const t2 = setTimeout(load, 350);
    return () => clearTimeout(t2);
  }, [load]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setShowModal(true); };
  const openEdit   = (m) => {
    setForm({
      nom:            m.nom || '',
      description:    m.description || '',
      categorie:      m.categorie || '',
      prix_achat:     String(m.prix_achat || ''),
      prix_vente:     String(m.prix_vente || ''),
      quantite_stock: String(m.quantite_stock || ''),
      date_expiration: m.date_expiration ? String(m.date_expiration).slice(0, 10) : '',
      seuil_alerte:   String(m.seuil_alerte || 20),
    });
    setEditItem(m);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim())                     { Alert.alert(t('erreur'), t('nom_obligatoire_msg')); return; }
    if (!form.prix_achat || !form.prix_vente) { Alert.alert(t('erreur'), t('prix_obligatoire_msg')); return; }
    if (!user?.province_id)                   { Alert.alert(t('erreur'), t('province_introuvable')); return; }
    setSaving(true);
    try {
      const payload = {
        nom:            form.nom.trim(),
        description:    form.description.trim(),
        categorie:      form.categorie.trim(),
        prix_achat:     parseFloat(form.prix_achat),
        prix_vente:     parseFloat(form.prix_vente),
        quantite_stock: parseInt(form.quantite_stock) || 0,
        date_expiration: form.date_expiration || null,
        seuil_alerte:   parseInt(form.seuil_alerte) || 20,
        province_id:    user.province_id,
      };
      if (editItem) {
        await api.updateMedicament(editItem.id, payload);
        Alert.alert(t('succes'), t('medicament_modifie'));
      } else {
        await api.createMedicament(payload);
        Alert.alert(t('succes'), t('medicament_ajoute'));
      }
      setShowModal(false);
      load();
    } catch (e) {
      Alert.alert(t('erreur'), e.message || t('impossible_sauvegarder'));
    } finally { setSaving(false); }
  };

  const handleDelete = (m) => {
    Alert.alert(t('confirmer_suppression'), `${t('supprimer')} "${m.nom}" ?`, [
      { text: t('annuler'), style: 'cancel' },
      { text: t('supprimer'), style: 'destructive', onPress: async () => {
        try { await api.deleteMedicament(m.id); load(); }
        catch (e) { Alert.alert(t('erreur'), e.message); }
      }},
    ]);
  };

  const displayed = tab === 'alertes' ? alertes : medicaments;
  const s = styles(colors);

  const renderItem = ({ item: m }) => {
    const isAlert = m.quantite_stock <= m.seuil_alerte;
    const benef   = m.prix_vente - m.prix_achat;
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderLeftColor: isAlert ? '#e74c3c' : colors.primary }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>{m.nom}</Text>
            {m.categorie
              ? <View style={{ alignSelf: 'flex-start', backgroundColor: colors.badgeGreenBg || '#e8f5e9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{m.categorie}</Text>
                </View>
              : null}
          </View>
          <View style={{ backgroundColor: isAlert ? '#fde8e8' : '#e8f5e9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: isAlert ? '#e74c3c' : '#27ae60' }}>
              {isAlert ? t('stock_bas') : 'OK'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {[
            [t('stock'),   `${m.quantite_stock} ${t('crtn')}`, isAlert ? '#e74c3c' : colors.primary],
            [t('achat'),   fmt(m.prix_achat),                  colors.textSecondary],
            [t('vente'),   fmt(m.prix_vente),                   colors.primary],
            [t('benefice'),fmt(benef),                          benef > 0 ? '#27ae60' : '#e74c3c'],
          ].map(([lbl, val, color]) => (
            <View key={lbl} style={{ flex: 1, backgroundColor: colors.inputBg, borderRadius: 8, padding: 7 }}>
              <Text style={{ fontSize: 9, textTransform: 'uppercase', color: colors.textMuted, letterSpacing: 0.4, marginBottom: 3 }}>{lbl}</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color, fontFamily: 'monospace' }}>{val}</Text>
            </View>
          ))}
        </View>

        {m.date_expiration
          ? <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>{t('expiration')} : {fmtDate(m.date_expiration)}</Text>
          : null}

        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary }}
            onPress={() => openEdit(m)}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{t('modifier')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#e74c3c' }}
            onPress={() => handleDelete(m)}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('supprimer')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
            {medicaments.length} {medicaments.length !== 1 ? t('produits') : t('produit')}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
            onPress={openCreate}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('ajouter')}</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={{ backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 11, fontSize: 14, color: colors.textPrimary }}
          value={search} onChangeText={setSearch}
          placeholder={t('rechercher')} placeholderTextColor={colors.textMuted}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {[
            ['all',     `${t('tous')} (${medicaments.length})`],
            ['alertes', `${t('alertes_stock')} (${alertes.length})`],
          ].map(([k, l]) => (
            <TouchableOpacity key={k}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1.5,
                backgroundColor: tab === k ? (k === 'alertes' ? '#e74c3c' : colors.primary) : colors.card,
                borderColor:     tab === k ? (k === 'alertes' ? '#e74c3c' : colors.primary) : colors.border }}
              onPress={() => setTab(k)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === k ? '#fff' : colors.textSecondary }}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading
        ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.textMuted }}>{t('chargement')}</Text>
          </View>
        : <FlatList
            data={displayed}
            keyExtractor={i => String(i.id)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 14, paddingTop: 4 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>{t('aucun_medicament')}</Text>
              </View>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          />
      }

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.overlay}>
            <View style={[s.modal, { backgroundColor: colors.card }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
                  {editItem ? t('modifier_medicament') : t('nouveau_medicament')}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={{ color: colors.textMuted, fontSize: 22 }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                <Field label={t('nom_obligatoire')} value={form.nom} onChange={v => set('nom', v)} colors={colors} />
                <Field label={t('categorie')} value={form.categorie} onChange={v => set('categorie', v)} colors={colors} placeholder="Ex: Antibiotiques" />
                <Field label={t('description')} value={form.description} onChange={v => set('description', v)} colors={colors} />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field label={t('prix_achat')} value={form.prix_achat} onChange={v => set('prix_achat', v)} colors={colors} kbd="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label={t('prix_vente')} value={form.prix_vente} onChange={v => set('prix_vente', v)} colors={colors} kbd="numeric" />
                  </View>
                </View>

                {form.prix_achat && form.prix_vente
                  ? <Text style={{ color: parseFloat(form.prix_vente) >= parseFloat(form.prix_achat) ? '#27ae60' : '#e74c3c', fontSize: 12, marginBottom: 10 }}>
                      {t('benefice')} : {fmt(parseFloat(form.prix_vente || 0) - parseFloat(form.prix_achat || 0))} / {t('crtn')}
                    </Text>
                  : null}

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field label={t('stock_crtn')} value={form.quantite_stock} onChange={v => set('quantite_stock', v)} colors={colors} kbd="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label={t('seuil_alerte')} value={form.seuil_alerte} onChange={v => set('seuil_alerte', v)} colors={colors} kbd="numeric" />
                  </View>
                </View>

                <Field label={t('date_expiration')} value={form.date_expiration} onChange={v => set('date_expiration', v)} colors={colors} placeholder="2026-12-31" />
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={{ flex: 1, padding: 13, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' }}
                  onPress={() => setShowModal(false)}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('annuler')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, padding: 13, borderRadius: 12, backgroundColor: saving ? colors.border : colors.primary, alignItems: 'center' }}
                  onPress={handleSave} disabled={saving}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {saving ? t('enregistrement') : editItem ? t('modifier') : t('ajouter')}
                  </Text>
                </TouchableOpacity>
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
  card:    { borderRadius: 14, marginBottom: 10, padding: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%' },
});