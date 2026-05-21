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
  const flatListRef = useRef(null);
  const replyTimeouts = useRef({});

  const activeChat = conversations.find(c => c.id === selectedChatId);
  const currentMessages = activeChat ? messagesByChat[activeChat.id] || [] : [];
  const visibleConversations = conversations.filter(c => !blockedChats.has(c.id));

  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const closeMenu = () => setShowMenu(false);

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
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

    setConversations(prev =>
      prev.filter(c => c.id !== chatId)
    );

    setMessagesByChat(prev => {
      const updated = { ...prev };
      delete updated[chatId];
      return updated;
    });
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

    setConversations(prev =>
      prev.filter(c => c.id !== chatId)
    );

    setMessagesByChat(prev => {
      const updated = { ...prev };
      delete updated[chatId];
      return updated;
    });
  };

  const handleMenuOption = (option) => {
    setShowMenu(false);

    if (!activeChat) return;

    const chatId = activeChat.id;

    switch (option) {
      case 'profile':
        setShowMenu(false);
        setProfileChat(activeChat);
        return;
      case 'mute':
        setMutedChats(prev => {
          const updated = new Set(prev);

          if (updated.has(chatId)) {
            updated.delete(chatId);
          } else {
            updated.add(chatId);
          }

          return updated;
        });
        break;

      case 'delete':
        deleteChat(chatId);
        break;

      case 'block':
        blockChat(chatId);
        break;

      default:
        break;
    }
  };

  if (profileChat) {
    return (
      <SafeAreaView style={styles.container}>
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
        </View>
      </SafeAreaView>
    );
  }

  if (selectedChatId && activeChat) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={closeMenu}>
            <View style={{ flex: 1 }}>
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

              {showMenu && (
                <View style={styles.menuContainer}>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuOption('profile')}>
                    <Text style={styles.menuItemText}>View Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuOption('mute')}>
                    <Text style={styles.menuItemText}>
                      {mutedChats.has(activeChat.id) ? 'Unmute Chat' : 'Mute Chat'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuOption('delete')}>
                    <Text style={styles.menuItemText}>Delete Chat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuOption('block')}>
                    <Text style={styles.menuItemText}>Block User</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.todayRow}>
                <View style={styles.line} />
                <Text style={styles.todayText}>TODAY</Text>
                <View style={styles.line} />
              </View>

              <FlatList
                ref={flatListRef}
                data={currentMessages}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <View style={[styles.messageRow, item.mine ? styles.myRow : styles.theirRow]}>
                    {!item.mine && (
                      <View style={styles.smallAvatar}>
                        <Text style={styles.smallAvatarText}>{activeChat.name.charAt(0)}</Text>
                      </View>
                    )}
                    <View style={[styles.messageBubble, item.mine ? styles.myBubble : styles.theirBubble]}>
                      <Text style={styles.messageText}>{item.text}</Text>
                      <View style={styles.messageFooter}>
                        <Text style={styles.messageTime}>{item.time}</Text>
                        <Text style={[styles.tick, { color: item.mine ? COLORS.accent : COLORS.blue }]}>
                          ✓✓
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              />

              {typingChats.has(activeChat.id) && (
                <View style={[styles.messageRow, styles.theirRow, { paddingHorizontal: 20 }]}>
                  <View style={styles.smallAvatar}>
                    <Text style={styles.smallAvatarText}>{activeChat.name.charAt(0)}</Text>
                  </View>
                  <View style={[styles.messageBubble, styles.theirBubble]}>
                    <Text style={styles.messageText}>typing...</Text>
                  </View>
                </View>
              )}

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Send message..."
                  placeholderTextColor="#666"
                  value={message}
                  onChangeText={setMessage}
                  onSubmitEditing={sendMessage}
                  returnKeyType="send"
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                  <Text style={styles.sendText}>SEND</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

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
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatCard} onPress={() => setSelectedChatId(item.id)}>
              <View style={styles.chatRow}>
                <View style={styles.avatarWrapper}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                  </View>
                  <View style={[styles.onlineDot, { backgroundColor: item.online ? COLORS.success : '#777' }]} />
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

      {(activeTab === 'Profile' || activeTab === 'Queue' || activeTab === 'Connect') && (
        <View style={styles.centerContainer}>
          <Text style={styles.screenTitle}>
            {activeTab === 'Profile' ? 'PROFILE' : activeTab === 'Queue' ? 'MESSAGE QUEUE' : 'NETWORK STATUS'}
          </Text>
          <Text style={styles.screenSub}>
            {activeTab === 'Profile'
              ? 'Zwelibanzi • Johannesburg, South Africa'
              : activeTab === 'Queue'
              ? 'All messages delivered successfully.'
              : 'Low-bandwidth communication active'}
          </Text>
        </View>
      )}

      <BottomTabs activeTab={activeTab} setActiveTab={setActiveTab} />
    </SafeAreaView>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
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
  },
  onlineText: {
    color: COLORS.success,
    fontSize: 10,
  },
  menu: {
    color: COLORS.accent,
    fontSize: 22,
  },
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
  },
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
    marginTop: 14,
  },
  messageTime: {
    color: COLORS.muted,
    fontSize: 9,
  },
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sendText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: 'bold',
  },
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
    marginBottom: 20,
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
  },
  profileStatus: {
    color: COLORS.success,
    fontSize: 12,
    marginBottom: 30,
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
  },
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
    marginBottom: 40,
    textAlign: 'center',
  },
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
