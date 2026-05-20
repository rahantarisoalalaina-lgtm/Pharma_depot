// src/screens/client/CCommandes.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  ScrollView, StyleSheet, RefreshControl
} from 'react-native';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLang }  from '../../context/LanguageContext';
import api from '../../services/api';

function fmt(n) { if (n == null || isNaN(n)) return '0 Ar'; return Number(n).toLocaleString('fr-MG') + ' Ar'; }
function fmtDate(d) { if (!d) return '—'; return String(d).slice(0, 10); }

export default function CCommandes() {
  const { user }   = useAuth();
  const { colors } = useTheme();
  const { t }      = useLang();

  const [commandes,  setCommandes]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail,     setDetail]     = useState(null);

  const load = useCallback(async () => {
    try {
      // user.id = id de la pharmacie (loginClient retourne l'objet pharmacie)
      const r = await api.clientGetCommandes(user?.id);
      setCommandes(r.data || []);
    } catch (e) { console.warn('CCommandes:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (cmd) => {
    setDetail(cmd);
    try { const r = await api.clientGetCommandeDetail(cmd.id); setDetail(r.data); } catch {}
  };

  const statutColor = (s) => ({
    paye:      '#27ae60',
    validee:   '#3498db',
    livree:    '#9b59b6',
    annulee:   '#e74c3c',
  }[s] || '#f39c12');

  const statutMsg = (s) => ({
    en_attente: t('statut_en_attente'),
    validee:    t('statut_validee'),
    livree:     t('statut_livree'),
    paye:       t('statut_payee'),
    annulee:    t('statut_annulee'),
  }[s] || s);

  const s = styles(colors);

  const renderItem = ({ item: cmd }) => {
    const reste = Math.max(0, (cmd.montant_total || 0) - (cmd.montant_paye || 0));
    return (
      <TouchableOpacity style={[s.card, { backgroundColor: colors.card }]} onPress={() => openDetail(cmd)} activeOpacity={0.75}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.badgeGreenBg || '#e8f5e9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>#{String(cmd.id).padStart(4, '0')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>{cmd.pharmacie_nom}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{fmtDate(cmd.created_at)}</Text>
          </View>
          <View style={{ backgroundColor: `${statutColor(cmd.statut)}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: statutColor(cmd.statut) }}>{cmd.statut}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(cmd.montant_total)}</Text>
          {reste > 0
            ? <Text style={{ fontSize: 11, color: '#e74c3c', fontWeight: '600' }}>{t('reste_payer')} : {fmt(reste)}</Text>
            : <Text style={{ fontSize: 11, color: '#27ae60', fontWeight: '600' }}>{t('regle')}</Text>
          }
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      {loading
        ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.textMuted }}>{t('chargement')}</Text></View>
        : <FlatList
            data={commandes} keyExtractor={i => String(i.id)} renderItem={renderItem}
            contentContainerStyle={{ padding: 14 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 }}>
                <Text style={{ fontSize: 40, marginBottom: 16 }}>📋</Text>
                <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                  {t('aucune_commande_client')}
                </Text>
              </View>
            }
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
              {/* Statut */}
              <View style={{ backgroundColor: `${statutColor(detail.statut)}15`, borderRadius: 14, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: statutColor(detail.statut) }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: statutColor(detail.statut), marginBottom: 4 }}>{detail.statut?.toUpperCase()}</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>{statutMsg(detail.statut)}</Text>
              </View>

              {/* Infos */}
              <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>{t('pharmacie')}</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>{detail.pharmacie_nom}</Text>
              </View>

              <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                {[
                  [t('total'),        fmt(detail.montant_total)],
                  [t('paye'),         fmt(detail.montant_paye)],
                  [t('reste_payer'),  fmt(Math.max(0, detail.montant_total - detail.montant_paye))],
                  [t('date'),         fmtDate(detail.created_at)],
                ].map(([lbl, val]) => (
                  <View key={lbl} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{lbl}</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>{val}</Text>
                  </View>
                ))}
              </View>

              {/* Lignes */}
              {(detail.lignes || []).length > 0 && (
                <View style={{ backgroundColor: colors.card, borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', padding: 14, paddingBottom: 8 }}>
                    {t('produits_commandes')}
                  </Text>
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

              <TouchableOpacity
                style={{ backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
                onPress={() => setDetail(null)}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('fermer')}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1 },
  card:      { borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3 },
  modalFull: { flex: 1 },
  mHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingTop: 20 },
  mTitle:    { fontSize: 17, fontWeight: '800', color: '#fff' },
});