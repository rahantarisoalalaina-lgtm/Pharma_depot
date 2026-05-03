// algorithms/kmp.js
// Algorithme de Knuth-Morris-Pratt (KMP) — Recherche de médicaments par nom
//
// Problème : rechercher un motif (pattern) dans un texte en O(n+m)
// au lieu de la méthode naïve en O(n*m).
//
// Application : recherche de médicaments par nom/catégorie
// Remplacement de la solution naïve : SQL LIKE '%pattern%' = O(n*m)
// Solution KMP : O(n + m) où n = longueur texte, m = longueur motif

/**
 * Construit la table des préfixes (failure function) pour KMP.
 * lps[i] = longueur du plus long préfixe propre de pattern[0..i]
 * qui est aussi un suffixe.
 *
 * Complexité : O(m) temps, O(m) mémoire
 * @param {string} pattern - Le motif à rechercher
 * @returns {number[]} Table lps
 */
function construireTableLPS(pattern) {
  const m = pattern.length;
  const lps = new Array(m).fill(0);
  let longueur = 0; // longueur du préfixe/suffixe précédent
  let i = 1;

  while (i < m) {
    if (pattern[i] === pattern[longueur]) {
      longueur++;
      lps[i] = longueur;
      i++;
    } else {
      if (longueur !== 0) {
        // Ne pas incrémenter i ici
        longueur = lps[longueur - 1];
      } else {
        lps[i] = 0;
        i++;
      }
    }
  }
  return lps;
}

/**
 * Recherche toutes les occurrences du motif dans le texte (insensible à la casse).
 * Algorithme KMP — complexité O(n + m)
 *
 * @param {string} texte   - Le texte dans lequel chercher
 * @param {string} motif   - Le motif à trouver
 * @returns {number[]}     - Indices de début de chaque occurrence trouvée
 */
function rechercherKMP(texte, motif) {
  if (!motif || !texte) return [];

  // Insensible à la casse
  const t = texte.toLowerCase();
  const p = motif.toLowerCase();

  const n = t.length;
  const m = p.length;
  const occurrences = [];

  if (m === 0 || m > n) return occurrences;

  const lps = construireTableLPS(p);

  let i = 0; // index dans texte
  let j = 0; // index dans motif

  while (i < n) {
    if (p[j] === t[i]) {
      i++;
      j++;
    }

    if (j === m) {
      occurrences.push(i - j); // occurrence trouvée à l'index i-j
      j = lps[j - 1];
    } else if (i < n && p[j] !== t[i]) {
      if (j !== 0) {
        j = lps[j - 1];
      } else {
        i++;
      }
    }
  }

  return occurrences;
}

/**
 * Vérifie si le motif est présent dans le texte (version booléenne).
 * Utilisé pour filtrer les médicaments.
 *
 * @param {string} texte
 * @param {string} motif
 * @returns {boolean}
 */
function contientMotif(texte, motif) {
  return rechercherKMP(texte, motif).length > 0;
}

/**
 * Filtre un tableau de médicaments en utilisant KMP.
 * Recherche dans : nom, description, categorie
 *
 * Solution NAÏVE (baseline) : SQL LIKE '%motif%' → O(n * m) par champ
 * Solution KMP              : O(n + m) par champ → significativement plus rapide
 * pour de longs catalogues de médicaments
 *
 * @param {Object[]} medicaments - Tableau de médicaments depuis la BD
 * @param {string}   motif       - Terme de recherche
 * @returns {Object[]}           - Médicaments filtrés + score de pertinence
 */
function filtrerMedicamentsKMP(medicaments, motif) {
  if (!motif || motif.trim() === '') return medicaments;

  const resultats = [];

  for (const med of medicaments) {
    const champsARechercher = [
      med.nom || '',
      med.description || '',
      med.categorie || '',
    ];

    let scoreTotal = 0;
    let trouve = false;

    for (const champ of champsARechercher) {
      const occurrences = rechercherKMP(champ, motif);
      if (occurrences.length > 0) {
        trouve = true;
        scoreTotal += occurrences.length;
        // Bonus si le motif est au début du nom (plus pertinent)
        if (occurrences[0] === 0) scoreTotal += 5;
      }
    }

    if (trouve) {
      resultats.push({ ...med, _score: scoreTotal });
    }
  }

  // Trier par score décroissant (plus pertinent en premier)
  resultats.sort((a, b) => b._score - a._score);

  // Nettoyer le champ _score avant de retourner
  return resultats.map(({ _score, ...med }) => med);
}

/**
 * Mesure comparative : KMP vs NAÏF (pour le dossier algorithmique)
 *
 * @param {string} texte
 * @param {string} motif
 * @returns {Object} { kmpMs, naifMs, occurrencesKMP, occurrencesNaif }
 */
function benchmarkKMPvsNaif(texte, motif) {
  // Solution naïve
  const t0naif = process.hrtime.bigint();
  const occurrencesNaif = [];
  const t = texte.toLowerCase();
  const p = motif.toLowerCase();
  for (let i = 0; i <= t.length - p.length; i++) {
    let j = 0;
    while (j < p.length && t[i + j] === p[j]) j++;
    if (j === p.length) occurrencesNaif.push(i);
  }
  const t1naif = process.hrtime.bigint();

  // Solution KMP
  const t0kmp = process.hrtime.bigint();
  const occurrencesKMP = rechercherKMP(texte, motif);
  const t1kmp = process.hrtime.bigint();

  return {
    naifMs: Number(t1naif - t0naif) / 1e6,
    kmpMs: Number(t1kmp - t0kmp) / 1e6,
    occurrencesNaif: occurrencesNaif.length,
    occurrencesKMP: occurrencesKMP.length,
    memeResultat: occurrencesNaif.length === occurrencesKMP.length,
  };
}

module.exports = {
  construireTableLPS,
  rechercherKMP,
  contientMotif,
  filtrerMedicamentsKMP,
  benchmarkKMPvsNaif,
};
