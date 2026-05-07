const { getDb } = require('../config/database');
const ClientModel = {
  findByEmail(email) { return getDb().queryOne('SELECT * FROM clients WHERE email = ?', [email]); },
  findById(id) {
    return getDb().queryOne(`
      SELECT c.*, p.nom as province_nom, ph.nom as pharmacie_nom
      FROM clients c
      LEFT JOIN provinces p ON c.province_id = p.id
      LEFT JOIN pharmacies ph ON c.pharmacie_id = ph.id
      WHERE c.id = ?`, [id]);
  },
  create({ nom, prenom, email, mot_de_passe, telephone, pharmacie_id, province_id }) {
    return getDb().insert(
      'INSERT INTO clients (nom,prenom,email,mot_de_passe,telephone,pharmacie_id,province_id) VALUES (?,?,?,?,?,?,?)',
      [nom, prenom, email, mot_de_passe, telephone||null, pharmacie_id, province_id]
    );
  },
  update(id, data) {
    const db = getDb();
    const ALLOWED = ['nom','prenom','telephone','pharmacie_id','province_id'];
    const keys = Object.keys(data).filter(k => ALLOWED.includes(k));
    if (!keys.length) return;
    db.execute(`UPDATE clients SET ${keys.map(k=>k+' = ?').join(', ')} WHERE id = ?`, [...keys.map(k=>data[k]), id]);
  }
};
module.exports = ClientModel;
