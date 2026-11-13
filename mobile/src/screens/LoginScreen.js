
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  Button,
  View,
  TouchableOpacity,
} from 'react-native';

import { commonStyles } from '../styles/commonStyles';

export default function LoginScreen({
  email,
  setEmail,
  password,
  setPassword,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  childId,
  setChildId,
  childPin,
  setChildPin,
  loading,
  onLoginParent,
  onRegisterParent,
  onLoginChild,
  whatsappNumber,
  setWhatsappNumber,
}) {
  const [activeTab, setActiveTab] = useState('parent');

  return (
    <SafeAreaView style={commonStyles.safe}>
      <ScrollView
        contentContainerStyle={commonStyles.centered}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={commonStyles.title}>TutorKids AI</Text>

        {/* ONGLET PARENT / ENFANT */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: '#E5E7EB',
          borderRadius: 12,
          padding: 4,
          marginBottom: 25,
          width: '100%',
        }}>
          <TouchableOpacity
            onPress={() => setActiveTab('parent')}
            style={{
              flex: 1,
              padding: 14,
              alignItems: 'center',
              borderRadius: 10,
              backgroundColor:
                activeTab === 'parent' ? '#4F46E5' : 'transparent',
            }}
          >
            <Text style={{
              color: activeTab === 'parent' ? '#FFFFFF' : '#374151',
              fontWeight: 'bold',
            }}>
              Parent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('child')}
            style={{
              flex: 1,
              padding: 14,
              alignItems: 'center',
              borderRadius: 10,
              backgroundColor:
                activeTab === 'child' ? '#4F46E5' : 'transparent',
            }}
          >
            <Text style={{
              color: activeTab === 'child' ? '#FFFFFF' : '#374151',
              fontWeight: 'bold',
            }}>
              Enfant
            </Text>
          </TouchableOpacity>
        </View>

        {/* ESPACE PARENT */}
        {activeTab === 'parent' && (
          <View style={{ width: '100%' }}>
            <Text style={commonStyles.sectionTitle}>
              Espace Parent
            </Text>

            <TextInput
              style={commonStyles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={commonStyles.input}
              placeholder="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TextInput
              style={commonStyles.input}
              placeholder="Prénom"
              value={firstName}
              onChangeText={setFirstName}
            />

            <TextInput
              style={commonStyles.input}
              placeholder="Nom"
              value={lastName}
              onChangeText={setLastName}
            />

            <TextInput
              style={commonStyles.input}
              placeholder="Whatsapp"
              value={whatsappNumber}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              onChangeText={setWhatsappNumber}
            />

            <View style={commonStyles.row}>
              <Button
                title="Se connecter"
                onPress={onLoginParent}
                disabled={loading}
              />

              <Button
                title="S'inscrire"
                onPress={onRegisterParent}
                disabled={loading}
              />
            </View>
          </View>
        )}

        {/* ESPACE ENFANT */}
        {activeTab === 'child' && (
          <View style={{ width: '100%' }}>
            <Text style={commonStyles.sectionTitle}>
              Espace Enfant
            </Text>

            <Text style={commonStyles.hint}>
              Demande à tes parents ton code PIN.
            </Text>

            <TextInput
              style={commonStyles.input}
              placeholder="Email d'un parent"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={commonStyles.input}
              placeholder="Ton identifiant (ID)"
              value={childId}
              onChangeText={setChildId}
            />

            <TextInput
              style={commonStyles.input}
              placeholder="Ton code PIN"
              value={childPin}
              onChangeText={setChildPin}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
            />

            <Button
              title="Se connecter enfant"
              onPress={onLoginChild}
              disabled={loading}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
