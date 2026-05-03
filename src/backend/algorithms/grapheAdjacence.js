// algorithms/grapheAdjacence.js
// Graphe en liste d'adjacence — Modélisation du réseau routier des dépôts
//
// Structure : HashMap custom (table de hachage avec chaînage) pour stocker
// les listes d'adjacence de chaque noeud.
//
// Pourquoi liste d'adjacence et non matrice d'adjacence ?
// - Graphe CREUX : V=~20 noeuds, E=~30 arêtes → matrice gaspillerait O(V²) = 400 cases
// - Liste : O(V + E) = O(50) en mémoire → optimal pour notre cas

// ═══════════════════════════════════════════════════════
// STRUCTURE 3 : TABLE DE HACHAGE avec gestion des collisions (chaînage)
// ═══════════════════════════════════════════════════════

/**
 * HashMap personnalisée avec gestion des collisions par chaînage (liste liée).
 *
 * Complexité :
 *   - Accès/Insertion/Suppression : O(1) amorti, O(n) cas pire (collisions dégénérées)
 *   - Mémoire : O(n)
 *
 * Utilisée pour : indexer les listes d'adjacence par ID de noeud
 */
class HashMapCustom {
  constructor(capacite = 64) {
    this.capacite = capacite;
    this.buckets = new Array(capacite).fill(null).map(() => []); // Chaînage
    this.taille = 0;
  }

  /**
   * Fonction de hachage : polynomiale sur la représentation string de la clé
   * h(k) = (Σ k_i * 31^i) mod capacité
   */
  _hash(cle) {
    const str = String(cle);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % this.capacite;
    }
    return hash;
  }

  /**
   * Insère ou met à jour une paire clé-valeur
   * @param {*} cle
   * @param {*} valeur
   */
  set(cle, valeur) {
    const index = this._hash(cle);
    const bucket = this.buckets[index];

    // Chercher si la clé existe déjà dans le bucket (gestion collision)
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].cle === cle) {
        bucket[i].valeur = valeur; // mise à jour
        return;
      }
    }

    // Nouvelle clé → chaînage
    bucket.push({ cle, valeur });
    this.taille++;

    // Rehachage si facteur de charge > 0.75
    if (this.taille / this.capacite > 0.75) {
      this._rehacher();
    }
  }

  /**
   * Récupère la valeur associée à une clé
   * @param {*} cle
   * @returns {*} valeur ou undefined
   */
  get(cle) {
    const index = this._hash(cle);
    const bucket = this.buckets[index];
    for (const entry of bucket) {
      if (entry.cle === cle) return entry.valeur;
    }
    return undefined;
  }

  /**
   * Vérifie l'existence d'une clé
   */
  has(cle) {
    return this.get(cle) !== undefined;
  }

  /**
   * Supprime une clé
   */
  delete(cle) {
    const index = this._hash(cle);
    const bucket = this.buckets[index];
    const i = bucket.findIndex(e => e.cle === cle);
    if (i !== -1) { bucket.splice(i, 1); this.taille--; return true; }
    return false;
  }

  /**
   * Retourne toutes les clés
   */
  cles() {
    const result = [];
    for (const bucket of this.buckets) {
      for (const entry of bucket) result.push(entry.cle);
    }
    return result;
  }

  /**
   * Rehachage : double la capacité pour maintenir O(1) amorti
   */
  _rehacher() {
    const anciensBuckets = this.buckets;
    this.capacite *= 2;
    this.buckets = new Array(this.capacite).fill(null).map(() => []);
    this.taille = 0;
    for (const bucket of anciensBuckets) {
      for (const entry of bucket) this.set(entry.cle, entry.valeur);
    }
  }

  /**
   * Statistiques sur les collisions (pour le dossier algorithmique)
   */
  statsCollisions() {
    let bucketNonVides = 0, maxChaine = 0, totalCollisions = 0;
    for (const bucket of this.buckets) {
      if (bucket.length > 0) bucketNonVides++;
      if (bucket.length > 1) totalCollisions += bucket.length - 1;
      maxChaine = Math.max(maxChaine, bucket.length);
    }
    return {
      capacite: this.capacite,
      taille: this.taille,
      bucketNonVides,
      tauxRemplissage: (bucketNonVides / this.capacite * 100).toFixed(1) + '%',
      totalCollisions,
      maxChaine,
    };
  }
}

// ═══════════════════════════════════════════════════════
// STRUCTURE : GRAPHE EN LISTE D'ADJACENCE
// ═══════════════════════════════════════════════════════

