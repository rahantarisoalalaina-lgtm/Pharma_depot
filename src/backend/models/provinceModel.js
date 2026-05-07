const { getDb } = require('../config/database');
const ProvinceModel = {
  findAll() { return getDb().query('SELECT * FROM provinces ORDER BY nom ASC'); },
  findById(id) { return getDb().queryOne('SELECT * FROM provinces WHERE id = ?', [id]); },
  findByCode(code) { return getDb().queryOne('SELECT * FROM provinces WHERE code = ?', [code]); },
};
module.exports = ProvinceModel;
