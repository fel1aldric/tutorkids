import React, { useEffect, useState } from 'react';
import { AudioModule } from 'expo-audio';
import LoginScreen from './src/screens/LoginScreen';
import ParentScreen from './src/screens/ParentScreen';
import ChildScreen from './src/screens/ChildScreen';
import { useAuth } from './src/hooks/useAuth';
import { useChat } from './src/hooks/useChat';
import { useFocus } from './src/hooks/useFocus';
import { useChildren } from './src/hooks/useChildren';
import { useEvents } from './src/hooks/useEvents';
import { useMessages } from './src/hooks/useMessages';
import { useDashboard } from './src/hooks/useDashboard';
import { useRoles } from './src/hooks/useRoles';
import { registerForPushNotifications, addNotificationListeners } from './src/utils/push';

export default function App() {
  const auth = useAuth();
  const roles = useRoles();
  const children = useChildren();
  const events = useEvents();
  const messages = useMessages();
  const dashboard = useDashboard();
  const [parentTab, setParentTab] = useState('chat');

  const chat = useChat({
    userType: auth.userType,
    selectedChildId: children.selectedChildId,
  });

  const focus = useFocus({
    childId: auth.user?.id,
  });

  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync().catch(() => {});
    registerForPushNotifications();
    roles.fetchRoles();

    const cleanup = addNotificationListeners({
      onFamilyMessage: () => messages.fetchMessageThreads(),
      onNotificationOpen: (data) => {
        auth.setScreen('parent');
        setParentTab('messages');
        if (data.child_id) {
          messages.setSelectedMessageChildId(data.child_id);
        }
      },
    });

    return cleanup;
  }, []);

  if (auth.screen === 'login') {
    return (
      <LoginScreen
        email={auth.email}
        setEmail={auth.setEmail}
        password={auth.password}
        setPassword={auth.setPassword}
        firstName={auth.firstName}
        setFirstName={auth.setFirstName}
        lastName={auth.lastName}
        setLastName={auth.setLastName}
        childId={auth.childId}
        setChildId={auth.setChildId}
        childPin={auth.childPin}
        setChildPin={auth.setChildPin}
        loading={auth.loading}
        onLoginParent={auth.loginParent}
        onRegisterParent={auth.registerParent}
        onLoginChild={auth.loginChild}
      />
    );
  }

  if (auth.screen === 'parent') {
    return (
      <ParentScreen
        user={auth.user}
        roles={roles.roles}
        parentTab={parentTab}
        setParentTab={setParentTab}
        chat={chat}
        children={children}
        events={events}
        messages={messages}
        dashboard={dashboard}
        onLogout={auth.logout}
      />
    );
  }

  return (
    <ChildScreen
      user={auth.user}
      roles={roles.roles}
      chat={chat}
      focus={focus}
      onLogout={auth.logout}
    />
  );
}