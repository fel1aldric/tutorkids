import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function HeaderChild({ title, onLogout }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Button title="Déconnexion" onPress={onLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 1
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});
