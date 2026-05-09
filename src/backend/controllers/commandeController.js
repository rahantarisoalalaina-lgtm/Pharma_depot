const CommandeModel = require('../models/commandeModel');
const MedicamentModel = require('../models/medicamentModel');
const { getDb } = require('../config/database');

const CommandeController = {
  getAll(req, res) {
    try {
      const { statut, pharmacie_id } = req.query;
      const province_id = req.user.province_id;
      const commandes = CommandeModel.findAll({ statut, pharmacie_id, province_id });
      res.json({ success: true, data: commandes });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  getById(req, res) {
    try {
      const commande = CommandeModel.findById(req.params.id);
      if (!commande) return res.status(404).json({ success: false, message: 'Commande introuvable' });
      res.json({ success: true, data: commande });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  getStats(req, res) {
    try {
      const province_id = req.user.province_id;
      const stats = CommandeModel.getStats(province_id);
      const benefice = getDb().queryOne(`
        SELECT COALESCE(SUM((lc.prix_unitaire - m.prix_achat) * lc.quantite), 0) as benefice
        FROM lignes_commande lc
        JOIN medicaments m ON lc.medicament_id = m.id
        JOIN commandes c ON lc.commande_id = c.id
        WHERE c.statut IN ('livree', 'paye') AND c.province_id = ?
      `, [province_id]);
      res.json({ success: true, data: { ...stats, benefice_reel: benefice?.benefice || 0 } });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  create(req, res) {
    try {
      const { pharmacie_id, lignes, note, urgence } = req.body;
      const province_id = req.user.province_id;
      if (!pharmacie_id || !lignes || lignes.length === 0) {
        return res.status(400).json({ success: false, message: 'Pharmacie et lignes de commande requis' });
      }
      for (const ligne of lignes) {
        const med = MedicamentModel.findById(ligne.medicament_id);
        if (!med) return res.status(400).json({ success: false, message: `Médicament ID ${ligne.medicament_id} introuvable` });
        if (med.quantite_stock < ligne.quantite) {
          return res.status(400).json({ success: false, message: `Stock insuffisant pour ${med.nom}: ${med.quantite_stock} disponible` });
        }
      }
      const commandeId = CommandeModel.create({ pharmacie_id, province_id, note, urgence });
      for (const ligne of lignes) {
        const med = MedicamentModel.findById(ligne.medicament_id);
        CommandeModel.addLigne({ commande_id: commandeId, medicament_id: ligne.medicament_id, quantite: ligne.quantite, prix_unitaire: med.prix_vente });
        MedicamentModel.updateStock(ligne.medicament_id, -ligne.quantite);
      }
      CommandeModel.updateMontantTotal(commandeId);
      const commande = CommandeModel.findById(commandeId);
      res.status(201).json({ success: true, data: commande, message: 'Commande créée avec succès' });
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
  },

  valider(req, res) {
    try {
      const commande = CommandeModel.findById(req.params.id);
      if (!commande) return res.status(404).json({ success: false, message: 'Commande introuvable' });
      if (commande.statut !== 'en_attente') return res.status(400).json({ success: false, message: 'Seules les commandes en attente peuvent être validées' });
      CommandeModel.updateStatut(req.params.id, 'validee');
      res.json({ success: true, data: CommandeModel.findById(req.params.id), message: 'Commande validée' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  payer(req, res) {
    try {
      const { montant } = req.body;
      const commande = CommandeModel.findById(req.params.id);
      if (!commande) return res.status(404).json({ success: false, message: 'Commande introuvable' });
      if (!montant || montant <= 0) return res.status(400).json({ success: false, message: 'Montant invalide' });
      CommandeModel.marquerPaye(req.params.id, montant);
      res.json({ success: true, data: CommandeModel.findById(req.params.id), message: 'Paiement enregistré' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  delete(req, res) {
    try {
      const commande = CommandeModel.findById(req.params.id);
      if (!commande) return res.status(404).json({ success: false, message: 'Commande introuvable' });
      if (commande.statut !== 'en_attente') return res.status(400).json({ success: false, message: 'Seules les commandes en attente peuvent être supprimées' });
      for (const ligne of commande.lignes) { MedicamentModel.updateStock(ligne.medicament_id, ligne.quantite); }
      CommandeModel.deleteLignes(req.params.id);
      CommandeModel.delete(req.params.id);
      res.json({ success: true, message: 'Commande annulée et stock remis' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
};

module.exports = CommandeController;
