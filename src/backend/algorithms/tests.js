// algorithms/tests.js
// Tests unitaires des modules algorithmiques — minimum 5 requis (exigence cahier des charges)

const { construireTableLPS, rechercherKMP, filtrerMedicamentsKMP, benchmarkKMPvsNaif } = require('./kmp');
const { TasBinaire, creerTasLivraisons } = require('./binaryHeap');
const { GrapheListeAdjacence, HashMapCustom } = require('./grapheAdjacence');
const { dijkstra } = require('./dijkstra');

let passed = 0, failed = 0;

function test(nom, fn) {
  try {
    fn();
    console.log(`  ✅ ${nom}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${nom} — ${e.message}`);
    failed++;
  }
}

function assertEqual(a, b, msg = '') {
  const aStr = JSON.stringify(a), bStr = JSON.stringify(b);
  if (aStr !== bStr) throw new Error(`${msg} Attendu: ${bStr}, Obtenu: ${aStr}`);
}

function assertTrue(val, msg = '') {
  if (!val) throw new Error(msg || `Attendu: true, Obtenu: ${val}`);
}

// ═══════════════════════════════════════
// SUITE 1 : KMP — Chaînes/Recherche
// ═══════════════════════════════════════
console.log('\n📋 SUITE 1 — KMP (Knuth-Morris-Pratt)');

test('T1.1 — Table LPS vide pour motif d\'un caractère', () => {
  const lps = construireTableLPS('A');
  assertEqual(lps, [0]);
});

test('T1.2 — Table LPS correcte pour "ABABC"', () => {
  const lps = construireTableLPS('ABABC');
  assertEqual(lps, [0, 0, 1, 2, 0]);
});

test('T1.3 — KMP trouve toutes les occurrences de "ine" dans "Amoxicilline Ibuprofène Cetirizine"', () => {
  const texte = 'Amoxicilline Ibuprofène Cetirizine';
  const occurrences = rechercherKMP(texte, 'ine');
  assertTrue(occurrences.length >= 2, `Doit trouver au moins 2 occurrences, trouvé: ${occurrences.length}`);
});

test('T1.4 — KMP insensible à la casse : "amox" dans "Amoxicilline"', () => {
  const occ = rechercherKMP('Amoxicilline 500mg', 'amox');
  assertEqual(occ, [0]);
});

test('T1.5 — KMP retourne [] si motif absent', () => {
  const occ = rechercherKMP('Paracétamol 500mg', 'xyz99');
  assertEqual(occ, []);
});

test('T1.6 — filtrerMedicamentsKMP filtre correctement un tableau', () => {
  const meds = [
    { id: 1, nom: 'Amoxicilline 500mg', description: 'Antibiotique', categorie: 'Antibiotiques' },
    { id: 2, nom: 'Paracétamol 500mg', description: 'Antalgique', categorie: 'Antalgiques' },
    { id: 3, nom: 'Amoxicilline 250mg', description: 'Péd.', categorie: 'Antibiotiques' },
  ];
  const res = filtrerMedicamentsKMP(meds, 'amox');
  assertEqual(res.length, 2);
  assertTrue(res[0].nom.toLowerCase().includes('amox'));
});

test('T1.7 — KMP vs Naïf : même nombre d\'occurrences', () => {
  const texte = 'Amoxicilline 500mg Amoxicilline 250mg Artemether-Lumefantrine';
  const bench = benchmarkKMPvsNaif(texte, 'ine');
  assertTrue(bench.memeResultat, 'KMP et Naïf doivent trouver le même nombre d\'occurrences');
  console.log(`      → Naïf: ${bench.naifMs.toFixed(4)}ms | KMP: ${bench.kmpMs.toFixed(4)}ms (${bench.occurrencesKMP} occ.)`);
});

// ═══════════════════════════════════════
// SUITE 2 : TAS BINAIRE — Priorités
// ═══════════════════════════════════════
console.log('\n📋 SUITE 2 — Tas Binaire (Min-Heap)');

test('T2.1 — Tas vide : extraireMin retourne null', () => {
  const tas = new TasBinaire();
  assertEqual(tas.extraireMin(), null);
});

test('T2.2 — Tas insère et extrait le minimum correct', () => {
  const tas = new TasBinaire((a, b) => a.priorite < b.priorite);
  tas.inserer({ id: 1, priorite: 3 });
  tas.inserer({ id: 2, priorite: 1 });
  tas.inserer({ id: 3, priorite: 2 });
  const min = tas.extraireMin();
  assertEqual(min.priorite, 1, 'Doit extraire priorité 1 en premier');
});

test('T2.3 — Tas trie les livraisons : urgence d\'abord', () => {
  const livraisons = [
    { id: 1, urgence: 0, priorite: 2, created_at: '2024-01-01' },
    { id: 2, urgence: 1, priorite: 1, created_at: '2024-01-02' },
    { id: 3, urgence: 0, priorite: 1, created_at: '2024-01-03' },
  ];
  const tas = creerTasLivraisons(livraisons);
  const triees = tas.trierParPriorite();
  assertEqual(triees[0].urgence, 1, 'La livraison urgente doit être en premier');
});

test('T2.4 — Propriété de tas : parent toujours ≤ enfants', () => {
  const tas = new TasBinaire((a, b) => a.val < b.val);
  [5, 3, 8, 1, 4, 7, 2].forEach(v => tas.inserer({ val: v }));
  const els = tas.elements;
  for (let i = 1; i < els.length; i++) {
    const parent = Math.floor((i - 1) / 2);
    assertTrue(els[parent].val <= els[i].val,
      `Violation de tas : parent[${parent}]=${els[parent].val} > enfant[${i}]=${els[i].val}`);
  }
});

