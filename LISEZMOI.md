# Électrolytes 3D — application Android

**Pr Hicham MESBAH — Lycée Almassira Alkhadra — Chimie 1BAC SX-SM**

Application de simulations 3D sur les solutions électrolytiques. Elle fonctionne **sans Internet** :
le moteur 3D (WebGL) est écrit à la main dans `app/src/main/assets/www/js/engine.js`, sans bibliothèque à télécharger.

## Contenu de l'appli

1. **Cristal NaCl** : modèle compact / éclaté, les 6 voisins de l'ion central.
2. **Molécules polaires** : HCl, H₂O, CO₂ avec les charges δ et les barycentres G⁺ et G⁻.
3. **Dissolution** : dissociation, hydratation (O vers Na⁺, H vers Cl⁻), dispersion. Curseur d'avancement.
4. **Conduction** : eau salée / eau distillée, migration des ions, électrons dans les fils, lampe.
5. **Labo des concentrations** : choix du soluté (NaCl, CuCl₂, Na₂SO₄, FeCl₃, Al₂(SO₄)₃), de la masse et du volume.
   L'appli écrit l'équation de dissolution et calcule M, n, C et les concentrations des ions.
   Le bécher se remplit d'ions en proportion de C, et les solutions de cuivre II et fer III prennent leur couleur.
6. **Quiz** : 10 questions tirées au hasard parmi 12, avec correction expliquée, vibration et meilleur score.

## Ouvrir et installer

1. Ouvrir Android Studio → **File › Open** → choisir le dossier `ElectrolytesSim`.
2. Laisser Android Studio synchroniser Gradle (il télécharge Gradle 8.7 et le plugin Android la première fois).
3. Brancher un téléphone (débogage USB activé) ou lancer un émulateur, puis **Run ▶**.
4. Pour un fichier à partager aux élèves : **Build › Build App Bundle(s) / APK(s) › Build APK(s)**.
   L'APK se trouve dans `app/build/outputs/apk/debug/`.

Android 8.0 (API 26) ou plus récent.

## Modifier le contenu

Tout le contenu est en HTML/JavaScript dans `app/src/main/assets/www/` :

| Fichier | Rôle |
|---|---|
| `index.html` | écrans (accueil, simulations, quiz) et textes des panneaux |
| `css/app.css` | couleurs et mise en page |
| `js/engine.js` | moteur 3D (sphères, liaisons, caméra tactile) |
| `js/sims.js` | les cinq simulations, dont le labo (liste `SOL` pour ajouter un soluté) |
| `js/quiz.js` | les questions du quiz (liste `BANK`) |
| `js/app.js` | navigation et fond animé |

Astuce : on peut aussi ouvrir `app/src/main/assets/www/index.html` directement dans Chrome sur ordinateur
pour tester ou projeter en classe.
