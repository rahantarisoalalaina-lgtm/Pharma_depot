// src/screens/gestionnaire/GDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLang }  from '../../context/LanguageContext';
import api from '../../services/api';

function Card({ children, style }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2 }, style]}>
      {children}
    </View>
  );
}

function StatCard({ label, value, color, mono }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2 }}>
      <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: color || colors.primary, fontFamily: mono ? 'monospace' : undefined }}>{value}</Text>
    </View>
  );
}

function SectionTitle({ text }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 }}>
      {text}
    </Text>
  );
}

function fmt(n) {
  if (n == null || isNaN(n)) return '0 Ar';
  return Number(n).toLocaleString('fr-MG') + ' Ar';
}

export default function GDashboard() {
  const { user }   = useAuth();
  const { colors } = useTheme();
  const { t }      = useLang();

  const [stats,      setStats]      = useState(null);
  const [medStats,   setMedStats]   = useState(null);
  const [alertes,    setAlertes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cmd, med, alt] = await Promise.all([
        api.getCommandeStats(user?.province_id),
        api.getMedStats(user?.province_id),
        api.getAlertes(user?.province_id),
      ]);
      setStats(cmd.data);
      setMedStats(med.data);
      setAlertes(alt.data || []);
    } catch (e) { console.warn('GDashboard:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>{t('chargement')}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20, backgroundColor: colors.primary }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{t('bonjour')}, {user?.prenom}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{t('province')} {user?.province_nom}</Text>
            </View>
            {alertes.length > 0 && (
              <View style={{ backgroundColor: '#e74c3c', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  {alertes.length} {alertes.length > 1 ? t('alertes') : t('alerte')} stock
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 14, paddingTop: 16 }}>
          <SectionTitle text={t('vue_ensemble')} />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <StatCard label={t('total_commandes')} value={stats?.total || 0}   color={colors.primary} />
            <StatCard label={t('stock_critique')}  value={alertes.length || 0} color="#e74c3c" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <StatCard label={t('chiffre_affaires')} value={fmt(stats?.chiffre_affaires)} color={colors.primary} mono />
            <StatCard label={t('encaisse')}          value={fmt(stats?.chiffre_affaires)} color="#27ae60" mono />
          </View>

          <SectionTitle text={t('statut_commandes')} />
          <Card style={{ marginBottom: 16 }}>
            {[
              [t('en_attente'), stats?.en_attente, '#f39c12'],
              [t('validees'),   stats?.validees,   '#3498db'],
              [t('payees'),     stats?.total || 0, '#27ae60'],
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
              <SectionTitle text={t('stocks_critiques')} />
              <Card style={{ marginBottom: 16 }}>
                {alertes.slice(0, 6).map((m, i) => (
                  <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: i < Math.min(alertes.length, 6) - 1 ? 1 : 0, borderBottomColor: colors.borderLight }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#e74c3c', marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{m.nom}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{m.categorie || t('sans_categorie')}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#e74c3c', fontFamily: 'monospace' }}>{m.quantite_stock} {t('crtn')}</Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          <SectionTitle text={t('valeur_stock_label')} />
          <Card style={{ marginBottom: 16 }}>
            {[
              [t('total_commandes'), `${medStats?.total || 0} ${t('produits')}`, colors.textPrimary],
              [t('stock_critique'),  `${medStats?.en_alerte || 0} ${t('produits')}`, '#e74c3c'],
              [t('valeur_vente'),    fmt(medStats?.valeur_stock || 0), colors.primary],
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