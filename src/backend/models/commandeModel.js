const { getDb } = require('../config/database');
const CommandeModel = {
  findAll({ statut='', province_id=null, client_id=null, pharmacie_id=null }={}) {
    const db = getDb();
    let sql = `SELECT c.*, p.nom as pharmacie_nom, p.adresse as pharmacie_adresse, pr.nom as province_nom,
               cl.nom as client_nom, cl.prenom as client_prenom
               FROM commandes c JOIN pharmacies p ON c.pharmacie_id=p.id
               JOIN provinces pr ON c.province_id=pr.id
               LEFT JOIN clients cl ON c.client_id=cl.id WHERE 1=1`;
    const params = [];
    if (statut) { sql += ' AND c.statut = ?'; params.push(statut); }
    if (province_id) { sql += ' AND c.province_id = ?'; params.push(province_id); }
    if (client_id) { sql += ' AND c.client_id = ?'; params.push(client_id); }
    if (pharmacie_id) { sql += ' AND c.pharmacie_id = ?'; params.push(pharmacie_id); }
    return db.query(sql+' ORDER BY c.created_at DESC', params);
  },
  findById(id) {
    const db = getDb();
    const cmd = db.queryOne(`SELECT c.*, p.nom as pharmacie_nom, p.adresse as pharmacie_adresse,
      p.telephone as pharmacie_telephone, p.latitude, p.longitude, pr.nom as province_nom,
      cl.nom as client_nom, cl.prenom as client_prenom
      FROM commandes c JOIN pharmacies p ON c.pharmacie_id=p.id
      JOIN provinces pr ON c.province_id=pr.id
      LEFT JOIN clients cl ON c.client_id=cl.id WHERE c.id = ?`, [id]);
    if (cmd) {
      cmd.lignes = db.query(`SELECT lc.*, m.nom as medicament_nom, m.categorie FROM lignes_commande lc
        JOIN medicaments m ON lc.medicament_id=m.id WHERE lc.commande_id = ?`, [id]);
    }
    return cmd;
  },
  create({ pharmacie_id, province_id, note, urgence=0, client_id=null, source='gestionnaire' }) {
    return getDb().insert(
      "INSERT INTO commandes (pharmacie_id,province_id,note,urgence,statut,client_id,source) VALUES (?,?,?,?,'en_attente',?,?)",
      [pharmacie_id, province_id, note||null, urgence, client_id, source]
    );
  },
  addLigne({ commande_id, medicament_id, quantite, prix_unitaire }) {
    getDb().insert('INSERT INTO lignes_commande (commande_id,medicament_id,quantite,prix_unitaire) VALUES (?,?,?,?)',
      [commande_id, medicament_id, quantite, prix_unitaire]);
  },
  updateMontantTotal(id) {
    const db = getDb();
    const r = db.queryOne('SELECT COALESCE(SUM(quantite*prix_unitaire),0) as total FROM lignes_commande WHERE commande_id = ?', [id]);
    db.execute('UPDATE commandes SET montant_total = ? WHERE id = ?', [r.total, id]);
  },
  updateStatut(id, statut) { getDb().execute('UPDATE commandes SET statut = ? WHERE id = ?', [statut, id]); },
  marquerPaye(id, montant) {
    const db = getDb();
    const cmd = db.queryOne('SELECT * FROM commandes WHERE id = ?', [id]);
    const newPaye = (cmd.montant_paye||0) + montant;
    db.execute('UPDATE commandes SET montant_paye = ? WHERE id = ?', [newPaye, id]);
    db.insert('INSERT INTO paiements (commande_id,montant) VALUES (?,?)', [id, montant]);
    if (newPaye >= cmd.montant_total) db.execute("UPDATE commandes SET statut='paye' WHERE id = ?", [id]);
    return db.queryOne('SELECT * FROM commandes WHERE id = ?', [id]);
  },
  delete(id) { getDb().execute('DELETE FROM commandes WHERE id = ?', [id]); },
  deleteLignes(id) { getDb().execute('DELETE FROM lignes_commande WHERE commande_id = ?', [id]); },
  getStats(province_id=null) {
    const db = getDb();
    let sql = `SELECT COUNT(*) as total,
      COUNT(CASE WHEN statut='en_attente' THEN 1 END) as en_attente,
      COUNT(CASE WHEN statut='validee' THEN 1 END) as validees,
      COUNT(CASE WHEN statut='livree' THEN 1 END) as livrees,
      COUNT(CASE WHEN statut='paye' THEN 1 END) as payees,
      COALESCE(SUM(montant_total),0) as chiffre_affaires,
      COALESCE(SUM(montant_paye),0) as montant_encaisse
      FROM commandes WHERE 1=1`;
    const p = [];
    if (province_id) { sql += ' AND province_id = ?'; p.push(province_id); }
    return db.queryOne(sql, p);
  }
};
module.exports = CommandeModel;
