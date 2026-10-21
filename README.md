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
| Mobile | React Native Expo (prochaine étape) |
| Voix | Whisper STT + Piper TTS (à intégrer) |

## Prérequis

- Python **3.12 ou plus récent**.
- [Ollama](https://ollama.com) installé et lancé.
- Docker + Docker Compose (optionnel, pour MySQL en production).

## Démarrage rapide (mode développement SQLite)

### 1. Lancer le backend

```bash
cd tutorkids/backend
./run_dev.sh
```

Ce script :
- crée un venv si besoin,
- installe les dépendances,
- lance les migrations Alembic,
- injecte les niveaux scolaires et le programme scolaire,
- démarre le serveur sur http://localhost:8000.

La documentation Swagger est sur http://localhost:8000/docs.

### 2. Vérifier qu'Ollama a le modèle

Si vous voulez utiliser `gpt-oss:20b`, vérifiez qu'il est disponible :

```bash
ollama list
ollama pull gpt-oss:20b
```

Sur certaines installations Ollama, le modèle cloud porte le nom `gpt-oss:20b-cloud`. Dans ce cas, lancez le backend avec :

```bash
OLLAMA_MODEL=gpt-oss:20b-cloud ./run_dev.sh
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
| POST | `/agents/chat` | Envoyer un message à un agent |
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

Créer un enfant (remplacez `PARENT_ID` par l'id retourné) :

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

Parler à l’agent tuteur (remplacez `CHILD_ID`) :

```bash
curl -X POST http://localhost:8000/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": "kids_tutor",
    "message": "Bonjour, je veux apprendre les dinosaures",
    "child_id": "CHILD_ID"
  }'
```

## Production avec MySQL

1. Configurez `.env` avec votre URL MySQL :

```env
DATABASE_URL=mysql+pymysql://tutorkids:tutorkids_password@localhost:3306/tutorkids
```

2. Lancez MySQL, par exemple avec Docker :

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

1. Intégrer Whisper pour la reconnaissance vocale.
2. Intégrer Piper TTS pour la synthèse vocale.
3. Créer l’application mobile React Native Expo.
4. Ajouter l’authentification JWT pour parents et enfants.
5. Créer un endpoint pour gérer l’emploi du temps (events / reminders).
