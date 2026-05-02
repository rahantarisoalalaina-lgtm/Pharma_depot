const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'depot_pharmacie_secret_2024';
const JWT_EXPIRES = '7d';

function generateToken(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES }); }

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success:false, message:'Token manquant' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(403).json({ success:false, message:'Token invalide ou expiré' }); }
}

function authenticateClient(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success:false, message:'Token manquant' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'client') return res.status(403).json({ success:false, message:'Accès réservé aux pharmacies' });
    req.user = decoded; next();
  } catch { res.status(403).json({ success:false, message:'Token invalide' }); }
}

module.exports = { generateToken, authenticateToken, authenticateClient };
