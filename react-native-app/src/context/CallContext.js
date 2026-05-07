import React, { createContext, useState, useContext, useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const CallContext = createContext({});

export const CallProvider = ({ children }) => {
  const { token } = useAuth();
  const [callState, setCallState] = useState({
    status: 'idle',
    type: 'voice',
    otherUser: null,
    duration: 0,
    isMuted: false,
    isSpeakerOn: false,
    isVideoOn: true
  });
  const [incomingCall, setIncomingCall] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (!token) return;

    let socket;
    const initSocket = async () => {
      socket = await connectSocket();
      if (!socket) return;

      socket.on('incoming-call', (data) => {
        setIncomingCall(data);
      });

      socket.on('call-rejected', () => {
        setCallState({
          status: 'rejected',
          type: callState.type,
          otherUser: null,
          duration: 0,
          isMuted: false,
          isSpeakerOn: false,
          isVideoOn: true
        });
      });

      socket.on('call-cancelled', () => {
        setCallState({
          status: 'cancelled',
          type: callState.type,
          otherUser: null,
          duration: 0,
          isMuted: false,
          isSpeakerOn: false,
          isVideoOn: true
        });
      });

      socket.on('call-ended', () => {
        setCallState({
          status: 'ended',
          type: callState.type,
          otherUser: null,
          duration: callState.duration,
          isMuted: false,
          isSpeakerOn: false,
          isVideoOn: true
        });
      });

      socket.on('user-status', (data) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          if (data.status === 'online') {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
      });
    };

    initSocket();

    return () => {
      disconnectSocket();
    };
  }, [token]);

  const startOutgoingCall = (targetUserId, targetUsername, callType = 'voice') => {
    const socket = getSocket();
    if (!socket) return;

    setCallState({
      status: 'calling',
      type: callType,
      otherUser: { id: targetUserId, username: targetUsername },
      duration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isVideoOn: callType === 'video'
    });
  };

  const answerCall = () => {
    if (!incomingCall) return;

    setCallState({
      status: 'connected',
      type: incomingCall.callType,
      otherUser: { id: incomingCall.callerId, username: incomingCall.callerUsername },
      duration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isVideoOn: incomingCall.callType === 'video'
    });
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('reject-call', { callerId: incomingCall.callerId });
    }
    setIncomingCall(null);
  };

  const endCall = () => {
    const socket = getSocket();
    if (socket && callState.otherUser) {
      socket.emit('end-call', { targetUserId: callState.otherUser.id });
    }

    setCallState({
      status: 'ended',
      type: callState.type,
      otherUser: null,
      duration: callState.duration,
      isMuted: false,
      isSpeakerOn: false,
      isVideoOn: true
    });
  };

  const resetCallState = () => {
    setCallState({
      status: 'idle',
      type: 'voice',
      otherUser: null,
      duration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isVideoOn: true
    });
  };

  const toggleMute = () => {
    setCallState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const toggleSpeaker = () => {
    setCallState((prev) => ({ ...prev, isSpeakerOn: !prev.isSpeakerOn }));
  };

  const toggleVideo = () => {
    setCallState((prev) => ({ ...prev, isVideoOn: !prev.isVideoOn }));
  };

  const updateDuration = (duration) => {
    setCallState((prev) => ({ ...prev, duration }));
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        incomingCall,
        onlineUsers,
        startOutgoingCall,
        answerCall,
        rejectCall,
        endCall,
        resetCallState,
        toggleMute,
        toggleSpeaker,
        toggleVideo,
        updateDuration
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export default CallContext;
