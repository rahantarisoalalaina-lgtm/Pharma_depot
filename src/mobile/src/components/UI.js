// src/components/UI.js
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useOffline } from '../context/OfflineContext';

export const fmt      = (n) => `${Number(n || 0).toLocaleString('fr-FR')} Ar`;
export const fmtDate  = (s) => s ? new Date(s).toLocaleDateString('fr-FR') : '-';

// ── OFFLINE BANNER ──
export function OfflineBanner() {
  const { isOnline, pendingCount, syncNow } = useOffline();
  const { colors } = useTheme();
  if (isOnline && pendingCount === 0) return null;
  return (
    <View style={{ backgroundColor: isOnline ? colors.primary : colors.warning, paddingVertical: 7, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 }}>
        {isOnline ? `En ligne — ${pendingCount} action(s) en attente de sync` : 'Hors ligne — donnees depuis le cache'}
      </Text>
      {isOnline && pendingCount > 0 && (
        <TouchableOpacity onPress={syncNow} style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Sync</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── CACHE BADGE ──
export function CacheBadge({ fromCache }) {
  const { colors } = useTheme();
  if (!fromCache) return null;
  return (
    <View style={{ backgroundColor: colors.badgeWarningBg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginHorizontal: 14, marginBottom: 4 }}>
      <Text style={{ color: colors.warning, fontSize: 11, fontWeight: '600' }}>Donnees depuis le cache (hors ligne)</Text>
    </View>
  );
}

// ── BADGE ──
export function Badge({ label, type }) {
  const { colors } = useTheme();
  const t = type || 'secondary';
  const map = {
    success:   [colors.badgeSuccessBg, colors.badgeSuccessTxt],
    warning:   [colors.badgeWarningBg, colors.badgeWarningTxt],
    danger:    [colors.badgeDangerBg,  colors.badgeDangerTxt],
    info:      [colors.badgeInfoBg,    colors.badgeInfoTxt],
    primary:   [colors.badgeGreenBg,   colors.primary],
    purple:    [colors.badgePurpleBg,  colors.purple],
    secondary: [colors.stripe,         colors.textMuted],
  };
  const [bg, txt] = map[t] || map.secondary;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: txt, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

// ── STATUS BADGE ──
export function StatusBadge({ statut }) {
  const map = {
    en_attente: ['warning',  'En attente'],
    validee:    ['info',     'Validee'],
    livree:     ['info',     'Livree'],
    paye:       ['success',  'Payee'],
    annulee:    ['danger',   'Annulee'],
    planifie:   ['warning',  'Planifiee'],
    en_cours:   ['primary',  'En cours'],
    livre:      ['success',  'Livree'],
    echec:      ['danger',   'Echec'],
  };
  const [type, label] = map[statut] || ['secondary', statut];
  return <Badge label={label} type={type} />;
}

// ── STAT CARD ──
export function StatCard({ label, value, color, mono }) {
  const { colors } = useTheme();
  const c = color || colors.primary;
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, flex: 1, ...colors.shadow }}>
      <Text style={{ fontSize: mono ? 13 : 20, fontWeight: '800', color: c, fontFamily: mono ? 'monospace' : undefined }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

// ── CARD ──
export function Card({ children, style, onPress }) {
  const { colors } = useTheme();
  const base = { backgroundColor: colors.card, borderRadius: 14, ...colors.shadow, marginBottom: 10, overflow: 'hidden' };
  if (onPress) return <TouchableOpacity style={[base, style]} onPress={onPress} activeOpacity={0.75}>{children}</TouchableOpacity>;
  return <View style={[base, style]}>{children}</View>;
}

// ── INFO ROW ──
export function InfoRow({ label, value, valueColor }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
      <Text style={{ fontSize: 13, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: valueColor || colors.textPrimary, fontFamily: 'monospace' }}>{value}</Text>
    </View>
  );
}

// ── BTN ──
export function Btn({ label, onPress, type, size, disabled, loading, icon }) {
  const { colors } = useTheme();
  const t = type || 'primary';
  const sz = size || 'md';
  const config = {
    primary:  { bg: colors.primary,     txt: '#fff',              border: colors.primary },
    success:  { bg: colors.accent,      txt: '#fff',              border: colors.accent },
    danger:   { bg: colors.danger,      txt: '#fff',              border: colors.danger },
    warning:  { bg: colors.warning,     txt: '#fff',              border: colors.warning },
    purple:   { bg: colors.purple,      txt: '#fff',              border: colors.purple },
    info:     { bg: colors.info,        txt: '#fff',              border: colors.info },
    outline:  { bg: 'transparent',      txt: colors.primary,      border: colors.primary },
    ghost:    { bg: colors.cardAlt,     txt: colors.textSecondary, border: colors.border },
  };
  const { bg, txt, border } = config[t] || config.primary;
  const pad = sz === 'sm' ? { paddingVertical: 7, paddingHorizontal: 14 } : sz === 'lg' ? { paddingVertical: 15, paddingHorizontal: 24 } : { paddingVertical: 12, paddingHorizontal: 18 };
  const fs = sz === 'sm' ? 12 : sz === 'lg' ? 16 : 14;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading}
      style={[{ backgroundColor: bg, borderRadius: 12, borderWidth: 1.5, borderColor: border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, opacity: (disabled || loading) ? 0.5 : 1 }, pad]}>
      {loading && <ActivityIndicator size="small" color={txt} />}
      {icon && !loading && <Text style={{ fontSize: fs }}>{icon}</Text>}
      <Text style={{ color: txt, fontWeight: '700', fontSize: fs }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── LOADER ──
export function Loader() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>Chargement...</Text>
    </View>
  );
}

// ── EMPTY ──
export function Empty({ text, icon }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 50 }}>
      {icon && <Text style={{ fontSize: 36, marginBottom: 12 }}>{icon}</Text>}
      <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>{text || 'Aucun resultat'}</Text>
    </View>
  );
}

// ── SECTION TITLE ──
export function SectionTitle({ text }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 6 }}>{text}</Text>;
}

// ── PILL ──
export function Pill({ label, active, onPress, color }) {
  const { colors } = useTheme();
  const bg  = active ? (color || colors.primary) : colors.card;
  const txt = active ? '#fff' : colors.textSecondary;
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: bg, borderWidth: 1.5, borderColor: active ? (color || colors.primary) : colors.border }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: txt }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── TAB ICON ──
export function TabIcon({ name, color, size }) {
  const sz = size || 22;
  const icons = { dashboard: '⊞', commandes: '≡', medicaments: '+', livraisons: '→', stock: '◫', mescommandes: '☰' };
  return <Text style={{ fontSize: sz * 0.85, color: color, lineHeight: sz + 2 }}>{icons[name] || '○'}</Text>;
}

// ── DIVIDER ──
export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: 8 }} />;
}
