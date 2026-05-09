const bcrypt = require('bcryptjs');
const PharmacieModel = require('../models/pharmacieModel');
const { generateToken } = require('../config/auth');

const PharmacieController = {
  getAll(req, res) {
    try {
      const { search, stats } = req.query;
      const province_id = req.user.province_id;
      const data = stats === 'true'
        ? PharmacieModel.getWithStats({ province_id, search })
        : PharmacieModel.findAll({ search, province_id });
      res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  getById(req, res) {
    try {
      const p = PharmacieModel.findById(req.params.id);
      if (!p) return res.status(404).json({ success: false, message: 'Pharmacie introuvable' });
      res.json({ success: true, data: p });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  create(req, res) {
    try {
      const id = PharmacieModel.create({ ...req.body, province_id: req.user.province_id });
      res.status(201).json({ success: true, data: PharmacieModel.findById(id), message: 'Créée' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  update(req, res) {
    try {
      if (!PharmacieModel.findById(req.params.id)) return res.status(404).json({ success: false, message: 'Introuvable' });
      PharmacieModel.update(req.params.id, req.body);
      res.json({ success: true, data: PharmacieModel.findById(req.params.id), message: 'Mise à jour' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  async changePassword(req, res) {
    try {
      const { mot_de_passe } = req.body;
      if (!mot_de_passe || mot_de_passe.length < 4) return res.status(400).json({ success: false, message: 'Mot de passe trop court' });
      await PharmacieModel.changePassword(req.params.id, mot_de_passe);
      res.json({ success: true, message: 'Mot de passe changé' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  async resetAllPasswords(req, res) {
    try {
      await PharmacieModel.resetAllPasswords();
      res.json({ success: true, message: 'Tous les mots de passe réinitialisés à Client123' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  delete(req, res) {
    try {
      if (!PharmacieModel.findById(req.params.id)) return res.status(404).json({ success: false, message: 'Introuvable' });
      PharmacieModel.delete(req.params.id);
      res.json({ success: true, message: 'Supprimée' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  // Login pharmacie (client) par sélection + mot de passe
  async login(req, res) {
    try {
      const { pharmacie_id, mot_de_passe } = req.body;
      if (!pharmacie_id || !mot_de_passe) return res.status(400).json({ success: false, message: 'Pharmacie et mot de passe requis' });
      const pharma = PharmacieModel.findByIdWithPassword(pharmacie_id);
      if (!pharma) return res.status(404).json({ success: false, message: 'Pharmacie introuvable' });
      if (!pharma.mot_de_passe) return res.status(401).json({ success: false, message: 'Mot de passe non configuré' });
      const ok = await bcrypt.compare(mot_de_passe, pharma.mot_de_passe);
      if (!ok) return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
      const token = generateToken({ id: pharma.id, nom: pharma.nom, role: 'client', province_id: pharma.province_id, pharmacie_id: pharma.id, pharmacie_nom: pharma.nom });
      const { mot_de_passe: _, ...pub } = pharma;
      res.json({ success: true, data: { pharmacie: pub, token } });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
};
module.exports = PharmacieController;
