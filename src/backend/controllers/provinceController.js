const ProvinceModel = require('../models/provinceModel');
const { getDb } = require('../config/database');

const ProvinceController = {
  getAll(req, res) {
    try {
      const provinces = ProvinceModel.findAll();
      // Ajouter les stats par province
      const db = getDb();
      const stats = provinces.map(p => {
        const nbMeds = db.queryOne('SELECT COUNT(*) as n FROM medicaments WHERE province_id = ?', [p.id]);
        const nbPharmacies = db.queryOne('SELECT COUNT(*) as n FROM pharmacies WHERE province_id = ?', [p.id]);
        return { ...p, nb_medicaments: nbMeds?.n || 0, nb_pharmacies: nbPharmacies?.n || 0 };
      });
      res.json({ success: true, data: stats });
    } catch(err) { res.status(500).json({ success: false, message: err.message }); }
  },
  getById(req, res) {
    try {
      const p = ProvinceModel.findById(req.params.id);
      if (!p) return res.status(404).json({ success: false, message: 'Province introuvable' });
      res.json({ success: true, data: p });
    } catch(err) { res.status(500).json({ success: false, message: err.message }); }
  }
};
module.exports = ProvinceController;
