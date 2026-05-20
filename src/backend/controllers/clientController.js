const bcrypt = require('bcryptjs');
const PharmacieModel = require('../models/pharmacieModel');
const MedicamentModel = require('../models/medicamentModel');
const CommandeModel = require('../models/commandeModel');
const LivraisonModel = require('../models/livraisonModel');
const { generateToken } = require('../config/auth');
const { getDb } = require('../config/database');

const ClientController = {
  // Le "login client" est maintenant géré par pharmacieController.login
  // Mais on garde un profil basé sur le token pharmacie
  profil(req, res) {
    try {
      const pharma = PharmacieModel.findById(req.user.id);
      if (!pharma) return res.status(404).json({ success: false, message: 'Pharmacie introuvable' });
      res.json({ success: true, data: { ...pharma, role: 'client', prenom: pharma.nom, nom: '', pharmacie_nom: pharma.nom } });
    } catch(err) { res.status(500).json({ success: false, message: err.message }); }
  },

  getStock(req, res) {
    try {
      const province_id = req.user.province_id;
      const { search, categorie } = req.query;
      const medicaments = MedicamentModel.findAll({ search, categorie, province_id });
      res.json({ success: true, data: medicaments });
    } catch(err) { res.status(500).json({ success: false, message: err.message }); }
  },

  getPharmaciesParProvince(req, res) {
    try {
      const { province_id } = req.params;
      const pharmacies = PharmacieModel.findAll({ province_id });
      res.json({ success: true, data: pharmacies });
    } catch(err) { res.status(500).json({ success: false, message: err.message }); }
  },

  creerCommande(req, res) {
    try {
      const { lignes, note, urgence } = req.body;
      const pharmacie_id = req.user.id; // pharmacie connectée
      const province_id = req.user.province_id;

      if (!lignes || lignes.length === 0)
        return res.status(400).json({ success: false, message: 'Ajoutez au moins un médicament' });

      for (const l of lignes) {
        const med = MedicamentModel.findById(l.medicament_id);
        if (!med) return res.status(400).json({ success: false, message: 'Médicament introuvable' });
        if (med.province_id !== province_id)
          return res.status(400).json({ success: false, message: `Médicament non disponible dans votre province` });
        if (med.quantite_stock < l.quantite)
          return res.status(400).json({ success: false, message: `Stock insuffisant pour ${med.nom}` });
      }

      const commandeId = CommandeModel.create({ pharmacie_id, province_id, note, urgence: urgence||0, source: 'client' });

      for (const l of lignes) {
        const med = MedicamentModel.findById(l.medicament_id);
        CommandeModel.addLigne({ commande_id: commandeId, medicament_id: l.medicament_id, quantite: l.quantite, prix_unitaire: med.prix_vente });
        MedicamentModel.updateStock(l.medicament_id, -l.quantite);
      }
      CommandeModel.updateMontantTotal(commandeId);
      const commande = CommandeModel.findById(commandeId);
      res.status(201).json({ success: true, data: commande, message: 'Commande envoyée avec succès' });
    } catch(err) { res.status(500).json({ success: false, message: err.message }); }
  },

  getMesCommandes(req, res) {
    try {
      const pharmacie_id = req.user.id;
      const commandes = CommandeModel.findAll({ pharmacie_id });
      res.json({ success: true, data: commandes });
    } catch(err) { res.status(500).json({ success: false, message: err.message }); }
  },

  getCommandeDetail(req, res) {
    try {
      const commande = CommandeModel.findById(req.params.id);
      if (!commande) return res.status(404).json({ success: false, message: 'Commande introuvable' });
      if (commande.pharmacie_id !== req.user.id)
        return res.status(403).json({ success: false, message: 'Accès interdit' });
      res.json({ success: true, data: commande });
    } catch(err) { res.status(500).json({ success: false, message: err.message }); }
  },

  getMesLivraisons(req, res) {
    try {
      const pharmacie_id = req.user.id;
      const { statut } = req.query;
      const db = getDb();
      let sql = `SELECT l.*, c.montant_total, c.urgence, p.nom as pharmacie_nom,
                 p.adresse as pharmacie_adresse
                 FROM livraisons l
                 JOIN commandes c ON l.commande_id = c.id
                 JOIN pharmacies p ON l.pharmacie_id = p.id
                 WHERE l.pharmacie_id = ?`;
      const params = [pharmacie_id];
      if (statut) { sql += ' AND l.statut = ?'; params.push(statut); }
      sql += ' ORDER BY l.created_at DESC';
      const livraisons = db.query(sql, params);
      res.json({ success: true, data: livraisons });
    } catch(err) { res.status(500).json({ success: false, message: err.message }); }
  },

  confirmerLivraison(req, res) {
    try {
      const pharmacie_id = req.user.id;
      const db = getDb();
      const livraison = db.queryOne(
        'SELECT * FROM livraisons WHERE id = ? AND pharmacie_id = ?',
        [req.params.id, pharmacie_id]
      );
      if (!livraison) return res.status(404).json({ success: false, message: 'Livraison introuvable ou accès refusé' });
      if (livraison.statut !== 'en_cours')
        return res.status(400).json({ success: false, message: 'La livraison doit être en cours pour être confirmée' });
      LivraisonModel.updateStatut(req.params.id, 'livre');
      res.json({ success: true, message: 'Livraison confirmée avec succès' });
    } catch(err) { res.status(500).json({ success: false, message: err.message }); }
  }
};
module.exports = ClientController;