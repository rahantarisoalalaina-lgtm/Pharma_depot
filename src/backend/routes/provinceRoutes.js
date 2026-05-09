const express = require('express');
const router = express.Router();
const C = require('../controllers/provinceController');
router.get('/', C.getAll);
router.get('/:id', C.getById);
module.exports = router;
