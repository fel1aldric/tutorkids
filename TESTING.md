# Procès-verbal de lancement et de test — TutorKids

Ce document décrit pas à pas comment lancer le projet en local (backend + mobile) et vérifier que toutes les fonctionnalités fonctionnent.

---

## 1. Prérequis

- Python **3.12 ou 3.14** installé.
- Node.js **18+** et npm installés.
- Ollama installé et lancé avec un modèle compatible (`gpt-oss:20b-cloud` par défaut).
- (Optionnel) Docker + Docker Compose pour MySQL en production.
- (Optionnel) Un appareil mobile physique ou un émulateur Android/iOS pour Expo.

---

## 2. Lancer le backend

```bash
cd tutorkids/backend

# Créer l'environnement virtuel (la première fois)
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Appliquer les migrations (SQLite par défaut)
alembic upgrade head

# Peupler les données de base (niveaux scolaires, compétences)
python seed_data.py

# En cas d'erreur Alembic suite à une base de développement corrompue :
# rm tutorkids_dev.db
# alembic upgrade head
# python seed_data.py
# (Cela supprime les données locales de développement.)

# Démarrer le serveur en mode développement
./run_dev.sh
```

Le backend est disponible sur **http://localhost:8000**.
La documentation Swagger est sur **http://localhost:8000/docs**.

> Si le modèle Ollama s'appelle différemment : `OLLAMA_MODEL=mon-model ./run_dev.sh`.

---

## 3. Lancer l'application mobile

```bash
cd tutorkids/mobile

# Installer les dépendances (la première fois)
npm install

# Remplacer l'IP du backend dans App.js
# Rechercher : const API_URL = 'http://192.168.1.XX:8000';
# Remplacer par l'IP locale de la machine qui héberge le backend.

# Démarrer Expo
npx expo start
```

- Scanner le QR code avec l'application **Expo Go** sur un téléphone physique.
- Ou appuyer sur `a` pour lancer sur un émulateur Android, `i` pour un simulateur iOS.

> Les notifications push ne fonctionnent que sur un vrai appareil avec un build EAS.

---

## 4. Build Android avec Codemagic + Expo EAS

### 4.1 Prérequis

- Compte **Expo** et projet EAS créé : https://expo.dev
- Compte **Codemagic** : https://codemagic.io
- EAS CLI installé localement :
  ```bash
  npm install -g eas-cli
  ```
