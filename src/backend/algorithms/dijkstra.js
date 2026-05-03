// algorithms/dijkstra.js
// Algorithme de Dijkstra pour l'optimisation des trajets de livraison

/**
 * Implémentation de l'algorithme de Dijkstra
 * Trouve le chemin le plus court entre deux noeuds dans un graphe pondéré
 * 
 * @param {Object} graphe - Représentation du graphe { noeudId: [{voisinId, distance}] }
 * @param {number} source - ID du noeud source (dépôt)
 * @param {number} destination - ID du noeud destination (pharmacie)
 * @returns {Object} { chemin: [...], distanceTotale: number }
 */
function dijkstra(graphe, source, destination) {
  // Ensemble des distances minimales connues
  const distances = {};
  // Ensemble des noeuds prédécesseurs (pour reconstruire le chemin)
  const predecesseurs = {};
  // Ensemble des noeuds non encore visités
  const nonVisites = new Set();

  // Initialisation : distance infinie pour tous les noeuds
  for (const noeud in graphe) {
    distances[noeud] = Infinity;
    predecesseurs[noeud] = null;
    nonVisites.add(noeud);
  }

  // Distance de la source à elle-même = 0
  distances[source] = 0;

  while (nonVisites.size > 0) {
    // Trouver le noeud non visité avec la distance minimale
    let noeudActuel = null;
    let distanceMin = Infinity;
    
    for (const noeud of nonVisites) {
      if (distances[noeud] < distanceMin) {
        distanceMin = distances[noeud];
        noeudActuel = noeud;
      }
    }

    // Si aucun noeud accessible, arrêter
    if (noeudActuel === null || distances[noeudActuel] === Infinity) break;

    // Si on a atteint la destination, arrêter
    if (noeudActuel == destination) break;

    nonVisites.delete(noeudActuel);

    // Mettre à jour les distances des voisins
    const voisins = graphe[noeudActuel] || [];
    for (const { voisinId, distance } of voisins) {
      if (!nonVisites.has(String(voisinId))) continue;
      
      const nouvelleDistance = distances[noeudActuel] + distance;
      if (nouvelleDistance < distances[voisinId]) {
        distances[voisinId] = nouvelleDistance;
        predecesseurs[voisinId] = noeudActuel;
      }
    }
  }

  // Reconstruire le chemin
  if (distances[destination] === Infinity) {
    return { chemin: [], distanceTotale: Infinity, accessible: false };
  }

  const chemin = [];
  let noeudCourant = String(destination);
  
  while (noeudCourant !== null) {
    chemin.unshift(parseInt(noeudCourant));
    noeudCourant = predecesseurs[noeudCourant];
  }

  return {
    chemin,
    distanceTotale: distances[destination],
    accessible: true
  };
}

/**
 * Construit un graphe à partir des arêtes de la base de données
 * @param {Array} aretes - Tableau des arêtes [{noeud_source_id, noeud_dest_id, distance}]
 * @returns {Object} Graphe sous forme d'objet d'adjacence
 */
function construireGraphe(aretes) {
  const graphe = {};
  
  for (const arete of aretes) {
    const src = String(arete.noeud_source_id);
    const dst = String(arete.noeud_dest_id);
    
    if (!graphe[src]) graphe[src] = [];
    if (!graphe[dst]) graphe[dst] = [];
    
    // Graphe non orienté (aller-retour)
    graphe[src].push({ voisinId: dst, distance: arete.distance });
    graphe[dst].push({ voisinId: src, distance: arete.distance });
  }
  
  return graphe;
}

/**
 * Calcule la distance euclidienne entre deux points GPS (approximation)
 * @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2
 * @returns {number} Distance en km
 */
function distanceHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = { dijkstra, construireGraphe, distanceHaversine };
