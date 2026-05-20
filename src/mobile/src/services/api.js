import AsyncStorage from '@react-native-async-storage/async-storage';
// src/services/api.js
// API locale 100% hors ligne — expo-sqlite v13 (SDK 50)
import { getDb, initDb, queryAsync, queryOneAsync, execAsync } from './database';

export const PROVINCES_STATIQUES = [
  { id: 1, nom: 'Antananarivo', description: 'Capitale — Hautes Terres Centrales' },
  { id: 2, nom: 'Fianarantsoa', description: 'Sud des Hautes Terres' },
  { id: 3, nom: 'Toamasina',   description: 'Côte Est — Port principal' },
  { id: 4, nom: 'Mahajanga',   description: 'Nord-Ouest — Côte Ouest' },
  { id: 5, nom: 'Toliara',     description: 'Grand Sud et Sud-Ouest' },
  { id: 6, nom: 'Antsiranana', description: 'Extrême Nord — Diego-Suarez' },
];

let _initialized = false;

async function db() {
  if (!_initialized) {
    await initDb();
    _initialized = true;
  }
  return getDb();
}

// ─── AUTH ──────────────────────────────────────────────────────────────────
async function loginGestionnaire({ email, mot_de_passe }) {
  const d = await db();
  const user = await queryOneAsync(d, 'SELECT * FROM gestionnaires WHERE email = ?', [email]);
  if (!user) throw new Error('Email ou mot de passe incorrect');
  if (user.mot_de_passe !== mot_de_passe) throw new Error('Email ou mot de passe incorrect');
  const { mot_de_passe: _, ...safeUser } = user;
  return { success: true, data: safeUser, token: `local_${user.id}_${Date.now()}` };
}

async function loginClient({ pharmacie_id, mot_de_passe }) {
  const d = await db();
  const ph = await queryOneAsync(d, 'SELECT * FROM pharmacies WHERE id = ?', [pharmacie_id]);
  if (!ph) throw new Error('Pharmacie introuvable');
  if (ph.mot_de_passe !== mot_de_passe) throw new Error('Mot de passe incorrect');
  const { mot_de_passe: _, ...safePh } = ph;
  return { success: true, data: safePh, token: `client_${ph.id}_${Date.now()}` };
}

// ─── PROVINCES ─────────────────────────────────────────────────────────────
async function getProvinces() {
  try {
    const d = await db();
    const data = await queryAsync(d, 'SELECT * FROM provinces ORDER BY nom');
    return { success: true, data };
  } catch(e) {
    return { success: true, data: PROVINCES_STATIQUES };
  }
}

// ─── PHARMACIES ────────────────────────────────────────────────────────────
async function getPharmacies({ province_id, search } = {}) {
  const d = await db();
  let sql = 'SELECT p.*, pr.nom as province_nom FROM pharmacies p LEFT JOIN provinces pr ON p.province_id = pr.id WHERE 1=1';
  const params = [];
  if (province_id) { sql += ' AND p.province_id = ?'; params.push(province_id); }
  if (search)      { sql += ' AND p.nom LIKE ?';      params.push(`%${search}%`); }
  sql += ' ORDER BY p.nom';
  const data = await queryAsync(d, sql, params);
  return { success: true, data, count: data.length };
}

async function getPharmaciesProvince(id) {
  return getPharmacies({ province_id: id });
}

// ─── MÉDICAMENTS ───────────────────────────────────────────────────────────
async function getMedicaments({ province_id, search, categorie } = {}) {
  const d = await db();
  let sql = 'SELECT * FROM medicaments WHERE 1=1';
  const params = [];
  if (province_id) { sql += ' AND province_id = ?'; params.push(province_id); }
  if (search)      { sql += ' AND nom LIKE ?';       params.push(`%${search}%`); }
  if (categorie)   { sql += ' AND categorie = ?';    params.push(categorie); }
  sql += ' ORDER BY nom';
  const data = await queryAsync(d, sql, params);
  return { success: true, data, count: data.length };
}

async function getMedicamentById(id) {
  const d = await db();
  const data = await queryOneAsync(d, 'SELECT * FROM medicaments WHERE id = ?', [id]);
  if (!data) throw new Error('Médicament introuvable');
  return { success: true, data };
}

