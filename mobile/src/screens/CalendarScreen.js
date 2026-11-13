import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from '../components/Header';
import TabBar from '../components/TabBar';
import { commonStyles } from '../styles/commonStyles';
import { EVENT_TYPES, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '../constants';
import { getWeekDays, sameDay, shortDayName, dayMonth, formatTime, pad2, parseApiDate } from '../utils/dates';

// "YYYY-MM-DD HH:MM" -> Date (local)
const parseLocal = (str) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/.exec(str || '');
  if (!m) return new Date();
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 9), +(m[5] || 0));
};
const fmtDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

export default function CalendarScreen({
  user,
  events,
  calendarView,
  setCalendarView,
  selectedCalendarDate,
  setSelectedCalendarDate,
  newEvent,
  setNewEvent,
  children,
  onFetchEvents,
  onCreateEvent,
  onDeleteEvent,
  onLogout,
  onChangeTab,
}) {
  const weekDays = getWeekDays(selectedCalendarDate);

  // picker = { field: 'start_at' | 'end_at', mode: 'date' | 'time' } | null
  const [picker, setPicker] = useState(null);

  const eventsForDay = (date) =>
    events
      .filter((e) => {
        const d = parseApiDate(e.start_at);
        return d && sameDay(d, date);
      })
      .sort((a, b) => a.start_at.localeCompare(b.start_at));

  const shiftWeek = (delta) => {
    const d = new Date(selectedCalendarDate);
    d.setDate(d.getDate() + delta * 7);
    setSelectedCalendarDate(d);
  };

  const shiftDay = (delta) => {
    const d = new Date(selectedCalendarDate);
    d.setDate(d.getDate() + delta);
    setSelectedCalendarDate(d);
  };

  const renderEventCard = (evt) => {
    const endDate = parseApiDate(evt.end_at);
    const color = EVENT_TYPE_COLORS[evt.event_type];
    const childName = evt.child?.first_name ||
      (evt.child_id && children.find((c) => c.id === evt.child_id)?.first_name) ||
      null;

    return (
      <View key={evt.id} style={[styles.eventCard, { borderLeftColor: color, borderLeftWidth: 5 }]}>
        <View style={styles.eventCardHeader}>
          <View style={[styles.eventTypeBadge, { backgroundColor: color }]}>
            <Text style={styles.eventTypeBadgeText}>{EVENT_TYPE_LABELS[evt.event_type]}</Text>
          </View>
          <Text style={styles.eventTime}>{formatTime(evt.start_at)}</Text>
        </View>
        <Text style={styles.eventTitle}>{evt.title}</Text>
        {evt.description ? <Text style={styles.eventDesc}>{evt.description}</Text> : null}
        <View style={styles.eventFooter}>
          {childName ? <Text style={styles.eventMeta}>👤 {childName}</Text> : null}
          {endDate ? <Text style={styles.eventMeta}>→ fin {dayMonth(endDate)} {formatTime(evt.end_at)}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => onDeleteEvent(evt.id)} style={styles.eventDelete}>
          <Text style={styles.eventDeleteText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const onPickerChange = (event, selected) => {
    // Android : fermer le dialog dans tous les cas
    if (Platform.OS === 'android') {
      const current = picker;
      setPicker(null);
      if (event.type !== 'set' || !selected || !current) return;
      applyPicked(current, selected);
      return;
    }
    // iOS : mise à jour en continu, fermeture via bouton OK
    if (selected && picker) applyPicked(picker, selected);
  };

  const applyPicked = ({ field, mode }, selected) => {
    const value = newEvent[field] || '';
    const [curDate, curTime] = value.split(' ');
    const date = mode === 'date' ? fmtDate(selected) : curDate || fmtDate(new Date());
    const time = mode === 'time' ? fmtTime(selected) : curTime || '09:00';
    setNewEvent({ ...newEvent, [field]: `${date} ${time}` });
  };

  const renderPickerButtons = (field, dateLabel, timeLabel) => {
    const [d, t] = (newEvent[field] || '').split(' ');
    return (
      <View style={commonStyles.row}>
        <TouchableOpacity
          style={[commonStyles.input, commonStyles.inputHalf, pickerStyles.field]}
          onPress={() => setPicker({ field, mode: 'date' })}
        >
          <Text style={d ? pickerStyles.value : pickerStyles.placeholder}>
            {d || dateLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[commonStyles.input, commonStyles.inputHalf, pickerStyles.field]}
          onPress={() => setPicker({ field, mode: 'time' })}
        >
          <Text style={t ? pickerStyles.value : pickerStyles.placeholder}>
            {t || timeLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={commonStyles.container}>
      <Header title="Calendrier familial" onLogout={onLogout} />
      <TabBar activeTab="calendar" onTabPress={onChangeTab} />

      <View style={styles.calendarToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, calendarView === 'day' && styles.toggleBtnActive]}
          onPress={() => setCalendarView('day')}
        >
          <Text style={calendarView === 'day' ? styles.toggleTextActive : styles.toggleText}>Jour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, calendarView === 'week' && styles.toggleBtnActive]}
          onPress={() => setCalendarView('week')}
        >
          <Text style={calendarView === 'week' ? styles.toggleTextActive : styles.toggleText}>Semaine</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calendarNav}>
        <Button title="◀" onPress={() => calendarView === 'day' ? shiftDay(-1) : shiftWeek(-1)} />
        <Text style={styles.calendarNavText}>
          {calendarView === 'day'
            ? `${shortDayName(selectedCalendarDate)} ${dayMonth(selectedCalendarDate)}`
            : `Semaine du ${dayMonth(weekDays[0])} au ${dayMonth(weekDays[6])}`}
        </Text>
        <Button title="▶" onPress={() => calendarView === 'day' ? shiftDay(1) : shiftWeek(1)} />
      </View>

      {calendarView === 'week' && (
        <View style={styles.weekStrip}>
          {weekDays.map((d) => {
            const isSelected = sameDay(d, selectedCalendarDate);
            return (
              <TouchableOpacity
                key={d.toISOString()}
                style={[styles.weekDayBox, isSelected && styles.weekDayBoxActive]}
                onPress={() => setSelectedCalendarDate(d)}
              >
                <Text style={styles.weekDayName}>{shortDayName(d)}</Text>
                <Text style={[styles.weekDayNum, isSelected && styles.weekDayNumActive]}>
                  {pad2(d.getDate())}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView style={styles.calendarBody}>
        {calendarView === 'day' ? (
          <View>
            {eventsForDay(selectedCalendarDate).length === 0 && (
              <Text style={commonStyles.empty}>Aucun événement ce jour.</Text>
            )}
            {eventsForDay(selectedCalendarDate).map((evt) => renderEventCard(evt))}
          </View>
        ) : (
          <View style={styles.weekColumns}>
            {weekDays.map((d) => {
              const dayEvents = eventsForDay(d);
              const isSelected = sameDay(d, selectedCalendarDate);
              return (
                <TouchableOpacity
                  key={d.toISOString()}
                  style={[
                    styles.weekColumn,
                    isSelected && styles.weekColumnActive,
                    dayEvents.length === 0 && styles.weekColumnEmpty,
                  ]}
                  onPress={() => setSelectedCalendarDate(d)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.weekColumnDay}>{shortDayName(d)} {dayMonth(d)}</Text>
                  {dayEvents.length === 0 ? (
                    <Text style={styles.weekColumnEmptyText}>-</Text>
                  ) : (
                    dayEvents.slice(0, 3).map((evt) => (
                      <View
                        key={evt.id}
                        style={[
                          styles.weekEventDot,
                          { backgroundColor: EVENT_TYPE_COLORS[evt.event_type] },
                        ]}
                      >
                        <Text style={styles.weekEventText} numberOfLines={1}>
                          {formatTime(evt.start_at)} {evt.title}
                        </Text>
                      </View>
                    ))
                  )}
                  {dayEvents.length > 3 && (
                    <Text style={styles.weekMore}>+{dayEvents.length - 3}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.eventForm}>
          <Text style={commonStyles.sectionTitle}>Nouvel événement</Text>
          <TextInput
            style={commonStyles.input}
            placeholder="Titre *"
            value={newEvent.title}
            onChangeText={(t) => setNewEvent({ ...newEvent, title: t })}
          />

          {renderPickerButtons('start_at', 'Date de début', 'Heure de début')}
          {renderPickerButtons('end_at', 'Date de fin', 'Heure de fin')}

          {picker && (
            <View>
              <DateTimePicker
                value={parseLocal(newEvent[picker.field])}
                mode={picker.mode}
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onPickerChange}
              />
              {Platform.OS === 'ios' && <Button title="OK" onPress={() => setPicker(null)} />}
            </View>
          )}

          <View style={styles.pickerRow}>
            {EVENT_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeChip,
                  newEvent.event_type === t && {
                    backgroundColor: EVENT_TYPE_COLORS[t],
                    borderColor: EVENT_TYPE_COLORS[t],
                  },
                ]}
                onPress={() => setNewEvent({ ...newEvent, event_type: t })}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    newEvent.event_type === t && { color: '#fff', fontWeight: 'bold' },
                  ]}
                >
                  {EVENT_TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {children.length > 0 && (
            <View style={styles.pickerRow}>
              <Text style={commonStyles.label}>Pour :</Text>
              <TouchableOpacity
                style={[styles.childChip, !newEvent.child_id && styles.childChipActive]}
                onPress={() => setNewEvent({ ...newEvent, child_id: '' })}
              >
                <Text style={!newEvent.child_id ? styles.childChipTextActive : styles.childChipText}>
                  Toute la famille
                </Text>
              </TouchableOpacity>
              {children.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.childChip,
                    newEvent.child_id === c.id && styles.childChipActive,
                  ]}
                  onPress={() => setNewEvent({ ...newEvent, child_id: c.id })}
                >
                  <Text
                    style={
                      newEvent.child_id === c.id
                        ? styles.childChipTextActive
                        : styles.childChipText
                    }
                  >
                    {c.first_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TextInput
            style={commonStyles.input}
            placeholder="Description"
            value={newEvent.description}
            onChangeText={(t) => setNewEvent({ ...newEvent, description: t })}
          />
          <TextInput
            style={commonStyles.input}
            placeholder="Récurrence (daily, weekly, monthly)"
            value={newEvent.recurrence}
            onChangeText={(t) => setNewEvent({ ...newEvent, recurrence: t })}
          />
          <Button title="Créer l'événement" onPress={onCreateEvent} />
        </View>
      </ScrollView>
    </View>
  );
}

// Nouveaux styles (à garder en plus de ton `styles` existant, que ton extrait n'incluait pas)
const pickerStyles = StyleSheet.create({
  field: { justifyContent: 'center' },
  value: { color: '#000' },
  placeholder: { color: '#999' },
});

const styles = StyleSheet.create({
  calendarToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  toggleBtnActive: {
    backgroundColor: '#2e7d32',
  },
  toggleText: {
    color: '#333',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  calendarNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarNavText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekDayBox: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    minWidth: 40,
  },
  weekDayBoxActive: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#2e7d32',
  },
  weekDayName: {
    fontSize: 11,
    color: '#666',
  },
  weekDayNum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  weekDayNumActive: {
    color: '#2e7d32',
  },
  calendarBody: {
    flex: 1,
  },
  weekColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  weekColumn: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 8,
    minHeight: 120,
  },
  weekColumnActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2e7d32',
  },
  weekColumnEmpty: {
    opacity: 0.7,
  },
  weekColumnDay: {
    fontWeight: 'bold',
    marginBottom: 6,
    fontSize: 12,
  },
  weekColumnEmptyText: {
    color: '#bbb',
    textAlign: 'center',
    marginTop: 30,
  },
  weekEventDot: {
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 5,
    marginVertical: 2,
  },
  weekEventText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  weekMore: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventTypeBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  eventTypeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDesc: {
    color: '#555',
    marginBottom: 4,
  },
  eventFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  eventMeta: {
    color: '#777',
    fontSize: 12,
  },
  eventDelete: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  eventDeleteText: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  eventForm: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  typeChipText: {
    fontSize: 12,
    color: '#333',
  },
  childChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  childChipActive: {
    backgroundColor: '#1565c0',
  },
  childChipText: {
    fontSize: 12,
    color: '#333',
  },
  childChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
