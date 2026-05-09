// routes/medicamentRoutes.js
const express = require('express');
const router = express.Router();
const MedicamentController = require('../controllers/medicamentController');
const { authenticateToken } = require('../config/auth');

router.use(authenticateToken);

router.get('/benchmark/kmp', MedicamentController.benchmarkKMP);
router.get('/', MedicamentController.getAll);
router.get('/stats', MedicamentController.getStats);
router.get('/alertes', MedicamentController.getAlertes);
router.get('/:id', MedicamentController.getById);
router.post('/', MedicamentController.create);
router.put('/:id', MedicamentController.update);
router.delete('/:id', MedicamentController.delete);

module.exports = router;
