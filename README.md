# TutorKids AI

Agents IA configurables pour accompagner la famille :
- **Assistant emploi du temps** pour la mère.
- **Tuteur scolaire** pour les enfants, qui évolue avec leur niveau scolaire.

Les agents sont définis dans des fichiers YAML, pas dans le code. On peut donc en ajouter, les modifier, ou changer leur persona sans redéployer le backend.

## Stack

| Couche | Technologie |
| --- | --- |
| Backend | FastAPI (Python 3.12+ / 3.14 OK avec les versions actuelles) |
| LLM framework | LangChain |
| LLM local | Ollama (`gpt-oss:20b` ou `gpt-oss:20b-cloud`) |
| Base de données | MySQL (production) / SQLite (développement) |
| ORM / migrations | SQLAlchemy + Alembic |
| Mobile | React Native Expo |
| Voix | Whisper STT + Piper TTS (gratuits, locaux), fallback `pyttsx3` |

## Prérequis

- Python **3.12 ou plus récent**.
- [Ollama](https://ollama.com) installé et lancé avec un modèle compatible.
- Docker + Docker Compose (optionnel, pour MySQL en production).

## Démarrage rapide (mode développement SQLite)

```bash
cd tutorkids/backend
./run_dev.sh
```

Le serveur démarre sur http://localhost:8000.
La documentation Swagger est sur http://localhost:8000/docs.

## Vérifier le modèle Ollama

```bash
ollama list
```

Le backend utilise par défaut `gpt-oss:20b-cloud`. Si votre modèle s'appelle différemment, modifiez-le dans `.env` ou en ligne de commande :

```bash
OLLAMA_MODEL=gpt-oss:20b ./run_dev.sh
```

## Architecture des agents

Les rôles d’agent sont définis dans `backend/app/agents/roles/` :

- `mother_schedule.yaml` : agent pour l’emploi du temps de la mère.
- `kids_tutor.yaml` : agent tuteur pour les enfants.

Le moteur (`backend/app/agents/engine/agent_runner.py`) lit ces fichiers au démarrage et adapte le prompt système selon le profil de l’enfant :
- prénom,
- âge calculé à partir de la date de naissance,
- niveau scolaire,
- intérêts,
- style d’apprentissage.

## Voix : STT et TTS (tout gratuit, local)

Le backend n'utilise **aucune API payante**. Tout ce qui n'est pas exécuté localement renvoie un message d'aide.

### Reconnaissance vocale (STT)

- **Whisper local** (`openai-whisper`) si installé.
- Sinon, message indiquant comment installer Whisper gratuitement.

```bash
source venv/bin/activate
pip install openai-whisper
```

### Synthèse vocale (TTS)

Ordre de priorité :
1. **Piper local** si le modèle est téléchargé dans `backend/voices/`.
2. **pyttsx3** (espeak) comme fallback gratuit local.
3. Sinon, pas d'audio.

Les fichiers audio générés sont stockés **uniquement en local** dans `backend/audio_outputs/`. Ils sont servis temporairement par le backend (`/audio/<uuid>.wav`) et nettoyés automatiquement après **24h** par défaut. Aucun fichier n'est envoyé vers un service cloud.

Pour configurer la durée de rétention, utilisez la variable d'environnement :

```env
TTS_RETENTION_HOURS=24
```

Mettez `0` pour désactiver le nettoyage automatique (non recommandé en production).

Pour télécharger une voix Piper française gratuite :

```bash
cd backend
./download_voice.sh
source venv/bin/activate
pip install piper-tts
```

## Modèle de données

- `parents` : comptes parents.
- `children` : profils des enfants avec niveau scolaire évolutif.
- `school_levels` : niveaux scolaires (jardin d’enfants, maternelle, CP, CE1…).
- `curriculum_items` : compétences / objectifs par niveau et matière.
- `conversations` : historique des échanges avec les agents.

## Endpoints principaux

| Méthode | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | Non | Vérifier que le backend est up |
| POST | `/auth/register-parent` | Non | Inscrire un parent |
| POST | `/auth/login-parent` | Non | Connecter un parent (retourne JWT) |
| POST | `/auth/login-child` | Non | Connecter un enfant avec son UUID (déprécié) |
| POST | `/auth/login-child-pin` | Non | Connecter un enfant avec email parent + ID + PIN |
| GET | `/agents/roles` | Non | Lister les rôles disponibles |
| POST | `/agents/chat` | Oui | Envoyer un message texte à un agent |
| POST | `/agents/chat-voice` | Oui | Envoyer un fichier audio, recevoir texte + audio |
| GET | `/parents/me` | Parent | Profil du parent connecté |
| GET | `/parents/` | Parent | Lister les parents |
| POST | `/children/` | Parent | Créer un enfant (assigné au parent connecté) |
| GET | `/children/` | Parent | Lister ses enfants |
| GET | `/children/{id}` | Parent | Voir un de ses enfants |
| PUT | `/children/{id}` | Parent | Modifier un de ses enfants |
| DELETE | `/children/{id}` | Parent | Supprimer un de ses enfants |
| POST | `/events/` | Parent | Créer un événement / devoir / activité |
| GET | `/events/` | Parent | Lister les événements (filtres optionnels) |
| GET | `/events/today` | Parent | Événements du jour |
| GET | `/events/{id}` | Parent | Voir un événement |
| PUT | `/events/{id}` | Parent | Modifier un événement |
| DELETE | `/events/{id}` | Parent | Supprimer un événement |

## Exemple : parler à l’agent tuteur

Inscrire un parent :

```bash
curl -X POST http://localhost:8000/auth/register-parent \
  -H "Content-Type: application/json" \
  -d '{"email":"mere@famille.fr","first_name":"Marie","last_name":"Dupont","password":"secret"}'
```

Connecter le parent :

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login-parent \
  -H "Content-Type: application/json" \
  -d '{"email":"mere@famille.fr","password":"secret"}' | jq -r '.access_token')
