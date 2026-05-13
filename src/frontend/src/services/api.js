// src/services/api.js — Mode hors ligne complet
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
    this._offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    window.addEventListener('online', () => this.processOfflineQueue());
  }

  setToken(t) { this.token = t; t ? localStorage.setItem('token', t) : localStorage.removeItem('token'); }
  headers() { const h = {'Content-Type':'application/json'}; if (this.token) h['Authorization'] = `Bearer ${this.token}`; return h; }

  // Cache management
  saveCache(k, d) {
    try {
      const c = JSON.parse(localStorage.getItem('depotCache') || '{}');
      c[k] = { data: d, ts: Date.now() };
      localStorage.setItem('depotCache', JSON.stringify(c));
    } catch {}
  }
  getCache(k, maxAge = CACHE_TTL) {
    try {
      const entry = JSON.parse(localStorage.getItem('depotCache') || '{}')[k];
      if (!entry) return null;
      if (Date.now() - entry.ts > maxAge) return null;
      return entry.data;
    } catch { return null; }
  }
  clearCache() { localStorage.removeItem('depotCache'); }

  // Offline queue
  addToOfflineQueue(method, endpoint, body) {
    this._offlineQueue.push({ method, endpoint, body, ts: Date.now() });
    localStorage.setItem('offlineQueue', JSON.stringify(this._offlineQueue));
  }
  async processOfflineQueue() {
    const queue = [...this._offlineQueue];
    this._offlineQueue = [];
    localStorage.setItem('offlineQueue', '[]');
    for (const req of queue) {
      try { await this.request(req.method, req.endpoint, req.body); } catch {}
    }
  }

  async request(method, endpoint, body = null, cacheKey = null, offlineQueue = false) {
    // Mode hors ligne: lire cache
    if (!navigator.onLine && method === 'GET' && cacheKey) {
      const c = this.getCache(cacheKey, Infinity); // hors ligne = cache illimité
      if (c) return { success: true, data: c, fromCache: true };
      throw new Error('Données non disponibles hors ligne');
    }
    if (!navigator.onLine && method !== 'GET') {
      if (offlineQueue) {
        this.addToOfflineQueue(method, endpoint, body);
        return { success: true, queued: true, message: 'Action mise en file (sera envoyée dès reconnexion)' };
      }
      throw new Error('Action impossible hors ligne');
    }
    try {
      const opts = { method, headers: this.headers() };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(`${API_BASE}${endpoint}`, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur serveur');
      if (method === 'GET' && cacheKey && data.data) this.saveCache(cacheKey, data.data);
      return data;
    } catch(err) {
      if (method === 'GET' && cacheKey) {
        const c = this.getCache(cacheKey, Infinity);
        if (c) return { success: true, data: c, fromCache: true };
      }
      throw err;
    }
  }

  // Auth gestionnaire
  login = (d) => this.request('POST', '/auth/login', d);
  register = (d) => this.request('POST', '/auth/register', d);
  getProfil = () => this.request('GET', '/auth/profil');

  // Auth pharmacie (client)
  pharmacieLogin = (d) => this.request('POST', '/pharmacies/login', d);
  clientProfil = () => this.request('GET', '/client/profil');

  // Provinces
  getProvinces = () => this.request('GET', '/provinces', null, 'provinces');
  getPharmaciesParProvince = (pid) => this.request('GET', `/client/pharmacies/${pid}`, null, `pharmacies_${pid}`);

  // Médicaments
  getMedicaments = (p = {}) => { const qs = new URLSearchParams(p).toString(); return this.request('GET', `/medicaments${qs?'?'+qs:''}`, null, 'medicaments'); };
  getMedicamentById = (id) => this.request('GET', `/medicaments/${id}`);
  getMedicamentStats = () => this.request('GET', '/medicaments/stats', null, 'med_stats');
  getAlertes = () => this.request('GET', '/medicaments/alertes', null, 'alertes');
  createMedicament = (d) => this.request('POST', '/medicaments', d);
  updateMedicament = (id, d) => this.request('PUT', `/medicaments/${id}`, d);
  deleteMedicament = (id) => this.request('DELETE', `/medicaments/${id}`);

  // Pharmacies
  getPharmacies = (p = {}) => { const qs = new URLSearchParams(p).toString(); return this.request('GET', `/pharmacies${qs?'?'+qs:''}`, null, 'pharmacies'); };
  createPharmacie = (d) => this.request('POST', '/pharmacies', d);
  updatePharmacie = (id, d) => this.request('PUT', `/pharmacies/${id}`, d);
  changePharmaciePassword = (id, pwd) => this.request('PUT', `/pharmacies/${id}/password`, { mot_de_passe: pwd });
  resetAllPharmaciePasswords = () => this.request('PUT', '/pharmacies/reset-passwords', {});
  deletePharmacie = (id) => this.request('DELETE', `/pharmacies/${id}`);

  // Commandes gestionnaire
  getCommandes = (p = {}) => { const qs = new URLSearchParams(p).toString(); return this.request('GET', `/commandes${qs?'?'+qs:''}`, null, 'commandes'); };
  getCommandeById = (id) => this.request('GET', `/commandes/${id}`);
  getCommandeStats = () => this.request('GET', '/commandes/stats', null, 'cmd_stats');
  createCommande = (d) => this.request('POST', '/commandes', d);
  validerCommande = (id) => this.request('PUT', `/commandes/${id}/valider`);
  payerCommande = (id, m) => this.request('PUT', `/commandes/${id}/payer`, { montant: m });
  deleteCommande = (id) => this.request('DELETE', `/commandes/${id}`);

  // Commandes client (pharmacie)
  clientGetStock = (p = {}) => { const qs = new URLSearchParams(p).toString(); return this.request('GET', `/client/stock${qs?'?'+qs:''}`, null, 'client_stock'); };
  clientCreerCommande = (d) => this.request('POST', '/client/commandes', d, null, true);
  clientGetCommandes = () => this.request('GET', '/client/commandes', null, 'client_commandes');
  clientGetCommandeDetail = (id) => this.request('GET', `/client/commandes/${id}`);

  // Livraisons
  getLivraisons = (p = {}) => { const qs = new URLSearchParams(p).toString(); return this.request('GET', `/livraisons${qs?'?'+qs:''}`, null, 'livraisons'); };
  getLivraisonById = (id) => this.request('GET', `/livraisons/${id}`);
  getLivraisonStats = () => this.request('GET', '/livraisons/stats', null, 'liv_stats');
  createLivraison = (d) => this.request('POST', '/livraisons', d);
  updateLivraisonStatut = (id, s) => this.request('PUT', `/livraisons/${id}/statut`, { statut: s });
  optimiserTrajet = (id) => this.request('POST', `/livraisons/${id}/optimiser`);
  deleteLivraison = (id) => this.request('DELETE', `/livraisons/${id}`);
}

export const api = new ApiService();
export default api;
