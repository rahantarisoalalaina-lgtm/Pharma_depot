// src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://maintenance-walks-assure-create.trycloudflare.com/api';
const CACHE_TTL = 1000 * 60 * 60 * 24;

export const PROVINCES_STATIQUES = [
  { id: 1, nom: 'Antananarivo', description: 'Capitale — Hautes Terres Centrales' },
  { id: 2, nom: 'Fianarantsoa', description: 'Sud des Hautes Terres' },
  { id: 3, nom: 'Toamasina',   description: 'Cote Est — Port principal' },
  { id: 4, nom: 'Mahajanga',   description: 'Nord-Ouest — Cote Ouest' },
  { id: 5, nom: 'Toliara',     description: 'Grand Sud et Sud-Ouest' },
  { id: 6, nom: 'Antsiranana', description: 'Extreme Nord — Diego-Suarez' },
];

function makeSignal(ms) {
  var ms2 = ms || 8000;
  var ctrl = new AbortController();
  setTimeout(function() { ctrl.abort(); }, ms2);
  return ctrl.signal;
}

function MobileApi() {
  this._token = null;
}

MobileApi.prototype.getToken = async function() {
  if (this._token) return this._token;
  try { return await AsyncStorage.getItem('token'); } catch(e) { return null; }
};

MobileApi.prototype.setToken = async function(t) {
  this._token = t;
  try { t ? await AsyncStorage.setItem('token', t) : await AsyncStorage.removeItem('token'); } catch(e) {}
};

MobileApi.prototype.headers = async function() {
  var token = await this.getToken();
  var h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
};

MobileApi.prototype.saveCache = async function(key, data) {
  try { await AsyncStorage.setItem('cache_' + key, JSON.stringify({ data: data, ts: Date.now() })); } catch(e) {}
};

MobileApi.prototype.loadCache = async function(key) {
  try {
    var raw = await AsyncStorage.getItem('cache_' + key);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    return Date.now() - obj.ts > CACHE_TTL ? null : obj.data;
  } catch(e) { return null; }
};

MobileApi.prototype.clearCache = async function() {
  try {
    var keys = await AsyncStorage.getAllKeys();
    var ck = keys.filter(function(k) { return k.startsWith('cache_'); });
    if (ck.length) await AsyncStorage.multiRemove(ck);
  } catch(e) {}
};

MobileApi.prototype.queueOfflineAction = async function(action) {
  try {
    var raw = await AsyncStorage.getItem('offline_queue');
    var q = raw ? JSON.parse(raw) : [];
    q.push(Object.assign({}, action, { ts: Date.now(), id: Math.random().toString(36).slice(2) }));
    await AsyncStorage.setItem('offline_queue', JSON.stringify(q));
  } catch(e) {}
};

MobileApi.prototype.getOfflineQueue = async function() {
  try { var r = await AsyncStorage.getItem('offline_queue'); return r ? JSON.parse(r) : []; } catch(e) { return []; }
};

MobileApi.prototype.syncOfflineQueue = async function() {
  var queue = await this.getOfflineQueue();
  if (!queue.length) return { synced: 0, failed: 0 };
  var synced = 0, failed = 0, remaining = [];
  for (var i = 0; i < queue.length; i++) {
    var action = queue[i];
    try {
      var opts = { method: action.method, headers: await this.headers() };
      if (action.body) opts.body = JSON.stringify(action.body);
      var res = await fetch(API_BASE + action.endpoint, opts);
      res.ok ? synced++ : (remaining.push(action), failed++);
    } catch(e) { remaining.push(action); failed++; }
  }
  await AsyncStorage.setItem('offline_queue', JSON.stringify(remaining));
  return { synced: synced, failed: failed };
};

MobileApi.prototype.request = async function(method, endpoint, body, cacheKey) {
  var self = this;
  var isAuth = endpoint.includes('/login') || endpoint.includes('/auth');

  if (method === 'GET' && cacheKey) {
    try {
      var res = await fetch(API_BASE + endpoint, { method: method, headers: await self.headers(), signal: makeSignal() });
      var data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur serveur');
      await self.saveCache(cacheKey, data);
      return Object.assign({}, data, { fromCache: false });
    } catch(e) {
      var cached = await self.loadCache(cacheKey);
      if (cached) return Object.assign({}, cached, { fromCache: true });
      throw new Error('Hors ligne — aucune donnee en cache.');
    }
  }

  if (method === 'GET') {
    var res2 = await fetch(API_BASE + endpoint, { method: method, headers: await self.headers(), signal: makeSignal() });
    var data2 = await res2.json();
    if (!res2.ok) throw new Error(data2.message || 'Erreur serveur');
    return data2;
  }

  try {
    var opts2 = { method: method, headers: await self.headers(), signal: makeSignal() };
    if (body) opts2.body = JSON.stringify(body);
    var res3 = await fetch(API_BASE + endpoint, opts2);
    var data3 = await res3.json();
    if (!res3.ok) throw new Error(data3.message || 'Erreur serveur');
    return data3;
  } catch(err) {
    if (isAuth) {
      if (err.name === 'AbortError' || err.message === 'Network request failed') {
        throw new Error('Impossible de joindre le serveur. Verifiez le backend sur le port 5000.');
      }
      throw err;
    }
    await self.queueOfflineAction({ method: method, endpoint: endpoint, body: body });
    throw new Error('Hors ligne — action enregistree.');
  }
};

