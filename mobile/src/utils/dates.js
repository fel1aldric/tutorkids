export const pad2 = (n) => String(n).padStart(2, '0');

export const parseApiDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const getWeekDays = (anchor) => {
  const d = new Date(anchor);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    days.push(date);
  }
  return days;
};

export const shortDayName = (date) =>
  ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()];

export const dayMonth = (date) => `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;

export const formatTime = (str) => {
  if (!str) return '';
  const m = str.match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : '';
};

export const formatDashDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

export const formatDashTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};
