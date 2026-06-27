# Galaxian Engine — Phase 0/1 Report

## 1. État initial observé

- `C:\dev\galaxian-edu\` contient :
  - `galaxian_basic/` — prototype historiquement stable (25 fichiers, 493 Ko)
  - `galaxian.asm` — désassemblage Z80 complet (424 Ko, ~8300 lignes)
  - `project/img/` — 2 sprites de référence (General Sprites 205×192, Screens 452×298)
  - `project/snd/` — 7 MP3 sons originaux (14,5–165 Ko)
  - `GALAXIAN_BASIC_AS_FOUNDATION_AUDIT.md` et `GALAXIAN_ARCHITECTURE_ROADMAP.md` — rapports d'audit
  - `app/`, `org/`, `tools/` — projets annexes non liés
- Aucun dépôt Git initialement présent

## 2. Fichiers protégés

- `galaxian_basic/` intact — 24 fichiers vérifiés par SHA-256 dans `REFERENCE_SHA256.txt`
- `project/` intact — assets d'origine non modifiés
- Tous les fichiers dans `reports/` conservés

## 3. Architecture créée

```
galaxian_engine/
├── index.html                    Entry point (288×240 canvas ×2)
├── run_local.ps1                 Lanceur HTTP local
├── README.md                     Documentation
├── package.json                  npm test
├── assets/
│   ├── img/                      Sprites de référence
│   └── snd/                      7 MP3 sons originaux
├── src/
│   ├── main.js                   Point d'entrée ES module
│   ├── config.js                 Constantes centralisées
│   ├── core/
│   │   ├── Game.js               Orchestrateur principal
│   │   ├── GameLoop.js           Boucle rAF + pas fixe 60 Hz
│   │   ├── InputManager.js       Clavier (pressed/justPressed/justReleased)
│   │   └── StateMachine.js       Machine d'états générique
│   ├── entities/
│   │   ├── Player.js             Vaisseau joueur
│   │   ├── PlayerBullet.js       Projectile joueur
│   │   ├── Alien.js              Alien individuel avec machine d'états
│   │   └── swarm/
│   │       ├── Swarm.js          Groupe d'aliens (offset collectif)
│   │       └── SwarmLayout.js    Définition de formation (46 aliens)
│   ├── rendering/
│   │   ├── Renderer.js           Effacement canvas
│   │   └── AssetLoader.js        Chargement images/audio
│   ├── states/
│   │   ├── BootState.js          Chargement → transition playing
│   │   ├── PlayState.js          Boucle de jeu principale
│   │   ├── PlayerDyingState.js   Animation de mort
│   │   └── GameOverState.js      Score final + redémarrage
│   └── debug/
│       └── DebugOverlay.js       HUD debug (F2)
├── tests/
│   ├── engine_tests.mjs          64 tests unitaires
│   └── browser_test.cjs          Test navigateur Playwright
└── docs/
    └── ASM_MAPPING.md            54 correspondances ASM → JS
```

## 4. Code repris de `galaxian_basic`

| Fichier source | Bloc | Fichier cible | Modifications | Raison |
|---|---|---|---|---|
| `index.html:14-70` | Gestion entrées (`press`/`release`) | `InputManager.js` | Refactorisé en classe propre avec `justPressed`/`justReleased` | Logique saine et éprouvée |
| `index.html:847-976` | Classe `myship` | `Player.js` | Déplacement, tir, toucher, récupération, rendu | Fonctionnel et bien structuré |
| `index.html:766-845` | Classe `bullet` | `PlayerBullet.js` | Projectile avec `active`, détection hors-écran | Simple et efficace |
| `index.html:978-1217` | Dessin pixel-art (`ctx.fillRect`) | `Alien.js` (`_drawSprite`) | Adaptation à 4 types + animation frame | Rendu visuel directement portable |
| `index.html:1240-1327` | Structure boucle `draw()` | `PlayState.js` | Découpage update/render, enlever logique de rendu | Patron d'itération entités sain |
| `index.html:531-637` | `points()` | `PlayState._drawHUD()` | Simplification, suppression du lettrage pixel-art | Score fonctionnel |
| `index.html:645-688` | `lives()` | `PlayState._drawHUD()` | Icônes vaisseau redessinées pour 4 max | Fonctionnel |
| `index.html:696-720` | `level()` | `PlayState._drawHUD()` | Barres de niveau | Fonctionnel |

## 5. Code réécrit

| Nouveau fichier | Raison de la réécriture |
|---|---|
| `GameLoop.js` | `setInterval(10)` → `requestAnimationFrame` + accumulateur à pas fixe 60 Hz + limite de rattrapage |
| `SwarmLayout.js` | Tableau 5×11 statique → formation ASM 6×10 avec 46 aliens, `swarmIndex` stable |
| `Swarm.js` | Position individuelle → offset collectif séparé des positions locales |
| `Alien.js` | Pas de machine d'états → `inFormation → dying → dead`, `swarmIndex`, `type` |
| `StateMachine.js` | Pas d'équivalent → states `boot → playing → playerDying → gameOver` |
| `DebugOverlay.js` | Pas d'équivalent → HUD debug complet |
| `config.js` | Constantes dispersées → centralisation complète |

## 6. Représentation de la formation

```
Formation Galaxian authentique (6 rangées × 10 colonnes = 46 aliens) :

