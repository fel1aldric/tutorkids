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

| Méthode | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Vérifier que le backend est up |
| GET | `/agents/roles` | Lister les rôles disponibles |
| POST | `/agents/chat` | Envoyer un message texte à un agent |
| POST | `/agents/chat-voice` | Envoyer un fichier audio, recevoir texte + audio |
| POST | `/parents/` | Créer un parent |
| GET | `/parents/` | Lister les parents |
| POST | `/children/` | Créer un enfant |
| GET | `/children/` | Lister les enfants |
| PUT | `/children/{id}` | Modifier un enfant (changer de niveau scolaire) |

## Exemple : parler à l’agent tuteur

Créer un parent :

```bash
curl -X POST http://localhost:8000/parents/ \
  -H "Content-Type: application/json" \
  -d '{"email":"mere@famille.fr","first_name":"Marie","last_name":"Dupont","password":"secret"}'
```

Créer un enfant (remplacez `PARENT_ID`) :

```bash
curl -X POST http://localhost:8000/children/ \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Léa",
    "birth_date": "2019-03-15",
    "school_level_code": "jardin_d_enfants",
    "parent_id": "PARENT_ID",
    "interests": "dinosaures, dessin",
    "learning_style": "visuel"
  }'
```

Chat texte (remplacez `CHILD_ID`) :

```bash
curl -X POST http://localhost:8000/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": "kids_tutor",
    "message": "Bonjour, je veux apprendre les dinosaures",
    "child_id": "CHILD_ID",
    "voice": true
  }'
```

Chat vocal (remplacez `CHILD_ID` et `recording.wav`) :

```bash
curl -X POST http://localhost:8000/agents/chat-voice \
  -F "role_id=kids_tutor" \
  -F "child_id=CHILD_ID" \
  -F "voice=true" \
  -F "audio_file=@recording.wav"
```

## Application mobile

L'application React Native Expo se trouve dans `mobile/`. Elle permet :
- de choisir un agent,
- de saisir l'ID d'un enfant,
- d'envoyer des messages texte,
- d'enregistrer un message vocal,
- de lire la réponse audio de l'agent.

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

1. Authentification JWT pour parents et enfants.
2. Gestion de l’emploi du temps : events, reminders, calendrier.
3. Stockage cloud des fichiers audio (S3 / MinIO).
4. Installation optimisée de Whisper et Piper en local.
