const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '../data/depot_pharmacie.db');
const dataDir = path.join(__dirname, '../data');
let db = null;

async function initDb() {
  if (db) return db;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const SQL = await require('sql.js')();
  db = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();
  db._save = () => fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.query = (sql, p=[]) => { const s=db.prepare(sql); s.bind(p); const r=[]; while(s.step()) r.push(s.getAsObject()); s.free(); return r; };
  db.queryOne = (sql, p=[]) => db.query(sql,p)[0]||null;
  db.insert = (sql, p=[]) => { db.run(sql,p); const r=db.query('SELECT last_insert_rowid() as id'); db._save(); return r[0]?.id||null; };
  db.execute = (sql, p=[]) => { db.run(sql,p); db._save(); };
  db.execAndSave = (sql) => { db.exec(sql); db._save(); };
  initSchema();
  // Migration: ajouter mot_de_passe à pharmacies si absent
  try {
    const cols = db.query("PRAGMA table_info(pharmacies)");
    if (!cols.find(c => c.name === 'mot_de_passe')) {
      db.execute("ALTER TABLE pharmacies ADD COLUMN mot_de_passe TEXT");
      console.log('Migration: colonne mot_de_passe ajoutée à pharmacies');
    }
  } catch(e) { console.log('Migration check:', e.message); }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS provinces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL UNIQUE, code TEXT NOT NULL UNIQUE,
      description TEXT, created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS gestionnaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL, prenom TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL, mot_de_passe TEXT NOT NULL,
      province_id INTEGER, role TEXT DEFAULT 'gestionnaire',
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY(province_id) REFERENCES provinces(id)
    );
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL, prenom TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL, mot_de_passe TEXT NOT NULL,
      telephone TEXT, pharmacie_id INTEGER, province_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pharmacies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL, adresse TEXT NOT NULL,
      telephone TEXT, email TEXT, latitude REAL, longitude REAL,
      contact_nom TEXT, mot_de_passe TEXT,
      province_id INTEGER NOT NULL, created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY(province_id) REFERENCES provinces(id)
    );
    CREATE TABLE IF NOT EXISTS medicaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL, description TEXT, categorie TEXT,
      prix_achat REAL NOT NULL, prix_vente REAL NOT NULL,
      quantite_stock INTEGER NOT NULL DEFAULT 0,
      date_expiration DATE, seuil_alerte INTEGER DEFAULT 20,
      province_id INTEGER NOT NULL, created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS noeuds_graphe (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL, latitude REAL, longitude REAL,
      type TEXT DEFAULT 'intersection', province_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS aretes_graphe (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      noeud_source_id INTEGER NOT NULL, noeud_dest_id INTEGER NOT NULL, distance REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS commandes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pharmacie_id INTEGER NOT NULL, client_id INTEGER,
      province_id INTEGER NOT NULL, statut TEXT DEFAULT 'en_attente',
      montant_total REAL DEFAULT 0, montant_paye REAL DEFAULT 0,
      note TEXT, urgence INTEGER DEFAULT 0, source TEXT DEFAULT 'gestionnaire',
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY(pharmacie_id) REFERENCES pharmacies(id),
      FOREIGN KEY(province_id) REFERENCES provinces(id)
    );
    CREATE TABLE IF NOT EXISTS lignes_commande (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commande_id INTEGER NOT NULL, medicament_id INTEGER NOT NULL,
      quantite INTEGER NOT NULL, prix_unitaire REAL NOT NULL,
      FOREIGN KEY(commande_id) REFERENCES commandes(id),
      FOREIGN KEY(medicament_id) REFERENCES medicaments(id)
    );
    CREATE TABLE IF NOT EXISTS livraisons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commande_id INTEGER NOT NULL, pharmacie_id INTEGER NOT NULL,
      province_id INTEGER NOT NULL, statut TEXT DEFAULT 'planifie',
      date_livraison DATETIME, priorite INTEGER DEFAULT 2,
      trajet_optimise TEXT, distance_totale REAL,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY(commande_id) REFERENCES commandes(id)
    );
    CREATE TABLE IF NOT EXISTS paiements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commande_id INTEGER NOT NULL, montant REAL NOT NULL,
      date_paiement DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY(commande_id) REFERENCES commandes(id)
    );
  `);
  db._save();
}

function getDb() { if (!db) throw new Error('DB non initialisée'); return db; }
module.exports = { getDb, initDb };
