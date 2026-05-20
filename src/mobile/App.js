// App.js
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider }    from './src/context/ThemeContext';
import { AuthProvider }     from './src/context/AuthContext';
import { OfflineProvider }  from './src/context/OfflineContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator         from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <OfflineProvider>
              <AppNavigator />
            </OfflineProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}