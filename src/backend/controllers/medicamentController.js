const MedicamentModel = require('../models/medicamentModel');
const { filtrerMedicamentsKMP, benchmarkKMPvsNaif } = require('../algorithms/kmp');

const MedicamentController = {
  getAll(req, res) {
    try {
      const { search, categorie, algo } = req.query;
      const province_id = req.user.province_id;

      // Récupérer TOUS les médicaments de la province (sans filtre SQL sur search)
      const tous = MedicamentModel.findAll({ categorie, province_id });

      // Appliquer KMP si search fourni, sinon retourner tous
      const medicaments = search
        ? filtrerMedicamentsKMP(tous, search)
        : tous;

      const alertes = MedicamentModel.findAlertes(province_id);
      res.json({ success: true, data: medicaments, alertes, algo_used: search ? 'KMP' : 'none' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  getById(req, res) {
    try {
      const m = MedicamentModel.findById(req.params.id);
      if (!m) return res.status(404).json({ success: false, message: 'Médicament introuvable' });
      res.json({ success: true, data: m });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  getAlertes(req, res) {
    try {
      const alertes = MedicamentModel.findAlertes(req.user.province_id);
      res.json({ success: true, data: alertes, count: alertes.length });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  getStats(req, res) {
    try {
      const stats = MedicamentModel.getStats(req.user.province_id);
      const categories = MedicamentModel.getCategories(req.user.province_id);
      res.json({ success: true, data: { ...stats, categories } });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  // Endpoint de benchmark KMP vs Naïf (pour le dossier algorithmique)
  benchmarkKMP(req, res) {
    try {
      const { texte, motif } = req.query;
      if (!texte || !motif) return res.status(400).json({ success: false, message: 'texte et motif requis' });
      const resultat = benchmarkKMPvsNaif(texte, motif);
      res.json({ success: true, data: resultat });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  create(req, res) {
    try {
      const id = MedicamentModel.create({ ...req.body, province_id: req.user.province_id });
      const m = MedicamentModel.findById(id);
      res.status(201).json({ success: true, data: m, message: 'Médicament créé' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  update(req, res) {
    try {
      const m = MedicamentModel.findById(req.params.id);
      if (!m) return res.status(404).json({ success: false, message: 'Médicament introuvable' });
      MedicamentModel.update(req.params.id, req.body);
      res.json({ success: true, data: MedicamentModel.findById(req.params.id), message: 'Mis à jour' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  delete(req, res) {
    try {
      if (!MedicamentModel.findById(req.params.id)) return res.status(404).json({ success: false, message: 'Introuvable' });
      MedicamentModel.delete(req.params.id);
      res.json({ success: true, message: 'Supprimé' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
};

module.exports = MedicamentController;
