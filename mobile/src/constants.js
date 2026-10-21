export const SCHOOL_LEVELS = [
  { code: 'jardin_d_enfants', label: "Jardin d'enfants" },
  { code: 'maternelle_grande', label: 'Grande section' },
  { code: 'cp', label: 'CP' },
  { code: 'ce1', label: 'CE1' },
  { code: 'ce2', label: 'CE2' },
  { code: 'cm1', label: 'CM1' },
  { code: 'cm2', label: 'CM2' },
  { code: 'sixieme', label: '6ème' },
];

export const EVENT_TYPES = ['activity', 'homework', 'appointment', 'reminder'];

export const EVENT_TYPE_LABELS = {
  activity: 'Activité',
  homework: 'Devoir',
  appointment: 'Rendez-vous',
  reminder: 'Rappel',
};

export const EVENT_TYPE_COLORS = {
  activity: '#43a047',
  homework: '#fb8c00',
  appointment: '#1e88e5',
  reminder: '#8e24aa',
};

export const DEFAULT_PARENT_ROLE = 'mother_schedule';
export const DEFAULT_CHILD_ROLE = 'kids_tutor';
