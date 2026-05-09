// routes/livraisonRoutes.js
const express = require('express');
const router = express.Router();
const LivraisonController = require('../controllers/livraisonController');
const { authenticateToken } = require('../config/auth');

router.use(authenticateToken);
router.get('/', LivraisonController.getAll);
router.get('/stats', LivraisonController.getStats);
router.get('/:id', LivraisonController.getById);
router.post('/', LivraisonController.create);
router.put('/:id/statut', LivraisonController.updateStatut);
router.post('/:id/optimiser', LivraisonController.optimiserTrajet);
router.delete('/:id', LivraisonController.delete);

module.exports = router;
