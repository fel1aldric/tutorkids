import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Header from '../components/Header';
import TabBar from '../components/TabBar';
import { commonStyles } from '../styles/commonStyles';
import { EVENT_TYPE_LABELS } from '../constants';
import { formatDashDate, formatDashTime } from '../utils/dates';

export default function DashboardScreen({
  user,
  dashboard,
  onFetchDashboard,
  onLogout,
  onChangeTab,
  onOpenMessages,
}) {
  useEffect(() => {
    if (!dashboard) onFetchDashboard();
  }, [dashboard, onFetchDashboard]);

  return (
    <View style={commonStyles.container}>
      <Header title="Tableau de bord" onLogout={onLogout} />
      <TabBar activeTab="home" onTabPress={onChangeTab} />

      <ScrollView style={styles.dashboardBody}>
        {!dashboard ? (
          <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.dashboardDate}>{formatDashDate(dashboard.date)}</Text>

            {dashboard.recommended_actions.length > 0 && (
              <View style={styles.dashboardSection}>
                <Text style={styles.dashboardSectionTitle}>🔔 Actions recommandées</Text>
                {dashboard.recommended_actions.map((action, idx) => (
                  <View key={idx} style={styles.dashboardAction}>
                    <Text style={styles.dashboardActionText}>• {action}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.dashboardSection}>
              <Text style={styles.dashboardSectionTitle}>📅 Aujourd'hui</Text>
              {dashboard.today_events.length === 0 ? (
                <Text style={commonStyles.empty}>Aucun événement aujourd'hui.</Text>
              ) : (
                dashboard.today_events.map((evt) => (
                  <View key={evt.id} style={styles.dashboardEvent}>
                    <Text style={styles.dashboardEventTime}>{formatDashTime(evt.start_at)}</Text>
                    <View style={styles.dashboardEventBody}>
                      <Text style={styles.dashboardEventTitle}>{evt.title}</Text>
                      <Text style={styles.dashboardEventMeta}>
                        {EVENT_TYPE_LABELS[evt.event_type]}
                        {evt.child_name ? ` • ${evt.child_name}` : ''}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {dashboard.upcoming_homework.length > 0 && (
              <View style={styles.dashboardSection}>
                <Text style={styles.dashboardSectionTitle}>📝 Devoirs à venir</Text>
                {dashboard.upcoming_homework.map((hw) => (
                  <View key={hw.id} style={styles.dashboardEvent}>
                    <Text style={styles.dashboardEventTime}>{formatDashDate(hw.start_at)}</Text>
                    <View style={styles.dashboardEventBody}>
                      <Text style={styles.dashboardEventTitle}>{hw.title}</Text>
                      {hw.child_name && <Text style={styles.dashboardEventMeta}>{hw.child_name}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {dashboard.recent_messages.length > 0 && (
              <View style={styles.dashboardSection}>
                <Text style={styles.dashboardSectionTitle}>✉️ Messages récents</Text>
                {dashboard.recent_messages.map((msg) => (
                  <TouchableOpacity
                    key={msg.id}
                    style={styles.dashboardMessage}
                    onPress={() => onOpenMessages(msg.child_id)}
                  >
                    <Text style={styles.dashboardMessageSender}>{msg.sender_name}</Text>
                    <Text style={styles.dashboardMessageContent} numberOfLines={2}>
                      {msg.content}
                    </Text>
                    {msg.child_name && (
                      <Text style={styles.dashboardMessageMeta}>Concernant {msg.child_name}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.dashboardSection}>
              <Text style={styles.dashboardSectionTitle}>👶 Enfants</Text>
              <View style={styles.dashboardChildrenRow}>
                {dashboard.children.length === 0 ? (
                  <Text style={commonStyles.empty}>Aucun enfant enregistré.</Text>
                ) : (
                  dashboard.children.map((c) => (
                    <View key={c.id} style={styles.dashboardChildChip}>
                      <Text style={styles.dashboardChildChipText}>{c.first_name}</Text>
                      <Text style={styles.dashboardChildChipLevel}>{c.school_level_code}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardBody: {
    flex: 1,
  },
  dashboardDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginVertical: 12,
    textAlign: 'center',
  },
  dashboardSection: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dashboardSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  dashboardAction: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#fb8c00',
  },
  dashboardActionText: {
    color: '#333',
  },
  dashboardEvent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
  },
  dashboardEventTime: {
    fontWeight: 'bold',
    color: '#2e7d32',
    minWidth: 50,
    marginRight: 10,
  },
  dashboardEventBody: {
    flex: 1,
  },
  dashboardEventTitle: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  dashboardEventMeta: {
    color: '#777',
    fontSize: 12,
    marginTop: 2,
  },
  dashboardMessage: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#1565c0',
  },
  dashboardMessageSender: {
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 2,
  },
  dashboardMessageContent: {
    color: '#333',
  },
  dashboardMessageMeta: {
    color: '#777',
    fontSize: 11,
    marginTop: 4,
  },
  dashboardChildrenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dashboardChildChip: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dashboardChildChipText: {
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  dashboardChildChipLevel: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
  },
});
