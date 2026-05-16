// src/navigation/AppNavigator.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { TabIcon } from '../components/UI';
import AuthScreen        from '../screens/AuthScreen';
import GDashboard        from '../screens/gestionnaire/GDashboard';
import GCommandes        from '../screens/gestionnaire/GCommandes';
import GMedicaments      from '../screens/gestionnaire/GMedicaments';
import GLivraisons       from '../screens/gestionnaire/GLivraisons';
import CStock            from '../screens/client/CStock';
import CCommandes        from '../screens/client/CCommandes';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function HeaderRight() {
  const { logout } = useAuth();
  const { toggleTheme, isDark, colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginRight: 4 }}>
      <TouchableOpacity onPress={toggleTheme}
        style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{isDark ? 'Clair' : 'Sombre'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={logout}
        style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Deconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}

function GestionnaireTabNav() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => <TabIcon name={route.name.toLowerCase()} color={color} size={22} />,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1, paddingBottom: 6, paddingTop: 4, height: 62 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        headerStyle: { backgroundColor: colors.primary },
        headerTitleStyle: { color: '#fff', fontWeight: '800', fontSize: 16 },
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerRight: () => <HeaderRight />,
      })}
    >
      <Tab.Screen name="dashboard"   component={GDashboard}   options={{ title: 'Tableau de bord', tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="commandes"   component={GCommandes}   options={{ title: 'Commandes',       tabBarLabel: 'Commandes' }} />
      <Tab.Screen name="medicaments" component={GMedicaments} options={{ title: 'Medicaments',     tabBarLabel: 'Stock' }} />
      <Tab.Screen name="livraisons"  component={GLivraisons}  options={{ title: 'Livraisons',      tabBarLabel: 'Livraisons' }} />
    </Tab.Navigator>
  );
}

function ClientTabNav() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => <TabIcon name={route.name.toLowerCase()} color={color} size={22} />,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1, paddingBottom: 6, paddingTop: 4, height: 62 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        headerStyle: { backgroundColor: colors.primary },
        headerTitleStyle: { color: '#fff', fontWeight: '800', fontSize: 16 },
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerRight: () => <HeaderRight />,
      })}
    >
      <Tab.Screen name="stock"        component={CStock}    options={{ title: 'Catalogue',    tabBarLabel: 'Catalogue' }} />
      <Tab.Screen name="mescommandes" component={CCommandes} options={{ title: 'Mes commandes', tabBarLabel: 'Commandes' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>+</Text>
      </View>
      <Text style={{ color: colors.textMuted, marginTop: 14, fontSize: 14, fontWeight: '600' }}>Chargement...</Text>
    </View>
  );
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : user.role === 'client' ? (
          <Stack.Screen name="ClientMain" component={ClientTabNav} />
        ) : (
          <Stack.Screen name="GestionnaireMain" component={GestionnaireTabNav} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
