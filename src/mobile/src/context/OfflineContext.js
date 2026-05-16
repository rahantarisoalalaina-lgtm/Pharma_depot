// src/context/OfflineContext.js — Détection réseau et sync offline
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import api from '../services/api';

export const OfflineContext = createContext({ isOnline: true, pendingCount: 0, syncNow: () => {} });
export const useOffline = () => useContext(OfflineContext);

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const wasOffline = useRef(false);
  const isOnlineRef = useRef(true);

  // Garder isOnlineRef synchronisé pour éviter les closures périmées
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  const refreshPending = useCallback(async () => {
    const q = await api.getOfflineQueue();
    setPendingCount(q.length);
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnlineRef.current) return;
    const result = await api.syncOfflineQueue();
    await refreshPending();
    setLastSync(new Date());
    return result;
  }, [refreshPending]);

  useEffect(() => {
    refreshPending();

    const unsub = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      isOnlineRef.current = online;
      // Si on revient en ligne après une période hors-ligne, sync automatique
      if (online && wasOffline.current) {
        wasOffline.current = false;
        setTimeout(syncNow, 1000); // délai pour laisser le réseau se stabiliser
      }
      if (!online) wasOffline.current = true;
    });

    // Refresh pending au retour de l'app en foreground
    const appSub = AppState.addEventListener('change', state => {
      if (state === 'active') refreshPending();
    });

    return () => {
      unsub();
      appSub.remove();
    };
  }, [refreshPending, syncNow]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, syncNow, lastSync, refreshPending }}>
      {children}
    </OfflineContext.Provider>
  );
}
