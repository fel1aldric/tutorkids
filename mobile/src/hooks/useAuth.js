import { useState } from 'react';
import { setApiToken } from '../utils/api';
import { api } from '../utils/api';
import { DEFAULT_PARENT_ROLE, DEFAULT_CHILD_ROLE } from '../constants';

export const useAuth = () => {
  const [screen, setScreen] = useState('login');
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [childId, setChildId] = useState('');
  const [childPin, setChildPin] = useState('');

  const setSession = (data, type) => {
    setToken(data.access_token);
    setApiToken(data.access_token);
    setUser(data.user);
    setUserType(type);
  };

  const clearSession = () => {
    setToken(null);
    setApiToken(null);
    setUser(null);
    setUserType(null);
    setScreen('login');
  };

  const loginParent = async () => {
    setLoading(true);
    const data = await api('/auth/login-parent', {
      method: 'POST',
      body: { email, password },
    });
    if (data.access_token) {
      setSession(data, 'parent');
      setScreen('parent');
    } else {
      alert('Échec de connexion parent');
    }
    setLoading(false);
    return data;
  };

  const registerParent = async () => {
    setLoading(true);
    await api('/auth/register-parent', {
      method: 'POST',
      body: {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      },
    });
    alert('Inscription réussie ! Connectez-vous.');
    setLoading(false);
  };

  const loginChild = async () => {
    setLoading(true);
    const data = await api('/auth/login-child-pin', {
      method: 'POST',
      body: {
        parent_email: email,
        child_id: childId,
        pin: childPin,
      },
    });
    if (data.access_token) {
      setSession(data, 'child');
      setScreen('child');
    } else {
      alert("Échec de connexion enfant (vérifie l'email parent, l'ID et le PIN)");
    }
    setLoading(false);
    return data;
  };

  const logout = () => {
    clearSession();
  };

  const defaultRole = userType === 'parent' ? DEFAULT_PARENT_ROLE : DEFAULT_CHILD_ROLE;

  return {
    screen,
    setScreen,
    token,
    user,
    userType,
    loading,
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
    loginParent,
    registerParent,
    loginChild,
    logout,
    defaultRole,
  };
};