/**
 * Graphe orienté pondéré en liste d'adjacence.
 * Utilise notre HashMapCustom pour stocker les voisins de chaque noeud.
 *
 * Structure interne :
 *   hashMap[noeudId] = [ { voisin: id, poids: distance }, ... ]
 *
 * Complexité :
 *   - Ajout noeud/arête : O(1) amorti
 *   - Accès voisins d'un noeud : O(1) amorti
 *   - Mémoire : O(V + E) — optimal pour graphe creux
 *
 * Comparaison avec matrice d'adjacence (solution naïve) :
 *   - Matrice : O(V²) mémoire = 400 cases pour 20 noeuds (gaspillage)
 *   - Liste   : O(V + E) = O(50) pour notre graphe réel
 */
class GrapheListeAdjacence {
  constructor() {
    this.noeuds = new HashMapCustom(); // noeudId → { id, nom, lat, lng, type }
    this.adjacence = new HashMapCustom(); // noeudId → [{voisin, poids}]
    this.nbAretes = 0;
  }

  /**
   * Ajoute un noeud au graphe
   */
  ajouterNoeud(id, donnees) {
    this.noeuds.set(id, donnees);
    if (!this.adjacence.has(id)) {
      this.adjacence.set(id, []);
    }
  }

  /**
   * Ajoute une arête orientée (source → destination)
   */
  ajouterArete(source, destination, poids) {
    if (!this.adjacence.has(source)) this.adjacence.set(source, []);
    const voisins = this.adjacence.get(source);
    // Éviter les doublons
    if (!voisins.find(v => v.voisin === destination)) {
      voisins.push({ voisin: destination, poids });
      this.adjacence.set(source, voisins);
      this.nbAretes++;
    }
  }

  /**
   * Ajoute une arête non-orientée (bidirectionnelle)
   */
  ajouterAreteNonOrientee(a, b, poids) {
    this.ajouterArete(a, b, poids);
    this.ajouterArete(b, a, poids);
  }

  /**
   * Retourne les voisins d'un noeud
   * @returns {Array} [{voisin, poids}]
   */
  voisins(noeudId) {
    return this.adjacence.get(noeudId) || [];
  }

  /**
   * Retourne les données d'un noeud
   */
  getNoeud(noeudId) {
    return this.noeuds.get(noeudId);
  }

  /**
   * Retourne tous les IDs de noeuds
   */
  tousLesNoeuds() {
    return this.noeuds.cles();
  }

  get nbNoeuds() { return this.noeuds.taille; }

  /**
   * Construit le graphe depuis les données de la BD (noeuds + arêtes)
   * @param {Object[]} noeuds  - Lignes de la table noeuds_graphe
   * @param {Object[]} aretes  - Lignes de la table aretes_graphe
   */
  static fromBD(noeuds, aretes) {
    const graphe = new GrapheListeAdjacence();

    for (const n of noeuds) {
      graphe.ajouterNoeud(n.id, {
        id: n.id, nom: n.nom,
        latitude: n.latitude, longitude: n.longitude,
        type: n.type,
      });
    }

    for (const a of aretes) {
      // Arêtes bidirectionnelles (routes à double sens)
      graphe.ajouterAreteNonOrientee(a.noeud_source_id, a.noeud_dest_id, a.distance);
    }

    return graphe;
  }

  /**
   * Représentation texte du graphe (debug)
   */
  toString() {
    const lines = [`Graphe: ${this.nbNoeuds} noeuds, ${this.nbAretes} arêtes`];
    for (const id of this.tousLesNoeuds()) {
      const noeud = this.getNoeud(id);
      const voisins = this.voisins(id).map(v => `→${v.voisin}(${v.poids}km)`).join(' ');
      lines.push(`  [${id}] ${noeud?.nom || id}: ${voisins || 'aucun voisin'}`);
    }
    return lines.join('\n');
  }

  /**
   * Benchmark : Accès O(1) liste vs O(V²) matrice simulée
   * Pour le dossier algorithmique.
   */
  benchmarkAcces(noeudId, iterations = 10000) {
    // Accès liste d'adjacence (notre implémentation)
    const t0liste = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) this.voisins(noeudId);
    const t1liste = process.hrtime.bigint();

    // Simulation accès matrice (tableau 2D)
    const V = this.nbNoeuds;
    const matrice = Array.from({ length: V }, () => new Array(V).fill(0));
    for (const id of this.tousLesNoeuds()) {
      const idx = parseInt(id) - 1;
      for (const { voisin, poids } of this.voisins(id)) {
        const jdx = parseInt(voisin) - 1;
        if (idx >= 0 && idx < V && jdx >= 0 && jdx < V) matrice[idx][jdx] = poids;
      }
    }
    const t0mat = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      const idx = parseInt(noeudId) - 1;
      if (idx >= 0 && idx < V) matrice[idx].filter(v => v > 0);
    }
    const t1mat = process.hrtime.bigint();

    return {
      listeMs: Number(t1liste - t0liste) / 1e6,
      matriceMs: Number(t1mat - t0mat) / 1e6,
      iterations,
    };
  }
}

module.exports = { GrapheListeAdjacence, HashMapCustom };
