import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { contactsApi } from '../services/api';
import { COLORS, SPACING, SHADOWS } from '../utils/theme';

export default function SearchUsersScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await contactsApi.search(searchQuery);
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddContact = async (userId, username) => {
    try {
      await contactsApi.add(userId);
      Alert.alert('Success', `${username} added to contacts`);
      setResults((prev) => prev.filter((u) => u.id !== userId));
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigation.navigate('UserProfile', { user: item })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.displayName || item.username).charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName || item.username}</Text>
        <Text style={styles.userUsername}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddContact(item.id, item.displayName || item.username)}
      >
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username or name..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            searchUsers(text);
          }}
          autoFocus
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
        />
      ) : query.length > 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : null}
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
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backText: {
    fontSize: 18,
    color: COLORS.text
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: 0
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  userInfo: {
    flex: 1,
    marginLeft: SPACING.md
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text
  },
  userUsername: {
    fontSize: 13,
    color: COLORS.textMuted
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted
  }
});
