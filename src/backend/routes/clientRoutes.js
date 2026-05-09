const express = require('express');
const router = express.Router();
const C = require('../controllers/clientController');
const { authenticateClient } = require('../config/auth');

router.get('/profil', authenticateClient, C.profil);
router.get('/stock', authenticateClient, C.getStock);
router.get('/pharmacies/:province_id', C.getPharmaciesParProvince);
router.post('/commandes', authenticateClient, C.creerCommande);
router.get('/commandes', authenticateClient, C.getMesCommandes);
router.get('/commandes/:id', authenticateClient, C.getCommandeDetail);
module.exports = router;