async function getAlertes(province_id) {
  const d = await db();
  let sql = 'SELECT * FROM medicaments WHERE quantite_stock <= seuil_alerte';
  const params = [];
  if (province_id) { sql += ' AND province_id = ?'; params.push(province_id); }
  const data = await queryAsync(d, sql, params);
  return { success: true, data, count: data.length };
}

async function getMedStats(province_id) {
  const d = await db();
  const where = province_id ? 'WHERE province_id = ?' : '';
  const p = province_id ? [province_id] : [];
  const total   = await queryOneAsync(d, `SELECT COUNT(*) as n FROM medicaments ${where}`, p);
  const alertes = await queryOneAsync(d, `SELECT COUNT(*) as n FROM medicaments ${where ? where+' AND' : 'WHERE'} quantite_stock <= seuil_alerte`, p);
  const rupture = await queryOneAsync(d, `SELECT COUNT(*) as n FROM medicaments ${where ? where+' AND' : 'WHERE'} quantite_stock = 0`, p);
  const valeur  = await queryOneAsync(d, `SELECT SUM(prix_vente * quantite_stock) as n FROM medicaments ${where}`, p);
  return { success: true, data: {
    total: total?.n || 0, en_alerte: alertes?.n || 0,
    en_rupture: rupture?.n || 0, valeur_stock: valeur?.n || 0
  }};
}

