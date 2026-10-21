# TutorKids Mobile

Application mobile React Native (Expo) pour interagir avec les agents IA TutorKids.

## Prérequis

- Node.js 18+
- Expo CLI : `npm install -g expo-cli`
- Le backend doit tourner sur le réseau local.

## Installation

```bash
cd tutorkids/mobile
npm install
```

## Configuration

Ouvrez `App.js` et remplacez `192.168.1.XX` par l'adresse IP locale de la machine qui fait tourner le backend :

```js
const API_URL = 'http://192.168.1.42:8000';
```

## Lancer l'application

```bash
npx expo start
```

Puis scannez le QR code avec l'application **Expo Go** sur votre téléphone.

## Fonctionnalités

### Connexion

- **Parent** : inscription / connexion avec email + mot de passe.
- **Enfant** : connexion avec son ID (UUID, temporaire ; un code PIN viendra plus tard).

### Espace Parent

L'espace parent est divisé en 3 onglets :

1. **💬 Agents**
   - Rôle par défaut : **Assistant Emploi du Temps** (`mother_schedule`).
   - Peut aussi discuter avec le **Tuteur Scolaire** (`kids_tutor`) au nom du premier enfant.
   - Chat texte + bouton micro pour envoyer un message vocal.
   - Lecture de la réponse audio de l'agent.

2. **📅 Calendrier familial**
   - Liste des événements / devoirs / rendez-vous / rappels.
   - Création d'un événement avec titre, type, date/heure, description, enfant concerné.
   - Suppression d'un événement.

3. **👶 Mes enfants**
   - Liste des profils enfants.
   - Ajout d'un enfant avec prénom, date de naissance, niveau scolaire (boutons visuels) et intérêts.
   - Modification / suppression d'un enfant.

### Espace Enfant

- Connexion sécurisée avec email parent + ID enfant + **code PIN**.
- Rôle par défaut : **Tuteur Scolaire** (`kids_tutor`).
- Chat texte + vocal, lecture audio de la réponse.

## Prochaines étapes

- Afficher un calendrier visuel par jour / semaine.
- Notifications locales pour les rappels et devoirs.
- Installer Whisper et Piper localement pour une STT/TTS 100% offline.
