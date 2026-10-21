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

## 4. Tests automatiques du backend

```bash
cd tutorkids/backend
source venv/bin/activate
pytest tests/ -v
```

Résultat attendu : **tous les tests passent** (actuellement 24 passed).

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
```

---

## 5. Vérifications fonctionnelles — API

### 5.1 Inscription et connexion parent

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

### 5.2 Créer un enfant et définir un PIN

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

### 5.3 Connexion enfant avec PIN

```bash
CHILD_TOKEN=$(curl -s -X POST http://localhost:8000/auth/login-child-pin \
  -H "Content-Type: application/json" \
  -d "{\"parent_email\":\"mere@famille.fr\",\"child_id\":\"$CHILD_ID\",\"pin\":\"1234\"}" | jq -r '.access_token')

echo $CHILD_TOKEN
```

### 5.4 Parler à l'agent tuteur scolaire

```bash
curl -X POST http://localhost:8000/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHILD_TOKEN" \
  -d '{"role_id":"kids_tutor","message":"Bonjour, je veux apprendre les dinosaures","voice":true}'
```

### 5.5 Parler à l'agent emploi du temps

```bash
curl -X POST http://localhost:8000/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"role_id":"mother_schedule","message":"Ajoute un rendez-vous chez le médecin pour Léa demain à 14h","voice":false}'
```

### 5.6 Vérifier la stack vocale

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

---

## 6. Vérifications fonctionnelles — Calendrier

### 6.1 Créer un événement

```bash
curl -X POST http://localhost:8000/events/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Cours de piano","start_at":"2026-10-22 16:00","event_type":"activity","child_id":"'$CHILD_ID'"}'
```

### 6.2 Lister les événements du jour

```bash
curl http://localhost:8000/events/today \
  -H "Authorization: Bearer $TOKEN"
```

### 6.3 Vérifier dans l'app mobile

1. Se connecter en tant que parent.
2. Aller dans l'onglet **📅 Calendrier**.
3. Vérifier que l'événement apparaît dans la vue jour et la vue semaine.
4. Vérifier la couleur associée au type d'événement (activité = vert, devoir = orange, rendez-vous = bleu, rappel = violet).

---

## 7. Vérifications fonctionnelles — Messagerie familiale

### 7.1 Lier un second parent à un enfant

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

### 7.2 Envoyer un message via l'agent messager

```bash
curl -X POST http://localhost:8000/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"role_id":"family_messenger","message":"Dis à Pierre que je ramène Léa à 18h","voice":false}'
```

### 7.3 Vérifier les fils de discussion

```bash
# En tant que parent B
curl http://localhost:8000/family-messages/threads \
  -H "Authorization: Bearer $TOKEN_B"
```

### 7.4 Vérifier dans l'app mobile

1. Se connecter avec les deux parents sur deux appareils/émulateurs.
2. Aller dans l'onglet **✉️ Messages**.
3. Envoyer un message depuis un parent.
4. Vérifier que l'autre parent reçoit le message dans le fil associé à l'enfant.

---

## 8. Vérifications fonctionnelles — Notifications push

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

## 9. Vérifications fonctionnelles — Tableau de bord

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

## 10. Vérifications fonctionnelles — Voix

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

## 11. Tests de non-régression

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

## 12. Dépannage courant

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
python seed_data.py
alembic stamp head
```

> Attention : cela supprime toutes les données locales de développement.

### Le mobile ne trouve pas le backend

- Vérifier que le téléphone et le PC sont sur le même réseau Wi-Fi.
- Vérifier que `API_URL` dans `mobile/App.js` utilise l'IP locale du PC (pas `localhost`).
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

## 13. Résumé des commandes essentielles

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
