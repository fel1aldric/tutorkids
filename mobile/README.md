# TutorKids Mobile

Application mobile React Native (Expo) pour interagir avec les agents IA.

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

Ouvrez `App.js` et remplacez `192.168.1.XX` par l'adresse IP locale de la machine qui fait tourner le backend.

## Lancer l'application

```bash
npx expo start
```

Puis scannez le QR code avec l'application **Expo Go** sur votre téléphone.

## Fonctionnalités actuelles

- Choisir un agent (`kids_tutor` ou `mother_schedule`).
- Saisir l'ID d'un enfant pour personnaliser le tuteur.
- Envoyer des messages texte au backend et afficher les réponses.

## Prochaines étapes

- Ajouter le bouton micro avec `expo-av` et envoi audio au backend.
- Lire la réponse audio retournée par le backend.
- Ajouter l'écran de connexion parent / enfant.
- Afficher la liste des enfants et permettre de changer de niveau scolaire.
