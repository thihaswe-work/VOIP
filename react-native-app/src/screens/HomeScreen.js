import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { contactsApi } from '../services/api';
import { COLORS, SPACING, SHADOWS } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { startOutgoingCall, onlineUsers } = useCall();
  const [contacts, setContacts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchContacts = async () => {
    try {
      const data = await contactsApi.getAll();
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchContacts();
    setRefreshing(false);
  }, []);

  const handleCall = (contact, type) => {
    startOutgoingCall(contact.id, contact.displayName || contact.username, type);
    navigation.navigate('Calling', {
      userId: contact.id,
      username: contact.displayName || contact.username,
      callType: type,
      isIncoming: false
    });
  };

  const renderContact = ({ item }) => {
    const isOnline = onlineUsers.has(item.id);
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => navigation.navigate('UserProfile', { user: item })}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, isOnline && styles.avatarOnline]}>
            <Text style={styles.avatarText}>
              {(item.displayName || item.username).charAt(0).toUpperCase()}
            </Text>
          </View>
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.displayName || item.username}</Text>
          <Text style={styles.contactStatus}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        <View style={styles.callButtons}>
          <TouchableOpacity
            style={[styles.callButton, styles.voiceButton]}
            onPress={() => handleCall(item, 'voice')}
          >
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.callButton, styles.videoButton]}
            onPress={() => handleCall(item, 'video')}
          >
            <Text style={styles.callIcon}>📹</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.username}>{user?.displayName || user?.username}</Text>
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('SearchUsers')}
        >
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Contacts</Text>
        <Text style={styles.contactCount}>{contacts.length}</Text>
      </View>

      {contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No contacts yet</Text>
          <Text style={styles.emptyText}>Search for users to add them to your contacts</Text>
          <TouchableOpacity
            style={styles.addContactButton}
            onPress={() => navigation.navigate('SearchUsers')}
          >
            <Text style={styles.addContactText}>Find People</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.md
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchIcon: {
    fontSize: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text
  },
  contactCount: {
    fontSize: 14,
    color: COLORS.textMuted
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: 0
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small
  },
  avatarContainer: {
    position: 'relative'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarOnline: {
    borderWidth: 2,
    borderColor: COLORS.online
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.online,
    borderWidth: 2,
    borderColor: COLORS.backgroundSecondary
  },
  contactInfo: {
    flex: 1,
    marginLeft: SPACING.md
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text
  },
  contactStatus: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2
  },
  callButtons: {
    flexDirection: 'row',
    gap: SPACING.sm
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  voiceButton: {
    backgroundColor: COLORS.accent + '20'
  },
  videoButton: {
    backgroundColor: COLORS.secondary + '20'
  },
  callIcon: {
    fontSize: 18
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg
  },
  addContactButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    ...SHADOWS.medium
  },
  addContactText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
