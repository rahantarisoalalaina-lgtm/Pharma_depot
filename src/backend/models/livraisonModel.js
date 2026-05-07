const { getDb } = require('../config/database');
const LivraisonModel = {
  findAll({ statut='', province_id=null }={}) {
    const db = getDb();
    let sql = `SELECT l.*, c.montant_total, c.urgence, p.nom as pharmacie_nom,
               p.adresse as pharmacie_adresse, p.latitude, p.longitude, pr.nom as province_nom
               FROM livraisons l JOIN commandes c ON l.commande_id=c.id
               JOIN pharmacies p ON l.pharmacie_id=p.id
               JOIN provinces pr ON l.province_id=pr.id WHERE 1=1`;
    const params = [];
    if (statut) { sql += ' AND l.statut = ?'; params.push(statut); }
    if (province_id) { sql += ' AND l.province_id = ?'; params.push(province_id); }
    return db.query(sql+' ORDER BY l.priorite ASC, l.created_at ASC', params);
  },
  findById(id) {
    return getDb().queryOne(`SELECT l.*, c.montant_total, c.urgence, p.nom as pharmacie_nom,
      p.adresse as pharmacie_adresse, p.latitude, p.longitude, p.telephone
      FROM livraisons l JOIN commandes c ON l.commande_id=c.id
      JOIN pharmacies p ON l.pharmacie_id=p.id WHERE l.id = ?`, [id]);
  },
  create({ commande_id, pharmacie_id, province_id, priorite=2, date_livraison }) {
    return getDb().insert(
      "INSERT INTO livraisons (commande_id,pharmacie_id,province_id,priorite,date_livraison,statut) VALUES (?,?,?,?,?,'planifie')",
      [commande_id, pharmacie_id, province_id, priorite, date_livraison||null]
    );
  },
  updateStatut(id, statut) {
    const db = getDb();
    db.execute('UPDATE livraisons SET statut = ? WHERE id = ?', [statut, id]);
    if (statut === 'livre') {
      const l = db.queryOne('SELECT commande_id FROM livraisons WHERE id = ?', [id]);
      if (l) db.execute("UPDATE commandes SET statut='livree' WHERE id = ?", [l.commande_id]);
    }
  },
  updateTrajet(id, { trajet_optimise, distance_totale }) {
    getDb().execute('UPDATE livraisons SET trajet_optimise=?, distance_totale=? WHERE id = ?',
      [JSON.stringify(trajet_optimise), distance_totale, id]);
  },
  delete(id) { getDb().execute('DELETE FROM livraisons WHERE id = ?', [id]); },
  getNoeuds(province_id=null) {
    const db = getDb();
    let sql = 'SELECT * FROM noeuds_graphe WHERE 1=1';
    const p = [];
    if (province_id) { sql += ' AND province_id = ?'; p.push(province_id); }
    return db.query(sql, p);
  },
  getAretes() { return getDb().query('SELECT * FROM aretes_graphe'); },
  getStats(province_id=null) {
    const db = getDb();
    let sql = `SELECT COUNT(*) as total,
      COUNT(CASE WHEN statut='planifie' THEN 1 END) as planifiees,
      COUNT(CASE WHEN statut='en_cours' THEN 1 END) as en_cours,
      COUNT(CASE WHEN statut='livre' THEN 1 END) as livrees,
      COALESCE(AVG(distance_totale),0) as distance_moyenne FROM livraisons WHERE 1=1`;
    const p = [];
    if (province_id) { sql += ' AND province_id = ?'; p.push(province_id); }
    return db.queryOne(sql, p);
  }
};
module.exports = LivraisonModel;