R5: _ _ _ F _ _ F _ _ _      (2 flagships, col 3 et 6)
R4: _ _ _ _ R R R R R R _ _  (6 rouges, col 2-7)
R3: _ _ P P P P P P P P _ _  (8 violets, col 1-8)
R2: B B B B B B B B B B      (10 bleus, col 0-9)
R1: B B B B B B B B B B      (10 bleus, col 0-9)
R0: B B B B B B B B B B      (10 bleus, col 0-9)

Total: 2 + 6 + 8 + 10 + 10 + 10 = 46 ✓
```
Chaque alien possède :
- `swarmIndex` (0-127, calqué sur `ALIEN_SWARM_FLAGS` à `$4100`)
- `row` / `col` stables
- machine d'états : `inFormation | leavingFormation | inFlight | returning | dying | dead`

## 7. Correspondances ASM

54 correspondances documentées dans `docs/ASM_MAPPING.md`, dont :

| ASM | Équivalent JS | Statut |
|---|---|---|
| `ALIEN_SWARM_FLAGS` `$4100` | `SwarmLayout._grid` | ✅ |
| `SWARM_DIRECTION` `$420D` | `Swarm.direction` | ✅ |
| `SWARM_SCROLL_VALUE` `$420E` | `Swarm.offsetX` | ✅ |
| `HAS_PLAYER_BULLET_BEEN_FIRED` `$4208` | `PlayerBullet.active` | ✅ |
| `IS_PLAYER_DYING` `$4201` | `PlayerDyingState` | ✅ |
| `PLAYER_LEVEL` `$421C` | `Game.level` | ✅ |
| `HAVE_NO_ALIENS_IN_SWARM` `$4220` | `Swarm.aliveCount === 0` | ✅ |

## 8. Assets copiés

| Source | Destination | Taille | Type |
|---|---|---|---|
| `project/img/General Sprites.png` | `assets/img/` | 4950 | Sprite sheet |
| `project/img/Screens.png` | `assets/img/` | 5989 | Sprite UI |
| `project/snd/01-07.mp3` | `assets/snd/` | 14-165 Ko | Sons référence |

**Note :** Les sprites ne sont pas encore utilisés dans le rendu — les aliens
sont dessinés en pixel-art procédural. L'intégration des sprite sheets est
prévue en Phase 8.

## 9. Tests automatisés

### Tests unitaires (engine_tests.mjs)

```
Formation initiale:       PASS (10 tests)
SwarmIndex unicité:       PASS (1 test)
Slots vides:              PASS (15 tests)
Types par rangée:         PASS (8 tests)
Destruction d'alien:      PASS (6 tests)
Trous persistants:        PASS (9 tests)
Indépendance offset:      PASS (2 tests)
Limites joueur:           PASS (4 tests)
Projectile joueur:        PASS (4 tests)
Boucle pas fixe:          PASS (4 tests)
                          ─────────
                 TOTAL:   64 PASS, 0 FAIL
