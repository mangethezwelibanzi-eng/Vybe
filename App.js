import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  SafeAreaView,
} from 'react-native';

const COLORS = {
  background: '#050505',
  card: '#0D0D0D',
  accent: '#FF003C',
  text: '#FFFFFF',
  muted: '#7A7A7A',
  success: '#00D26A',
  border: '#161616',
  blue: '#008CFF',
};

const initialConversations = [
  { id: '1', name: 'Lerato', message: 'Signal recovered on my side.', time: '08:51', online: true },
  { id: '2', name: 'Operations', message: 'Queue sync completed.', time: '08:42', online: true },
  { id: '3', name: 'You', message: 'Low data mode active.', time: '08:32', online: false },
];

const initialMessages = {
  '1': [
    { id: '1', text: 'Signal recovered on my side.', time: '08:51', mine: false },
    { id: '2', text: 'Nice. Queue sync looks stable.', time: '08:53', mine: true },
  ],
  '2': [{ id: '1', text: 'Queue sync completed.', time: '08:42', mine: false }],
  '3': [{ id: '1', text: 'Low data mode active.', time: '08:32', mine: true }],
};

export default function App() {
  // ================= STATE =================
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('Chats');
  const [profileChat, setProfileChat] = useState(null);
  const [conversations, setConversations] = useState(initialConversations);
  const [messagesByChat, setMessagesByChat] = useState(initialMessages);
  const [mutedChats, setMutedChats] = useState(new Set());
  const [blockedChats, setBlockedChats] = useState(new Set());
  const [typingChats, setTypingChats] = useState(new Set());
  const [showMenu, setShowMenu] = useState(false);

  // ================= REFS =================
  const flatListRef = useRef(null);
  const replyTimeouts = useRef({});
  const inputRef = useRef(null);

  // ================= DERIVED STATE =================
  const activeChat = conversations.find(c => c.id === selectedChatId);
  const currentMessages = activeChat ? messagesByChat[activeChat.id] || [] : [];
  const visibleConversations = conversations.filter(c => !blockedChats.has(c.id));

  // ================= HELPERS =================
  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const closeMenu = () => setShowMenu(false);

  const formatTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ================= EFFECTS =================
  useEffect(() => {
    if (selectedChatId && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentMessages.length, selectedChatId]);

  useEffect(() => {
    return () => {
      Object.values(replyTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  // ================= CHAT LOGIC =================
  const simulateReply = (chatId) => {
    if (mutedChats.has(chatId)) return;
    if (replyTimeouts.current[chatId]) clearTimeout(replyTimeouts.current[chatId]);

    setTypingChats(prev => {
      const updated = new Set(prev);
      updated.add(chatId);
      return updated;
    });

    const timeout = setTimeout(() => {
      setTypingChats(prev => {
        const updated = new Set(prev);
        updated.delete(chatId);
        return updated;
      });

      const replies = ['Got it.', 'Copy that.', 'Received.', 'Perfect.', 'Acknowledged.'];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      const replyMsg = {
        id: generateId(),
        text: randomReply,
        time: formatTime(),
        mine: false,
      };

      setMessagesByChat(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), replyMsg],
      }));

      setConversations(prev =>
        prev.map(chat =>
          chat.id === chatId
            ? { ...chat, message: randomReply, time: replyMsg.time }
            : chat
        )
      );
    }, 1600);

    replyTimeouts.current[chatId] = timeout;
  };

  const sendMessage = () => {
    if (!message.trim() || !activeChat) return;

    const newMessage = {
      id: generateId(),
      text: message.trim(),
      time: formatTime(),
      mine: true,
    };

    setMessagesByChat(prev => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), newMessage],
    }));

    setConversations(prev =>
      prev.map(chat =>
        chat.id === activeChat.id
          ? { ...chat, message: newMessage.text, time: newMessage.time }
          : chat
      )
    );

    setMessage('');
    simulateReply(activeChat.id);
  };

  // ================= MENU ACTIONS =================
  const deleteChat = (chatId) => {
    setSelectedChatId(null);

    if (replyTimeouts.current[chatId]) {
      clearTimeout(replyTimeouts.current[chatId]);
      delete replyTimeouts.current[chatId];
    }

    setTypingChats(prev => {
      const updated = new Set(prev);
      updated.delete(chatId);
      return updated;
    });

    setConversations(prev => prev.filter(c => c.id !== chatId));

    setMessagesByChat(prev => {
      const updated = { ...prev };
      delete updated[chatId];
      return updated;
    });

    Alert.alert('Chat Deleted', 'Conversation has been removed.');
  };

  const blockChat = (chatId) => {
    setSelectedChatId(null);

    if (replyTimeouts.current[chatId]) {
      clearTimeout(replyTimeouts.current[chatId]);
      delete replyTimeouts.current[chatId];
    }

    setTypingChats(prev => {
      const updated = new Set(prev);
      updated.delete(chatId);
      return updated;
    });

    setBlockedChats(prev => {
      const updated = new Set(prev);
      updated.add(chatId);
      return updated;
    });

    setConversations(prev => prev.filter(c => c.id !== chatId));

    setMessagesByChat(prev => {
      const updated = { ...prev };
      delete updated[chatId];
      return updated;
    });

    Alert.alert('User Blocked', 'You have blocked this contact.');
  };

  const handleMenuOption = (option) => {
    setShowMenu(false);

    if (!activeChat) return;

    const chatId = activeChat.id;

    switch (option) {
      case 'profile':
        setProfileChat(activeChat);
        return;

      case 'mute':
        setMutedChats(prev => {
          const updated = new Set(prev);
          if (updated.has(chatId)) {
            updated.delete(chatId);
            Alert.alert('Notifications', 'Chat notifications enabled.');
          } else {
            updated.add(chatId);
            Alert.alert('Notifications', 'Chat has been muted.');
          }
          return updated;
        });
        break;

      case 'delete':
        Alert.alert(
          'Delete Chat',
          'Are you sure? This action cannot be undone.',
          [
            { text: 'Cancel', onPress: () => {}, style: 'cancel' },
            { text: 'Delete', onPress: () => deleteChat(chatId), style: 'destructive' },
          ]
        );
        break;

      case 'block':
        Alert.alert(
          'Block User',
          'You will no longer receive messages from this contact.',
          [
            { text: 'Cancel', onPress: () => {}, style: 'cancel' },
            { text: 'Block', onPress: () => blockChat(chatId), style: 'destructive' },
          ]
        );
        break;

      default:
        break;
    }
  };

  // ================= PROFILE SCREEN =================
  if (profileChat) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.profileContainer}>
          <TouchableOpacity
            onPress={() => setProfileChat(null)}
            style={styles.profileBack}
          >
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>

          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {profileChat.name.charAt(0)}
            </Text>
          </View>

          <Text style={styles.profileName}>
            {profileChat.name}
          </Text>

          <Text style={styles.profileStatus}>
            {profileChat.online ? 'Stable Connection' : 'Offline'}
          </Text>

          <View style={styles.profileCard}>
            <Text style={styles.profileLabel}>STATUS</Text>
            <Text style={styles.profileValue}>
              Secure communication active
            </Text>
          </View>

          <View style={styles.profileCard}>
            <Text style={styles.profileLabel}>DEVICE</Text>
            <Text style={styles.profileValue}>
              VYBE Mobile Node
            </Text>
          </View>

          <View style={styles.profileCard}>
            <Text style={styles.profileLabel}>LAST SEEN</Text>
            <Text style={styles.profileValue}>
              {profileChat.time}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ================= CHAT SCREEN =================
  if (selectedChatId && activeChat) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={closeMenu}>
            <View style={{ flex: 1 }}>
              {/* CHAT HEADER */}
              <View style={styles.chatHeader}>
                <TouchableOpacity onPress={() => setSelectedChatId(null)}>
                  <Text style={styles.backButton}>←</Text>
                </TouchableOpacity>

                <View style={styles.chatProfile}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{activeChat.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.chatName}>{activeChat.name}</Text>
                    <Text style={styles.onlineText}>
                      {activeChat.online ? 'stable connection' : 'offline'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
                  <Text style={styles.menu}>⋮</Text>
                </TouchableOpacity>
              </View>

              {/* MENU */}
              {showMenu && (
                <View style={styles.menuContainer}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleMenuOption('profile')}
                  >
                    <Text style={styles.menuItemText}>View Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleMenuOption('mute')}
                  >
                    <Text style={styles.menuItemText}>
                      {mutedChats.has(activeChat.id) ? 'Unmute Chat' : 'Mute Chat'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleMenuOption('delete')}
                  >
                    <Text style={styles.menuItemText}>Delete Chat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleMenuOption('block')}
                  >
                    <Text style={styles.menuItemText}>Block User</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* TODAY DIVIDER */}
              <View style={styles.todayRow}>
                <View style={styles.line} />
                <Text style={styles.todayText}>TODAY</Text>
                <View style={styles.line} />
              </View>

              {/* MESSAGES */}
              <FlatList
                ref={flatListRef}
                data={currentMessages}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <View style={[styles.messageRow, item.mine ? styles.myRow : styles.theirRow]}>
                    {!item.mine && (
                      <View style={styles.smallAvatar}>
                        <Text style={styles.smallAvatarText}>
                          {activeChat.name.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.messageBubble,
                        item.mine ? styles.myBubble : styles.theirBubble,
                      ]}
                    >
                      <Text style={styles.messageText}>{item.text}</Text>
                      <View style={styles.messageFooter}>
                        <Text style={styles.messageTime}>{item.time}</Text>
                        <Text
                          style={[
                            styles.tick,
                            { color: item.mine ? COLORS.accent : COLORS.blue },
                          ]}
                        >
                          ✓✓
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              />

              {/* TYPING INDICATOR */}
              {typingChats.has(activeChat.id) && (
                <View style={[styles.messageRow, styles.theirRow, { paddingHorizontal: 20 }]}>
                  <View style={styles.smallAvatar}>
                    <Text style={styles.smallAvatarText}>
                      {activeChat.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={[styles.messageBubble, styles.theirBubble]}>
                    <Text style={styles.messageText}>typing...</Text>
                  </View>
                </View>
              )}

              {/* INPUT */}
              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Send message..."
                  placeholderTextColor="#666"
                  value={message}
                  onChangeText={setMessage}
                  onSubmitEditing={sendMessage}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={sendMessage}
                  disabled={!message.trim()}
                >
                  <Text style={styles.sendText}>SEND</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ================= MAIN SCREEN =================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {activeTab === 'Chats' && (
        <View style={styles.header}>
          <View>
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                <Text style={styles.logoV}>V</Text>
              </View>
              <Text style={styles.logo}>VYBE</Text>
            </View>
            <Text style={styles.tagline}>COMMUNICATE • ADAPT • CONNECT</Text>
          </View>

          <View style={styles.stableBadge}>
            <View style={styles.stableDot} />
            <Text style={styles.stableText}>STABLE</Text>
          </View>
        </View>
      )}

      {activeTab === 'Chats' && (
        <FlatList
          data={visibleConversations}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No conversations</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatCard}
              onPress={() => setSelectedChatId(item.id)}
            >
              <View style={styles.chatRow}>
                <View style={styles.avatarWrapper}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                  </View>
                  <View
                    style={[
                      styles.onlineDot,
                      { backgroundColor: item.online ? COLORS.success : '#777' },
                    ]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatTitle}>{item.name}</Text>
                  <Text style={styles.chatMessage}>{item.message}</Text>
                  <Text style={styles.chatTime}>{item.time}</Text>
                </View>
                <Text style={styles.tick}>✓✓</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {activeTab === 'Profile' && (
        <View style={styles.centerContainer}>
          <Text style={styles.screenTitle}>PROFILE</Text>
          <Text style={styles.screenSub}>Zwelibanzi • Johannesburg, South Africa</Text>

          <View style={styles.profileInfoCard}>
            <Text style={styles.profileInfoLabel}>USER ID</Text>
            <Text style={styles.profileInfoValue}>VYB-001-ZWE</Text>
          </View>

          <View style={styles.profileInfoCard}>
            <Text style={styles.profileInfoLabel}>STATUS</Text>
            <Text style={styles.profileInfoValue}>Active</Text>
          </View>

          <View style={styles.profileInfoCard}>
            <Text style={styles.profileInfoLabel}>CONNECTION</Text>
            <Text style={styles.profileInfoValue}>Secure</Text>
          </View>
        </View>
      )}

      {activeTab === 'Queue' && (
        <View style={styles.centerContainer}>
          <Text style={styles.screenTitle}>MESSAGE QUEUE</Text>
          <Text style={styles.screenSub}>All messages delivered successfully.</Text>

          <View style={styles.queueCard}>
            <Text style={styles.queueLabel}>PENDING</Text>
            <Text style={styles.queueValue}>0</Text>
          </View>

          <View style={styles.queueCard}>
            <Text style={styles.queueLabel}>DELIVERED</Text>
            <Text style={styles.queueValue}>
              {Object.values(messagesByChat).reduce((sum, msgs) => sum + msgs.length, 0)}
            </Text>
          </View>
        </View>
      )}

      {activeTab === 'Connect' && (
        <View style={styles.centerContainer}>
          <Text style={styles.screenTitle}>NETWORK STATUS</Text>
          <Text style={styles.screenSub}>Low-bandwidth communication active</Text>

          <View style={styles.networkCard}>
            <Text style={styles.networkLabel}>SIGNAL STRENGTH</Text>
            <Text style={styles.networkValue}>Strong</Text>
          </View>

          <View style={styles.networkCard}>
            <Text style={styles.networkLabel}>LATENCY</Text>
            <Text style={styles.networkValue}>24ms</Text>
          </View>

          <View style={styles.networkCard}>
            <Text style={styles.networkLabel}>ENCRYPTION</Text>
            <Text style={styles.networkValue}>E2E</Text>
          </View>
        </View>
      )}

      <BottomTabs activeTab={activeTab} setActiveTab={setActiveTab} />
    </SafeAreaView>
  );
}

// ================= BOTTOM TABS COMPONENT =================
function BottomTabs({ activeTab, setActiveTab }) {
  const tabs = ['Chats', 'Queue', 'Connect', 'Profile'];

  return (
    <View style={styles.tabBar}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab}
          style={styles.tabButton}
          onPress={() => setActiveTab(tab)}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTab]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.activeLine} />}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ===== HEADER =====
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 24,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  logoV: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },

  logo: {
    color: '#FFF',
    fontSize: 24,
    letterSpacing: 6,
    fontWeight: 'bold',
  },

  tagline: {
    color: COLORS.muted,
    fontSize: 8,
    letterSpacing: 2,
    marginTop: 10,
  },

  stableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  stableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDD',
    marginRight: 10,
  },

  stableText: {
    color: '#FFF',
    fontSize: 11,
    letterSpacing: 2,
  },

  // ===== CHAT CARD =====
  chatCard: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrapper: {
    marginRight: 16,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },

  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    right: 0,
    bottom: 2,
    borderWidth: 2,
    borderColor: COLORS.card,
  },

  chatTitle: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '600',
  },

  chatMessage: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 10,
  },

  chatTime: {
    color: COLORS.muted,
    fontSize: 10,
  },

  tick: {
    color: COLORS.blue,
    fontSize: 8,
    letterSpacing: -2,
  },

  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyStateText: {
    color: COLORS.muted,
    fontSize: 14,
    letterSpacing: 1,
  },

  // ===== CHAT HEADER =====
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backButton: {
    color: COLORS.accent,
    fontSize: 28,
    marginRight: 18,
  },

  chatProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  chatName: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '600',
  },

  onlineText: {
    color: COLORS.success,
    fontSize: 10,
    letterSpacing: 1,
  },

  menu: {
    color: COLORS.accent,
    fontSize: 24,
  },

  // ===== MENU =====
  menuContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  menuItemText: {
    color: '#FFF',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // ===== TODAY ROW =====
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  todayText: {
    color: COLORS.muted,
    fontSize: 10,
    marginHorizontal: 14,
    letterSpacing: 2,
  },

  // ===== MESSAGES =====
  messageRow: {
    flexDirection: 'row',
    marginBottom: 18,
    alignItems: 'flex-end',
  },

  myRow: {
    justifyContent: 'flex-end',
  },

  theirRow: {
    justifyContent: 'flex-start',
  },

  smallAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  smallAvatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  messageBubble: {
    maxWidth: '76%',
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
  },

  theirBubble: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },

  myBubble: {
    backgroundColor: '#1A040A',
    borderColor: '#340814',
  },

  messageText: {
    color: '#FFF',
    fontSize: 13,
    lineHeight: 20,
  },

  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  messageTime: {
    color: COLORS.muted,
    fontSize: 9,
    marginRight: 8,
  },

  // ===== INPUT =====
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },

  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: '#FFF',
    fontSize: 13,
    marginRight: 12,
  },

  sendButton: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sendText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // ===== PROFILE =====
  profileContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },

  profileBack: {
    alignSelf: 'flex-start',
    marginBottom: 30,
  },

  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },

  profileAvatarText: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: 'bold',
  },

  profileName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },

  profileStatus: {
    color: COLORS.success,
    fontSize: 12,
    marginBottom: 30,
    letterSpacing: 1,
  },

  profileCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  profileLabel: {
    color: COLORS.muted,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 8,
  },

  profileValue: {
    color: '#FFF',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // ===== CENTER SCREENS =====
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  screenTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
  },

  screenSub: {
    color: COLORS.muted,
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: 40,
    textAlign: 'center',
  },

  profileInfoCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  profileInfoLabel: {
    color: COLORS.muted,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 8,
  },

  profileInfoValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  queueCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },

  queueLabel: {
    color: COLORS.muted,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 8,
  },

  queueValue: {
    color: COLORS.success,
    fontSize: 32,
    fontWeight: 'bold',
  },

  networkCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  networkLabel: {
    color: COLORS.muted,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 8,
  },

  networkValue: {
    color: COLORS.blue,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ===== TABS =====
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 10,
  },

  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
  },

  tabText: {
    color: COLORS.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
  },

  activeTab: {
    color: COLORS.accent,
  },

  activeLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.accent,
    marginTop: 8,
    borderRadius: 1,
  },
});
