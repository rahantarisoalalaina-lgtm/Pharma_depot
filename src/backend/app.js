const express = require('express');
const cors = require('cors');
const { initDb } = require('./config/database');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/provinces', require('./routes/provinceRoutes'));
app.use('/api/auth', require('./routes/gestionnaireRoutes'));
app.use('/api/client', require('./routes/clientRoutes'));
app.use('/api/medicaments', require('./routes/medicamentRoutes'));
app.use('/api/pharmacies', require('./routes/pharmacieRoutes'));
app.use('/api/commandes', require('./routes/commandeRoutes'));
app.use('/api/livraisons', require('./routes/livraisonRoutes'));
app.get('/api/health', (_,res) => res.json({ success:true, message:'API opérationnelle v2.0' }));
app.use((_,res) => res.status(404).json({ success:false, message:'Route introuvable' }));
app.use((err,_,res,__) => res.status(500).json({ success:false, message:err.message }));

initDb().then(() => {
  app.listen(PORT, () => console.log(`\n Dépôt Pharma API: http://localhost:${PORT}\n`));
}).catch(err => { console.error(err); process.exit(1); });
module.exports = app;