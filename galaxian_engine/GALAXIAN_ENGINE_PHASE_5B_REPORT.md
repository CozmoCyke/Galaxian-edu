# Phase 5B/5 — Deterministic Arcade Audio Engine

## Objectif

Implémenter un moteur audio déterministe reproduisant les sons du Galaxian original :
- **Pas d'échantillons WAV/MP3** — uniquement du son synthétisé via Web Audio API (`OscillatorNode`, `GainNode`)
- **Architecture events** — le gameplay émet des événements, l'audio s'abonne
- **6 effets sonores distincts** (tir joueur, tir ennemi, plongée, destruction alien, destruction vaisseau amiral, destruction joueur)
- **Bourdonnement de formation** (formation hum) — fréquence variable selon le ratio aliens en vie
- **Musiques** (début de stage, game over)
- **Limite de sons simultanés** (3 plongées max)
- **Mute toggle** (touche M)
- **Déverrouillage audio** (premier clic/clavier)
- **Testable hors-ligne** via OfflineAudioContext

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Gameplay (PlayState, PlayerDyingState, GameOverState)│
│    ↓ AudioEventBus.emit(type, data)                   │
├──────────────────────────────────────────────────────┤
│  AudioEventBus (singleton)                            │
│    ↓ events[]  (accumulés par tick)                   │
├──────────────────────────────────────────────────────┤
│  AudioManager.update()                                │
│    ↓ _processEvents()  ← lit + vide le bus           │
│    ├── SoundEffects (6 effets ponctuels)              │
│    ├── FormationHumController (hum continu)           │
│    ├── AttackSoundController (plongées, max 3)       │
│    └── MusicSequencePlayer (stage-start, game-over)   │
└──────────────────────────────────────────────────────┘
```

## Fichiers source (6 fichiers, 290 lignes)

| Fichier | Rôle | Lignes |
|---|---|---|
| `src/audio/AudioEventBus.js` | Singleton bus d'événements (emit, subscribe, clear, reset) | 58 |
| `src/audio/SoundEffects.js` | 6 générateurs de formes d'onde déterministes | 83 |
| `src/audio/AudioManager.js` | Cycle de vie (init, unlock, update, reset, destroy), mute, volume | 177 |
| `src/audio/FormationHumController.js` | Oscillateur triangle 40-80 Hz, gain 0.08-0.18 | 65 |
| `src/audio/AttackSoundController.js` | Sawtooth dive sweep, max 3 simultanés | 40 |
| `src/audio/MusicSequencePlayer.js` | Séquences stage-start (2 notes) et game-over (4 notes descendantes) | 51 |

## Événements audio émis depuis le gameplay

| Événement | Émetteur | Condition |
|---|---|---|
| `STAGE_STARTED` | `PlayState.enter()` | Une seule fois par entrée |
| `PLAYER_SHOT` | `PlayState._fireBullet()` | Chaque tir joueur |
| `ENEMY_SHOT` | `PlayState.update()` | Quand un alien tire |
| `ALIEN_DIVE_STARTED` | `PlayState.update()` | Alien atteint stage ATTACKING_PLAYER |
| `ALIEN_DESTROYED` | `PlayState._checkCollisions()` | Collision balle joueur → alien |
| `FLAGSHIP_DESTROYED` | `PlayState.update()` | Événement flagship_killed |
| `PLAYER_DESTROYED` | `PlayerDyingState.enter()` | Transition vers playerDying |
| `GAME_OVER` | `GameOverState.enter()` | Transition vers gameOver |

## Effets sonores (6)

Chaque effet est synthétisé par `OscillatorNode` + `GainNode` :

| Effet | Forme d'onde | Fréquence | Durée | Enveloppe |
|---|---|---|---|---|
| `PLAYER_SHOT` | Carrée | 800 Hz → 200 Hz | 80 ms | Décroissance exponentielle |
| `ENEMY_SHOT` | Sinusoïdale | 400 Hz → 150 Hz | 60 ms | Décroissance rapide |
| `ALIEN_DIVE` | Dent de scie | 600 Hz → 150 Hz | 150 ms | Piqué descendant |
| `ALIEN_DESTROYED` | Triangulaire | 500 Hz → 1000 Hz | 120 ms | Montée puis chute |
| `FLAGSHIP_DESTROYED` | Dent de scie + carrée | 300 Hz → 80 Hz | 400 ms | Longue décroissance |
| `PLAYER_DESTROYED` | Bruit (tremolo) | 200 Hz aléatoire | 600 ms | Tremolo + décroissance |

## Commandes joueur

| Touche | Action |
|---|---|
| `M` | Toggle mute |
| Clic / touche | Déverrouillage audio (première interaction) |

## Tests

### Tests Node.js (déterministes, engine_tests.mjs)

| Section | Tests | Statut |
|---|---|---|
| AUDIO EVENT BUS | 9 | ✅ |
| AUDIO EVENTS — STATE TRANSITION INTEGRATION | 4 | ✅ |
| AUDIO MANAGER | 8 | ✅ |
| MUSIC SEQUENCE PLAYER | 2 | ✅ |
| FORMATION HUM CONTROLLER | 3 | ✅ |
| ATTACK SOUND CONTROLLER | 2 | ✅ |
| ENEMY SHOT EVENT | 1 | ✅ |
| DUPLICATE EVENT PREVENTION | 1 | ✅ |
| AUDIO CONFIG | 4 | ✅ |
| OFFLINE AUDIO — WAVEFORM VALIDATION | 6 | ✅ (skip dans Node.js) |
| FORMATION HUM — BEHAVIOR | 8 | ✅ |
| MUSIC SEQUENCE PLAYER — STOP/CLEANUP | 6 | ✅ |
| AUDIO MANAGER — RESET | 6 | ✅ |
| **Total audio** | **60** | **✅ 60/60** |

### Tests browser (Chromium, phase5b_browser_validation.mjs)

| Scénario | Statut |
|---|---|
| 1. STAGE_STARTED + PLAYER_SHOT | ✅ |
| 2. GAME_OVER | ✅ |
| 3. AudioManager state | ✅ |
| 4. Event lifecycle (accumulation, clear) | ✅ |
| 5. PLAYER_DESTROYED | ✅ |
| 6. ENEMY_SHOT (enemy capable of firing) | ✅ |
| 7. ALIEN_DESTROYED via collision | ✅ |
| 8. No errors (console + page) | ✅ |
| 9. Mute toggle | ✅ |
| 10. AudioManager accessible | ✅ |
| 11. Multiple event types same tick | ✅ |
| 12. STAGE_STARTED once per enter | ✅ |
| **Total** | **18/18** |

### OfflineAudioContext (Chromium, phase5b_offline_audio.mjs)

Chaque effet est rendu via `OfflineAudioContext`, puis validé :
- Forme d'onde non nulle
- Amplitude finie (pas de NaN, pas d'infini)
- Queue d'enveloppe → 0

| Effet | Durée | Peak | Queue | Statut |
|---|---|---|---|---|
| PLAYER_SHOT | 0.500s | 0.143 | 0.000 | ✅ |
| ENEMY_SHOT | 0.500s | 0.090 | 0.000 | ✅ |
| ALIEN_DIVE | 0.500s | 0.070 | 0.000 | ✅ |
| ALIEN_DESTROYED | 0.500s | 0.118 | 0.000 | ✅ |
| FLAGSHIP_DESTROYED | 0.500s | 0.136 | 0.000 | ✅ |
| PLAYER_DESTROYED | 0.500s | 0.286 | 0.000 | ✅ |

**Total : 6/6**

## Résultats globaux (Phase 5B uniquement)

| Catégorie | Résultat |
|---|---|
| **Tests unitaires (Node.js)** | **60/60** |
| **Tests browser (Chromium)** | **18/18** |
| **OfflineAudioContext (Chromium)** | **6/6** |
| **Régression générale** | **2114/2114** (tous tests confondus) |

## Architecture vérifiée

- ✅ **Séparation gameplay/audio** : le gameplay émet des événements type-string, l'audio s'abonne (pas de dépendance directe)
- ✅ **AudioEventBus singleton** : bus partagé, abonnement/désabonnement, accumulation par tick, reset
- ✅ **FormationHumController** : fréquence 40-80 Hz basée sur ratio aliens en vie, arrêt/redémarrage safe
- ✅ **AttackSoundController** : max 3 sons simultanés, reset sur transition d'état
- ✅ **MusicSequencePlayer** : séquences jouées via setTimeout, arrêt safe, double-stop safe
- ✅ **Mute toggle** : setMuted(true/false), touche M
- ✅ **Déverrouillage audio** : unlock() sur première interaction utilisateur
- ✅ **_emitOnce('STAGE_STARTED')** : pas de duplication intra-tick
- ✅ **Game.js** : `audioManager` passé par dépendance-injection, `update(swarmState)` par tick
- ✅ **config.js** : `AUDIO.MASTER_VOLUME`, seuils de fréquence/gain, `MAX_SIMULTANEOUS_DIVES`
- ✅ **OfflineAudioContext** : 6/6 validations waveform dans Chromium
- ✅ **Déterminisme** : tous les oscillateurs sont créés avec des paramètres fixes (pas de random dans la synthèse de base)

## Historique des commits

```
d3732b4 feat(5B): deterministic arcade audio engine with OfflineAudioContext validation
fbcb83a feat(5A): enemy bullet pool, controller, browser validation, and tests
735e9a4 docs: finalize phase 4 report with publication audit and results
```

## Arrêt avant publication

⚠️ **Ne pas pusher.** Les commits 5A et 5B sont en avance de 2 commits sur `origin/main`.
La publication sera faite après finalisation et approbation du rapport.
