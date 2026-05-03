// algorithms/binaryHeap.js
// Tas binaire (min-heap) pour la priorisation des livraisons

/**
 * Classe TasBinaire - Min-Heap
 * Priorise les livraisons selon leur urgence et leur priorité
 * Plus la valeur de priorité est faible, plus la livraison est urgente
 */
class TasBinaire {
  constructor(comparateur) {
    this.elements = [];
    // Comparateur : retourne true si a a priorité sur b
    this.comparateur = comparateur || ((a, b) => a.priorite < b.priorite);
  }

  /**
   * Insère un élément dans le tas
   */
  inserer(element) {
    this.elements.push(element);
    this._remonter(this.elements.length - 1);
  }

  /**
   * Extrait l'élément de plus haute priorité (racine)
   */
  extraireMin() {
    if (this.elements.length === 0) return null;
    if (this.elements.length === 1) return this.elements.pop();

    const min = this.elements[0];
    this.elements[0] = this.elements.pop();
    this._descendre(0);
    return min;
  }

  /**
   * Consulte l'élément de plus haute priorité sans l'extraire
   */
  peek() {
    return this.elements[0] || null;
  }

  get taille() {
    return this.elements.length;
  }

  get estVide() {
    return this.elements.length === 0;
  }

  /**
   * Remonte un élément vers la racine si nécessaire (après insertion)
   */
  _remonter(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.comparateur(this.elements[index], this.elements[parentIndex])) {
        [this.elements[index], this.elements[parentIndex]] = 
          [this.elements[parentIndex], this.elements[index]];
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  /**
   * Fait descendre un élément vers les feuilles si nécessaire (après extraction)
   */
  _descendre(index) {
    const n = this.elements.length;
    while (true) {
      let plusPrioritaire = index;
      const gauche = 2 * index + 1;
      const droite = 2 * index + 2;

      if (gauche < n && this.comparateur(this.elements[gauche], this.elements[plusPrioritaire])) {
        plusPrioritaire = gauche;
      }
      if (droite < n && this.comparateur(this.elements[droite], this.elements[plusPrioritaire])) {
        plusPrioritaire = droite;
      }

      if (plusPrioritaire !== index) {
        [this.elements[index], this.elements[plusPrioritaire]] = 
          [this.elements[plusPrioritaire], this.elements[index]];
        index = plusPrioritaire;
      } else {
        break;
      }
    }
  }

  /**
   * Retourne tous les éléments triés par priorité (sans modifier le tas)
   */
  trierParPriorite() {
    const copie = new TasBinaire(this.comparateur);
    copie.elements = [...this.elements];
    const resultat = [];
    while (!copie.estVide) {
      resultat.push(copie.extraireMin());
    }
    return resultat;
  }
}

/**
 * Crée un tas de livraisons priorisées
 * Critères : urgence (booléen) d'abord, puis quantité totale décroissante
 * 
 * @param {Array} livraisons - Tableau de livraisons
 * @returns {TasBinaire} Tas ordonné
 */
function creerTasLivraisons(livraisons) {
  const comparateur = (a, b) => {
    // L'urgence passe en premier
    if (a.urgence !== b.urgence) return a.urgence > b.urgence;
    // Puis la priorité numérique (1 = haute, 3 = basse)
    if (a.priorite !== b.priorite) return a.priorite < b.priorite;
    // Enfin, la date de création (FIFO)
    return new Date(a.created_at) < new Date(b.created_at);
  };

  const tas = new TasBinaire(comparateur);
  livraisons.forEach(l => tas.inserer(l));
  return tas;
}

module.exports = { TasBinaire, creerTasLivraisons };