// ═══════════════════════════════════════
// SUITE 3 : HASHMAP CUSTOM
// ═══════════════════════════════════════
console.log('\n📋 SUITE 3 — HashMap Custom (Chaînage)');

test('T3.1 — Set et Get basiques', () => {
  const map = new HashMapCustom();
  map.set('pharmacie_1', { nom: 'Centrale' });
  assertEqual(map.get('pharmacie_1').nom, 'Centrale');
});

test('T3.2 — Mise à jour d\'une clé existante', () => {
  const map = new HashMapCustom();
  map.set('k', 10); map.set('k', 20);
  assertEqual(map.get('k'), 20);
});

test('T3.3 — Clé inexistante retourne undefined', () => {
  const map = new HashMapCustom();
  assertEqual(map.get('inexistant'), undefined);
});

test('T3.4 — Suppression fonctionne', () => {
  const map = new HashMapCustom();
  map.set('a', 1); map.delete('a');
  assertEqual(map.get('a'), undefined);
});

test('T3.5 — Rehachage automatique préserve les données', () => {
  const map = new HashMapCustom(4); // petite capacité pour forcer rehachage
  for (let i = 0; i < 10; i++) map.set(`cle_${i}`, i * 10);
  for (let i = 0; i < 10; i++) {
    assertEqual(map.get(`cle_${i}`), i * 10, `Clé cle_${i} perdue après rehachage`);
  }
});

test('T3.6 — Stats collisions cohérentes', () => {
  const map = new HashMapCustom(8);
  for (let i = 0; i < 6; i++) map.set(i, i);
  const stats = map.statsCollisions();
  assertTrue(stats.taille === 6, `Taille attendue 6, obtenu ${stats.taille}`);
  console.log(`      → Collisions: ${stats.totalCollisions}, Taux: ${stats.tauxRemplissage}`);
});

// ═══════════════════════════════════════
// SUITE 4 : GRAPHE LISTE D'ADJACENCE
// ═══════════════════════════════════════
console.log('\n📋 SUITE 4 — Graphe en liste d\'adjacence');

test('T4.1 — Ajout noeud et récupération', () => {
  const g = new GrapheListeAdjacence();
  g.ajouterNoeud(1, { nom: 'Dépôt', latitude: -18.91, longitude: 47.53 });
  assertEqual(g.getNoeud(1).nom, 'Dépôt');
});

test('T4.2 — Arête non-orientée crée 2 directions', () => {
  const g = new GrapheListeAdjacence();
  g.ajouterNoeud(1, {}); g.ajouterNoeud(2, {});
  g.ajouterAreteNonOrientee(1, 2, 0.5);
  assertTrue(g.voisins(1).some(v => v.voisin === 2), '1→2 manquant');
  assertTrue(g.voisins(2).some(v => v.voisin === 1), '2→1 manquant');
});

test('T4.3 — Graphe construit depuis données BD', () => {
  const noeuds = [
    { id: 1, nom: 'Dépôt', latitude: -18.91, longitude: 47.53, type: 'depot' },
    { id: 2, nom: 'Analakely', latitude: -18.91, longitude: 47.54, type: 'intersection' },
    { id: 3, nom: 'Anosy', latitude: -18.92, longitude: 47.54, type: 'intersection' },
  ];
  const aretes = [
    { id: 1, noeud_source_id: 1, noeud_dest_id: 2, distance: 0.2 },
    { id: 2, noeud_source_id: 2, noeud_dest_id: 3, distance: 0.6 },
  ];
  const g = GrapheListeAdjacence.fromBD(noeuds, aretes);
  assertEqual(g.nbNoeuds, 3);
  assertTrue(g.nbAretes >= 2, 'Doit avoir au moins 2 arêtes');
});

test('T4.4 — Dijkstra trouve chemin correct sur graphe simple', () => {
  // Graphe : 1 --0.2-- 2 --0.6-- 3, et 1 --1.0-- 3
  // Plus court chemin 1→3 : 1→2→3 = 0.8
  // Format attendu par dijkstra.js : { voisinId, distance }
  const graphe = {
    '1': [{ voisinId: '2', distance: 0.2 }, { voisinId: '3', distance: 1.0 }],
    '2': [{ voisinId: '3', distance: 0.6 }],
    '3': []
  };
  const res = dijkstra(graphe, '1', '3');
  assertTrue(Math.abs(res.distanceTotale - 0.8) < 0.001, `Distance attendue 0.8, obtenu ${res.distanceTotale}`);
  assertEqual(res.chemin.map(String), ['1', '2', '3']);
});

test('T4.5 — Dijkstra : noeud inaccessible retourne Infinity', () => {
  const graphe = { '1': [], '2': [] };
  const res = dijkstra(graphe, '1', '2');
  assertTrue(res.distanceTotale === Infinity || !res.chemin.includes('2'),
    'Noeud inaccessible doit retourner distance Infinie');
});

// ═══════════════════════════════════════
// RÉSUMÉ
// ═══════════════════════════════════════
console.log(`\n${'═'.repeat(50)}`);
console.log(`RÉSULTATS : ${passed} ✅ réussis | ${failed} ❌ échoués | ${passed + failed} total`);
console.log(`${'═'.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
