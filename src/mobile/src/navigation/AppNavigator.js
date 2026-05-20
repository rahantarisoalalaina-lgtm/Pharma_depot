// src/navigation/AppNavigator.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer }          from '@react-navigation/native';
import { createNativeStackNavigator }   from '@react-navigation/native-stack';
import { createBottomTabNavigator }     from '@react-navigation/bottom-tabs';
import { useAuth }     from '../context/AuthContext';
import { useTheme }    from '../context/ThemeContext';
import { useLang }     from '../context/LanguageContext';
import { LANGUAGES }   from '../i18n/i18n';
import AuthScreen      from '../screens/AuthScreen';
import GDashboard      from '../screens/gestionnaire/GDashboard';
import GCommandes      from '../screens/gestionnaire/GCommandes';
import GMedicaments    from '../screens/gestionnaire/GMedicaments';
import GLivraisons     from '../screens/gestionnaire/GLivraisons';
import CStock          from '../screens/client/CStock';
import CCommandes      from '../screens/client/CCommandes';
import CLivraisons     from '../screens/client/CLivraisons';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function LangThemeBar() {
  const { toggleTheme, isDark, colors } = useTheme();
  const { lang, switchLang, t }         = useLang();
  const next = LANGUAGES.find(l => l.code !== lang);
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginRight: 6 }}>
      <TouchableOpacity
        onPress={() => switchLang(next.code)}
        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.25)' }}>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{next.flag} {next.label}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={toggleTheme}
        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' }}>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{isDark ? t('clair') : t('sombre')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function LogoutBar() {
  const { logout }   = useAuth();
  const { t }        = useLang();
  const { colors }   = useTheme();
  return (
    <TouchableOpacity
      onPress={logout}
      style={{ paddingHorizontal: 12, paddingVertical: 5, marginRight: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' }}>
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{t('deconnexion')}</Text>
    </TouchableOpacity>
  );
}

const headerOpts = (colors) => ({
  headerStyle:      { backgroundColor: colors.primary },
  headerTitleStyle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  headerTintColor:  '#fff',
  headerShadowVisible: false,
  headerRight: () => <LangThemeBar />,
  headerLeft:  () => <LogoutBar />,
});

function GTab() {
  const { colors } = useTheme();
  const { t }      = useLang();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerOpts(colors),
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card, borderTopColor: colors.border,
          borderTopWidth: 1, paddingBottom: 6, paddingTop: 4, height: 62,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      })}>
      <Tab.Screen name="dashboard"   component={GDashboard}
        options={{ title: t('tableau_de_bord'), tabBarLabel: t('accueil'),    tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} /> }} />
      <Tab.Screen name="commandes"   component={GCommandes}
        options={{ title: t('commandes'),       tabBarLabel: t('commandes'),  tabBarIcon: ({ color }) => <TabIcon icon="📋" color={color} /> }} />
      <Tab.Screen name="medicaments" component={GMedicaments}
        options={{ title: t('medicaments'),     tabBarLabel: t('stock'),      tabBarIcon: ({ color }) => <TabIcon icon="💊" color={color} /> }} />
      <Tab.Screen name="livraisons"  component={GLivraisons}
        options={{ title: t('livraisons'),      tabBarLabel: t('livraisons'), tabBarIcon: ({ color }) => <TabIcon icon="🚚" color={color} /> }} />
    </Tab.Navigator>
  );
}

function CTab() {
  const { colors } = useTheme();
  const { t }      = useLang();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerOpts(colors),
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card, borderTopColor: colors.border,
          borderTopWidth: 1, paddingBottom: 6, paddingTop: 4, height: 62,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      })}>
      <Tab.Screen name="stock"        component={CStock}
        options={{ title: t('catalogue'),    tabBarLabel: t('catalogue'),    tabBarIcon: ({ color }) => <TabIcon icon="💊" color={color} /> }} />
      <Tab.Screen name="mescommandes" component={CCommandes}
        options={{ title: t('mes_commandes'), tabBarLabel: t('mes_commandes'), tabBarIcon: ({ color }) => <TabIcon icon="📋" color={color} /> }} />
      <Tab.Screen name="meslivraisons" component={CLivraisons}
        options={{ title: t('mes_livraisons'), tabBarLabel: t('mes_livraisons'), tabBarIcon: ({ color }) => <TabIcon icon="🚚" color={color} /> }} />
    </Tab.Navigator>
  );
}

function TabIcon({ icon, color }) {
  return <Text style={{ fontSize: 20, opacity: 0.9 }}>{icon}</Text>;
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors }        = useTheme();
  const { t }             = useLang();

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>+</Text>
      </View>
      <Text style={{ color: colors.textMuted, marginTop: 14, fontSize: 14 }}>{t('chargement')}</Text>
    </View>
  );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : user.role === 'client' ? (
          <Stack.Screen name="ClientMain" component={CTab} />
        ) : (
          <Stack.Screen name="GestionnaireMain" component={GTab} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}