// ── PROVINCES ──
MobileApi.prototype.getProvinces = async function() {
  try { return await this.request('GET', '/provinces', null, 'provinces'); }
  catch(e) { return { data: PROVINCES_STATIQUES, fromCache: true, isStatic: true }; }
};

// ── AUTH ──
MobileApi.prototype.getPharmaciesProvince = function(id)    { return this.request('GET',  '/client/pharmacies/' + id, null, 'pharmacies_' + id); };
MobileApi.prototype.loginGestionnaire     = function(d)     { return this.request('POST', '/auth/login',              d); };
MobileApi.prototype.loginClient           = function(d)     { return this.request('POST', '/pharmacies/login',        d); };

// ── MEDICAMENTS ──
MobileApi.prototype.getMedicaments = function(p) {
  var params = p || {};
  var qs = new URLSearchParams(params).toString();
  return this.request('GET', '/medicaments' + (qs ? '?' + qs : ''), null, 'medicaments_' + qs);
};
MobileApi.prototype.getMedicamentById = function(id)    { return this.request('GET',    '/medicaments/' + id,  null, 'med_' + id); };
MobileApi.prototype.getAlertes        = function()      { return this.request('GET',    '/medicaments/alertes', null, 'alertes'); };
MobileApi.prototype.getMedStats       = function()      { return this.request('GET',    '/medicaments/stats',   null, 'med_stats'); };
MobileApi.prototype.createMedicament  = function(d)     { return this.request('POST',   '/medicaments',         d); };
MobileApi.prototype.updateMedicament  = function(id, d) { return this.request('PUT',    '/medicaments/' + id,   d); };
MobileApi.prototype.deleteMedicament  = function(id)    { return this.request('DELETE', '/medicaments/' + id); };

// ── PHARMACIES ──
MobileApi.prototype.getPharmacies = function(p) {
  var params = p || {};
  var qs = new URLSearchParams(params).toString();
  return this.request('GET', '/pharmacies' + (qs ? '?' + qs : ''), null, 'pharmacies_list_' + qs);
};

// ── COMMANDES ──
MobileApi.prototype.getCommandes = function(p) {
  var params = p || {};
  var qs = new URLSearchParams(params).toString();
  return this.request('GET', '/commandes' + (qs ? '?' + qs : ''), null, 'commandes_' + qs);
};
MobileApi.prototype.getCommandeById  = function(id)    { return this.request('GET',    '/commandes/' + id,          null, 'commande_' + id); };
MobileApi.prototype.getCommandeStats = function()      { return this.request('GET',    '/commandes/stats',          null, 'commande_stats'); };
MobileApi.prototype.createCommande   = function(d)     { return this.request('POST',   '/commandes',                d); };
MobileApi.prototype.validerCommande  = function(id)    { return this.request('PUT',    '/commandes/' + id + '/valider'); };
MobileApi.prototype.payerCommande    = function(id, m) { return this.request('PUT',    '/commandes/' + id + '/payer', { montant: m }); };
MobileApi.prototype.deleteCommande   = function(id)    { return this.request('DELETE', '/commandes/' + id); };

// ── LIVRAISONS ──
MobileApi.prototype.getLivraisons = function(p) {
  var params = p || {};
  var qs = new URLSearchParams(params).toString();
  return this.request('GET', '/livraisons' + (qs ? '?' + qs : ''), null, 'livraisons_' + qs);
};
MobileApi.prototype.getLivraisonById      = function(id)    { return this.request('GET',    '/livraisons/' + id,              null, 'livraison_' + id); };
MobileApi.prototype.createLivraison       = function(d)     { return this.request('POST',   '/livraisons',                    d); };
MobileApi.prototype.updateLivraisonStatut = function(id, s) { return this.request('PUT',    '/livraisons/' + id + '/statut', { statut: s }); };
MobileApi.prototype.optimiserTrajet       = function(id)    { return this.request('POST',   '/livraisons/' + id + '/optimiser'); };
MobileApi.prototype.deleteLivraison       = function(id)    { return this.request('DELETE', '/livraisons/' + id); };

// ── CLIENT ──
MobileApi.prototype.clientGetStock = function(p) {
  var params = p || {};
  var qs = new URLSearchParams(params).toString();
  return this.request('GET', '/client/stock' + (qs ? '?' + qs : ''), null, 'client_stock_' + qs);
};
MobileApi.prototype.clientCreerCommande     = function(d)   { return this.request('POST', '/client/commandes',       d); };
MobileApi.prototype.clientGetCommandes      = function()    { return this.request('GET',  '/client/commandes',       null, 'client_commandes'); };
MobileApi.prototype.clientGetCommandeDetail = function(id)  { return this.request('GET',  '/client/commandes/' + id, null, 'client_cmd_' + id); };

var api = new MobileApi();
export { api };
export default api;