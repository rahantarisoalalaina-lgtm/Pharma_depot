const { getDb } = require('../config/database');
const MedicamentModel = {
  findAll({ search='', categorie='', province_id=null }={}) {
    const db = getDb();
    let sql = 'SELECT * FROM medicaments WHERE 1=1';
    const p = [];
    if (search) { sql += ' AND nom LIKE ?'; p.push(`%${search}%`); }
    if (categorie) { sql += ' AND categorie = ?'; p.push(categorie); }
    if (province_id) { sql += ' AND province_id = ?'; p.push(province_id); }
    sql += ' ORDER BY nom ASC';
    return db.query(sql, p);
  },
  findById(id) { return getDb().queryOne('SELECT * FROM medicaments WHERE id = ?', [id]); },
  findAlertes(province_id=null) {
    const db = getDb();
    // Alerte stock BAS ou date expiration dans moins de 90 jours
    const today = new Date().toISOString().split('T')[0];
    const in90 = new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0];
    let sql = `SELECT *, 
      CASE WHEN quantite_stock <= seuil_alerte THEN 1 ELSE 0 END as alerte_stock,
      CASE WHEN date_expiration IS NOT NULL AND date_expiration <= ? THEN 1 ELSE 0 END as alerte_expiration
      FROM medicaments WHERE (quantite_stock <= seuil_alerte OR (date_expiration IS NOT NULL AND date_expiration <= ?))`;
    const p = [in90, in90];
    if (province_id) { sql += ' AND province_id = ?'; p.push(province_id); }
    sql += ' ORDER BY date_expiration ASC, quantite_stock ASC';
    return db.query(sql, p);
  },
  create(data) {
    const { nom,description,categorie,prix_achat,prix_vente,quantite_stock,date_expiration,seuil_alerte=20,province_id } = data;
    return getDb().insert(
      'INSERT INTO medicaments (nom,description,categorie,prix_achat,prix_vente,quantite_stock,date_expiration,seuil_alerte,province_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [nom,description,categorie,prix_achat,prix_vente,quantite_stock,date_expiration,seuil_alerte,province_id]
    );
  },
  update(id, data) {
    const db = getDb();
    const ALLOWED = ['nom','description','categorie','prix_achat','prix_vente','quantite_stock','date_expiration','seuil_alerte'];
    const keys = Object.keys(data).filter(k => ALLOWED.includes(k));
    if (!keys.length) return;
    db.execute(`UPDATE medicaments SET ${keys.map(k=>k+' = ?').join(', ')} WHERE id = ?`, [...keys.map(k=>data[k]), id]);
  },
  updateStock(id, delta) { getDb().execute('UPDATE medicaments SET quantite_stock = quantite_stock + ? WHERE id = ?', [delta, id]); },
  delete(id) { getDb().execute('DELETE FROM medicaments WHERE id = ?', [id]); },
  getCategories(province_id=null) {
    const db = getDb();
    let sql = 'SELECT DISTINCT categorie FROM medicaments WHERE categorie IS NOT NULL';
    const p = [];
    if (province_id) { sql += ' AND province_id = ?'; p.push(province_id); }
    return db.query(sql+' ORDER BY categorie', p);
  },
  getStats(province_id=null) {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const in90 = new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0];
    let sql = `SELECT COUNT(*) as total,
      COALESCE(SUM(quantite_stock*prix_achat),0) as valeur_stock_achat,
      COALESCE(SUM(quantite_stock*prix_vente),0) as valeur_stock_vente,
      COUNT(CASE WHEN quantite_stock<=seuil_alerte THEN 1 END) as nb_alertes_stock,
      COUNT(CASE WHEN date_expiration IS NOT NULL AND date_expiration <= ? THEN 1 END) as nb_alertes_expiration,
      COUNT(CASE WHEN quantite_stock<=seuil_alerte OR (date_expiration IS NOT NULL AND date_expiration <= ?) THEN 1 END) as nb_alertes
      FROM medicaments WHERE 1=1`;
    const p = [in90, in90];
    if (province_id) { sql += ' AND province_id = ?'; p.push(province_id); }
    const stats = db.queryOne(sql, p);
    const cats = db.query('SELECT DISTINCT categorie FROM medicaments WHERE categorie IS NOT NULL ORDER BY categorie');
    return { ...stats, categories: cats };
  }
};
module.exports = MedicamentModel;