async function createMedicament(data) {
  const d = await db();
  await execAsync(d,
    `INSERT INTO medicaments (nom,description,categorie,prix_achat,prix_vente,quantite_stock,date_expiration,seuil_alerte,province_id)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [data.nom,data.description,data.categorie,data.prix_achat,data.prix_vente,
     data.quantite_stock||0,data.date_expiration,data.seuil_alerte||20,data.province_id]
  );
  return { success: true };
}

async function updateMedicament(id, data) {
  const d = await db();
  await execAsync(d,
    `UPDATE medicaments SET nom=?,description=?,categorie=?,prix_achat=?,prix_vente=?,quantite_stock=?,date_expiration=?,seuil_alerte=? WHERE id=?`,
    [data.nom,data.description,data.categorie,data.prix_achat,data.prix_vente,
     data.quantite_stock,data.date_expiration,data.seuil_alerte,id]
  );
  return { success: true };
}

async function deleteMedicament(id) {
  const d = await db();
  await execAsync(d, 'DELETE FROM medicaments WHERE id = ?', [id]);
  return { success: true };
}

// ─── COMMANDES ─────────────────────────────────────────────────────────────
async function getCommandes({ province_id, statut, pharmacie_id } = {}) {
  const d = await db();
  let sql = `SELECT c.*, p.nom as pharmacie_nom FROM commandes c
             LEFT JOIN pharmacies p ON c.pharmacie_id = p.id WHERE 1=1`;
  const params = [];
  if (province_id)  { sql += ' AND c.province_id = ?';  params.push(province_id); }
  if (statut)       { sql += ' AND c.statut = ?';        params.push(statut); }
  if (pharmacie_id) { sql += ' AND c.pharmacie_id = ?';  params.push(pharmacie_id); }
  sql += ' ORDER BY c.created_at DESC';
  const data = await queryAsync(d, sql, params);
  return { success: true, data, count: data.length };
}

async function getCommandeById(id) {
  const d = await db();
  const commande = await queryOneAsync(d,
    `SELECT c.*, p.nom as pharmacie_nom FROM commandes c
     LEFT JOIN pharmacies p ON c.pharmacie_id = p.id WHERE c.id = ?`, [id]);
  if (!commande) throw new Error('Commande introuvable');
  const lignes = await queryAsync(d,
    `SELECT l.*, m.nom as medicament_nom FROM lignes_commande l
     LEFT JOIN medicaments m ON l.medicament_id = m.id WHERE l.commande_id = ?`, [id]);
  return { success: true, data: { ...commande, lignes } };
}

async function getCommandeStats(province_id) {
  const d = await db();
  const where = province_id ? 'WHERE province_id = ?' : '';
  const p = province_id ? [province_id] : [];
  const total    = await queryOneAsync(d, `SELECT COUNT(*) as n FROM commandes ${where}`, p);
  const attente  = await queryOneAsync(d, `SELECT COUNT(*) as n FROM commandes ${where ? where+' AND' : 'WHERE'} statut='en_attente'`, p);
  const validees = await queryOneAsync(d, `SELECT COUNT(*) as n FROM commandes ${where ? where+' AND' : 'WHERE'} statut='validee'`, p);
  const ca       = await queryOneAsync(d, `SELECT SUM(montant_paye) as n FROM commandes ${where}`, p);
  return { success: true, data: {
    total: total?.n||0, en_attente: attente?.n||0,
    validees: validees?.n||0, chiffre_affaires: ca?.n||0
  }};
}

async function createCommande(data) {
  const d = await db();
  await execAsync(d,
    `INSERT INTO commandes (pharmacie_id,client_id,province_id,note,urgence,source,montant_total)
     VALUES (?,?,?,?,?,?,?)`,
    [data.pharmacie_id,data.client_id||null,data.province_id,
     data.note||null,data.urgence||0,data.source||'gestionnaire',data.montant_total||0]
  );
  const row = await queryOneAsync(d, 'SELECT last_insert_rowid() as id');
  const commandeId = row.id;
  if (data.lignes && data.lignes.length > 0) {
    for (const l of data.lignes) {
      await execAsync(d,
        'INSERT INTO lignes_commande (commande_id,medicament_id,quantite,prix_unitaire) VALUES (?,?,?,?)',
        [commandeId, l.medicament_id, l.quantite, l.prix_unitaire]
      );
    }
  }
  return { success: true, data: { id: commandeId } };
}

async function validerCommande(id) {
  const d = await db();
  await execAsync(d, "UPDATE commandes SET statut='validee' WHERE id=?", [id]);
  return { success: true };
}

async function payerCommande(id, montant) {
  const d = await db();
  await execAsync(d,
    `UPDATE commandes SET montant_paye = montant_paye + ?,
     statut = CASE WHEN montant_paye + ? >= montant_total THEN 'payee' ELSE statut END
     WHERE id = ?`, [montant, montant, id]);
  await execAsync(d, 'INSERT INTO paiements (commande_id,montant) VALUES (?,?)', [id, montant]);
  return { success: true };
}

async function deleteCommande(id) {
  const d = await db();
  await execAsync(d, 'DELETE FROM lignes_commande WHERE commande_id = ?', [id]);
  await execAsync(d, 'DELETE FROM commandes WHERE id = ?', [id]);
  return { success: true };
}

// ─── LIVRAISONS ────────────────────────────────────────────────────────────
async function getLivraisons({ province_id, statut } = {}) {
  const d = await db();
  let sql = `SELECT l.*, p.nom as pharmacie_nom FROM livraisons l
             LEFT JOIN pharmacies p ON l.pharmacie_id = p.id WHERE 1=1`;
  const params = [];
  if (province_id) { sql += ' AND l.province_id = ?'; params.push(province_id); }
  if (statut)      { sql += ' AND l.statut = ?';      params.push(statut); }
  sql += ' ORDER BY l.priorite DESC, l.created_at DESC';
  const data = await queryAsync(d, sql, params);
  return { success: true, data, count: data.length };
}

async function getLivraisonById(id) {
  const d = await db();
  const data = await queryOneAsync(d,
    `SELECT l.*, p.nom as pharmacie_nom FROM livraisons l
     LEFT JOIN pharmacies p ON l.pharmacie_id = p.id WHERE l.id = ?`, [id]);
  if (!data) throw new Error('Livraison introuvable');
  return { success: true, data };
}

async function createLivraison(data) {
  const d = await db();
  await execAsync(d,
    `INSERT INTO livraisons (commande_id,pharmacie_id,province_id,priorite,date_livraison)
     VALUES (?,?,?,?,?)`,
    [data.commande_id,data.pharmacie_id,data.province_id,data.priorite||2,data.date_livraison||null]
  );
  const row = await queryOneAsync(d, 'SELECT last_insert_rowid() as id');
  return { success: true, data: { id: row.id } };
}

async function updateLivraisonStatut(id, statut) {
  const d = await db();
  await execAsync(d, 'UPDATE livraisons SET statut = ? WHERE id = ?', [statut, id]);
  return { success: true };
}

async function deleteLivraison(id) {
  const d = await db();
  await execAsync(d, 'DELETE FROM livraisons WHERE id = ?', [id]);
  return { success: true };
}

// ─── CLIENT ────────────────────────────────────────────────────────────────
async function clientGetStock({ pharmacie_id, search } = {}) {
  const d = await db();
  let sql = 'SELECT * FROM medicaments WHERE quantite_stock > 0';
  const params = [];
  if (pharmacie_id) {
    const ph = await queryOneAsync(d, 'SELECT province_id FROM pharmacies WHERE id = ?', [pharmacie_id]);
    if (ph) { sql += ' AND province_id = ?'; params.push(ph.province_id); }
  }
  if (search) { sql += ' AND nom LIKE ?'; params.push(`%${search}%`); }
  sql += ' ORDER BY nom';
  const data = await queryAsync(d, sql, params);
  return { success: true, data };
}

async function clientCreerCommande(data) {
  return createCommande({ ...data, source: 'client' });
}

async function clientGetCommandes(pharmacie_id) {
  const d = await db();
  // Filtre par pharmacie_id — les commandes créées par le gestionnaire ont client_id=NULL
  let sql = `SELECT c.*, p.nom as pharmacie_nom FROM commandes c
     LEFT JOIN pharmacies p ON c.pharmacie_id = p.id WHERE 1=1`;
  const params = [];
  if (pharmacie_id) { sql += ' AND c.pharmacie_id = ?'; params.push(pharmacie_id); }
  sql += ' ORDER BY c.created_at DESC';
  const data = await queryAsync(d, sql, params);
  return { success: true, data };
}

async function clientGetCommandeDetail(id) {
  return getCommandeById(id);
}

async function clientGetLivraisons({ statut, pharmacie_id } = {}) {
  try {
    const d = await db();
    let sql = `SELECT l.*, c.montant_total, c.urgence, p.nom as pharmacie_nom
               FROM livraisons l
               JOIN commandes c ON l.commande_id = c.id
               JOIN pharmacies p ON l.pharmacie_id = p.id
               WHERE 1=1`;
    const params = [];
    if (pharmacie_id) { sql += ' AND l.pharmacie_id = ?'; params.push(pharmacie_id); }
    if (statut)       { sql += ' AND l.statut = ?';       params.push(statut); }
    sql += ' ORDER BY l.created_at DESC';
    const data = await queryAsync(d, sql, params);
    return { success: true, data };
  } catch (e) { return { success: false, data: [], message: e.message }; }
}

async function clientConfirmerLivraison(id) {
  const d = await db();
  const liv = await queryOneAsync(d, 'SELECT * FROM livraisons WHERE id = ?', [id]);
  if (!liv) throw new Error('Livraison introuvable');
  if (liv.statut === 'livre') throw new Error('Cette livraison est déjà livrée');
  // Marquer la livraison comme livrée
  await execAsync(d, "UPDATE livraisons SET statut = 'livre' WHERE id = ?", [id]);
  // Mettre à jour le statut de la commande associée → livree
  if (liv.commande_id) {
    await execAsync(d, "UPDATE commandes SET statut = 'livree' WHERE id = ?", [liv.commande_id]);
  }
  return { success: true };
}


// En mode SQLite local, il n'y a pas de vraie file offline HTTP
// mais OfflineContext appelle ces fonctions — on les garde vides
async function getOfflineQueue() {
  try {
    const raw = await AsyncStorage.getItem('offline_queue');
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

async function syncOfflineQueue() {
  // En mode offline SQLite, tout est déjà local — rien à synchroniser
  return { synced: 0, failed: 0 };
}

async function clearCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ck = keys.filter(k => k.startsWith('cache_'));
    if (ck.length) await AsyncStorage.multiRemove(ck);
  } catch(e) {}
}

// ─── EXPORT COMPATIBLE avec l'ancien api.js ────────────────────────────────
const api = {
  loginGestionnaire, loginClient,
  getProvinces, getPharmaciesProvince, getPharmacies,
  getMedicaments, getMedicamentById, getAlertes, getMedStats,
  createMedicament, updateMedicament, deleteMedicament,
  getCommandes, getCommandeById, getCommandeStats,
  createCommande, validerCommande, payerCommande, deleteCommande,
  getLivraisons, getLivraisonById, createLivraison,
  updateLivraisonStatut, deleteLivraison,
  clientGetStock, clientCreerCommande, clientGetCommandes, clientGetCommandeDetail,
  clientGetLivraisons, clientConfirmerLivraison,
  // compatibilité ancienne API
  getOfflineQueue,
  syncOfflineQueue,
  clearCache,
  optimiserTrajet: (id) => Promise.resolve({ success: true }),
};

export { api };
export default api;