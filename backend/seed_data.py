"""
Seed initial school levels and curriculum data.
Run with: source venv/bin/activate && python seed_data.py
"""

from app.database import SessionLocal, engine, Base
from app.models.school_level import SchoolLevel
from app.models.curriculum import CurriculumItem

# Ensure tables exist for quick dev seeding.
Base.metadata.create_all(bind=engine)

LEVELS = [
    {
        "code": "jardin_d_enfants",
        "label": "Jardin d'enfants",
        "typical_age_min": 3,
        "typical_age_max": 5,
        "description": "Premier cycle de l'école maternelle : découverte, langage oral, socialisation.",
    },
    {
        "code": "maternelle_grande",
        "label": "Grande section (GS)",
        "typical_age_min": 5,
        "typical_age_max": 6,
        "description": "Dernière année de maternelle : préparation à l'apprentissage de la lecture.",
    },
    {
        "code": "cp",
        "label": "CP",
        "typical_age_min": 6,
        "typical_age_max": 7,
        "description": "Première année du cycle 2 : apprendre à lire, écrire et compter.",
    },
    {
        "code": "ce1",
        "label": "CE1",
        "typical_age_min": 7,
        "typical_age_max": 8,
        "description": "Consolidation de la lecture et des premières compétences en maths.",
    },
    {
        "code": "ce2",
        "label": "CE2",
        "typical_age_min": 8,
        "typical_age_max": 9,
        "description": "Entrée dans le cycle 3 : lecture fluide, raisonnement mathématique.",
    },
    {
        "code": "cm1",
        "label": "CM1",
        "typical_age_min": 9,
        "typical_age_max": 10,
        "description": "Approfondissement des techniques scolaires et méthode de travail.",
    },
    {
        "code": "cm2",
        "label": "CM2",
        "typical_age_min": 10,
        "typical_age_max": 11,
        "description": "Dernière année du primaire : autonomie et préparation au collège.",
    },
    {
        "code": "sixieme",
        "label": "6ème",
        "typical_age_min": 11,
        "typical_age_max": 12,
        "description": "Adaptation au collège et consolidation des savoirs fondamentaux.",
    },
]

CURRICULUM_SNIPPETS = [
    ("jardin_d_enfants", "langage", "Comprendre une consigne simple", "Écouter et exécuter une consigne en 1 ou 2 étapes."),
    ("jardin_d_enfants", "langage", "S'exprimer à l'oral", "Décrire une image, raconter un souvenir en quelques phrases."),
    ("jardin_d_enfants", "maths", "Compter jusqu'à 10", "Dire la suite des nombres de 1 à 10 dans l'ordre."),
    ("jardin_d_enfants", "maths", "Reconnaître les formes simples", "Nommer un cercle, un carré, un triangle."),
    ("jardin_d_enfants", "decouverte", "Distinguer les couleurs principales", "Nommer le rouge, le bleu, le jaune, le vert."),
    ("cp", "francais", "Lire des mots simples", "Déchiffrer des mots en letters-sons."),
    ("cp", "francais", "Écrire en lettres cursives", "Reproduire des lettres et des mots courts."),
    ("cp", "maths", "Compter jusqu'à 100", "Connaître la suite numérique et la décomposition dizaines-unités."),
    ("cp", "maths", "Résoudre des problèmes additifs", "Additionner et soustraire jusqu'à 20."),
    ("ce1", "francais", "Lire avec fluidité", "Lire un texte court à voix haute sans s'arrêter."),
    ("ce1", "maths", "Maîtriser les tables d'addition", "Additionner rapidement jusqu'à 100."),
    ("ce1", "maths", "Introduction à la multiplication", "Comprendre la multiplication comme répétition d'additions."),
    ("ce2", "francais", "Comprendre un texte narratif", "Retrouver les personnages, le lieu et les événements."),
    ("ce2", "maths", "Maîtriser les tables de multiplication", "Multiplier de tête jusqu'à 10 x 10."),
    ("ce2", "maths", "Poser une multiplication", "Multiplier un nombre à 2 chiffres par un nombre à 1 chiffre."),
    ("cm1", "francais", "Résumer un texte", "Écrire quelques phrases pour résumer une histoire."),
    ("cm1", "maths", "Les fractions simples", "Représenter et comparer des fractions comme 1/2, 1/4, 3/4."),
    ("cm1", "sciences", "Le cycle de l'eau", "Expliquer les états et le cycle de l'eau."),
    ("cm2", "francais", "Analyser un texte", "Identifier le registre, les personnages et les sentiments."),
    ("cm2", "maths", "Division avec reste", "Effectuer une division posée avec un reste."),
    ("cm2", "histoire", "La Révolution française", "Comprendre les causes et les grandes dates."),
]


def seed():
    db = SessionLocal()
    try:
        existing = {sl.code for sl in db.query(SchoolLevel).all()}
        for level in LEVELS:
            if level["code"] not in existing:
                db.add(SchoolLevel(**level))
        db.commit()

        for code, subject, skill, description in CURRICULUM_SNIPPETS:
            item = db.query(CurriculumItem).filter(
                CurriculumItem.school_level_code == code,
                CurriculumItem.subject == subject,
                CurriculumItem.skill == skill,
            ).first()
            if not item:
                db.add(CurriculumItem(
                    school_level_code=code,
                    subject=subject,
                    skill=skill,
                    description=description,
                ))
        db.commit()
        print("Seeding completed.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
