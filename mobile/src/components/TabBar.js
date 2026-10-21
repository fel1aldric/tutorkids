import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const TABS = [
  { key: 'home', label: '🏠 Accueil' },
  { key: 'chat', label: '💬 Agents' },
  { key: 'calendar', label: '📅 Calendrier' },
  { key: 'messages', label: '✉️ Messages' },
  { key: 'children', label: '👶 Enfants' },
];

export default function TabBar({ activeTab, onChange, onTabPress }) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => {
            onTabPress?.(tab.key);
            onChange?.(tab.key);
          }}
        >
          <Text style={activeTab === tab.key ? styles.tabTextActive : styles.tabText}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
    marginTop: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#e8f5e9',
  },
  tabText: {
    color: '#555',
  },
  tabTextActive: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
});
