const bcrypt = require('bcryptjs');
const { initDb } = require('./database');

async function seed() {
  // Supprimer l'ancienne DB pour repartir propre
  const fs = require('fs'); const path = require('path');
  const dbPath = path.join(__dirname, '../data/depot_pharmacie.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = await initDb();
  console.log('Seeding v3...\n');

  // 6 PROVINCES DE MADAGASCAR
  const provinces = [
    ['Antananarivo','TANA','Capitale — Hautes Terres Centrales'],
    ['Fianarantsoa','FIANA','Sud des Hautes Terres'],
    ['Toamasina','TOAM','Côte Est — Port principal'],
    ['Mahajanga','MAHA','Nord-Ouest — Côte Ouest'],
    ['Toliara','TOLI','Grand Sud et Sud-Ouest'],
    ['Antsiranana','ANTSI','Extrême Nord — Diego-Suarez'],
  ];
  db.execute('DELETE FROM provinces');
  for (const p of provinces) {
    db.insert('INSERT INTO provinces (nom,code,description) VALUES (?,?,?)', p);
  }
  console.log(`${provinces.length} provinces insérées`);

  // GESTIONNAIRES (un par province)
  const hashAdmin = bcrypt.hashSync('Admin1234!', 10);
  const gestionnaires = [
    ['Rakoto','Jean','admin.tana@depot.mg',1],
    ['Rasoa','Marie','admin.fiana@depot.mg',2],
    ['Rabe','Pierre','admin.toam@depot.mg',3],
    ['Randria','Luc','admin.maha@depot.mg',4],
    ['Ravonjy','Fara','admin.toli@depot.mg',5],
    ['Andria','Solo','admin.antsi@depot.mg',6],
  ];
  db.execute('DELETE FROM gestionnaires');
  for (const g of gestionnaires) {
    db.insert('INSERT INTO gestionnaires (nom,prenom,email,mot_de_passe,province_id) VALUES (?,?,?,?,?)',
      [g[0],g[1],g[2],hashAdmin,g[3]]);
  }
  console.log('Gestionnaires créés — mot de passe: Admin1234!');

  // PHARMACIES avec mot_de_passe = Client123
  db.execute('DELETE FROM pharmacies');
  const hashPharma = bcrypt.hashSync('Client123', 10);
  const H = hashPharma;
  const pharmacies = [
    // ══════════════════════════════════════════════════
    // ANTANANARIVO (province_id=1) — 22 pharmacies
    // ══════════════════════════════════════════════════
    ['Pharmacie Centrale Analakely',      'Rue de l\'Indépendance n°12, Analakely',        '034 12 345 67','centrale@pharma.mg',      -18.9137,47.5361,'Rabe Hery',H,1],
    ['Pharmacie Anosy',                   'Avenue de l\'Indépendance n°45, Anosy',          '033 22 456 78','anosy@pharma.mg',          -18.9200,47.5400,'Rasoa Marie',H,1],
    ['Pharmacie Tsaralalana',             'Rue Tsaralalana n°8, Tsaralalana',               '032 56 789 01','tsaralalana@pharma.mg',    -18.9100,47.5320,'Rakoto Paul',H,1],
    ['Pharmacie Isotry',                  'Boulevard des Martyrs n°3, Isotry',              '034 78 901 23','isotry@pharma.mg',         -18.9050,47.5280,'Randriana Luc',H,1],
    ['Pharmacie Behoririka',              'Place de la Poste n°1, Behoririka',              '033 90 123 45','behoririka@pharma.mg',     -18.9180,47.5290,'Ratsima Claire',H,1],
    ['Pharmacie Ampefiloha',              'Rue Rainizanabololona n°22, Ampefiloha',         '032 11 222 33','ampefiloha@pharma.mg',     -18.9250,47.5350,'Rakotobe Fidy',H,1],
    ['Pharmacie Ankadivato',              'Rue Pasteur n°7, Ankadivato',                    '034 44 555 66','ankadivato@pharma.mg',     -18.9320,47.5420,'Randrianasolo Mamy',H,1],
    ['Pharmacie Isoraka',                 'Rue Ratsimilaho n°15, Isoraka',                  '033 65 432 10','isoraka@pharma.mg',        -18.9150,47.5445,'Andriamanana Zo',H,1],
    ['Pharmacie Ambohijatovo',            'Avenue 26 Juin n°31, Ambohijatovo',              '034 76 543 21','ambohijatovo@pharma.mg',   -18.9083,47.5367,'Ramiandrisoa Soa',H,1],
    ['Pharmacie Ankadifotsy',             'Rue de Russie n°4, Ankadifotsy',                 '032 87 654 32','ankadifotsy@pharma.mg',    -18.9300,47.5500,'Razafindrakoto Ny',H,1],
    ['Pharmacie Antanimena',              'Rue Rabearivelo n°18, Antanimena',               '033 98 765 43','antanimena@pharma.mg',     -18.9167,47.5333,'Randrianarisoa Beby',H,1],
    ['Pharmacie Faravohitra',             'Montée Faravohitra n°6, Faravohitra',            '034 09 876 54','faravohitra@pharma.mg',    -18.9217,47.5278,'Ratsimbazafy Heritiana',H,1],
    ['Pharmacie Mahamasina',              'Rue Ranavalona III n°9, Mahamasina',             '032 21 098 76','mahamasina@pharma.mg',     -18.9233,47.5317,'Rakotomavo Lanto',H,1],
    ['Pharmacie Ankorondrano',            'Zone Galaxy, Ankorondrano',                      '033 32 109 87','ankorondrano@pharma.mg',   -18.8983,47.5372,'Andriamasinoro Tafita',H,1],
    ['Pharmacie Ivandry',                 'Lot IVR 31, Route d\'Ivandry',                   '034 43 210 98','ivandry@pharma.mg',        -18.8900,47.5450,'Rajoelina Vola',H,1],
    ['Pharmacie Ambodivona',              'Rue Razakaboana n°5, Ambodivona',               '032 54 321 09','ambodivona@pharma.mg',     -18.9117,47.5394,'Rabenoro Fitia',H,1],
    ['Pharmacie Soavinandriana',          'Lot II M 47, Soavinandriana',                    '033 76 543 21','soavinandriana@pharma.mg', -18.9400,47.5250,'Ralaindimby Haja',H,1],
    ['Pharmacie Andohatapenaka',          'Marché Andohatapenaka, Bloc B',                  '034 87 654 32','andohatapenaka@pharma.mg', -18.9483,47.5133,'Raholijaona Fy',H,1],
    ['Pharmacie Anosizato',               'Centre Commercial Anosizato',                    '032 98 765 43','anosizato@pharma.mg',      -18.9567,47.5217,'Rasoazanandratra Brice',H,1],
    ['Pharmacie Ambohipo',                'Rue du Docteur Rabary n°11, Ambohipo',           '033 09 876 54','ambohipo@pharma.mg',       -18.9033,47.5517,'Rakotoarimanana Tiana',H,1],
    ['Pharmacie Tanjombato',              'Route Nationale 7, Tanjombato',                  '034 21 098 76','tanjombato@pharma.mg',     -18.9783,47.5400,'Randriamanalina Rina',H,1],
    ['Pharmacie Ambanidia',               'Résidence Ambanidia, Bâtiment A',                '032 32 109 87','ambanidia@pharma.mg',      -18.9117,47.5283,'Ratsarahasina Tojo',H,1],

    // ══════════════════════════════════════════════════
    // FIANARANTSOA (province_id=2) — 14 pharmacies
    // ══════════════════════════════════════════════════
    ['Pharmacie Haute Ville',             'Rue de la Cathédrale n°3, Haute Ville',          '034 21 234 56','hauteville@pharma.mg',     -21.4530,47.0856,'Raharisoa Zo',H,2],
    ['Pharmacie Tanambao',                'Quartier Tanambao, Lot T 12',                    '033 31 345 67','tanambao.fiana@pharma.mg', -21.4580,47.0900,'Ratolojanahary Jo',H,2],
    ['Pharmacie Ambositra',               'Avenue de l\'Indépendance n°7, Ambositra',       '032 41 456 78','ambositra@pharma.mg',      -20.5289,47.2453,'Randriamaro Nivo',H,2],
    ['Pharmacie Ambalavao',               'Rue Principale n°14, Ambalavao',                 '034 55 667 78','ambalavao@pharma.mg',      -21.8300,46.9200,'Rasoamanarivo Lanto',H,2],
    ['Pharmacie Fianarantsoa Centre',     'Place de l\'Indépendance, Centre-ville',         '033 67 890 12','centre.fiana@pharma.mg',   -21.4545,47.0867,'Rajaonarisoa Meva',H,2],
    ['Pharmacie Basse Ville',             'Route Nationale 7, Basse Ville',                 '032 78 901 23','basseville@pharma.mg',     -21.4600,47.0920,'Razakarivelo Mbolatiana',H,2],
    ['Pharmacie Isandra',                 'Quartier Isandra, Fianarantsoa',                 '034 89 012 34','isandra@pharma.mg',        -21.4650,47.0880,'Rakotondravony Fanja',H,2],
    ['Pharmacie Manakara',                'Rue du Port n°2, Manakara',                      '033 90 123 45','manakara@pharma.mg',       -22.1333,48.0167,'Randrianomenjanahary Soa',H,2],
    ['Pharmacie Farafangana',             'Boulevard de la Mer n°5, Farafangana',           '032 01 234 56','farafangana@pharma.mg',    -22.8167,47.8333,'Rasoazanandratro Tojo',H,2],
    ['Pharmacie Ihosy',                   'Carrefour Principal, Ihosy',                     '034 12 345 67','ihosy@pharma.mg',          -22.4000,46.1333,'Randrianarisoa Faly',H,2],
    ['Pharmacie Ranohira',                'Route d\'Isalo, Ranohira',                       '033 23 456 78','ranohira@pharma.mg',       -22.5500,45.3833,'Rakotondrabe Haingo',H,2],
    ['Pharmacie Vohipeno',                'Centre de Santé, Vohipeno',                      '032 34 567 89','vohipeno@pharma.mg',       -22.3500,47.8500,'Andrianirina Voahangy',H,2],
    ['Pharmacie Midongy',                 'Rue de l\'Hôpital, Midongy-Atsimo',              '034 45 678 90','midongy@pharma.mg',        -23.5667,47.0167,'Rakotoarisoa Lalao',H,2],
    ['Pharmacie Ambalakindresy',          'Lot AM 8, Route vers Ambalakindresy',            '033 56 789 01','ambalakindresy@pharma.mg', -21.3000,47.2000,'Rasoarimalala Fara',H,2],

    // ══════════════════════════════════════════════════
    // TOAMASINA (province_id=3) — 15 pharmacies
    // ══════════════════════════════════════════════════
    ['Pharmacie Port de Toamasina',       'Boulevard Joffre n°1, Toamasina',               '034 51 567 89','port@pharma.mg',           -18.1492,49.4023,'Rabemananjara Eric',H,3],
    ['Pharmacie Bazar Be',                'Marché Bazar Be, Bloc Santé',                    '033 61 678 90','bazarbe@pharma.mg',        -18.1550,49.4050,'Ratsimbazafy Lala',H,3],
    ['Pharmacie Mahavelona',              'Route Nationale 5, Mahavelona',                  '032 71 789 01','mahavelona@pharma.mg',     -18.1400,49.3950,'Andriantsoa Mamy',H,3],
    ['Pharmacie Ambatondrazaka',          'Avenue de la Libération n°6, Ambatondrazaka',   '034 77 888 99','ambatondrazaka@pharma.mg', -17.8300,48.4200,'Rafaralahy Ntsoa',H,3],
    ['Pharmacie Toamasina Nord',          'Rue de la Corniche n°8, Toamasina',             '033 82 012 34','nord.toam@pharma.mg',      -18.1400,49.4100,'Razafindrakoto Manda',H,3],
    ['Pharmacie Analanjirofo',            'Centre Commercial, Toamasina',                  '032 93 123 45','analanjirofo@pharma.mg',   -18.1600,49.3980,'Rakotondratsimba Heri',H,3],
    ['Pharmacie Moramanga',               'Rue Principale n°3, Moramanga',                  '034 04 234 56','moramanga@pharma.mg',      -18.9333,48.2167,'Randrianarivony Nanie',H,3],
    ['Pharmacie Fénérive Est',            'Avenue de la Mer n°9, Fénérive Est',             '033 15 345 67','fenerive@pharma.mg',       -17.3667,49.4167,'Rasolonomena Lalaina',H,3],
    ['Pharmacie Tamatave Plage',          'Front de Mer, Toamasina',                        '032 26 456 78','plage.toam@pharma.mg',     -18.1700,49.4200,'Rabemananjara Haja',H,3],
    ['Pharmacie Mananara Nord',           'Rue de l\'Hôpital, Mananara',                    '034 37 567 89','mananara@pharma.mg',       -16.1667,49.7667,'Randrianarisoa Vola',H,3],
    ['Pharmacie Soanierana Ivongo',       'Centre Ville, Soanierana Ivongo',                '033 48 678 90','soanierana@pharma.mg',     -16.9167,49.5833,'Rakotomanga Hery',H,3],
    ['Pharmacie Vatomandry',              'Près de l\'Hôpital, Vatomandry',                 '032 59 789 01','vatomandry@pharma.mg',     -19.3333,48.9833,'Razafimandimby Ony',H,3],
    ['Pharmacie Maroantsetra',            'Rue du Marché, Maroantsetra',                    '034 60 890 12','maroantsetra@pharma.mg',   -15.4333,49.7500,'Andrianjafy Tantely',H,3],
    ['Pharmacie Andilamena',              'Lot A 5, Centre d\'Andilamena',                   '033 71 901 23','andilamena@pharma.mg',     -17.0167,48.5167,'Rasoamanarivo Hanta',H,3],
    ['Pharmacie Ampasimanolotra',         'RN 2, Ampasimanolotra',                          '032 82 012 34','ampasimanolotra@pharma.mg',-18.8667,49.0667,'Rakotoarivony Soa',H,3],

    // ══════════════════════════════════════════════════
    // MAHAJANGA (province_id=4) — 12 pharmacies
    // ══════════════════════════════════════════════════
    ['Pharmacie Mahajanga Centre',        'Rue du Commerce n°4, Mahajanga',                '034 81 890 12','centre.maha@pharma.mg',    -15.7167,46.3167,'Rajaonarivony Haja',H,4],
    ['Pharmacie Amborovy',                'Quartier Amborovy, Résidence les Flamboyants',  '033 91 901 23','amborovy@pharma.mg',        -15.7100,46.3100,'Randriantsoa Tina',H,4],
    ['Pharmacie Majunga Beach',           'Boulevard Marcoz n°12, Front de Mer',           '032 93 012 34','beach.maha@pharma.mg',      -15.7200,46.3200,'Andriatsiferana Rojo',H,4],
    ['Pharmacie Tsaramandroso',           'Avenue du Marché, Tsaramandroso',               '034 04 123 45','tsaramandroso@pharma.mg',   -15.7050,46.3050,'Rabesahala Kanto',H,4],
    ['Pharmacie Mahatsinjo',              'Rue de l\'Église n°3, Mahatsinjo',              '033 15 234 56','mahatsinjo@pharma.mg',       -15.7300,46.3350,'Razanamparany Dina',H,4],
    ['Pharmacie Antsohihy',               'Avenue Principale n°7, Antsohihy',              '032 26 345 67','antsohihy@pharma.mg',        -14.8667,47.9833,'Rakotondrabe Fanja',H,4],
    ['Pharmacie Mampikony',               'Centre Ville, Mampikony',                       '034 37 456 78','mampikony@pharma.mg',        -16.0833,47.6333,'Andrianjanahary Tojo',H,4],
    ['Pharmacie Mitsinjo',                'Route Nationale 4, Mitsinjo',                   '033 48 567 89','mitsinjo@pharma.mg',         -16.0167,45.8667,'Rasoaharimanana Aina',H,4],
    ['Pharmacie Port Bergé',              'Rue du Marché, Port Bergé',                     '032 59 678 90','portberge@pharma.mg',        -15.5667,47.6167,'Randrianarivelo Mamy',H,4],
    ['Pharmacie Besalampy',               'Quartier Central, Besalampy',                   '034 60 789 01','besalampy@pharma.mg',        -16.7500,44.4833,'Ratsimba Haingo',H,4],
    ['Pharmacie Kandreho',                'Près du Dispensaire, Kandreho',                 '033 71 890 12','kandreho@pharma.mg',         -17.4833,44.9500,'Ravonjy Lalao',H,4],
    ['Pharmacie Soalala',                 'Centre de Santé de Base, Soalala',              '032 82 901 23','soalala@pharma.mg',          -16.1000,45.3000,'Andriamasimanana Brice',H,4],

    // ══════════════════════════════════════════════════
    // TOLIARA (province_id=5) — 11 pharmacies
    // ══════════════════════════════════════════════════
    ['Pharmacie Toliara Sud',             'Avenue de France n°2, Toliara',                 '034 12 012 34','sud.toli@pharma.mg',        -23.3500,43.6667,'Ramaroson Vola',H,5],
    ['Pharmacie Betania',                 'Quartier Betania, Lot B 22',                    '033 12 123 45','betania@pharma.mg',          -23.3550,43.6700,'Andriamihaja Noro',H,5],
    ['Pharmacie Morondava',               'Rue de la République n°6, Morondava',           '034 56 789 01','morondava@pharma.mg',        -20.2833,44.2833,'Rakotozafy Bina',H,5],
    ['Pharmacie Toliara Centre',          'Boulevard de la Mer n°14, Toliara',             '032 23 234 56','centre.toli@pharma.mg',      -23.3450,43.6600,'Razafindrabe Zo',H,5],
    ['Pharmacie Anketa',                  'Rue Gallieni n°8, Anketa',                      '033 34 345 67','anketa@pharma.mg',           -23.3600,43.6750,'Rakotomalala Soa',H,5],
    ['Pharmacie Ambovombe',               'Place du Marché, Ambovombe',                    '034 45 456 78','ambovombe@pharma.mg',        -25.1667,46.0833,'Rasoazanandratra Fara',H,5],
    ['Pharmacie Fort Dauphin',            'Rue Flacourt n°3, Tôlanaro/Fort Dauphin',       '032 56 567 89','fortdauphin@pharma.mg',      -25.0167,46.9833,'Andrianasolo Meva',H,5],
    ['Pharmacie Tuléar Nord',             'Avenue de l\'Hôpital, Tuléar',                  '033 67 678 90','nord.toli@pharma.mg',        -23.3350,43.6550,'Randrianomenjanahary Hery',H,5],
    ['Pharmacie Beroroha',                'Centre de Santé, Beroroha',                     '034 78 789 01','beroroha@pharma.mg',         -21.6667,45.1667,'Rajaobelina Tantely',H,5],
    ['Pharmacie Sakaraha',                'Rue Principale n°5, Sakaraha',                  '032 89 890 12','sakaraha@pharma.mg',         -22.9000,44.5333,'Razafindrahanta Lanto',H,5],
    ['Pharmacie Ampanihy',                'Près de l\'Hôpital, Ampanihy',                  '033 90 901 23','ampanihy@pharma.mg',         -24.7000,44.7500,'Ratsimamanga Ony',H,5],

    // ══════════════════════════════════════════════════
    // ANTSIRANANA (province_id=6) — 11 pharmacies
    // ══════════════════════════════════════════════════
    ['Pharmacie Diego',                   'Rue Colbert n°11, Antsiranana',                 '034 12 234 56','diego@pharma.mg',            -12.3530,49.2960,'Rasoloniaina Tojo',H,6],
    ['Pharmacie Ramena',                  'Route de Ramena km 8',                          '033 12 345 67','ramena@pharma.mg',           -12.2500,49.3300,'Andriamanantena Solo',H,6],
    ['Pharmacie Sambava',                 'Avenue Principale n°17, Sambava',               '032 34 567 89','sambava@pharma.mg',          -14.2667,50.1667,'Rahalison Aina',H,6],
    ['Pharmacie Antsiranana Centre',      'Place Kabary n°2, Antsiranana',                 '034 23 456 78','centre.antsi@pharma.mg',     -12.3600,49.2900,'Razafimahatratra Mamy',H,6],
    ['Pharmacie Nossi-Be',                'Rue de la Mer n°5, Hellville, Nosy Be',         '033 34 567 89','nossibe@pharma.mg',          -13.4033,48.2747,'Ratsimbazafy Heritiana',H,6],
    ['Pharmacie Ambanja',                 'Avenue du Marché n°9, Ambanja',                 '032 45 678 90','ambanja@pharma.mg',          -13.6667,48.4500,'Andrianjanahary Kanto',H,6],
    ['Pharmacie Antalaha',                'Rue du Commerce n°6, Antalaha',                 '034 56 789 01','antalaha@pharma.mg',         -14.8833,50.2833,'Rakotondrabe Voahary',H,6],
    ['Pharmacie Vohémar',                 'Quartier Central, Vohémar',                     '033 67 890 12','vohemar@pharma.mg',          -13.3500,50.0000,'Randrianasolo Faly',H,6],
    ['Pharmacie Andapa',                  'Près de l\'Hôpital, Andapa',                    '032 78 901 23','andapa@pharma.mg',           -14.6500,49.6500,'Rabefitia Haingo',H,6],
    ['Pharmacie Anivorano Nord',          'Route Nationale 6, Anivorano Nord',             '034 89 012 34','anivorano@pharma.mg',        -12.7000,49.2833,'Rasoarimalala Bina',H,6],
    ['Pharmacie Ambilobe',                'Avenue de l\'Hôpital n°4, Ambilobe',            '033 90 123 45','ambilobe@pharma.mg',         -13.2000,49.0500,'Rajoelison Ny',H,6],
  ];
  for (const p of pharmacies) {
    db.insert('INSERT INTO pharmacies (nom,adresse,telephone,email,latitude,longitude,contact_nom,mot_de_passe,province_id) VALUES (?,?,?,?,?,?,?,?,?)', p);
  }
  console.log(`${pharmacies.length} pharmacies insérées — Tana:22, Fiana:14, Toam:15, Maha:12, Toli:11, Antsi:11 (mot de passe: Client123)`);

  // MÉDICAMENTS — nombre différent par province
  db.execute('DELETE FROM medicaments');
  const medsBase = [
    ['Amoxicilline 500mg','Antibiotique pénicilline','Antibiotiques',8500,14200,150,'2026-06-30'],
    ['Amoxicilline 250mg','Antibiotique pédiatrique','Antibiotiques',6200,10500,120,'2026-08-15'],
    ['Azithromycine 500mg','Antibiotique macrolide','Antibiotiques',12000,20000,80,'2026-05-20'],
    ['Ciprofloxacine 500mg','Fluoroquinolone','Antibiotiques',15000,25000,60,'2026-09-10'],
    ['Métronidazole 500mg','Antiparasitaire','Antibiotiques',5000,8500,90,'2026-12-31'],
    ['Doxycycline 100mg','Tétracycline','Antibiotiques',7000,12000,45,'2026-07-15'],
    ['Cotrimoxazole 400mg','Sulfonamide','Antibiotiques',4500,7500,110,'2026-10-20'],
    ['Paracétamol 500mg','Antalgique antipyrétique','Antalgiques',2500,4200,300,'2027-01-31'],
    ['Paracétamol 1000mg','Antalgique adulte','Antalgiques',3500,6000,250,'2027-03-15'],
    ['Ibuprofène 400mg','AINS anti-inflammatoire','Antalgiques',4000,7000,200,'2026-12-31'],
    ['Ibuprofène 200mg','AINS pédiatrique','Antalgiques',3000,5200,180,'2026-11-15'],
    ['Diclofénac 50mg','Anti-inflammatoire','Antalgiques',6000,10000,90,'2026-09-30'],
    ['Tramadol 50mg','Opioïde modéré','Antalgiques',9500,16000,40,'2026-08-20'],
    ['Aspirine 500mg','Antalgique antipyrétique','Antalgiques',2000,3500,220,'2027-02-28'],
    ['Artemether-Lumefantrine','Antipaludéen combiné','Antipaludéens',22000,36000,200,'2026-10-15'],
    ['Quinine 300mg','Antipaludéen classique','Antipaludéens',6000,10000,150,'2026-08-31'],
    ['Chloroquine 150mg','Prophylaxie paludisme','Antipaludéens',4500,7500,120,'2026-12-31'],
    ['Artésunate injectable','Paludisme grave IV','Antipaludéens',35000,58000,50,'2026-06-30'],
    ['Amlodipine 5mg','Antihypertenseur','Cardiovasculaires',8000,13500,95,'2027-01-31'],
    ['Captopril 25mg','Inhibiteur ECA','Cardiovasculaires',5500,9200,85,'2026-12-31'],
    ['Atenolol 50mg','Bêtabloquant','Cardiovasculaires',6500,11000,60,'2026-11-15'],
    ['Furosémide 40mg','Diurétique','Cardiovasculaires',4000,6800,110,'2027-03-31'],
    ['Vitamine C 500mg','Acide ascorbique','Vitamines',3000,5200,400,'2027-06-30'],
    ['Vitamine D3 1000UI','Cholécalciférol','Vitamines',5000,8500,180,'2027-05-31'],
    ['Acide Folique 5mg','Vitamine B9','Vitamines',2500,4200,220,'2027-08-31'],
    ['Fer + Acide Folique','Supplément anémie','Vitamines',3500,6000,250,'2027-09-30'],
    ['Zinc 20mg','Oligo-élément','Vitamines',4500,7500,170,'2027-07-31'],
    ['Metformine 500mg','Antidiabétique oral','Antidiabétiques',4500,7500,130,'2027-02-28'],
    ['Glibenclamide 5mg','Sulfonylurée','Antidiabétiques',3500,6000,90,'2026-12-31'],
    ['Insuline Rapide 10ml','Insuline action rapide','Antidiabétiques',25000,42000,40,'2026-09-15'],
    ['Salbutamol 100µg','Bronchodilatateur inhalé','Respiratoires',12000,20000,80,'2026-11-30'],
    ['Béclométasone 100µg','Corticoïde inhalé','Respiratoires',18000,30000,50,'2026-10-15'],
    ['Cetirizine 10mg','Antihistaminique','Respiratoires',5000,8500,110,'2027-02-28'],
    ['Oméprazole 20mg','Inhibiteur pompe protons','Gastro-intestinaux',7000,11800,150,'2027-04-30'],
    ['Lopéramide 2mg','Antidiarrhéique','Gastro-intestinaux',3500,6000,130,'2027-06-30'],
    ['Sel de réhydratation','SRO diarrhée','Gastro-intestinaux',1500,2500,300,'2028-01-31'],
    ['Charbon activé 250mg','Adsorbant gastrique','Gastro-intestinaux',4500,7500,80,'2027-03-15'],
    ['Clotrimazole crème 1%','Antifongique topique','Dermatologie',5500,9200,85,'2026-11-30'],
    ['Hydrocortisone crème 1%','Corticoïde topique','Dermatologie',4500,7500,95,'2027-01-31'],
    ['Zinc oxyde pommade','Protecteur cutané','Dermatologie',3500,6000,120,'2027-06-30'],
    ['Chloramphénicol collyre','Antibiotique ophtalmique','Ophtalmologie',6000,10000,90,'2026-08-31'],
    ['Larmes artificielles','Lubrifiant oculaire','Ophtalmologie',5000,8500,120,'2027-05-31'],
  ];

  // Chaque province a un nombre DIFFÉRENT de médicaments avec des stocks variés
  const provinceMedConfig = [
    { provId: 1, meds: medsBase, stockMult: 1.5 },       // Tana: tous, stocks élevés
    { provId: 2, meds: medsBase.slice(0, 35), stockMult: 1.0 },   // Fiana: 35 médicaments
    { provId: 3, meds: medsBase.slice(0, 38), stockMult: 1.2 },   // Toam: 38 médicaments
    { provId: 4, meds: medsBase.slice(0, 28), stockMult: 0.8 },   // Maha: 28 médicaments, stocks bas
    { provId: 5, meds: medsBase.slice(0, 25), stockMult: 0.7 },   // Toli: 25 médicaments, stocks bas
    { provId: 6, meds: medsBase.slice(0, 30), stockMult: 0.9 },   // Antsi: 30 médicaments
  ];

  let totalMeds = 0;
  for (const cfg of provinceMedConfig) {
    for (const m of cfg.meds) {
      const stock = Math.max(5, Math.round(m[5] * cfg.stockMult));
      db.insert('INSERT INTO medicaments (nom,description,categorie,prix_achat,prix_vente,quantite_stock,date_expiration,province_id) VALUES (?,?,?,?,?,?,?,?)',
        [m[0],m[1],m[2],m[3],m[4],stock,m[6],cfg.provId]);
      totalMeds++;
    }
  }
  console.log(`${totalMeds} médicaments insérés (Tana:42, Fiana:35, Toam:38, Maha:28, Toli:25, Antsi:30)`);

  // GRAPHE Antananarivo
  db.execute('DELETE FROM noeuds_graphe'); db.execute('DELETE FROM aretes_graphe');
  const noeuds = [
    [1,'Dépôt Central',-18.9137,47.5361,'depot',1],[2,'Analakely',-18.9145,47.5370,'intersection',1],
    [3,'Anosy',-18.9200,47.5400,'intersection',1],[4,'Tsaralalana',-18.9100,47.5320,'intersection',1],
    [5,'Isotry',-18.9050,47.5280,'intersection',1],[6,'Behoririka',-18.9180,47.5290,'intersection',1],
    [7,'Ankadifotsy',-18.9300,47.5500,'intersection',1],[8,'Isoraka',-18.9150,47.5450,'intersection',1],
  ];
  for (const n of noeuds) db.insert('INSERT INTO noeuds_graphe (id,nom,latitude,longitude,type,province_id) VALUES (?,?,?,?,?,?)', n);
  const aretes = [[1,2,0.2],[1,4,0.5],[1,6,0.7],[2,3,0.6],[2,8,0.9],[3,6,0.8],[4,5,0.6],[5,6,0.8],[6,3,0.8],[7,8,0.8],[8,3,1.1]];
  for (const a of aretes) db.insert('INSERT INTO aretes_graphe (noeud_source_id,noeud_dest_id,distance) VALUES (?,?,?)', a);

  // COMMANDES fictives
  const cmdSeed = [
    {pha:1,prov:1,statut:'paye',urgence:0,lignes:[[1,10],[8,20]]},
    {pha:2,prov:1,statut:'livree',urgence:0,lignes:[[15,5],[19,8]]},
    {pha:3,prov:1,statut:'validee',urgence:1,lignes:[[22,12],[30,7]]},
    {pha:4,prov:1,statut:'en_attente',urgence:0,lignes:[[2,15],[9,25]]},
    {pha:8,prov:2,statut:'paye',urgence:0,lignes:[[1,8],[8,15]]},
    {pha:9,prov:2,statut:'en_attente',urgence:1,lignes:[[3,10],[14,20]]},
    {pha:12,prov:3,statut:'validee',urgence:0,lignes:[[1,6],[12,12]]},
    {pha:16,prov:4,statut:'en_attente',urgence:0,lignes:[[1,5],[8,10]]},
  ];

  // Get med id offsets per province
  const provMedStart = {};
  let offset = 1;
  for (const cfg of provinceMedConfig) {
    provMedStart[cfg.provId] = offset;
    offset += cfg.meds.length;
  }

  for (const c of cmdSeed) {
    const base = provMedStart[c.prov];
    const cmdId = db.insert(
      "INSERT INTO commandes (pharmacie_id,province_id,statut,urgence,montant_total,montant_paye,source) VALUES (?,?,?,?,0,0,'gestionnaire')",
      [c.pha, c.prov, c.statut, c.urgence]
    );
    let total = 0;
    for (const [idx, qte] of c.lignes) {
      const medId = base + idx - 1;
      const med = db.queryOne('SELECT prix_vente FROM medicaments WHERE id = ?', [medId]);
      if (!med) continue;
      db.insert('INSERT INTO lignes_commande (commande_id,medicament_id,quantite,prix_unitaire) VALUES (?,?,?,?)',
        [cmdId, medId, qte, med.prix_vente]);
      total += qte * med.prix_vente;
    }
    const paye = c.statut==='paye' ? total : c.statut==='livree' ? Math.floor(total*0.5) : 0;
    db.execute('UPDATE commandes SET montant_total=?,montant_paye=? WHERE id=?', [total, paye, cmdId]);
    if (['livree','paye','validee'].includes(c.statut)) {
      db.insert('INSERT INTO livraisons (commande_id,pharmacie_id,province_id,statut,priorite,distance_totale) VALUES (?,?,?,?,?,?)',
        [cmdId, c.pha, c.prov, c.statut==='livree'||c.statut==='paye'?'livre':'planifie', c.urgence?1:2, (Math.random()*5+1).toFixed(2)]);
    }
  }

  console.log('\nSeed v3 terminé !');
  console.log('Gestionnaires: admin.tana@depot.mg / Admin1234!');
  console.log('Pharmacies: sélectionner + Client123');
}

seed().catch(e => { console.error(e.message); process.exit(1); });
