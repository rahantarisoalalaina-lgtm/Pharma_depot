// routes/gestionnaireRoutes.js
const express = require('express');
const router = express.Router();
const GestionnaireController = require('../controllers/gestionnaireController');
const { authenticateToken } = require('../config/auth');

router.post('/register', GestionnaireController.register);
router.post('/login', GestionnaireController.login);
router.get('/profil', authenticateToken, GestionnaireController.profil);

module.exports = router;
