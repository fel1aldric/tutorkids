import React from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Header from '../components/Header';
import TabBar from '../components/TabBar';
import { commonStyles } from '../styles/commonStyles';
import { SCHOOL_LEVELS } from '../constants';

export default function ChildrenScreen({
  user,
  children,
  newChild,
  setNewChild,
  editingChild,
  setEditingChild,
  onFetchChildren,
  onCreateChild,
  onUpdateChild,
  onDeleteChild,
  onLogout,
  onChangeTab,
}) {
  React.useEffect(() => {
    onFetchChildren();
  }, []);

  return (
    <View style={commonStyles.container}>
      <Header title="Mes enfants" onLogout={onLogout} />
      <TabBar activeTab="children" onTabPress={onChangeTab} />

      <ScrollView style={styles.formSection}>
        <Text style={commonStyles.sectionTitle}>Ajouter un enfant</Text>
        <TextInput
          style={commonStyles.input}
          placeholder="Prénom *"
          value={newChild.first_name}
          onChangeText={(t) => setNewChild({ ...newChild, first_name: t })}
        />
        <TextInput
          style={commonStyles.input}
          placeholder="Date de naissance (YYYY-MM-DD)"
          value={newChild.birth_date}
          onChangeText={(t) => setNewChild({ ...newChild, birth_date: t })}
        />
        <View style={styles.pickerRow}>
          {SCHOOL_LEVELS.map((lvl) => (
            <TouchableOpacity
              key={lvl.code}
              style={[
                styles.levelChip,
                newChild.school_level_code === lvl.code && styles.levelChipActive,
              ]}
              onPress={() => setNewChild({ ...newChild, school_level_code: lvl.code })}
            >
              <Text style={newChild.school_level_code === lvl.code ? styles.levelTextActive : styles.levelText}>
                {lvl.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={commonStyles.input}
          placeholder="Intérêts"
          value={newChild.interests}
          onChangeText={(t) => setNewChild({ ...newChild, interests: t })}
        />
        <Button title="Ajouter" onPress={onCreateChild} />

        <Text style={[commonStyles.sectionTitle, { marginTop: 24 }]}>Liste des enfants</Text>
        {children.length === 0 && <Text style={commonStyles.empty}>Aucun enfant enregistré.</Text>}
        {children.map((c) => (
          <View key={c.id} style={commonStyles.card}>
            {editingChild?.id === c.id ? (
              <>
                <TextInput
                  style={commonStyles.input}
                  value={editingChild.first_name}
                  onChangeText={(t) => setEditingChild({ ...editingChild, first_name: t })}
                />
                <View style={styles.pickerRow}>
                  {SCHOOL_LEVELS.map((lvl) => (
                    <TouchableOpacity
                      key={lvl.code}
                      style={[
                        styles.levelChip,
                        editingChild.school_level_code === lvl.code && styles.levelChipActive,
                      ]}
                      onPress={() => setEditingChild({ ...editingChild, school_level_code: lvl.code })}
                    >
                      <Text style={editingChild.school_level_code === lvl.code ? styles.levelTextActive : styles.levelText}>
                        {lvl.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={commonStyles.input}
                  value={editingChild.interests || ''}
                  onChangeText={(t) => setEditingChild({ ...editingChild, interests: t })}
                />
                <TextInput
                  style={commonStyles.input}
                  placeholder="Nouveau PIN (4-6 chiffres)"
                  value={editingChild.pin || ''}
                  onChangeText={(t) => setEditingChild({ ...editingChild, pin: t })}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Text style={commonStyles.label}>Durée de concentration (minutes)</Text>
                <TextInput
                  style={commonStyles.input}
                  placeholder="15"
                  value={String(editingChild.focus_duration_minutes || 15)}
                  onChangeText={(t) =>
                    setEditingChild({ ...editingChild, focus_duration_minutes: parseInt(t, 10) || 0 })
                  }
                  keyboardType="number-pad"
                />
                <View style={commonStyles.row}>
                  <Button title="Enregistrer" onPress={onUpdateChild} />
                  <Button title="Annuler" onPress={() => setEditingChild(null)} />
                </View>
              </>
            ) : (
              <>
                <Text style={commonStyles.cardTitle}>{c.first_name}</Text>
                <Text style={commonStyles.cardMeta}>ID : {c.id}</Text>
                <Text style={commonStyles.cardMeta}>Niveau : {c.school_level_code}</Text>
                {c.birth_date && <Text style={commonStyles.cardMeta}>Né(e) le : {c.birth_date}</Text>}
                {c.interests && <Text style={commonStyles.cardMeta}>Intérêts : {c.interests}</Text>}
                {c.pin_hash && <Text style={commonStyles.cardMeta}>🔒 PIN configuré</Text>}
                {!c.pin_hash && <Text style={commonStyles.cardMeta}>⚠️ PIN non configuré</Text>}
                <Text style={commonStyles.cardMeta}>🎯 Concentration : {c.focus_duration_minutes || 15} min</Text>
                <View style={commonStyles.row}>
                  <Button title="Modifier" onPress={() => setEditingChild({ ...c, pin: '' })} />
                  <Button title="Supprimer" color="#d32f2f" onPress={() => onDeleteChild(c.id)} />
                </View>
              </>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  formSection: {
    flex: 1,
    marginTop: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  levelChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  levelChipActive: {
    backgroundColor: '#1565c0',
  },
  levelText: {
    color: '#333',
    fontSize: 12,
  },
  levelTextActive: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