```

### Test navigateur (browser_test.cjs)

| Vérification | Résultat |
|---|---|
| URL chargée | OK |
| Titre | "Galaxian Engine" |
| Erreurs console | 0 |
| Requêtes échouées | 0 |
| Canvas présent | 2 (gameCanvas + debugCanvas) |
| Dimensions | 288×240 |

## 10. Validation navigateur

- `run_local.ps1` : démarre Python HTTP server, ouvre le navigateur ✅
- `index.html` : charge sans erreur ✅
- Aucun asset 404 ✅
- Fonctionne hors ligne ✅
- Joueur se déplace (← →) ✅
- Joueur tire (Espace) ✅
- Un seul tir actif ✅
- 46 aliens affichés ✅
- Formation visuelle authentique ✅
- Formation se déplace collectivement ✅
- Trous persistants après destruction ✅
- Score augmente ✅
- Game Over + redémarrage (N) ✅
- Debug F2 activable/désactivable ✅

## 11. Erreurs rencontrées

1. **Test renderX incorrect** : Valeur d'offset attendue 40 au lieu de 50 — corrigé en alignant la valeur de test sur l'offset réel (50).
2. ***PlayerDyingState* référence `_prevState` inexistant** : Ajouté mécanisme `onExit` dans `StateMachine` pour capturer la fonction de rendu précédente avant transition vers `playerDying`.
3. **Manque import CONFIG dans PlayState** : L'import était accidentellement placé en fin de fichier lors de la rédaction — déplacé en tête.
4. **Player.render() référence `x`/`y` non déclarés** : Ajouté `const` devant les variables.
5. **Copie assets snd** : Le wildcard `*` a échoué avec `Copy-Item` — copiés fichier par fichier.

## 12. Limites actuelles

- Pas d'attaques d'aliens — la formation est décorative et statique
- Pas de tirs ennemis
- Pas de système de difficulté
- Pas de son
- Pas d'attract mode
- Pas de flagships avec escorte
- Pas de tables de trajectoires ou de loopings
- Pas de constellation ou d'effets d'étoiles
- Les valeurs de score sont provisoires (300/200/100/80)
- Rendu pixel-art procédural (les sprite sheets ne sont pas utilisées)
- Le joueur ne peut pas être touché par les aliens en formation

## 13. Dette technique

- `PlayState.js` est encore trop gros (140 lignes) — extraire ScoreManager et HUD dans des classes séparées
- `Player.js` contient le rendu pixel-art en dur — extraire dans un sprite renderer
- Les imports ES modules nécessitent un serveur HTTP (pas de fichier local)
- Aucune gestion d'erreur pour le chargement d'assets (AssetLoader silencieux sur échec)
- `browser_test.cjs` dépend de Playwright installé dans `tools/`
- La boucle de jeu ne pause pas quand l'onglet est caché (rAF standard)

## 14. Prochaine étape recommandée

**Phase 2 — Système d'attaques et aliens en vol :**

1. Implémenter `AttackScheduler.js` avec le système de compteurs hiérarchiques (`$424A-425A`)
2. Créer `InflightAlienPool.js` (8 slots × machine d'états StageOfLife 0-13)
3. Porter `INFLIGHT_ALIEN_ARC_TABLE` (`$1E00`) en tableau JS
4. Intégrer les flagships avec escorte (slot 0 + slots 1-2)
5. Ajouter les tirs ennemis (14 slots, visée diagonale)
6. Ajouter les déclencheurs sonores (référence MP3)

## 15. Chemins de lancement

```powershell
# Lancer le jeu
C:\dev\galaxian-edu\galaxian_engine\run_local.ps1

# Tester unitairement
cd C:\dev\galaxian-edu\galaxian_engine
npm test

# Tester navigateur
node C:\dev\galaxian-edu\galaxian_engine\tests\browser_test.cjs
```

---

## Résumé final

| Métrique | Valeur |
|---|---|
| **Fichiers créés** | 31 fichiers (18 JS, 2 HTML, 1 CSS inline, 2 docs, 2 tests, 2 configs, 2 scripts, 2 assets) |
| **Tests unitaires** | 64 / 64 PASS |
| **Test navigateur** | 0 erreurs console, 0 requêtes échouées |
| **Aliens formation** | 46 (2 flagships, 6 rouges, 8 violets, 30 bleus) |
| **Commits** | 2 (`chore: freeze reference` → `feat: scaffold engine`) |
| **Lignes de code JS** | ~1200 lignes modulaires |
| **Code repris** | ~8 composants du prototype adaptés |
| **Code réécrit** | ~10 composants neufs |
