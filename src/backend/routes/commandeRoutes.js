// routes/commandeRoutes.js
const express = require('express');
const router = express.Router();
const CommandeController = require('../controllers/commandeController');
const { authenticateToken } = require('../config/auth');

router.use(authenticateToken);
router.get('/', CommandeController.getAll);
router.get('/stats', CommandeController.getStats);
router.get('/:id', CommandeController.getById);
router.post('/', CommandeController.create);
router.put('/:id/valider', CommandeController.valider);
router.put('/:id/payer', CommandeController.payer);
router.delete('/:id', CommandeController.delete);

module.exports = router;
