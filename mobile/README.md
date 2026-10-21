# TutorKids Mobile

Application mobile React Native (Expo) pour interagir avec les agents IA TutorKids.

## Prérequis

- Node.js 18+
- EAS CLI (optionnel, pour les builds cloud) : `npm install -g eas-cli`
- Le backend doit tourner sur le réseau local.

## Installation

```bash
cd tutorkids/mobile
npm install
```

## Générer les assets

```bash
cd tutorkids/mobile
python3 scripts/generate-assets.py
```

Cela crée les images requises par `app.json` (`icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png`, `notification-icon.png`). Remplacez-les ensuite par de vrais assets graphiques avant publication.

## Configuration

Ouvrez `src/config.js` et remplacez `192.168.1.XX` par l'adresse IP locale de la machine qui fait tourner le backend :

```js
export const API_URL = 'http://192.168.1.42:8000';
```

## Lancer l'application en développement

```bash
npx expo start
```

Puis scannez le QR code avec l'application **Expo Go** sur votre téléphone.

## Build Android avec EAS / Codemagic

1. Créer le projet EAS :

   ```bash
   cd tutorkids/mobile
   eas login
   eas init
   ```

2. Générer le keystore localement :

   ```bash
   ./scripts/generate-keystore.sh
   ```

3. Uploader le keystore et les variables d'environnement dans Codemagic (voir `TESTING.md` section 4).

4. Lancer un build :
   - **APK interne** : workflow `android-apk-preview` dans Codemagic.
   - **AAB Play Store** : workflow `android-aab-production` dans Codemagic.

## Fonctionnalités

### Connexion

- **Parent** : inscription / connexion avec email + mot de passe.
- **Enfant** : connexion avec email parent + ID enfant + **code PIN**.

### Espace Parent

L'espace parent est divisé en 4 onglets :

1. **🏠 Accueil (Dashboard)**
   - Date du jour.
   - Actions recommandées, événements du jour, devoirs à venir, messages récents.
   - Liste des enfants liés au parent.

2. **💬 Agents**
   - Discuter avec l'**Assistant Emploi du Temps** (`mother_schedule`).
   - Discuter avec le **Tuteur Scolaire** (`kids_tutor`) au nom d'un enfant.
   - Envoyer des messages à l'**Agent Messager Familial** (`family_messenger`).
   - Chat texte + bouton micro pour envoyer un message vocal.
   - Lecture audio de la réponse de l'agent.

3. **📅 Calendrier**
   - Vue jour et vue semaine.
   - Création d'événements (activité, devoir, rendez-vous, rappel).
   - Couleurs par type d'événement.

4. **✉️ Messages**
   - Fil de discussion familial par enfant.
   - Messages historiques avec nom de l'expéditeur et de l'enfant.

### Espace Enfant

- Connexion sécurisée avec email parent + ID enfant + **code PIN**.
- Rôle par défaut : **Tuteur Scolaire** (`kids_tutor`).
- Chat texte + vocal, lecture audio de la réponse.

## Architecture

L'application est découpée en modules sous `src/` :

- `config.js` : URL du backend et constantes globales.
- `constants.js` : niveaux scolaires, types d'événements, etc.
- `styles/commonStyles.js` : styles partagés.
- `utils/` : client API, helpers dates, voix, notifications push.
- `hooks/` : logiques métier (auth, chat, enfants, événements, messages, dashboard, rôles).
- `components/` : composants réutilisables (`Header`, `TabBar`).
- `screens/` : écrans de l'application (`Login`, `Parent`, `Child`, `Chat`, `Dashboard`, `Calendar`, `Messages`, `Children`).
- `App.js` : point d'entrée qui orchestre les hooks et la navigation.

## Tests de syntaxe

```bash
cd tutorkids/mobile
npm install
npm run lint
```
