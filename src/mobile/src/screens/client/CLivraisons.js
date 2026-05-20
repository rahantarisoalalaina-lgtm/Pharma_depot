// src/screens/client/CLivraisons.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  ScrollView, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLang }  from '../../context/LanguageContext';
import { useAuth }  from '../../context/AuthContext';
import api from '../../services/api';

function fmt(n)    { return n == null ? '0 Ar' : Number(n).toLocaleString('fr-MG') + ' Ar'; }
function fmtDate(d){ return d ? String(d).slice(0, 16).replace('T', ' ') : '—'; }

const STATUT_COLOR = {
  planifie: '#f39c12',
  en_cours: '#3498db',
  livre:    '#27ae60',
  echec:    '#e74c3c',
};

export default function CLivraisons() {
  const { colors }  = useTheme();
  const { t }       = useLang();
  const { user }    = useAuth();

  const [livraisons, setLivraisons] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail,     setDetail]     = useState(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    try {
      // user.id = pharmacie_id (loginClient retourne l'objet pharmacie)
      const r = await api.clientGetLivraisons({ pharmacie_id: user?.id });
      setLivraisons(r.data || []);
    } catch (e) { console.warn('CLivraisons:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Polling automatique toutes les 15 secondes pour voir les nouvelles livraisons
  useEffect(() => {
    const interval = setInterval(() => { load(); }, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const openDetail = async (liv) => {
    setDetail(liv);
  };

  const handleConfirmer = (liv) => {
    Alert.alert(
      t('confirmer_reception'),
      t('confirmer_reception_msg'),
      [
        { text: t('annuler'), style: 'cancel' },
        {
          text: t('recu'),
          onPress: async () => {
            setConfirming(true);
            try {
              await api.clientConfirmerLivraison(liv.id);
              Alert.alert(t('succes'), t('livraison_confirmee'));
              setDetail(null);
              load();
            } catch (e) {
              Alert.alert(t('erreur'), e.message);
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
  };

  const nbPlanif  = livraisons.filter(l => l.statut === 'planifie').length;
  const nbEnCours = livraisons.filter(l => l.statut === 'en_cours').length;
  const nbLivrees = livraisons.filter(l => l.statut === 'livre').length;

  const s = styles(colors);

  const renderItem = ({ item: liv }) => {
    const col = STATUT_COLOR[liv.statut] || '#95a5a6';
    return (
      <View style={[s.card, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => openDetail(liv)}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
            <View style={[s.dot, { backgroundColor: col }]} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                #{String(liv.id).padStart(4, '0')}
                {liv.pharmacie_nom ? ` — ${liv.pharmacie_nom}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                <View style={{ backgroundColor: `${col}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: col }}>
                    {t(liv.statut === 'planifie' ? 'planifiees'
                      : liv.statut === 'en_cours' ? 'en_cours'
                      : liv.statut === 'livre'    ? 'livree'
                      : 'echec')}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary, fontFamily: 'monospace' }}>
                {fmt(liv.montant_total)}
              </Text>
              {liv.distance_totale ? (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {Number(liv.distance_totale).toFixed(1)} {t('km')}
                </Text>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>

        {/* Bouton Livré visible directement sur la card */}
        {(liv.statut === 'planifie' || liv.statut === 'en_cours') && (
          <TouchableOpacity
            style={{
              marginHorizontal: 14, marginBottom: 12,
              backgroundColor: '#27ae60', borderRadius: 10, padding: 12, alignItems: 'center',
            }}
            onPress={() => handleConfirmer(liv)}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
              ✅ {t('marquer_livre')}
            </Text>
          </TouchableOpacity>
        )}

        {liv.statut === 'livre' && (
          <View style={{ marginHorizontal: 14, marginBottom: 12, backgroundColor: '#eafaf1', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#27ae60' }}>
            <Text style={{ color: '#27ae60', fontWeight: '700', fontSize: 13 }}>✓ {t('livree')}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>

      {/* Statistiques */}
      <View style={{ flexDirection: 'row', gap: 8, padding: 14, paddingBottom: 6 }}>
        {[
          { label: t('livraisons_planifiees_label'), value: nbPlanif,  color: '#f39c12' },
          { label: t('en_cours'),                    value: nbEnCours, color: '#3498db' },
          { label: t('livraisons_recues'),            value: nbLivrees, color: '#27ae60' },
        ].map(stat => (
          <View key={stat.label} style={{
            flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12,
            alignItems: 'center', borderWidth: 1.5, borderColor: `${stat.color}40`,
          }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: stat.color, fontFamily: 'monospace' }}>
              {stat.value}
            </Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2, textAlign: 'center' }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Bannière livraisons en cours */}
      {nbEnCours > 0 && (
        <View style={{
          margin: 14, marginTop: 6, padding: 12, backgroundColor: '#ebf5fb',
          borderRadius: 10, borderWidth: 1.5, borderColor: '#3498db', flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <Text style={{ fontSize: 18 }}>🚚</Text>
          <Text style={{ color: '#3498db', fontWeight: '600', fontSize: 12, flex: 1 }}>
            {nbEnCours} {t('banniere_livraison')}
          </Text>
        </View>
      )}

      {loading
        ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.textMuted }}>{t('chargement')}</Text>
          </View>
        : <FlatList
            data={livraisons}
            keyExtractor={i => String(i.id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>📦</Text>
                <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: '600' }}>
                  {t('aucune_livraison_client')}
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(); }}
                tintColor={colors.primary}
              />
            }
          />
      }

      {/* Modal détail */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={[s.modalFull, { backgroundColor: colors.bg }]}>
          <View style={[s.mHeader, { backgroundColor: colors.primary }]}>
            <Text style={s.mTitle}>
              {t('livraison')} #{detail && String(detail.id).padStart(4, '0')}
            </Text>
            <TouchableOpacity onPress={() => setDetail(null)}>
              <Text style={{ color: '#fff', fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {detail && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>

              {/* Infos */}
              <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                {[
                  [t('statut'),          t(detail.statut === 'planifie' ? 'planifiees'
                                           : detail.statut === 'en_cours' ? 'en_cours'
                                           : detail.statut === 'livre'    ? 'livree'
                                           : 'echec')],
                  [t('date_prevue'),     fmtDate(detail.date_livraison)],
                  [t('montant_recu'),    fmt(detail.montant_total)],
                  [t('distance_totale'), detail.distance_totale
                    ? `${Number(detail.distance_totale).toFixed(2)} ${t('km')}`
                    : t('non_calculee')],
                ].map(([lbl, val]) => (
                  <View key={lbl} style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border,
                  }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{lbl}</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>{val}</Text>
                  </View>
                ))}
              </View>

              {/* Actions */}
              <View style={{ gap: 10 }}>
                {(detail.statut === 'en_cours' || detail.statut === 'planifie') && (
                  <TouchableOpacity
                    style={{ backgroundColor: confirming ? colors.border : '#27ae60', borderRadius: 12, padding: 15, alignItems: 'center' }}
                    onPress={() => handleConfirmer(detail)}
                    disabled={confirming}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                      {confirming ? t('chargement') : '✅ ' + t('marquer_livre')}
                    </Text>
                  </TouchableOpacity>
                )}

                {detail.statut === 'livre' && (
                  <View style={{ backgroundColor: '#eafaf1', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#27ae60', alignItems: 'center' }}>
                    <Text style={{ color: '#27ae60', fontWeight: '700', fontSize: 14 }}>
                      ✓ {t('livree')}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={{ backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
                  onPress={() => setDetail(null)}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('fermer')}</Text>
                </TouchableOpacity>
              </View>
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
  dot:       { width: 12, height: 12, borderRadius: 6 },
  modalFull: { flex: 1 },
  mHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingTop: 20 },
  mTitle:    { fontSize: 17, fontWeight: '800', color: '#fff' },
});