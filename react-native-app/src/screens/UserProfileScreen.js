import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { contactsApi, callsApi } from '../services/api';
import { useCall } from '../context/CallContext';
import { COLORS, SPACING, SHADOWS } from '../utils/theme';

export default function UserProfileScreen({ route, navigation }) {
  const { user } = route.params;
  const { startOutgoingCall, onlineUsers } = useCall();
  const [isContact, setIsContact] = useState(false);
  const [callHistory, setCallHistory] = useState([]);

  const isOnline = onlineUsers.has(user.id);

  useEffect(() => {
    checkContactStatus();
    fetchCallHistory();
  }, [user.id]);

  const checkContactStatus = async () => {
    try {
      const contacts = await contactsApi.getAll();
      setIsContact(contacts.some((c) => c.id === user.id));
    } catch {
      // ignore
    }
  };

  const fetchCallHistory = async () => {
    try {
      const history = await callsApi.getHistory();
      const userCalls = history.filter((c) => c.otherUserId === user.id);
      setCallHistory(userCalls);
    } catch {
      // ignore
    }
  };

  const handleAddContact = async () => {
    try {
      await contactsApi.add(user.id);
      setIsContact(true);
      Alert.alert('Success', `${user.displayName || user.username} added to contacts`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRemoveContact = async () => {
    try {
      await contactsApi.remove(user.id);
      setIsContact(false);
      Alert.alert('Removed', 'Contact removed');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCall = (type) => {
    startOutgoingCall(user.id, user.displayName || user.username, type);
    navigation.navigate('Calling', {
      userId: user.id,
      username: user.displayName || user.username,
      callType: type,
      isIncoming: false
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          <View style={[styles.avatar, isOnline && styles.avatarOnline]}>
            <Text style={styles.avatarText}>
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user.displayName || user.username}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          <View style={[styles.statusBadge, isOnline ? styles.statusOnline : styles.statusOffline]}>
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>

        <View style={styles.callButtons}>
          <TouchableOpacity
            style={[styles.callButtonLarge, styles.voiceButtonLarge]}
            onPress={() => handleCall('voice')}
          >
            <Text style={styles.callButtonIcon}>📞</Text>
            <Text style={styles.callButtonText}>Voice Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.callButtonLarge, styles.videoButtonLarge]}
            onPress={() => handleCall('video')}
          >
            <Text style={styles.callButtonIcon}>📹</Text>
            <Text style={styles.callButtonText}>Video Call</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Contact Actions</Text>
          {isContact ? (
            <TouchableOpacity style={styles.actionButton} onPress={handleRemoveContact}>
              <Text style={styles.actionText}>Remove from Contacts</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionButtonPrimary} onPress={handleAddContact}>
              <Text style={styles.actionTextPrimary}>Add to Contacts</Text>
            </TouchableOpacity>
          )}
        </View>

        {callHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent Calls</Text>
            {callHistory.slice(0, 5).map((call) => (
              <View key={call.id} style={styles.historyItem}>
                <Text style={styles.historyIcon}>
                  {call.status === 'missed' ? '📵' : call.isIncoming ? '📲' : '📱'}
                </Text>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyType}>
                    {call.callType === 'video' ? 'Video' : 'Voice'} • {call.status}
                  </Text>
                  <Text style={styles.historyTime}>
                    {new Date(call.startedAt).toLocaleString()}
                  </Text>
                </View>
                {call.duration > 0 && (
                  <Text style={styles.historyDuration}>{formatDuration(call.duration)}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    padding: SPACING.lg
  },
  backButton: {
    padding: SPACING.sm
  },
  backText: {
    color: COLORS.primaryLight,
    fontSize: 16
  },
  content: {
    padding: SPACING.lg,
    paddingTop: 0
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.medium
  },
  avatarOnline: {
    borderWidth: 3,
    borderColor: COLORS.online
  },
  avatarText: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#fff'
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text
  },
  username: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 4
  },
  statusBadge: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 20
  },
  statusOnline: {
    backgroundColor: COLORS.online + '20'
  },
  statusOffline: {
    backgroundColor: COLORS.offline + '20'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600'
  },
  statusOnlineText: {
    color: COLORS.online
  },
  callButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg
  },
  callButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderRadius: 16,
    gap: SPACING.sm
  },
  voiceButtonLarge: {
    backgroundColor: COLORS.accent + '20'
  },
  videoButtonLarge: {
    backgroundColor: COLORS.secondary + '20'
  },
  callButtonIcon: {
    fontSize: 24
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600'
  },
  infoCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.small
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md
  },
  actionButton: {
    backgroundColor: COLORS.error + '20',
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center'
  },
  actionText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600'
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center'
  },
  actionTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  historySection: {
    marginTop: SPACING.md
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm
  },
  historyIcon: {
    fontSize: 20,
    marginRight: SPACING.md
  },
  historyInfo: {
    flex: 1
  },
  historyType: {
    fontSize: 14,
    color: COLORS.text
  },
  historyTime: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  historyDuration: {
    fontSize: 14,
    color: COLORS.textSecondary
  }
});
