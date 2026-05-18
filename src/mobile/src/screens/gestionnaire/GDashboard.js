// src/screens/gestionnaire/GDashboard.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { StatCard, Card, SectionTitle, Badge, OfflineBanner, CacheBadge, fmt, fmtDate } from '../../components/UI';
import api from '../../services/api';

export default function GDashboard() {
  const { user }  = useAuth();
  const { colors } = useTheme();
  const [stats,    setStats]    = useState(null);
  const [medStats, setMedStats] = useState(null);
  const [alertes,  setAlertes]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache]   = useState(false);

  const load = async () => {
    try {
      const [cmd, med, alt] = await Promise.all([api.getCommandeStats(), api.getMedStats(), api.getAlertes()]);
      setStats(cmd.data); setMedStats(med.data); setAlertes(alt.data || []);
      setFromCache(!!(cmd.fromCache || med.fromCache));
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const benefice = (medStats?.valeur_stock_vente || 0) - (medStats?.valeur_stock_achat || 0);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>Chargement...</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <OfflineBanner />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20, backgroundColor: colors.primary }}>
          <CacheBadge fromCache={fromCache} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>Bonjour, {user?.prenom}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Province {user?.province_nom}</Text>
            </View>
            {alertes.length > 0 && (
              <View style={{ backgroundColor: colors.danger, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{alertes.length} alerte{alertes.length > 1 ? 's' : ''} stock</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 14, paddingTop: 16 }}>
          <SectionTitle text="Vue d'ensemble" />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <StatCard label="Total commandes"  value={stats?.total || 0}               color={colors.primary} />
            <StatCard label="Stock critique"   value={alertes.length || 0}             color={colors.danger} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <StatCard label="Chiffre d'affaires" value={fmt(stats?.chiffre_affaires)} color={colors.primary} mono />
            <StatCard label="Encaisse"            value={fmt(stats?.montant_encaisse)} color={colors.accent} mono />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <StatCard label="Benefice reel"      value={fmt(stats?.benefice_reel)}    color={colors.primary} mono />
            <StatCard label="Benefice potentiel" value={fmt(benefice)}                color={colors.warning} mono />
          </View>

          <SectionTitle text="Statut des commandes" />
          <Card style={{ marginBottom: 16 }}>
            {[
              ['En attente',  stats?.en_attente, colors.warning],
              ['Validees',    stats?.validees,   colors.info],
              ['Livrees',     stats?.livrees,    colors.primary],
              ['Payees',      stats?.payees,     colors.accent],
            ].map(([label, val, color]) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 12 }} />
                <Text style={{ flex: 1, fontSize: 14, color: colors.textSecondary }}>{label}</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color, fontFamily: 'monospace' }}>{val || 0}</Text>
              </View>
            ))}
          </Card>

          {alertes.length > 0 && (
            <>
              <SectionTitle text="Stocks critiques" />
              <Card style={{ marginBottom: 16 }}>
                {alertes.slice(0, 6).map((m, i) => (
                  <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: i < Math.min(alertes.length, 6) - 1 ? 1 : 0, borderBottomColor: colors.borderLight }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{m.nom}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{m.categorie || 'Sans categorie'}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.danger, fontFamily: 'monospace' }}>{m.quantite_stock} crtn</Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          <SectionTitle text="Valeur du stock" />
          <Card style={{ marginBottom: 16 }}>
            {[
              ['Valeur achat',  fmt(medStats?.valeur_stock_achat), colors.textPrimary],
              ['Valeur vente',  fmt(medStats?.valeur_stock_vente), colors.primary],
              ['Marge totale',  fmt(benefice),                     benefice >= 0 ? colors.accent : colors.danger],
            ].map(([label, value, color]) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color, fontFamily: 'monospace' }}>{value}</Text>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
