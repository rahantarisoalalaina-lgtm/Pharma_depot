// src/services/database.js
// Compatible expo-sqlite v13.x (SDK 50) — API synchrone
import * as SQLite from 'expo-sqlite';
import { SEED_DATA } from './seed_data';

let _db = null;

// ─── OUVRIR LA DB (API v13 synchrone) ─────────────────────────────────────
export function getDb() {
  if (_db) return _db;
  _db = SQLite.openDatabase('depot_pharmacie.db');
  return _db;
}

// ─── UTILITAIRES ──────────────────────────────────────────────────────────
function execAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(sql, params,
        (_, result) => resolve(result),
        (_, err)    => { reject(err); return true; }
      );
    });
  });
}

function queryAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(sql, params,
        (_, result) => resolve(result.rows._array),
        (_, err)    => { reject(err); return true; }
      );
    });
  });
}

function queryOneAsync(db, sql, params = []) {
  return queryAsync(db, sql, params).then(rows => rows[0] || null);
}

function execBatchAsync(db, statements) {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      for (const { sql, params } of statements) {
        tx.executeSql(sql, params || [],
          null,
          (_, err) => { reject(err); return true; }
        );
      }
    }, reject, resolve);
  });
}

// ─── CRÉATION DES TABLES ──────────────────────────────────────────────────
export async function initSchema(db) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS provinces (
      id INTEGER PRIMARY KEY, nom TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE, description TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS gestionnaires (
      id INTEGER PRIMARY KEY, nom TEXT NOT NULL, prenom TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL, mot_de_passe TEXT NOT NULL,
      province_id INTEGER, role TEXT DEFAULT 'gestionnaire',
      created_at DATETIME DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY, nom TEXT NOT NULL, prenom TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL, mot_de_passe TEXT NOT NULL,
      telephone TEXT, pharmacie_id INTEGER, province_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS pharmacies (
      id INTEGER PRIMARY KEY, nom TEXT NOT NULL, adresse TEXT NOT NULL,
      telephone TEXT, email TEXT, latitude REAL, longitude REAL,
      contact_nom TEXT, mot_de_passe TEXT, province_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS medicaments (
      id INTEGER PRIMARY KEY, nom TEXT NOT NULL, description TEXT,
      categorie TEXT, prix_achat REAL NOT NULL, prix_vente REAL NOT NULL,
      quantite_stock INTEGER NOT NULL DEFAULT 0, date_expiration DATE,
      seuil_alerte INTEGER DEFAULT 20, province_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS noeuds_graphe (
      id INTEGER PRIMARY KEY, nom TEXT NOT NULL,
      latitude REAL, longitude REAL, type TEXT DEFAULT 'intersection',
      province_id INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS aretes_graphe (
      id INTEGER PRIMARY KEY, noeud_source_id INTEGER NOT NULL,
      noeud_dest_id INTEGER NOT NULL, distance REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS commandes (
      id INTEGER PRIMARY KEY, pharmacie_id INTEGER NOT NULL,
      client_id INTEGER, province_id INTEGER NOT NULL,
      statut TEXT DEFAULT 'en_attente', montant_total REAL DEFAULT 0,
      montant_paye REAL DEFAULT 0, note TEXT, urgence INTEGER DEFAULT 0,
      source TEXT DEFAULT 'gestionnaire',
      created_at DATETIME DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS lignes_commande (
      id INTEGER PRIMARY KEY, commande_id INTEGER NOT NULL,
      medicament_id INTEGER NOT NULL, quantite INTEGER NOT NULL,
      prix_unitaire REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS livraisons (
      id INTEGER PRIMARY KEY, commande_id INTEGER NOT NULL,
      pharmacie_id INTEGER NOT NULL, province_id INTEGER NOT NULL,
      statut TEXT DEFAULT 'planifie', date_livraison DATETIME,
      priorite INTEGER DEFAULT 2, trajet_optimise TEXT,
      distance_totale REAL, created_at DATETIME DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS paiements (
      id INTEGER PRIMARY KEY, commande_id INTEGER NOT NULL,
      montant REAL NOT NULL,
      date_paiement DATETIME DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY, value TEXT
    )`,
  ];

  const batch = tables.map(sql => ({ sql, params: [] }));
  await execBatchAsync(db, batch);
}

// ─── SEED ─────────────────────────────────────────────────────────────────
export async function seedDatabase(db) {
  const meta = await queryOneAsync(db, "SELECT value FROM app_meta WHERE key='seeded'");
  if (meta?.value === '1') return;

  console.log('[DB] Injection des données...');

  const tables = [
    'provinces','gestionnaires','clients','pharmacies',
    'medicaments','noeuds_graphe','aretes_graphe',
    'commandes','lignes_commande','livraisons','paiements'
  ];

  for (const table of tables) {
    const rows = SEED_DATA[table] || [];
    if (rows.length === 0) continue;

    const statements = rows.map(row => {
      const cols = Object.keys(row);
      const placeholders = cols.map(() => '?').join(', ');
      const values = Object.values(row).map(v => v === null ? null : v);
      return {
        sql: `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
        params: values
      };
    });

    try {
      await execBatchAsync(db, statements);
      console.log(`[DB] ${table}: ${rows.length} lignes`);
    } catch(e) {
      console.warn(`[DB] Erreur seed ${table}:`, e.message);
    }
  }

  await execAsync(db, "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seeded', '1')");
  console.log('[DB] Seed terminé !');
}

// ─── INIT COMPLÈTE ────────────────────────────────────────────────────────
export async function initDb() {
  const db = getDb();
  await initSchema(db);
  await seedDatabase(db);
  return db;
}

// ─── EXPORTS UTILITAIRES pour api.js ──────────────────────────────────────
export { queryAsync, queryOneAsync, execAsync };