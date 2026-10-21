import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  Button,
  View,
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
}) {
  return (
    <SafeAreaView style={commonStyles.safe}>
      <ScrollView contentContainerStyle={commonStyles.centered}>
        <Text style={commonStyles.title}>TutorKids AI</Text>

        <Text style={commonStyles.sectionTitle}>Parent</Text>
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
        <View style={commonStyles.row}>
          <Button title="Se connecter" onPress={onLoginParent} disabled={loading} />
          <Button title="S'inscrire" onPress={onRegisterParent} disabled={loading} />
        </View>

        <Text style={[commonStyles.sectionTitle, { marginTop: 30 }]}>Enfant</Text>
        <Text style={commonStyles.hint}>Demande à tes parents ton code PIN.</Text>
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
        <Button title="Se connecter enfant" onPress={onLoginChild} disabled={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}
