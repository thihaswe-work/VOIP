import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { COLORS, SPACING, SHADOWS } from '../utils/theme';

export default function SettingsScreen({ navigation }) {
  const { user, logout, updateUserData } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    soundEnabled: true,
    videoDefault: false,
    darkMode: true,
    autoAnswer: false
  });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || '',
    phoneNumber: user?.phoneNumber || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({
        displayName: user.displayName || '',
        phoneNumber: user.phoneNumber || ''
      });
    }
  }, [user]);

  const toggleSetting = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await authApi.updateProfile(editForm);
      updateUserData(response.user);
      setShowEditProfile(false);
      Alert.alert('Success', 'Profile updated');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setShowChangePassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      Alert.alert('Success', 'Password changed');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, value, onPress, isSwitch }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isSwitch}
    >
      <View style={styles.settingIcon}>{icon}</View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.primary }}
          thumbColor="#fff"
        />
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.displayName || user?.username || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.displayName || user?.username}</Text>
            <Text style={styles.profileUsername}>@{user?.username}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setShowEditProfile(true)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <SettingItem
              icon="🔔"
              title="Notifications"
              value={settings.notifications}
              onPress={() => toggleSetting('notifications')}
              isSwitch
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🔊"
              title="Sound Effects"
              value={settings.soundEnabled}
              onPress={() => toggleSetting('soundEnabled')}
              isSwitch
            />
            <View style={styles.divider} />
            <SettingItem
              icon="📹"
              title="Video Calls by Default"
              value={settings.videoDefault}
              onPress={() => toggleSetting('videoDefault')}
              isSwitch
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🌙"
              title="Dark Mode"
              value={settings.darkMode}
              onPress={() => toggleSetting('darkMode')}
              isSwitch
            />
            <View style={styles.divider} />
            <SettingItem
              icon="📞"
              title="Auto Answer Calls"
              value={settings.autoAnswer}
              onPress={() => toggleSetting('autoAnswer')}
              isSwitch
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <SettingItem
              icon="👤"
              title="Edit Profile"
              subtitle="Change name, phone number"
              onPress={() => setShowEditProfile(true)}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🔒"
              title="Change Password"
              onPress={() => setShowChangePassword(true)}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🛡️"
              title="Privacy & Security"
              subtitle="Manage your privacy settings"
              onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available in the next update')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.card}>
            <SettingItem
              icon="❓"
              title="Help & FAQ"
              onPress={() => Alert.alert('Help', 'Visit our documentation for help')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="📝"
              title="Report a Bug"
              onPress={() => Alert.alert('Report', 'Bug reporting coming soon')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="ℹ️"
              title="About"
              subtitle="Version 1.0.0"
              onPress={() => Alert.alert('About', 'P2P Calling App\nVersion 1.0.0\nBuilt with React Native & WebRTC')}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>P2P Calling v1.0.0</Text>
      </ScrollView>

      <Modal visible={showEditProfile} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editForm.displayName}
              onChangeText={(v) => setEditForm((prev) => ({ ...prev, displayName: v }))}
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              value={editForm.phoneNumber}
              onChangeText={(v) => setEditForm((prev) => ({ ...prev, phoneNumber: v }))}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditProfile(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showChangePassword} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.modalInput}
              value={passwordForm.currentPassword}
              onChangeText={(v) => setPasswordForm((prev) => ({ ...prev, currentPassword: v }))}
              secureTextEntry
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.modalInput}
              value={passwordForm.newPassword}
              onChangeText={(v) => setPasswordForm((prev) => ({ ...prev, newPassword: v }))}
              secureTextEntry
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.modalInput}
              value={passwordForm.confirmPassword}
              onChangeText={(v) => setPasswordForm((prev) => ({ ...prev, confirmPassword: v }))}
              secureTextEntry
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowChangePassword(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleChangePassword}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: 0
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text
  },
  scrollContent: {
    padding: SPACING.lg
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff'
  },
  profileInfo: {
    flex: 1,
    marginLeft: SPACING.md
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text
  },
  profileUsername: {
    fontSize: 14,
    color: COLORS.textMuted
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  editButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  section: {
    marginBottom: SPACING.lg
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.small
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md
  },
  settingIcon: {
    fontSize: 22,
    width: 36,
    textAlign: 'center'
  },
  settingInfo: {
    flex: 1,
    marginLeft: SPACING.sm
  },
  settingTitle: {
    fontSize: 16,
    color: COLORS.text
  },
  settingSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textMuted
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 50
  },
  logoutButton: {
    backgroundColor: COLORS.error + '20',
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600'
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
    paddingBottom: SPACING.xl + 20
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md
  },
  modalInput: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: COLORS.backgroundTertiary
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600'
  },
  saveButton: {
    backgroundColor: COLORS.primary
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
