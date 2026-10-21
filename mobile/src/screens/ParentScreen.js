import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native';
import ChatScreen from './ChatScreen';
import DashboardScreen from './DashboardScreen';
import CalendarScreen from './CalendarScreen';
import MessagesScreen from './MessagesScreen';
import ChildrenScreen from './ChildrenScreen';
import { playAudio } from '../utils/voice';
import { API_URL } from '../config';
import { DEFAULT_PARENT_ROLE } from '../constants';

export default function ParentScreen({
  user,
  roles,
  parentTab,
  setParentTab,
  chat,
  children,
  events,
  messages,
  dashboard,
  onLogout,
}) {
  useEffect(() => {
    if (!chat.selectedRole) {
      chat.setSelectedRole(DEFAULT_PARENT_ROLE);
    }
  }, []);

  const handleTabChange = (tab) => {
    setParentTab(tab);
    if (tab === 'home') dashboard.fetchDashboard();
    if (tab === 'calendar') events.fetchEvents();
    if (tab === 'messages') {
      messages.fetchMessageThreads();
      messages.fetchLinkedParents();
    }
    if (tab === 'children') {
      children.fetchChildren();
    }
  };

  const handleOpenMessages = (childId) => {
    setParentTab('messages');
    if (childId) messages.setSelectedMessageChildId(childId);
    messages.fetchMessageThreads();
    messages.fetchLinkedParents();
  };

  if (parentTab === 'home') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <DashboardScreen
          user={user}
          dashboard={dashboard.dashboard}
          onFetchDashboard={dashboard.fetchDashboard}
          onLogout={onLogout}
          onChangeTab={handleTabChange}
          onOpenMessages={handleOpenMessages}
        />
      </SafeAreaView>
    );
  }

  if (parentTab === 'calendar') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <CalendarScreen
          user={user}
          events={events.events}
          calendarView={events.calendarView}
          setCalendarView={events.setCalendarView}
          selectedCalendarDate={events.selectedCalendarDate}
          setSelectedCalendarDate={events.setSelectedCalendarDate}
          newEvent={events.newEvent}
          setNewEvent={events.setNewEvent}
          children={children.children}
          onFetchEvents={events.fetchEvents}
          onCreateEvent={events.createEvent}
          onDeleteEvent={events.deleteEvent}
          onLogout={onLogout}
          onChangeTab={handleTabChange}
        />
      </SafeAreaView>
    );
  }

  if (parentTab === 'messages') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <MessagesScreen
          user={user}
          messageThreads={messages.messageThreads}
          linkedParents={messages.linkedParents}
          selectedMessageChildId={messages.selectedMessageChildId}
          setSelectedMessageChildId={messages.setSelectedMessageChildId}
          newMessageText={messages.newMessageText}
          setNewMessageText={messages.setNewMessageText}
          selectedRecipientId={messages.selectedRecipientId}
          setSelectedRecipientId={messages.setSelectedRecipientId}
          onFetchThreads={messages.fetchMessageThreads}
          onFetchLinkedParents={messages.fetchLinkedParents}
          onSendMessage={messages.sendFamilyMessage}
          onLogout={onLogout}
          onChangeTab={handleTabChange}
        />
      </SafeAreaView>
    );
  }

  if (parentTab === 'children') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <ChildrenScreen
          user={user}
          children={children.children}
          newChild={children.newChild}
          setNewChild={children.setNewChild}
          editingChild={children.editingChild}
          setEditingChild={children.setEditingChild}
          onFetchChildren={children.fetchChildren}
          onCreateChild={children.createChild}
          onUpdateChild={children.updateChild}
          onDeleteChild={children.deleteChild}
          onLogout={onLogout}
          onChangeTab={handleTabChange}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ChatScreen
        title="Espace Parent"
        user={user}
        userType="parent"
        roles={roles}
        selectedRole={chat.selectedRole}
        onSelectRole={chat.setSelectedRole}
        children={children.children}
        selectedChildId={children.selectedChildId}
        onSelectChild={children.setSelectedChildId}
        message={chat.message}
        onChangeMessage={chat.setMessage}
        history={chat.history}
        onSend={chat.sendTextMessage}
        onPlayAudio={(url) => playAudio(`${API_URL}${url}`)}
        loading={chat.loading}
        recording={chat.recording}
        onStartRecording={chat.beginRecording}
        onStopRecording={chat.finishRecording}
        onLogout={onLogout}
      />
    </SafeAreaView>
  );
}
