const { getDb } = require('../config/database');
const GestionnaireModel = {
  findByEmail(email) { return getDb().queryOne('SELECT * FROM gestionnaires WHERE email = ?', [email]); },
  findById(id) {
    return getDb().queryOne(
      `SELECT g.id,g.nom,g.prenom,g.email,g.province_id,g.role,g.created_at,p.nom as province_nom
       FROM gestionnaires g LEFT JOIN provinces p ON g.province_id=p.id WHERE g.id = ?`, [id]);
  },
  create({ nom, prenom, email, mot_de_passe, province_id }) {
    return getDb().insert(
      'INSERT INTO gestionnaires (nom,prenom,email,mot_de_passe,province_id) VALUES (?,?,?,?,?)',
      [nom, prenom, email, mot_de_passe, province_id]
    );
  }
};
module.exports = GestionnaireModel;
