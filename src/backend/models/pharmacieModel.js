const { getDb } = require('../config/database');
const bcrypt = require('bcryptjs');

const PharmacieModel = {
  findAll({ search='', province_id=null }={}) {
    const db = getDb();
    let sql = `SELECT p.id, p.nom, p.adresse, p.telephone, p.email, p.latitude, p.longitude, p.contact_nom, p.province_id, pr.nom as province_nom FROM pharmacies p JOIN provinces pr ON p.province_id = pr.id WHERE 1=1`;
    const params = [];
    if (search) { sql += ' AND (p.nom LIKE ? OR p.adresse LIKE ?)'; params.push(`%${search}%`,`%${search}%`); }
    if (province_id) { sql += ' AND p.province_id = ?'; params.push(province_id); }
    return db.query(sql+' ORDER BY p.nom ASC', params);
  },
  findById(id) {
    return getDb().queryOne(`SELECT p.id, p.nom, p.adresse, p.telephone, p.email, p.latitude, p.longitude, p.contact_nom, p.province_id, pr.nom as province_nom FROM pharmacies p JOIN provinces pr ON p.province_id = pr.id WHERE p.id = ?`, [id]);
  },
  findByIdWithPassword(id) {
    return getDb().queryOne(`SELECT * FROM pharmacies WHERE id = ?`, [id]);
  },
  create({ nom, adresse, telephone, email, latitude, longitude, contact_nom, province_id, mot_de_passe }) {
    const hash = mot_de_passe ? bcrypt.hashSync(mot_de_passe, 10) : bcrypt.hashSync('Client123', 10);
    return getDb().insert(
      'INSERT INTO pharmacies (nom,adresse,telephone,email,latitude,longitude,contact_nom,mot_de_passe,province_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [nom,adresse,telephone||null,email||null,latitude||null,longitude||null,contact_nom||null,hash,province_id]
    );
  },
  update(id, data) {
    const db = getDb();
    const ALLOWED = ['nom','adresse','telephone','email','latitude','longitude','contact_nom','province_id'];
    const keys = Object.keys(data).filter(k => ALLOWED.includes(k));
    if (!keys.length) return;
    db.execute(`UPDATE pharmacies SET ${keys.map(k=>k+' = ?').join(', ')} WHERE id = ?`, [...keys.map(k=>data[k]), id]);
  },
  async resetAllPasswords() {
    const db = getDb();
    const hash = bcrypt.hashSync('Client123', 10);
    db.execute('UPDATE pharmacies SET mot_de_passe = ?', [hash]);
  },
  async changePassword(id, newPassword) {
    const hash = bcrypt.hashSync(newPassword, 10);
    getDb().execute('UPDATE pharmacies SET mot_de_passe = ? WHERE id = ?', [hash, id]);
  },
  delete(id) { getDb().execute('DELETE FROM pharmacies WHERE id = ?', [id]); },
  getWithStats({ province_id=null, search='' }={}) {
    const db = getDb();
    let sql = `SELECT p.id, p.nom, p.adresse, p.telephone, p.email, p.latitude, p.longitude, p.contact_nom, p.province_id, pr.nom as province_nom, COUNT(c.id) as nb_commandes, COALESCE(SUM(c.montant_total),0) as total_achats
      FROM pharmacies p JOIN provinces pr ON p.province_id=pr.id
      LEFT JOIN commandes c ON p.id=c.pharmacie_id WHERE 1=1`;
    const params = [];
    if (province_id) { sql += ' AND p.province_id = ?'; params.push(province_id); }
    if (search) { sql += ' AND (p.nom LIKE ? OR p.adresse LIKE ? OR p.contact_nom LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    return db.query(sql+' GROUP BY p.id ORDER BY p.nom ASC', params);
  }
};
module.exports = PharmacieModel;
