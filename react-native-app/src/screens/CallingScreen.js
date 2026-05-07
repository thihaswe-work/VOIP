import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { useCall } from '../context/CallContext';
import { callsApi } from '../services/api';
import { getSocket } from '../services/socket';
import { COLORS, SPACING, SHADOWS } from '../utils/theme';

const { width } = Dimensions.get('window');

export default function CallingScreen({ route, navigation }) {
  const { userId, username, callType, isIncoming } = route.params;
  const { callState, answerCall, endCall, toggleMute, toggleSpeaker, toggleVideo, updateDuration } = useCall();
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [pulseAnim] = useState(new Animated.Value(1));
  const timerRef = useRef(null);

  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
        updateDuration(duration + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callStatus]);

  useEffect(() => {
    if (callStatus === 'calling' || callStatus === 'incoming') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      ).start();
    }

    return () => {
      pulseAnim.stopAnimation();
    };
  }, [callStatus]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('call-answered', () => {
      setCallStatus('connected');
    });

    socket.on('call-rejected', () => {
      logCall('rejected');
      setCallStatus('rejected');
      setTimeout(() => navigation.goBack(), 2000);
    });

    socket.on('call-ended', () => {
      logCall('completed');
      setCallStatus('ended');
      setTimeout(() => navigation.goBack(), 2000);
    });

    return () => {
      socket.off('call-answered');
      socket.off('call-rejected');
      socket.off('call-ended');
    };
  }, [userId]);

  const logCall = async (status) => {
    try {
      await callsApi.logCall({
        receiverId: userId,
        callType,
        status,
        duration
      });
    } catch (error) {
      console.error('Error logging call:', error);
    }
  };

  const handleAnswer = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('answer-call', { callerId: userId });
    }
    answerCall();
    setCallStatus('connected');
  };

  const handleEnd = async () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('end-call', { targetUserId: userId });
    }

    if (callStatus === 'calling') {
      socket.emit('cancel-call', { targetUserId: userId });
      logCall('cancelled');
    } else {
      logCall('completed');
    }

    setCallStatus('ended');
    setTimeout(() => navigation.goBack(), 1000);
  };

  const handleReject = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('reject-call', { callerId: userId });
    }
    logCall('rejected');
    setCallStatus('rejected');
    setTimeout(() => navigation.goBack(), 2000);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, isVideoOn && styles.videoBackground]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.callerInfo}>
        <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={[styles.avatar, isVideoOn && styles.avatarSmall]}>
            <Text style={styles.avatarText}>
              {username.charAt(0).toUpperCase()}
            </Text>
          </View>
        </Animated.View>
        <Text style={styles.callerName}>{username}</Text>
        <Text style={styles.callStatus}>
          {callStatus === 'calling' && 'Calling...'}
          {callStatus === 'incoming' && 'Incoming call...'}
          {callStatus === 'connected' && formatTime(duration)}
          {callStatus === 'rejected' && 'Call rejected'}
          {callStatus === 'ended' && `Call ended • ${formatTime(duration)}`}
        </Text>
      </View>

      {isVideoOn && (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoPlaceholderText}>📹</Text>
          <Text style={styles.videoPlaceholderSubtext}>Video call active</Text>
        </View>
      )}

      {callStatus === 'connected' && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={() => {
              toggleMute();
              setIsMuted(!isMuted);
            }}
          >
            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
            <Text style={styles.controlText}>Mute</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
            onPress={() => {
              toggleSpeaker();
              setIsSpeakerOn(!isSpeakerOn);
            }}
          >
            <Text style={styles.controlIcon}>🔊</Text>
            <Text style={styles.controlText}>Speaker</Text>
          </TouchableOpacity>

          {callType === 'video' && (
            <TouchableOpacity
              style={[styles.controlButton, isVideoOn && styles.controlButtonActive]}
              onPress={() => {
                toggleVideo();
                setIsVideoOn(!isVideoOn);
              }}
            >
              <Text style={styles.controlIcon}>{isVideoOn ? '📹' : '📷'}</Text>
              <Text style={styles.controlText}>Video</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.bottomActions}>
        {callStatus === 'incoming' ? (
          <View style={styles.incomingActions}>
            <TouchableOpacity style={[styles.actionButton, styles.rejectActionButton]} onPress={handleReject}>
              <Text style={styles.actionIcon}>📵</Text>
              <Text style={styles.actionText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.answerActionButton]} onPress={handleAnswer}>
              <Text style={styles.actionIcon}>📞</Text>
              <Text style={styles.actionText}>Answer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.actionButton, styles.endActionButton]} onPress={handleEnd}>
            <Text style={styles.actionIcon}>📵</Text>
            <Text style={styles.actionText}>End Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'space-between',
    padding: SPACING.xl
  },
  videoBackground: {
    backgroundColor: '#000'
  },
  callerInfo: {
    alignItems: 'center',
    marginTop: SPACING.xxl
  },
  avatarContainer: {
    marginBottom: SPACING.lg
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large
  },
  avatarSmall: {
    width: 80,
    height: 80,
    borderRadius: 40
  },
  avatarText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#fff'
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm
  },
  callStatus: {
    fontSize: 16,
    color: COLORS.textSecondary
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoPlaceholderText: {
    fontSize: 80
  },
  videoPlaceholderSubtext: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.md
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginBottom: SPACING.xl
  },
  controlButton: {
    alignItems: 'center',
    gap: SPACING.xs
  },
  controlButtonActive: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 16,
    padding: SPACING.sm
  },
  controlIcon: {
    fontSize: 24
  },
  controlText: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  bottomActions: {
    alignItems: 'center',
    marginBottom: SPACING.xl
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%'
  },
  actionButton: {
    alignItems: 'center',
    gap: SPACING.xs
  },
  endActionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium
  },
  rejectActionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium
  },
  answerActionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium
  },
  actionIcon: {
    fontSize: 30
  },
  actionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600'
  }
});
