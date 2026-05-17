// src/screens/client/CCommandes.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { StatusBadge, Btn, Loader, Empty, OfflineBanner, CacheBadge, fmt, fmtDate, Card, InfoRow } from '../../components/UI';
import api from '../../services/api';

export default function CCommandes() {
  const { colors } = useTheme();
  const [commandes,  setCommandes]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail,     setDetail]     = useState(null);

  const load = async () => {
    try { const r = await api.clientGetCommandes(); setCommandes(r.data || []); }
    catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (cmd) => {
    setDetail(cmd);
    try { const r = await api.clientGetCommandeDetail(cmd.id); setDetail(r.data); } catch {}
  };

  const STATUT_MSG = {
    en_attente: 'En attente de validation par le depot.',
    validee:    'Commande validee — livraison en preparation.',
    livree:     'Commande livree — en attente de reglement.',
    paye:       'Commande entierement payee.',
    annulee:    'Commande annulee.',
  };

  const s = styles(colors);

  const renderItem = ({ item: cmd }) => {
    const reste    = Math.max(0, (cmd.montant_total || 0) - (cmd.montant_paye || 0));
    const progress = cmd.montant_total > 0 ? Math.min(1, (cmd.montant_paye || 0) / cmd.montant_total) : 0;
    return (
      <TouchableOpacity style={[s.card, { backgroundColor: colors.card }]} onPress={() => openDetail(cmd)} activeOpacity={0.75}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          <View style={[s.numBox, { backgroundColor: colors.badgeGreenBg }]}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>#{String(cmd.id).padStart(5,'0')}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <StatusBadge statut={cmd.statut} />
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{fmtDate(cmd.created_at)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(cmd.montant_total)}</Text>
            {reste > 0 && <Text style={{ fontSize: 11, color: colors.danger, fontWeight: '600', marginTop: 2 }}>Reste {fmt(reste)}</Text>}
          </View>
        </View>
        {cmd.montant_total > 0 && (
          <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
            <View style={[s.progBg, { backgroundColor: colors.borderLight }]}>
              <View style={[s.progFill, { backgroundColor: progress >= 1 ? colors.accent : colors.primary, width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
              Regle : {Math.round(progress * 100)}%
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <OfflineBanner />
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 }}>
        <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
          {commandes.length} commande{commandes.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loading ? <Loader /> : (
        <FlatList
          data={commandes} keyExtractor={i => String(i.id)} renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 30 }}
          ListEmptyComponent={<Empty text={'Aucune commande pour le moment.\n\nPassez votre premiere commande depuis le catalogue.'} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        />
      )}

      {/* Detail */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={[s.modalFull, { backgroundColor: colors.bg }]}>
          <View style={[s.mHeader, { backgroundColor: colors.primary }]}>
            <Text style={s.mTitle}>Commande #{detail && String(detail.id).padStart(5,'0')}</Text>
            <TouchableOpacity onPress={() => setDetail(null)}><Text style={{ color: '#fff', fontSize: 22 }}>x</Text></TouchableOpacity>
          </View>
          {detail && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {STATUT_MSG[detail.statut] && (
                <View style={{ backgroundColor: colors.badgeGreenBg, borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: colors.primary }}>
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>{STATUT_MSG[detail.statut]}</Text>
                </View>
              )}
              <Card style={{ padding: 16, marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Pharmacie</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>{detail.pharmacie_nom}</Text>
              </Card>
              <Card style={{ padding: 16, marginBottom: 12 }}>
                <InfoRow label="Total"         value={fmt(detail.montant_total)}  valueColor={colors.primary} />
                <InfoRow label="Paye"          value={fmt(detail.montant_paye)}   valueColor={colors.accent} />
                <InfoRow label="Reste a payer" value={fmt(Math.max(0, (detail.montant_total || 0) - (detail.montant_paye || 0)))} valueColor={colors.danger} />
                <InfoRow label="Date"          value={fmtDate(detail.created_at)} />
              </Card>
              {(detail.lignes || []).length > 0 && (
                <>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Produits commandes</Text>
                  <Card style={{ marginBottom: 16 }}>
                    {detail.lignes.map((l, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: i < detail.lignes.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{l.medicament_nom}</Text>
                          <Text style={{ fontSize: 12, color: colors.textMuted }}>{l.quantite} crtn x {fmt(l.prix_unitaire)}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(l.quantite * l.prix_unitaire)}</Text>
                      </View>
                    ))}
                    <View style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.badgeGreenBg }}>
                      <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Total</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontFamily: 'monospace' }}>{fmt(detail.montant_total)}</Text>
                    </View>
                  </Card>
                </>
              )}
              <Btn label="Fermer" type="ghost" onPress={() => setDetail(null)} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container:  { flex: 1 },
  card:       { borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3 },
  numBox:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progBg:     { height: 5, borderRadius: 3, overflow: 'hidden' },
  progFill:   { height: 5, borderRadius: 3 },
  modalFull:  { flex: 1 },
  mHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingTop: 20 },
  mTitle:     { fontSize: 17, fontWeight: '800', color: '#fff' },
});