- Créer le projet EAS dans `mobile/` :
  ```bash
  cd tutorkids/mobile
  eas login
  eas init
  ```
  Récupérer le `projectId` affiché (il sera utilisé comme variable d'environnement `EAS_PROJECT_ID` dans Codemagic).

### 4.2 Générer le keystore Android

```bash
cd tutorkids/mobile
./scripts/generate-keystore.sh
```

Ce script crée :
- Un fichier `tutorkids-release.keystore`
- Un mot de passe keystore
- Un alias de clé
- Un mot de passe de clé

> **Ne jamais commiter le fichier `.keystore` ni les mots de passe.** Conservez-les dans un gestionnaire de mots de passe sécurisé.

### 4.3 Configurer les secrets dans Codemagic

Dans l'interface Codemagic, pour l'application TutorKids :

1. **Variables d'environnement (Environment variables)** :
   - `EXPO_TOKEN` : token d'accès personnel Expo (https://expo.dev/settings/access-tokens)
   - `EAS_PROJECT_ID` : l'identifiant du projet EAS
   - `ANDROID_KEYSTORE_PASSWORD` : mot de passe du keystore
   - `ANDROID_KEY_PASSWORD` : mot de passe de la clé
   - `ANDROID_KEY_ALIAS` : alias de la clé (par défaut `tutorkids`)

2. **Fichier de signature Android (Android code signing)** :
   - Uploader le fichier `tutorkids-release.keystore`.
   - Nommer le fichier de signature : `tutorkids_keystore`.

### 4.4 Fichiers de configuration

Les fichiers suivants sont déjà présents dans le dépôt :

- `tutorkids/mobile/app.json` : configuration Expo avec placeholders pour les assets.
- `tutorkids/mobile/eas.json` : profils de build (`preview` = APK, `production` = AAB).
- `tutorkids/codemagic.yaml` : workflows CI/CD pour Codemagic.

Avant le premier build, remplacez `your-eas-project-id` dans `mobile/app.json` par le vrai `projectId`, ou laissez Codemagic l'injecter via la variable `EAS_PROJECT_ID`.

### 4.5 Lancer un build APK (test interne)

Dans Codemagic, lancer le workflow **Android APK Preview**.

Il exécute :
```bash
eas build --platform android --profile preview --non-interactive --no-wait
```

Le lien de téléchargement APK apparaît dans le dashboard EAS une fois le build terminé.

### 4.6 Lancer un build AAB (Google Play Store)

Dans Codemagic, lancer le workflow **Android AAB Production**.

Il exécute :
```bash
eas build --platform android --profile production --non-interactive --no-wait
```

Le fichier `.aab` généré peut être soumis manuellement ou automatiquement au Play Console via `eas submit`.

### 4.7 Installer et tester l'APK

```bash
# Sur un appareil Android connecté en USB avec adb activé
adb install -r chemin/vers/app-preview.apk

# Lancer l'application
adb shell am start -n com.tutorkids.ai/.MainActivity
```

### 4.8 Workflow de tests mobiles

Le workflow **Mobile Tests** dans `codemagic.yaml` vérifie :
- L'installation des dépendances npm.
- La syntaxe du fichier `App.js` avec Babel.
- (Optionnel) ESLint.

---

## 5. Tests automatiques du backend

```bash
cd tutorkids/backend
source venv/bin/activate
pytest tests/ -v
```

Résultat attendu : **tous les tests passent** (actuellement 29 passed).

### Lancer un test spécifique

```bash
pytest tests/test_dashboard.py -v
pytest tests/test_family_messages.py -v
pytest tests/test_children_multi_parent.py -v
pytest tests/test_push_notifications.py -v
pytest tests/test_agent_tools.py -v
pytest tests/test_auth_pin.py -v
pytest tests/test_voice_status.py -v
pytest tests/test_audio_cleanup.py -v
pytest tests/test_roles.py -v
pytest tests/test_focus_mode.py -v
```

---

## 6. Vérifications fonctionnelles — API

### 6.1 Inscription et connexion parent

```bash
# Inscrire un parent
curl -X POST http://localhost:8000/auth/register-parent \
  -H "Content-Type: application/json" \
  -d '{"email":"mere@famille.fr","first_name":"Marie","last_name":"Dupont","password":"secret"}'

# Connecter le parent
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login-parent \
  -H "Content-Type: application/json" \
  -d '{"email":"mere@famille.fr","password":"secret"}' | jq -r '.access_token')

echo $TOKEN
```

### 6.2 Créer un enfant et définir un PIN

```bash
CHILD=$(curl -s -X POST http://localhost:8000/children/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"first_name":"Léa","birth_date":"2019-03-15","school_level_code":"cp","interests":"dinosaures, dessin"}')

CHILD_ID=$(echo "$CHILD" | jq -r '.id')
echo $CHILD_ID

# Définir le PIN
curl -X PUT "http://localhost:8000/children/$CHILD_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pin":"1234"}'
```

### 6.3 Connexion enfant avec PIN

```bash
CHILD_TOKEN=$(curl -s -X POST http://localhost:8000/auth/login-child-pin \
  -H "Content-Type: application/json" \
  -d "{\"parent_email\":\"mere@famille.fr\",\"child_id\":\"$CHILD_ID\",\"pin\":\"1234\"}" | jq -r '.access_token')

echo $CHILD_TOKEN
```

### 6.4 Parler à l'agent tuteur scolaire

```bash
curl -X POST http://localhost:8000/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHILD_TOKEN" \
  -d '{"role_id":"kids_tutor","message":"Bonjour, je veux apprendre les dinosaures","voice":true}'
```

### 6.5 Parler à l'agent emploi du temps

```bash
curl -X POST http://localhost:8000/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"role_id":"mother_schedule","message":"Ajoute un rendez-vous chez le médecin pour Léa demain à 14h","voice":false}'
```

### 6.6 Vérifier la stack vocale

```bash
curl http://localhost:8000/health/voice
```

Réponse attendue (si Whisper/Piper installés via `scripts/setup_voice.sh`) :

```json
{
  "stt": { "available": true, "provider": "whisper_local", "model": "base" },
  "tts": { "available": true, "provider": "piper", "voice": "fr_FR-siwis-medium" },
  "local_only": true,
  "cloud": false
}
```

### 6.7 Configurer le mode concentration

```bash
# Définir la durée de concentration par défaut (minutes)
curl -X PUT "http://localhost:8000/children/$CHILD_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"focus_duration_minutes":20}'

# Démarrer une session de concentration
curl -X POST "http://localhost:8000/focus/$CHILD_ID/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"topic":"Mathématiques","agent_role_id":"kids_tutor"}'

# Le backend utilise la durée configurée sur l'enfant (20 min par défaut)
```

---

## 7. Vérifications fonctionnelles — Calendrier

### 7.1 Créer un événement

```bash
curl -X POST http://localhost:8000/events/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Cours de piano","start_at":"2026-10-22 16:00","event_type":"activity","child_id":"'$CHILD_ID'"}'
```

### 7.2 Lister les événements du jour

```bash
curl http://localhost:8000/events/today \
  -H "Authorization: Bearer $TOKEN"
```

### 7.3 Vérifier dans l'app mobile

1. Se connecter en tant que parent.
2. Aller dans l'onglet **📅 Calendrier**.
3. Vérifier que l'événement apparaît dans la vue jour et la vue semaine.
4. Vérifier la couleur associée au type d'événement (activité = vert, devoir = orange, rendez-vous = bleu, rappel = violet).

---

## 8. Vérifications fonctionnelles — Messagerie familiale

### 8.1 Lier un second parent à un enfant

```bash
# Inscrire un second parent
curl -X POST http://localhost:8000/auth/register-parent \
  -H "Content-Type: application/json" \
  -d '{"email":"pere@famille.fr","first_name":"Pierre","last_name":"Dupont","password":"secret"}'

TOKEN_B=$(curl -s -X POST http://localhost:8000/auth/login-parent \
  -H "Content-Type: application/json" \
  -d '{"email":"pere@famille.fr","password":"secret"}' | jq -r '.access_token')

# Lier le second parent à l'enfant
curl -X POST "http://localhost:8000/children/$CHILD_ID/link-parent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"parent_email":"pere@famille.fr"}'
```

### 8.2 Envoyer un message via l'agent messager

```bash
curl -X POST http://localhost:8000/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"role_id":"family_messenger","message":"Dis à Pierre que je ramène Léa à 18h","voice":false}'
```

### 8.3 Vérifier les fils de discussion

```bash
# En tant que parent B
curl http://localhost:8000/family-messages/threads \
  -H "Authorization: Bearer $TOKEN_B"
```

### 8.4 Vérifier dans l'app mobile

1. Se connecter avec les deux parents sur deux appareils/émulateurs.
2. Aller dans l'onglet **✉️ Messages**.
3. Envoyer un message depuis un parent.
4. Vérifier que l'autre parent reçoit le message dans le fil associé à l'enfant.

---

## 9. Vérifications fonctionnelles — Notifications push

> Les notifications push nécessitent un vrai appareil et un projet Expo configuré.

1. Installer l'application sur un appareil physique via EAS Build ou Expo Go.
2. Se connecter avec un parent.
3. Vérifier que le backend a bien enregistré le token via `GET /parents/me` (`push_token` doit être présent).
4. Depuis l'autre parent, envoyer un message familial.
5. Vérifier que le destinataire reçoit une notification push avec :
   - Le prénom de l'expéditeur,
   - Le prénom de l'enfant concerné,
   - Un extrait du message.
6. Taper sur la notification : l'application doit s'ouvrir sur l'onglet **Messages** avec le bon fil de discussion.

---

## 10. Vérifications fonctionnelles — Tableau de bord

1. Se connecter en tant que parent.
2. L'onglet **🏠 Accueil** doit s'afficher par défaut.
3. Vérifier que le tableau de bord affiche :
   - La date du jour.
   - Les actions recommandées.
   - Les événements d'aujourd'hui.
   - Les devoirs à venir.
   - Les messages récents (moins de 24h).
   - La liste des enfants.
4. Ajouter un événement, un devoir ou recevoir un message, puis revenir à l'accueil : le dashboard doit refléter les changements.

---

## 11. Vérifications fonctionnelles — Voix

1. Vérifier que la stack vocale est installée :
   ```bash
   cd tutorkids/backend
   ./scripts/setup_voice.sh
   ```
2. Relancer le backend.
3. Appeler `GET /health/voice` et vérifier que STT et TTS sont disponibles.
4. Dans l'app mobile, envoyer un message vocal depuis l'écran enfant ou parent.
5. Vérifier que la réponse de l'agent est lue automatiquement (si `voice: true`).
6. Vérifier que les fichiers audio dans `backend/audio_outputs/` sont nettoyés après 24h (via `app/services/audio_cleanup.py`).

---

## 12. Vérifications fonctionnelles — Mode Concentration

### 12.1 Configurer la durée côté parent

1. Se connecter en tant que parent.
2. Aller dans l'onglet **👶 Enfants**.
3. Modifier un enfant et changer la **durée de concentration** (ex: 15 min).
4. Enregistrer.

### 12.2 Lancer une session côté enfant

1. Se connecter en tant qu'enfant avec le PIN.
2. Basculer sur l'onglet **🎯 Concentration**.
3. Choisir une durée ou utiliser la durée par défaut.
4. Appuyer sur le bouton de lancement : le compte à rebours démarre.
5. Discuter avec le tuteur scolaire pendant la session.
6. À la fin, appuyer sur **Terminer la session**.

### 12.3 Vérifier le récapitulatif

```bash
curl http://localhost:8000/focus/summary/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

Vérifier que :

- Le total de minutes apparaît pour l'enfant concerné.
- Le nombre de sessions terminées est incrémenté.
- Une ligne dans le dashboard mobile affiche le temps de concentration de la journée.

---

## 13. Tests de non-régression

### Multi-parent

- Créer un enfant avec le parent A.
- Lier le parent B.
- Vérifier que le parent B peut voir l'enfant, modifier ses informations et le connecter avec son PIN.
- Supprimer l'enfant depuis le parent A : l'enfant doit être supprimé pour tous les parents uniquement si plus aucun parent n'est lié.

### Sécurité

- Un parent ne doit pas pouvoir accéder aux enfants d'un autre parent.
- Un parent ne doit pas pouvoir envoyer un message à un parent non lié par un enfant commun.
- Un token enfant ne doit pas pouvoir appeler les endpoints parents (`/children/`, `/events/`, etc.).

---

## 14. Dépannage courant

### `ModuleNotFoundError` lors des tests

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Erreur SQLite `NOT NULL constraint failed: children.parent_id`

La base de données est dans un état ancien. Réinitialiser :

```bash
cd tutorkids/backend
rm tutorkids_dev.db
source venv/bin/activate
alembic upgrade head
python seed_data.py
```

> Attention : cela supprime toutes les données locales de développement.

### Le mobile ne trouve pas le backend

- Vérifier que le téléphone et le PC sont sur le même réseau Wi-Fi.
- Vérifier que `API_URL` dans `mobile/src/config.js` utilise l'IP locale du PC (pas `localhost`).
- Vérifier que le backend écoute sur `0.0.0.0` (`uvicorn app.main:app --host 0.0.0.0 --port 8000`).

### Ollama ne répond pas

```bash
ollama list
ollama pull gpt-oss:20b-cloud
ollama run gpt-oss:20b-cloud
```

### Les notifications push ne fonctionnent pas

- Normal sur simulateur / `npx expo start`.
- Nécessite un build EAS et un vrai appareil.
- Vérifier que le token Expo est bien enregistré via `GET /parents/me`.

---

## 15. Résumé des commandes essentielles

| Action | Commande |
| --- | --- |
| Installer backend | `pip install -r requirements.txt` |
| Lancer backend | `./run_dev.sh` |
| Lancer tests | `pytest tests/ -v` |
| Migrer base | `alembic upgrade head` |
| Peupler données | `python seed_data.py` |
| Installer mobile | `npm install` |
| Lancer mobile | `npx expo start` |
| Installer voix | `./scripts/setup_voice.sh` |
| Voir Swagger | http://localhost:8000/docs |

---

Document généré pour TutorKids.
