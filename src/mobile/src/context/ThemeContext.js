// src/context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

export const COLORS = {
  light: {
    primary:    '#16A34A',
    primaryDark:'#15803D',
    accent:     '#22C55E',
    danger:     '#DC2626',
    warning:    '#D97706',
    info:       '#2563EB',
    purple:     '#7C3AED',

    bg:         '#F0FDF4',
    card:       '#FFFFFF',
    cardAlt:    '#F0FDF4',
    inputBg:    '#F9FAFB',
    stripe:     '#F0FDF4',

    textPrimary:   '#0F172A',
    textSecondary: '#374151',
    textMuted:     '#6B7280',

    border:      '#D1FAE5',
    borderLight: '#F0FDF4',

    badgeSuccessBg:  '#DCFCE7', badgeSuccessTxt:  '#166534',
    badgeWarningBg:  '#FEF3C7', badgeWarningTxt:  '#92400E',
    badgeDangerBg:   '#FEE2E2', badgeDangerTxt:   '#991B1B',
    badgeInfoBg:     '#DBEAFE', badgeInfoTxt:     '#1E40AF',
    badgePurpleBg:   '#EDE9FE', badgePurpleTxt:   '#5B21B6',
    badgeGreenBg:    '#DCFCE7', badgeGreenTxt:    '#166534',

    shadow: { shadowColor: '#166534', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  },
  dark: {
    primary:    '#4ADE80',
    primaryDark:'#22C55E',
    accent:     '#86EFAC',
    danger:     '#F87171',
    warning:    '#FBBF24',
    info:       '#60A5FA',
    purple:     '#A78BFA',

    bg:         '#0A0F0A',
    card:       '#111811',
    cardAlt:    '#162016',
    inputBg:    '#162016',
    stripe:     '#0A0F0A',

    textPrimary:   '#F0FDF4',
    textSecondary: '#A7F3D0',
    textMuted:     '#6B7280',

    border:      '#1A2E1A',
    borderLight: '#111811',

    badgeSuccessBg:  '#052E16', badgeSuccessTxt:  '#4ADE80',
    badgeWarningBg:  '#1C1400', badgeWarningTxt:  '#FBBF24',
    badgeDangerBg:   '#1A0000', badgeDangerTxt:   '#F87171',
    badgeInfoBg:     '#0C1A33', badgeInfoTxt:     '#60A5FA',
    badgePurpleBg:   '#1A0E33', badgePurpleTxt:   '#A78BFA',
    badgeGreenBg:    '#052E16', badgeGreenTxt:    '#4ADE80',

    shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    AsyncStorage.getItem('theme').then(t => { if (t) setTheme(t); }).catch(() => {});
  }, []);
  const toggleTheme = async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try { await AsyncStorage.setItem('theme', next); } catch {}
  };
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors: COLORS[theme], isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}
