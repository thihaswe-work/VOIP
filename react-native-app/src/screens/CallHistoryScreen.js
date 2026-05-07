import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl
} from 'react-native';
import { callsApi } from '../services/api';
import { COLORS, SPACING, SHADOWS } from '../utils/theme';

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

export default function CallHistoryScreen({ navigation }) {
  const [calls, setCalls] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCallHistory = async () => {
    try {
      const data = await callsApi.getHistory();
      setCalls(data);
    } catch (error) {
      console.error('Error fetching call history:', error);
    }
  };

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCallHistory();
    setRefreshing(false);
  };

  const getStatusIcon = (call) => {
    if (call.status === 'missed') return '📵';
    if (call.isIncoming) return '📲';
    return '📱';
  };

  const getStatusColor = (call) => {
    if (call.status === 'missed') return COLORS.missedCall;
    if (call.isIncoming) return COLORS.incomingCall;
    return COLORS.outgoingCall;
  };

  const renderCall = ({ item }) => (
    <TouchableOpacity
      style={styles.callItem}
      onPress={() => navigation.navigate('UserProfile', {
        user: {
          id: item.otherUserId,
          username: item.otherUsername,
          displayName: item.otherDisplayName
        }
      })}
    >
      <View style={styles.callInfo}>
        <Text style={[styles.callIcon, { color: getStatusColor(item) }]}>
          {getStatusIcon(item)}
        </Text>
        <View style={styles.callDetails}>
          <Text style={[
            styles.callName,
            item.status === 'missed' && styles.missedName
          ]}>
            {item.otherDisplayName || item.otherUsername}
          </Text>
          <View style={styles.callMeta}>
            <Text style={styles.callType}>
              {item.callType === 'video' ? '📹 Video' : '📞 Voice'}
            </Text>
            <Text style={styles.callTime}>• {formatDate(item.startedAt)}</Text>
            {item.duration > 0 && (
              <Text style={styles.callDuration}>• {formatDuration(item.duration)}</Text>
            )}
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.callAgainButton}
        onPress={() => navigation.navigate('Calling', {
          userId: item.otherUserId,
          username: item.otherDisplayName || item.otherUsername,
          callType: item.callType,
          isIncoming: false
        })}
      >
        <Text style={styles.callAgainIcon}>📞</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Calls</Text>
        <Text style={styles.callCount}>{calls.length} calls</Text>
      </View>

      {calls.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📞</Text>
          <Text style={styles.emptyTitle}>No call history</Text>
          <Text style={styles.emptyText}>Your recent calls will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          renderItem={renderCall}
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
    padding: SPACING.lg
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text
  },
  callCount: {
    fontSize: 14,
    color: COLORS.textMuted
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: 0
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small
  },
  callInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  callIcon: {
    fontSize: 24,
    marginRight: SPACING.md
  },
  callDetails: {
    flex: 1
  },
  callName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text
  },
  missedName: {
    color: COLORS.missedCall
  },
  callMeta: {
    flexDirection: 'row',
    marginTop: 4
  },
  callType: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  callTime: {
    fontSize: 13,
    color: COLORS.textMuted
  },
  callDuration: {
    fontSize: 13,
    color: COLORS.textMuted
  },
  callAgainButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center',
    alignItems: 'center'
  },
  callAgainIcon: {
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
    textAlign: 'center'
  }
});
