const LivraisonModel = require('../models/livraisonModel');
const CommandeModel = require('../models/commandeModel');
const { dijkstra, construireGraphe, distanceHaversine } = require('../algorithms/dijkstra');
const { creerTasLivraisons } = require('../algorithms/binaryHeap');
const { GrapheListeAdjacence } = require('../algorithms/grapheAdjacence');

const DEPOT_LAT = -18.9137, DEPOT_LON = 47.5361, DEPOT_NOEUD_ID = 1;

const LivraisonController = {
  getAll(req, res) {
    try {
      const { statut } = req.query;
      const province_id = req.user.province_id;
      const livraisons = LivraisonModel.findAll({ statut, province_id });
      const tas = creerTasLivraisons(livraisons);
      res.json({ success: true, data: tas.trierParPriorite() });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  getById(req, res) {
    try {
      const l = LivraisonModel.findById(req.params.id);
      if (!l) return res.status(404).json({ success: false, message: 'Livraison introuvable' });
      res.json({ success: true, data: l });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  getStats(req, res) {
    try {
      res.json({ success: true, data: LivraisonModel.getStats(req.user.province_id) });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  create(req, res) {
    try {
      const { commande_id, priorite, date_livraison } = req.body;
      const commande = CommandeModel.findById(commande_id);
      if (!commande) return res.status(404).json({ success: false, message: 'Commande introuvable' });
      const province_id = req.user.province_id;
      const id = LivraisonModel.create({
        commande_id, pharmacie_id: commande.pharmacie_id, province_id,
        priorite: commande.urgence ? 1 : (priorite || 2), date_livraison
      });
      // Calcul trajet
      const aretes = LivraisonModel.getAretes();
      const noeuds = LivraisonModel.getNoeuds(province_id);
      if (aretes.length > 0 && commande.latitude) {
        const graphe = construireGraphe(aretes);
        let noeudId = null, distMin = Infinity;
        for (const n of noeuds) {
          const d = distanceHaversine(commande.latitude, commande.longitude, n.latitude, n.longitude);
          if (d < distMin) { distMin = d; noeudId = n.id; }
        }
        if (noeudId) {
          const res2 = dijkstra(graphe, String(DEPOT_NOEUD_ID), String(noeudId));
          LivraisonModel.updateTrajet(id, { trajet_optimise: res2.chemin, distance_totale: res2.distanceTotale });
        }
      } else if (commande.latitude) {
        const dist = distanceHaversine(DEPOT_LAT, DEPOT_LON, commande.latitude, commande.longitude);
        LivraisonModel.updateTrajet(id, { trajet_optimise: [], distance_totale: dist });
      }
      CommandeModel.updateStatut(commande_id, 'validee');
      res.status(201).json({ success: true, data: LivraisonModel.findById(id), message: 'Livraison planifiée' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  updateStatut(req, res) {
    try {
      const { statut } = req.body;
      if (!['planifie','en_cours','livre','echec'].includes(statut))
        return res.status(400).json({ success: false, message: 'Statut invalide' });
      const l = LivraisonModel.findById(req.params.id);
      if (!l) return res.status(404).json({ success: false, message: 'Livraison introuvable' });
      LivraisonModel.updateStatut(req.params.id, statut);
      res.json({ success: true, data: LivraisonModel.findById(req.params.id), message: `Livraison ${statut}` });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  optimiserTrajet(req, res) {
    try {
      const l = LivraisonModel.findById(req.params.id);
      if (!l) return res.status(404).json({ success: false, message: 'Introuvable' });

      const aretes = LivraisonModel.getAretes();
      const noeuds = LivraisonModel.getNoeuds(req.user.province_id);

      // Structure 3 : Graphe en liste d'adjacence — O(V+E) mémoire au lieu de O(V²)
      const grapheLA = GrapheListeAdjacence.fromBD(noeuds, aretes);

      // Format compatible Dijkstra existant
      const graphe = construireGraphe(aretes);

      // Trouver le noeud graphe le plus proche de la pharmacie
      let noeudId = null, distMin = Infinity;
      for (const n of noeuds) {
        const d = distanceHaversine(l.latitude, l.longitude, n.latitude, n.longitude);
        if (d < distMin) { distMin = d; noeudId = n.id; }
      }

      // Dijkstra sur la liste d'adjacence
      const resultat = dijkstra(graphe, String(DEPOT_NOEUD_ID), String(noeudId));
      LivraisonModel.updateTrajet(req.params.id, { trajet_optimise: resultat.chemin, distance_totale: resultat.distanceTotale });

      res.json({
        success: true,
        data: {
          ...resultat,
          noeuds: noeuds.filter(n => resultat.chemin.includes(n.id)),
          graphe_stats: { nb_noeuds: grapheLA.nbNoeuds, nb_aretes: grapheLA.nbAretes }
        },
        message: 'Trajet optimisé — Dijkstra + Liste d\'adjacence'
      });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  delete(req, res) {
    try {
      if (!LivraisonModel.findById(req.params.id)) return res.status(404).json({ success: false, message: 'Introuvable' });
      LivraisonModel.delete(req.params.id);
      res.json({ success: true, message: 'Supprimée' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
};
module.exports = LivraisonController;
