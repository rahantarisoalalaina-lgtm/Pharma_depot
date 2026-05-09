const bcrypt = require('bcryptjs');
const GestionnaireModel = require('../models/gestionnaireModel');
const { generateToken } = require('../config/auth');

const GestionnaireController = {
  async register(req, res) {
    try {
      const { nom, prenom, email, mot_de_passe, province_id } = req.body;
      if (!nom||!prenom||!email||!mot_de_passe||!province_id)
        return res.status(400).json({ success:false, message:'Tous les champs sont requis' });
      if (GestionnaireModel.findByEmail(email))
        return res.status(409).json({ success:false, message:'Email déjà utilisé' });
      const hash = await bcrypt.hash(mot_de_passe, 10);
      const id = GestionnaireModel.create({ nom, prenom, email, mot_de_passe:hash, province_id });
      const g = GestionnaireModel.findById(id); // includes province_nom
      const token = generateToken({ id, email, nom, prenom, role:'gestionnaire', province_id:Number(province_id) });
      res.status(201).json({ success:true, data:{ gestionnaire:g, token } });
    } catch(err) { res.status(500).json({ success:false, message:err.message }); }
  },
  async login(req, res) {
    try {
      const { email, mot_de_passe } = req.body;
      const raw = GestionnaireModel.findByEmail(email);
      if (!raw||!await bcrypt.compare(mot_de_passe, raw.mot_de_passe))
        return res.status(401).json({ success:false, message:'Email ou mot de passe incorrect' });
      const g = GestionnaireModel.findById(raw.id); // includes province_nom
      const token = generateToken({ id:g.id, email:g.email, nom:g.nom, prenom:g.prenom, role:'gestionnaire', province_id:g.province_id });
      res.json({ success:true, data:{ gestionnaire:g, token } });
    } catch(err) { res.status(500).json({ success:false, message:err.message }); }
  },
  profil(req, res) {
    try { res.json({ success:true, data:GestionnaireModel.findById(req.user.id) }); }
    catch(err) { res.status(500).json({ success:false, message:err.message }); }
  }
};
module.exports = GestionnaireController;