```

Créer un enfant :

```bash
CHILD=$(curl -s -X POST http://localhost:8000/children/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"first_name":"Léa","birth_date":"2019-03-15","school_level_code":"jardin_d_enfants","interests":"dinosaures, dessin"}')
echo "$CHILD"
```

Définir un PIN pour l'enfant (depuis le parent) :

```bash
CHILD_ID=$(echo "$CHILD" | jq -r '.id')
curl -X PUT "http://localhost:8000/children/$CHILD_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pin":"1234"}'
```

Connecter l'enfant avec son PIN :

```bash
CHILD_TOKEN=$(curl -s -X POST http://localhost:8000/auth/login-child-pin \
  -H "Content-Type: application/json" \
  -d "{\"parent_email\":\"mere@famille.fr\",\"child_id\":\"$CHILD_ID\",\"pin\":\"1234\"}" | jq -r '.access_token')
```

Chat texte en tant qu'enfant :

```bash
curl -X POST http://localhost:8000/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHILD_TOKEN" \
  -d '{"role_id":"kids_tutor","message":"Bonjour, je veux apprendre les dinosaures","voice":true}'
```

Chat vocal en tant qu'enfant :

```bash
curl -X POST http://localhost:8000/agents/chat-voice \
  -H "Authorization: Bearer $CHILD_TOKEN" \
  -F "role_id=kids_tutor" \
  -F "voice=true" \
  -F "audio_file=@recording.wav"
```

## Exemple : ajouter un événement via l'agent mère

En tant que parent, demandez à l'agent emploi du temps de créer un rappel :

```bash
curl -X POST http://localhost:8000/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"role_id":"mother_schedule","message":"Ajoute un rendez-vous chez le médecin pour Léa demain à 14h","voice":false}'
```

L'agent peut aussi récapituler la journée :

```bash
curl -X POST http://localhost:8000/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"role_id":"mother_schedule","message":"Quel est l'emploi du temps de Léa aujourd'hui ?","voice":false}'
```

> L'agent reçoit automatiquement l'emploi du temps du jour et de la semaine, et dispose d'outils pour ajouter des événements.

## Application mobile

L'application React Native Expo se trouve dans `mobile/`. Elle permet :
- **Parent** : connexion, gestion des enfants, calendrier familial, discussion avec l'agent emploi du temps ou le tuteur scolaire.
- **Enfant** : connexion avec email parent + ID + PIN, discussion avec le tuteur scolaire.
- Chat texte + vocal, lecture audio de la réponse de l'agent.

```bash
cd tutorkids/mobile
npm install
npx expo start
```

Pensez à remplacer `192.168.1.XX` par l'IP locale du backend dans `App.js`.

## Production avec MySQL

1. Configurez `.env` avec votre URL MySQL :

```env
DATABASE_URL=mysql+pymysql://tutorkids:tutorkids_password@localhost:3306/tutorkids
```

2. Lancez MySQL avec Docker :

```bash
cd tutorkids
docker compose up -d mysql
```

3. Appliquez les migrations et démarrez le backend :

```bash
cd backend
alembic upgrade head
python seed_data.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Prochaines étapes

1. ✅ Gestion de l’emploi du temps : events, reminders, calendrier pour la mère.
2. ✅ Sécurité enfant : login par PIN (email parent + ID + PIN).
3. ✅ Écran calendrier / emploi du temps dans l'application mobile.
4. ✅ Nettoyage automatique local des fichiers audio TTS (24h par défaut, pas de cloud).
5. Installation optimisée de Whisper et Piper en local.
6. Calendrier visuel par jour / semaine dans l'application mobile.
