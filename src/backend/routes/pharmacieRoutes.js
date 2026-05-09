const express = require('express');
const router = express.Router();
const PharmacieController = require('../controllers/pharmacieController');
const { authenticateToken } = require('../config/auth');

// Public: login pharmacie
router.post('/login', PharmacieController.login);

// Protected gestionnaire
router.use(authenticateToken);
router.get('/', PharmacieController.getAll);
router.get('/:id', PharmacieController.getById);
router.post('/', PharmacieController.create);
router.put('/reset-passwords', PharmacieController.resetAllPasswords);
router.put('/:id', PharmacieController.update);
router.put('/:id/password', PharmacieController.changePassword);
router.delete('/:id', PharmacieController.delete);

module.exports = router;
