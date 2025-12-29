import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiMessageSquare,
  FiUsers,
  FiX,
  FiSend,
  FiPhone,
  FiRotateCw,
  FiVolume2,
  FiVolumeX,
  FiCircle,
  FiPause,
  FiPlay,
  FiSquare
} from 'react-icons/fi';
import { RiCameraSwitchLine } from 'react-icons/ri';
import { PiHandPalm } from 'react-icons/pi';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { io } from 'socket.io-client';
import { liveClassAPI } from '../services/api';

// IndexedDB Helper for persistent recording chunks
const DB_NAME = 'dvision_live_recordings';
const STORE_NAME = 'chunks';
const METADATA_STORE_NAME = 'metadata';
const DB_VERSION = 2; // Increment version for new store

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (event) => reject('IndexedDB error: ' + event.target.error);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        db.createObjectStore(METADATA_STORE_NAME, { keyPath: 'classId' });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
  });
};

const saveChunkToDB = async (classId, blob) => {
  try {
    const db = await initDB();
    const count = await new Promise((resolve) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const item = {
        classId,
        blob,
        sequence: count + 1,
        timestamp: Date.now()
      };
      store.add(item);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IDB Save Error:', err);
  }
};

const getChunksFromDB = async (classId) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const allItems = request.result;
        const classItems = allItems
          .filter(item => item.classId === classId)
          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0) || a.timestamp - b.timestamp)
          .map(item => item.blob);
        resolve(classItems);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IDB Get Error:', err);
    return [];
  }
};

const clearChunksFromDB = async (classId) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, METADATA_STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const metaStore = tx.objectStore(METADATA_STORE_NAME);

      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.classId === classId) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      // Also clear metadata
      const metaRequest = metaStore.delete(classId);

      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IDB Clear Error:', err);
  }
};

const saveDurationToDB = async (classId, duration) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([METADATA_STORE_NAME], 'readwrite');
      const store = tx.objectStore(METADATA_STORE_NAME);
      store.put({ classId, duration });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IDB Duration Save Error:', err);
  }
};

const getDurationFromDB = async (classId) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([METADATA_STORE_NAME], 'readonly');
      const store = tx.objectStore(METADATA_STORE_NAME);
      const request = store.get(classId);
      request.onsuccess = () => resolve(request.result?.duration || 0);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    return 0;
  }
};

// Auto-detect API base URL for socket connections
// Use the same logic as the API service to ensure consistency
const getApiBaseUrl = () => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    // Remove trailing slash if present
    const cleanUrl = envUrl.replace(/\/$/, '');
    console.log('[Teacher Socket] Using VITE_API_BASE_URL from env:', cleanUrl);
    return cleanUrl;
  }

  // Auto-detect production environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProduction = hostname.includes('dvisionacademy.com');

    if (isProduction) {
      // Try api subdomain first, fallback to same domain
      const protocol = window.location.protocol;
      let apiUrl;
      if (hostname.startsWith('www.')) {
        apiUrl = `${protocol}//api.${hostname.substring(4)}/api`;
      } else if (!hostname.startsWith('api.')) {
        apiUrl = `${protocol}//api.${hostname}/api`;
      } else {
        apiUrl = `${protocol}//${hostname}/api`;
      }
      console.log('[Teacher Socket] Production detected. Hostname:', hostname, '→ API URL:', apiUrl);
      return apiUrl;
    } else {
      console.log('[Teacher Socket] Development mode. Hostname:', hostname);
    }
  }

  // Default to localhost for development
  const defaultUrl = 'http://localhost:5000/api';
  console.log('[Teacher Socket] Using default API URL:', defaultUrl);
  return defaultUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Socket.io connection URL (should be the base URL without /api)
const getSocketUrl = () => {
  try {
    // Explicit socket URL takes precedence
    if (import.meta.env.VITE_SOCKET_URL) {
      const clean = import.meta.env.VITE_SOCKET_URL.replace(/\/$/, '');
      console.log('[Teacher Socket] Using VITE_SOCKET_URL:', clean);
      return clean;
    }

    let url = API_BASE_URL;
    // Remove /api if present (handle both /api and /api/)
    url = url.replace(/\/api\/?$/, '');
    // Remove trailing slash
    url = url.replace(/\/$/, '');

    // If it's a full URL, parse it to get just the origin
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      const socketUrl = `${urlObj.protocol}//${urlObj.host}`;
      console.log('[Teacher Socket] Socket URL determined:', socketUrl, 'from API URL:', API_BASE_URL);
      return socketUrl;
    }
    // Default fallback
    const defaultSocket = 'http://localhost:5000';
    console.log('[Teacher Socket] Using default socket URL:', defaultSocket);
    return defaultSocket;
  } catch (error) {
    console.error('[Teacher Socket] Error parsing URL, using default:', error);
    return 'http://localhost:5000';
  }
};

const SOCKET_URL = getSocketUrl();
console.log('[Teacher Socket] Final SOCKET_URL:', SOCKET_URL);

/**
 * Live Class Room Component - Teacher Panel
 * Google Meet + Zoom level functionality
 */
const LiveClassRoom = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // State
  const [liveClass, setLiveClass] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' or 'environment'
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Chat & Participants
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [allParticipants, setAllParticipants] = useState([]);
  const [handRaisedStudents, setHandRaisedStudents] = useState([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Get current user ID for read tracking
  const getCurrentUserId = () => {
    const token = localStorage.getItem('dvision_teacher_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id;
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
    return null;
  };

  // Calculate unread message count
  const calculateUnreadCount = (messages) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return 0;

    return messages.filter(msg => {
      const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
      const isOwnMessage = msgUserId === currentUserId?.toString();
      if (isOwnMessage) return false; // Own messages are always considered read

      const hasRead = msg.readBy && msg.readBy.some(
        read => read.userId?.toString() === currentUserId?.toString()
      );
      return !hasRead;
    }).length;
  };

  // Chat scroll ref
  const chatMessagesEndRef = useRef(null);

  // Agora refs
  const clientRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const remoteUsersRef = useRef({});
  const localVideoContainerRef = useRef(null);

  const isComponentMounted = useRef(true);
  // Local Recording Refs
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartTimeRef = useRef(null);
  const accumulatedDurationRef = useRef(0);

  // Cloud recording state (Agora cloud recording)
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle, starting, recording, stopping, processing
  const [recordingError, setRecordingError] = useState(null);

  // Socket.io ref
  const socketRef = useRef(null);

  // Connection state
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected

  // UI chrome (header + bottom controls) auto-hide
  const [showChrome, setShowChrome] = useState(true);
  const chromeHideTimerRef = useRef(null);

  const scheduleChromeHide = useCallback(() => {
    if (chromeHideTimerRef.current) {
      clearTimeout(chromeHideTimerRef.current);
    }
    chromeHideTimerRef.current = setTimeout(() => {
      setShowChrome(false);
    }, 2000); // hide after 2 seconds of inactivity
  }, []);

  const handleUserActivity = useCallback(() => {
    setShowChrome(true);
    scheduleChromeHide();
  }, [scheduleChromeHide]);

  // Initialize class
  useEffect(() => {
    isComponentMounted.current = true;
    let isMounted = true;

    // Handle browser close/refresh race condition
    const handleBeforeUnload = () => {
      // Save duration if we are recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' && recordingStartTimeRef.current) {
        const sessionDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
        saveDurationToDB(id, accumulatedDurationRef.current + sessionDuration);
      }

      isComponentMounted.current = false;
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const init = async () => {
      // Cleanup any existing connections first
      await cleanup();
      if (isMounted) {
        await initializeClass();
      }
    };

    init();

    // start auto-hide timer after initial mount
    scheduleChromeHide();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      isMounted = false;
      isComponentMounted.current = false;
      // Prevent auto-upload on unmount/refresh
      // We only want upload on explicit Stop/End Class.
      if (mediaRecorderRef.current) {
        console.log('Unmounting: Disabling upload on stop');
        mediaRecorderRef.current.onstop = null;
      }
      // Save duration if we are recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' && recordingStartTimeRef.current) {
        const sessionDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
        saveDurationToDB(id, accumulatedDurationRef.current + sessionDuration);
      }

      cleanup();
      if (chromeHideTimerRef.current) {
        clearTimeout(chromeHideTimerRef.current);
      }
    };
  }, [id, scheduleChromeHide]);


  // Apply WhatsApp-like video styling and transform when camera facing changes
  useEffect(() => {
    const applyVideoStyling = () => {
      if (localVideoContainerRef.current) {
        // Find the video element inside the container
        const videoElement = localVideoContainerRef.current.querySelector('video') ||
          (localVideoContainerRef.current.tagName === 'VIDEO' ? localVideoContainerRef.current : null);
        if (videoElement) {
          // WhatsApp-like behavior: contain mode with black bars, centered
          videoElement.style.objectFit = 'contain';
          videoElement.style.width = '100%';
          videoElement.style.height = '100%';
          videoElement.style.maxWidth = '100%';
          videoElement.style.maxHeight = '100%';
          videoElement.style.position = 'absolute';
          videoElement.style.top = '50%';
          videoElement.style.left = '50%';
          videoElement.style.backgroundColor = 'black';

          // Apply camera mirror transform
          // Front camera (user): mirror (scaleX(-1)) for selfie view - left appears as right
          // Back camera (environment): no mirror (scaleX(1)) for natural view - shows as real eyes see
          const mirrorTransform = cameraFacing === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
          videoElement.style.transform = `translate(-50%, -50%) ${mirrorTransform}`;
          videoElement.style.transition = 'transform 0.2s ease-in-out';
          console.log('Applied video styling and transform for camera facing:', cameraFacing);
        }
      }
    };

    // Apply styling immediately and also after a short delay to ensure video element exists
    applyVideoStyling();
    const timeout = setTimeout(applyVideoStyling, 200);
    const interval = setInterval(applyVideoStyling, 1000); // Reapply periodically to handle orientation changes

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [cameraFacing, isVideoEnabled]);

  // Ensure local video is played when container is ready
  useEffect(() => {
    if (localVideoTrackRef.current && localVideoContainerRef.current && connectionState === 'connected' && isVideoEnabled) {
      const playVideo = () => {
        if (localVideoContainerRef.current && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
          try {
            const playPromise = localVideoTrackRef.current.play(localVideoContainerRef.current);
            if (playPromise && typeof playPromise.then === 'function') {
              playPromise.then(() => {
                console.log('Local video playing successfully in useEffect');
                // Apply transform after video starts playing
                setTimeout(() => {
                  const videoElement = localVideoContainerRef.current?.querySelector('video');
                  if (videoElement) {
                    videoElement.style.transform = cameraFacing === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
                    videoElement.style.transition = 'transform 0.2s ease-in-out';
                  }
                }, 100);
                setIsReconnecting(false);
              }).catch(err => {
                console.error('Error playing local video in useEffect:', err);
                // Retry after a short delay only if video is still enabled
                if (isVideoEnabled && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
                  setTimeout(playVideo, 200);
                }
              });
            } else {
              // play() returned undefined or not a promise - video might already be playing
              console.log('Video play returned non-promise, assuming success');
              setTimeout(() => {
                const videoElement = localVideoContainerRef.current?.querySelector('video');
                if (videoElement) {
                  videoElement.style.transform = cameraFacing === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
                  videoElement.style.transition = 'transform 0.2s ease-in-out';
                }
              }, 100);
              setIsReconnecting(false);
            }
          } catch (playErr) {
            console.error('Error calling play on local video in useEffect:', playErr);
            // Retry after a short delay only if video is still enabled
            if (isVideoEnabled && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
              setTimeout(playVideo, 200);
            }
          }
        }
      };
      playVideo();
    }
  }, [connectionState, isVideoEnabled, cameraFacing]);


  // Initialize Socket.io
  const initializeSocket = useCallback(() => {
    // Cleanup existing socket first to prevent duplicate listeners
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const token = localStorage.getItem('dvision_teacher_token');
    if (!token) {
      console.error('No auth token found');
      setError('Session expired. Please log in again.');
      navigate('/teacher/login', { replace: true });
      return;
    }

    // Ensure SOCKET_URL is correct
    const socketUrl = SOCKET_URL || 'http://localhost:5000';
    console.log('[Socket] Connecting to:', socketUrl, 'with token:', token ? 'Present' : 'Missing');

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10, // be more resilient to temporary drops
      path: '/socket.io/',
      autoConnect: true,
      forceNew: false,
      timeout: 60000 // increase timeout to reduce spurious "timeout" errors
    });

    socket.on('connect', () => {
      console.log('Teacher socket connected');
      setConnectionState('connected');
      setIsReconnecting(false);
      // Join room immediately after connection
      socket.emit('join-live-class', { liveClassId: id });
      console.log('Teacher joined live class room:', id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnectionState('disconnected');
      // Only show reconnecting if we were previously connected
      if (connectionState === 'connected') {
        setIsReconnecting(true);
      } else {
        setIsReconnecting(false);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      console.error('Socket error details:', {
        message: error.message,
        type: error.type,
        description: error.description,
        context: error.context,
        socketUrl: socketUrl
      });

      // Only show reconnecting if socket previously connected; avoid
      // showing spinner on initial connection issues
      if (connectionState === 'connected') {
        setIsReconnecting(true);
      } else {
        setIsReconnecting(false);
      }

      // If it's a namespace error, log additional info
      if (error.message && error.message.includes('namespace')) {
        console.warn('[Socket] Namespace error detected. Check if Socket.io server is running on:', socketUrl);
        console.warn('[Socket] Make sure the server URL does not include /api path');
      }
    });

    socket.on('reconnect', () => {
      console.log('Socket reconnected');
      setIsReconnecting(false);
      socket.emit('join-live-class', { liveClassId: id });
      // Refresh chat messages after reconnection
      setTimeout(() => {
        refreshChatMessages();
      }, 500);
    });

    // Chat events - ensure this listener is set up
    socket.on('chat-message', (message) => {
      console.log('Teacher received chat message:', message);
      console.log('Message details:', {
        userId: message.userId,
        userName: message.userName,
        userType: message.userType,
        message: message.message,
        messageId: message._id
      });
      setChatMessages(prev => {
        // Remove any temporary messages with the same content from the same user
        const filteredPrev = prev.filter(msg => {
          // Keep temporary messages that don't match this one
          if (msg._id && msg._id.toString().startsWith('temp-')) {
            const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
            const newMsgUserId = message.userId?._id?.toString() || message.userId?.toString() || message.userId;
            // Remove temp message if it matches the incoming message
            return !(msgUserId === newMsgUserId && msg.message === message.message);
          }
          return true;
        });

        // Check for duplicates (by _id or content)
        const isDuplicate = filteredPrev.some(msg => {
          if (msg._id && message._id && !msg._id.toString().startsWith('temp-')) {
            return msg._id.toString() === message._id.toString();
          }
          // Fallback: check userId, timestamp, and message content
          const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
          const newMsgUserId = message.userId?._id?.toString() || message.userId?.toString() || message.userId;
          return msgUserId === newMsgUserId &&
            msg.message === message.message &&
            Math.abs(new Date(msg.timestamp) - new Date(message.timestamp)) < 1000; // Within 1 second
        });

        if (isDuplicate) {
          console.log('Duplicate message ignored');
          return filteredPrev;
        }

        const newMessages = [...filteredPrev, message];

        // Update unread count if chat is closed and message is not from current user
        const currentUserId = getCurrentUserId();
        const msgUserId = message.userId?._id?.toString() || message.userId?.toString() || message.userId;
        const isOwnMessage = currentUserId && msgUserId && currentUserId.toString() === msgUserId.toString();

        if (!showChat && !isOwnMessage) {
          // Increment unread count for new messages when chat is closed
          setUnreadMessageCount(prev => prev + 1);
        }

        // Scroll to bottom after state update
        setTimeout(() => {
          chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return newMessages;
      });
    });

    // Participant events
    socket.on('user-joined', ({ userName, userRole }) => {
      console.log(`User joined: ${userName} (${userRole})`);
      // Refresh participants
      refreshParticipants();
    });

    socket.on('user-left', ({ userId, userName }) => {
      console.log(`User left: ${userName}`);
      // Immediately remove from local state for instant UI update
      setAllParticipants(prev => prev.filter(p => {
        const pUserId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
        return pUserId !== userId?.toString();
      }));
      // Also refresh from backend to ensure consistency
      setTimeout(() => refreshParticipants(), 500);
    });

    // Student kicked event
    socket.on('student-kicked', ({ userId }) => {
      console.log(`Student ${userId} was kicked`);
      // Refresh participants immediately
      refreshParticipants();
    });

    socket.on('participants-updated', ({ participants }) => {
      // Remove duplicates by userId and filter out participants who have left
      const uniqueParticipants = (participants || [])
        .filter((p, index, self) => {
          const userId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
          return self.findIndex(pp => {
            const ppUserId = pp.userId?._id?.toString() || pp.userId?.toString() || pp.userId;
            return ppUserId === userId;
          }) === index;
        })
        .filter(p => !p.leftAt); // Exclude participants who have left

      // Update participants list while preserving hand raise status from current state
      setAllParticipants(prev => {
        return uniqueParticipants.map(p => {
          const pUserIdStr = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
          // Check if this participant has raised hand in current state
          const existingParticipant = prev.find(ep => {
            const epUserIdStr = ep.userId?._id?.toString() || ep.userId?.toString() || ep.userId;
            return epUserIdStr === pUserIdStr;
          });
          // Preserve hasRaisedHand from existing state or use from new data
          return {
            ...p,
            hasRaisedHand: existingParticipant?.hasRaisedHand || p.hasRaisedHand || false
          };
        });
      });
    });

    // Real-time participant status update (mic/video status)
    socket.on('participant-status-updated', ({ userId, isMuted, isVideoEnabled }) => {
      console.log('Participant status updated:', userId, 'muted:', isMuted, 'video:', isVideoEnabled);
      // Update local state immediately for instant UI update
      setAllParticipants(prev => prev.map(p => {
        const pUserId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
        if (pUserId === userId?.toString()) {
          return {
            ...p,
            isMuted: isMuted !== undefined ? isMuted : p.isMuted,
            isVideoEnabled: isVideoEnabled !== undefined ? isVideoEnabled : p.isVideoEnabled
          };
        }
        return p;
      }));
      // Also refresh from server to ensure consistency (with delay to avoid too many requests)
      setTimeout(() => refreshParticipants(), 500);
    });

    // Hand raise events - ensure this listener is set up
    socket.on('hand-raise-updated', ({ userId, userName, hasRaisedHand }) => {
      console.log('Teacher received hand-raise-updated:', { userId, userName, hasRaisedHand });
      const userIdStr = userId?.toString();

      // Update hand raised students list
      if (hasRaisedHand) {
        setHandRaisedStudents(prev => {
          // Check if already exists
          const exists = prev.find(s => {
            const sUserIdStr = s.userId?.toString();
            return sUserIdStr === userIdStr;
          });
          if (!exists) {
            console.log('Adding student to hand raised list:', userName);
            return [...prev, { userId: userIdStr, userName }];
          }
          return prev;
        });
      } else {
        setHandRaisedStudents(prev => {
          const filtered = prev.filter(s => {
            const sUserIdStr = s.userId?.toString();
            return sUserIdStr !== userIdStr;
          });
          console.log('Removing student from hand raised list:', userName);
          return filtered;
        });
      }

      // Instantly update participants list with hand raise status
      setAllParticipants(prev => prev.map(p => {
        const pUserIdStr = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
        if (pUserIdStr === userIdStr) {
          return {
            ...p,
            hasRaisedHand: hasRaisedHand
          };
        }
        return p;
      }));
    });

    // Error events
    socket.on('error', ({ message }) => {
      console.error('Socket error:', message);
    });

    socketRef.current = socket;

    // If socket is already connected, join room immediately
    if (socket.connected) {
      console.log('Teacher socket already connected, joining room');
      socket.emit('join-live-class', { liveClassId: id });
    }

    return socket;
  }, [id]);

  // Refresh chat messages from backend
  const refreshChatMessages = async () => {
    try {
      const response = await liveClassAPI.getLiveClass(id);
      if (response.success && response.data?.liveClass) {
        const messages = response.data.liveClass.chatMessages || [];
        // Remove duplicates
        const uniqueMessages = messages.filter((msg, index, self) => {
          if (msg._id) {
            return self.findIndex(m => m._id?.toString() === msg._id.toString()) === index;
          }
          const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
          return self.findIndex(m => {
            const mUserId = m.userId?._id?.toString() || m.userId?.toString() || m.userId;
            return mUserId === msgUserId &&
              m.message === msg.message &&
              Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 1000;
          }) === index;
        });
        setChatMessages(uniqueMessages);
      }
    } catch (err) {
      console.error('Error refreshing chat messages:', err);
    }
  };

  // Refresh participants from backend
  const refreshParticipants = async () => {
    try {
      const response = await liveClassAPI.getLiveClass(id);
      if (response.success && response.data?.liveClass) {
        const participants = response.data.liveClass.participants || [];
        // Remove duplicates by userId and filter out participants who have left
        const uniqueParticipants = participants
          .filter((p, index, self) => {
            const userId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
            return self.findIndex(pp => {
              const ppUserId = pp.userId?._id?.toString() || pp.userId?.toString() || pp.userId;
              return ppUserId === userId;
            }) === index;
          })
          .filter(p => !p.leftAt); // Exclude participants who have left
        setAllParticipants(uniqueParticipants);
      }
    } catch (err) {
      console.error('Error refreshing participants:', err);
    }
  };

  // Initialize class
  const initializeClass = async () => {
    try {
      setIsLoading(true);
      setError('');
      setConnectionState('connecting');

      // Get live class details and join token
      const response = await liveClassAPI.joinLiveClass(id);
      if (response.success && response.data) {
        const { liveClass: classData, agoraToken, agoraAppId, agoraChannelName, agoraUid, unreadMessageCount: initialUnreadCount } = response.data;
        setLiveClass(classData);
        // Remove duplicates from initial chat messages
        const initialMessages = classData.chatMessages || [];
        const uniqueMessages = initialMessages.filter((msg, index, self) => {
          if (msg._id) {
            return self.findIndex(m => m._id?.toString() === msg._id.toString()) === index;
          }
          // Fallback: check userId, timestamp, and message content
          const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
          return self.findIndex(m => {
            const mUserId = m.userId?._id?.toString() || m.userId?.toString() || m.userId;
            return mUserId === msgUserId &&
              m.message === msg.message &&
              m.timestamp === msg.timestamp;
          }) === index;
        });
        setChatMessages(uniqueMessages);

        // Set initial unread count from backend or calculate it
        const unreadCount = initialUnreadCount !== undefined ? initialUnreadCount : calculateUnreadCount(uniqueMessages);
        setUnreadMessageCount(unreadCount);
        // Remove duplicates from initial participants and filter out those who have left
        const participants = classData.participants || [];
        const uniqueParticipants = participants
          .filter((p, index, self) => {
            const userId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
            return self.findIndex(pp => {
              const ppUserId = pp.userId?._id?.toString() || pp.userId?.toString() || pp.userId;
              return ppUserId === userId;
            }) === index;
          })
          .filter(p => !p.leftAt); // Exclude participants who have left
        setAllParticipants(uniqueParticipants);

        // Initialize Socket.io first
        initializeSocket();

        // Initialize Agora
        await initializeAgora(agoraAppId, agoraToken, agoraChannelName, agoraUid);
      } else {
        setError('Failed to join class');
      }
    } catch (err) {
      console.error('Error initializing class:', err);
      setError(err.message || 'Failed to join class');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Agora
  const initializeAgora = async (appId, token, channelName, uid) => {
    try {
      // Create Agora client with optimized settings
      const client = AgoraRTC.createClient({
        mode: 'rtc',
        codec: 'vp8',
        enableAudio: true,
        enableVideo: true
      });
      clientRef.current = client;

      // Enable echo cancellation and noise suppression
      await AgoraRTC.setParameter('AUDIO_AINS_AGGRESSIVE', 'high');
      await AgoraRTC.setParameter('AUDIO_AINS_STRENGTH', 'high');

      // Set up event handlers
      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);
      client.on('user-left', handleUserLeft);
      client.on('connection-state-change', handleConnectionStateChange);
      client.on('token-privilege-will-expire', handleTokenExpiry);

      // Handle Agora exceptions/warnings (suppress non-critical warnings)
      client.on('exception', (evt) => {
        // Filter out common non-critical warnings
        const nonCriticalCodes = [2001, 2003, 4003]; // AUDIO_INPUT_LEVEL_TOO_LOW, SEND_AUDIO_BITRATE_TOO_LOW, SEND_AUDIO_BITRATE_TOO_LOW_RECOVER
        if (nonCriticalCodes.includes(evt.code)) {
          // These are informational warnings, not errors - suppress them
          return;
        }
        // Log other exceptions
        console.warn('Agora exception:', evt.code, evt.msg);
      });

      // Join channel
      await client.join(appId, channelName, token, uid);
      console.log('Successfully joined Agora channel');
      setConnectionState('connected');
      setIsReconnecting(false);

      // Create and publish local tracks
      await createLocalTracks();
    } catch (err) {
      console.error('Error initializing Agora:', err);
      setError('Failed to initialize video/audio. Please check permissions.');
      throw err;
    }
  };

  // Create local tracks
  const createLocalTracks = async () => {
    try {
      // Create audio track with optimized settings
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'speech_standard',
        AEC: true, // Echo cancellation
        ANS: true, // Noise suppression
        AGC: true  // Auto gain control
      });
      localAudioTrackRef.current = audioTrack;

      // Set initial volume to 100
      await audioTrack.setVolume(100);

      // Get available cameras and detect initial camera facing
      const cameras = await AgoraRTC.getCameras();

      // Filter out virtual/screen cameras - only use real physical cameras
      const physicalCameras = cameras.filter(device => {
        const label = (device.label || '').toLowerCase();
        return !label.includes('virtual') &&
          !label.includes('screen') &&
          !label.includes('obs') &&
          !label.includes('capture') &&
          !label.includes('dshow') &&
          device.deviceId &&
          device.deviceId.length > 0;
      });

      let initialCameraId = undefined;
      let initialFacing = 'user'; // Default to front camera

      if (physicalCameras.length > 0) {
        // Try to find front camera first, otherwise use first available
        const frontCamera = physicalCameras.find(cam => {
          const label = (cam.label || '').toLowerCase();
          return label.includes('front') || label.includes('user') ||
            (label.includes('facing') && label.includes('user'));
        });
        initialCameraId = frontCamera ? frontCamera.deviceId : physicalCameras[0].deviceId;
      }

      // Create video track with camera selection
      const videoTrack = await AgoraRTC.createCameraVideoTrack({
        cameraId: initialCameraId,
        encoderConfig: {
          width: 1280,
          height: 720,
          frameRate: 30,
          bitrateMax: 2000
        }
      });
      localVideoTrackRef.current = videoTrack;

      // Wait a bit for track to initialize, then detect facingMode
      await new Promise(resolve => setTimeout(resolve, 200));

      // Detect initial camera facing from track settings
      const trackSettings = videoTrack.getMediaStreamTrack()?.getSettings();
      if (trackSettings && trackSettings.facingMode) {
        initialFacing = trackSettings.facingMode; // 'user' or 'environment'
        console.log('Initial camera facingMode detected:', initialFacing);
      } else if (physicalCameras.length > 0) {
        // Fallback to label detection
        const selectedCamera = physicalCameras.find(cam => cam.deviceId === initialCameraId) || physicalCameras[0];
        const label = (selectedCamera.label || '').toLowerCase();
        const isBack = label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('world');
        initialFacing = isBack ? 'environment' : 'user';
        console.log('Initial camera facingMode from label:', initialFacing);
      }

      setCameraFacing(initialFacing);

      // Play local video in full screen container - with retry logic
      const playLocalVideo = (retryCount = 0) => {
        if (localVideoContainerRef.current && videoTrack && videoTrack.enabled) {
          try {
            const playPromise = videoTrack.play(localVideoContainerRef.current);
            if (playPromise && typeof playPromise.then === 'function') {
              playPromise.then(() => {
                console.log('Local video playing successfully');
                setConnectionState('connected');
                setIsReconnecting(false);
              }).catch(err => {
                console.error('Error playing local video:', err);
                // Retry up to 10 times
                if (retryCount < 10 && videoTrack && videoTrack.enabled) {
                  setTimeout(() => playLocalVideo(retryCount + 1), 200);
                } else {
                  console.error('Failed to play local video after retries');
                }
              });
            } else {
              // play() returned undefined or not a promise - video might already be playing
              console.log('Video play returned non-promise, assuming success');
              setConnectionState('connected');
              setIsReconnecting(false);
            }
          } catch (playErr) {
            console.error('Error calling play on local video track:', playErr);
            // Retry up to 10 times
            if (retryCount < 10 && videoTrack && videoTrack.enabled) {
              setTimeout(() => playLocalVideo(retryCount + 1), 200);
            } else {
              console.error('Failed to play local video after retries');
            }
          }
        } else if (retryCount < 20 && videoTrack) {
          // Container not ready, retry
          setTimeout(() => playLocalVideo(retryCount + 1), 100);
        }
      };
      playLocalVideo();

      // Publish tracks
      await clientRef.current.publish([audioTrack, videoTrack]);

      // Update status via socket
      if (socketRef.current) {
        socketRef.current.emit('participant-status', {
          liveClassId: id,
          isMuted: false,
          isVideoEnabled: true
        });
      }


    } catch (err) {
      console.error('Error creating local tracks:', err);
      if (err.message.includes('permission')) {
        setError('Camera/Microphone permission denied. Please allow access.');
      } else {
        setError('Failed to access camera/microphone');
      }
      throw err;
    }
  };






  // Handle user published
  const handleUserPublished = async (user, mediaType) => {
    try {
      // Check if user has the media type available before subscribing
      if (mediaType === 'video' && !user.hasVideo) {
        console.warn('[Agora] User does not have video stream available');
        return;
      }
      if (mediaType === 'audio' && !user.hasAudio) {
        console.warn('[Agora] User does not have audio stream available');
        return;
      }

      try {
        await clientRef.current.subscribe(user, mediaType);
      } catch (subscribeError) {
        // Handle "no such stream id" error gracefully
        if (subscribeError.message && subscribeError.message.includes('no such stream id')) {
          console.warn('[Agora] Stream not available yet, will retry:', {
            userId: user.uid,
            mediaType,
            error: subscribeError.message
          });
          // Retry after a short delay
          setTimeout(async () => {
            try {
              await clientRef.current.subscribe(user, mediaType);
            } catch (retryError) {
              console.error('[Agora] Retry subscribe failed:', retryError);
            }
          }, 1000);
          return;
        }
        throw subscribeError;
      }

      if (mediaType === 'video') {
        remoteUsersRef.current[user.uid] = user;
        refreshParticipants();

        // Play remote video
        const playVideo = (retryCount = 0) => {
          const container = document.getElementById(`remote-video-${user.uid}`);
          if (container && user.videoTrack) {
            try {
              const playPromise = user.videoTrack.play(container);
              if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(err => {
                  console.error('Error playing remote video:', err);
                });
              }
            } catch (playErr) {
              console.error('Error calling play on remote video track:', playErr);
            }
          } else if (user.videoTrack && retryCount < 10) {
            setTimeout(() => playVideo(retryCount + 1), 100);
          }
        };
        playVideo();
      }

      if (mediaType === 'audio') {
        if (user.audioTrack) {
          try {
            const playPromise = user.audioTrack.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(err => {
                console.error('Error playing remote audio:', err);
              });
            }
          } catch (playErr) {
            console.error('Error calling play on remote audio track:', playErr);
          }
        }
      }
    } catch (err) {
      console.error('Error handling user published:', err);
    }
  };

  // Handle user unpublished
  const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === 'video') {
      delete remoteUsersRef.current[user.uid];
      refreshParticipants();
    }
  };

  // Handle user left
  const handleUserLeft = (user) => {
    delete remoteUsersRef.current[user.uid];
    refreshParticipants();
  };

  // Handle connection state change
  const handleConnectionStateChange = (curState, revState) => {
    console.log('Agora connection state:', curState, 'Previous:', revState);
    if (curState === 'CONNECTING') {
      setConnectionState('connecting');
      // Only show reconnecting spinner if we were previously fully connected
      // This prevents brief CONNECTING states at startup from flashing the loader
      if (connectionState === 'connected') {
        setIsReconnecting(true);
      }
    } else if (curState === 'CONNECTED') {
      setConnectionState('connected');
      setIsReconnecting(false);
      // Ensure video is playing when connected
      if (localVideoTrackRef.current && localVideoContainerRef.current && localVideoTrackRef.current.enabled) {
        try {
          const playPromise = localVideoTrackRef.current.play(localVideoContainerRef.current);
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(err => {
              console.error('Error playing video after connection:', err);
            });
          }
        } catch (playErr) {
          console.error('Error calling play on video after connection:', playErr);
        }
      }
    } else if (curState === 'DISCONNECTED') {
      setConnectionState('disconnected');
      // Do NOT force rejoin here. Agora will emit RECONNECTING/CONNECTED
      // when it can recover. For intentional leave/end-class we call
      // client.leave() in our own cleanup logic.
      console.log('Agora client disconnected; waiting for explicit leave or internal reconnection');
      // Keep isReconnecting as-is; RECONNECTING state will control the spinner.
    } else if (curState === 'RECONNECTING') {
      setConnectionState('connecting');
      setIsReconnecting(true);
    }
  };

  // Handle token expiry
  const handleTokenExpiry = async () => {
    try {
      const response = await liveClassAPI.joinLiveClass(id);
      if (response.success && response.data) {
        const { agoraToken } = response.data;
        await clientRef.current.renewToken(agoraToken);
      }
    } catch (err) {
      console.error('Error renewing token:', err);
    }
  };

  // Toggle mute
  const toggleMute = async () => {
    try {
      if (localAudioTrackRef.current && clientRef.current) {
        const newMutedState = !isMuted;

        if (newMutedState) {
          // Muting: Set volume to 0 first, then disable
          await localAudioTrackRef.current.setVolume(0);
          await localAudioTrackRef.current.setEnabled(false);
          console.log('Teacher audio track muted');
        } else {
          // Unmuting: Enable first, then set volume
          console.log('Unmuting teacher audio track...');

          // First, ensure volume is set to 100 before enabling
          await localAudioTrackRef.current.setVolume(100);

          // Then enable the track
          await localAudioTrackRef.current.setEnabled(true);

          // Wait a bit for track to be fully enabled and initialized
          await new Promise(resolve => setTimeout(resolve, 300));

          // Verify track is enabled
          const isEnabled = localAudioTrackRef.current.enabled;
          console.log('Teacher audio track enabled:', isEnabled);

          // Double-check volume is set correctly (set it again to ensure)
          await localAudioTrackRef.current.setVolume(100);

          // If track is still not properly enabled, try republishing
          if (!isEnabled) {
            console.warn('Teacher audio track not enabled after unmute, attempting republish...');
            try {
              // Unpublish and republish to ensure track is active
              await clientRef.current.unpublish([localAudioTrackRef.current]);
              await new Promise(resolve => setTimeout(resolve, 200));
              await localAudioTrackRef.current.setVolume(100);
              await localAudioTrackRef.current.setEnabled(true);
              await clientRef.current.publish([localAudioTrackRef.current]);
              console.log('Teacher audio track republished successfully');
            } catch (repubErr) {
              console.error('Error republishing teacher audio track:', repubErr);
            }
          }
        }

        setIsMuted(newMutedState);

        if (socketRef.current) {
          socketRef.current.emit('participant-status', {
            liveClassId: id,
            isMuted: newMutedState,
            isVideoEnabled
          });
        }
      }
    } catch (err) {
      console.error('Error toggling mute:', err);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    try {
      if (localVideoTrackRef.current) {
        const newVideoState = !isVideoEnabled;

        if (newVideoState) {
          // Turning video on: Enable first, then play
          await localVideoTrackRef.current.setEnabled(true);
          setIsVideoEnabled(true);

          // Wait a bit for track to be enabled
          await new Promise(resolve => setTimeout(resolve, 200));

          // Play video in container if it exists
          if (localVideoContainerRef.current && localVideoTrackRef.current.enabled) {
            try {
              const playPromise = localVideoTrackRef.current.play(localVideoContainerRef.current);
              if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(err => {
                  console.error('Error playing video after enabling:', err);
                });
              }
            } catch (playErr) {
              console.error('Error playing video:', playErr);
            }
          }
        } else {
          // Turning video off: Stop playing first, then disable
          if (localVideoContainerRef.current && localVideoTrackRef.current) {
            try {
              localVideoTrackRef.current.stop();
            } catch (stopErr) {
              console.warn('Error stopping video track:', stopErr);
            }
          }
          await localVideoTrackRef.current.setEnabled(false);
          setIsVideoEnabled(false);
        }

        if (socketRef.current) {
          socketRef.current.emit('participant-status', {
            liveClassId: id,
            isMuted,
            isVideoEnabled: newVideoState
          });
        }
      }
    } catch (err) {
      console.error('Error toggling video:', err);
    }
  };

  // Switch camera (front/back)
  const switchCamera = async () => {
    try {
      if (!localVideoTrackRef.current || !clientRef.current) return;

      const devices = await AgoraRTC.getCameras();

      // Filter out virtual/screen cameras - only use real physical cameras
      const physicalCameras = devices.filter(device => {
        const label = (device.label || '').toLowerCase();
        // Exclude virtual cameras, screen captures, and OBS/streaming software cameras
        return !label.includes('virtual') &&
          !label.includes('screen') &&
          !label.includes('obs') &&
          !label.includes('capture') &&
          !label.includes('dshow') &&
          device.deviceId &&
          device.deviceId.length > 0;
      });

      if (physicalCameras.length === 0) {
        console.warn('No physical cameras found');
        return;
      }

      const currentSettings = localVideoTrackRef.current.getMediaStreamTrack()?.getSettings();
      const currentDeviceId = currentSettings?.deviceId || localVideoTrackRef.current.getDeviceId?.();

      // Find the next physical camera
      let nextDevice = physicalCameras.find(d => d.deviceId && d.deviceId !== currentDeviceId);
      if (!nextDevice && physicalCameras.length > 1) {
        nextDevice = physicalCameras.find(d => d.deviceId !== currentDeviceId) || physicalCameras[0];
      } else if (!nextDevice && physicalCameras.length === 1) {
        // Only one camera available, can't switch
        console.warn('Only one camera available, cannot switch');
        return;
      }

      if (nextDevice) {
        console.log('[Camera Switch] Starting camera switch to:', nextDevice.label || nextDevice.deviceId);

        // Store reference to old track
        const oldVideoTrack = localVideoTrackRef.current;
        const wasVideoEnabled = oldVideoTrack.enabled;

        // Unpublish the old video track first
        try {
          await clientRef.current.unpublish([oldVideoTrack]);
          console.log('[Camera Switch] Old video track unpublished');
        } catch (unpublishErr) {
          console.warn('[Camera Switch] Error unpublishing old track:', unpublishErr);
          // Continue anyway - track might not be published
        }

        // Create a completely new video track with the new camera
        // This ensures Agora Recording sees a new stream and continues recording
        const newVideoTrack = await AgoraRTC.createCameraVideoTrack({
          cameraId: nextDevice.deviceId,
          encoderConfig: {
            width: 1280,
            height: 720,
            frameRate: 30,
            bitrateMax: 2000
          }
        });

        // Wait a bit for track to initialize
        await new Promise(resolve => setTimeout(resolve, 150));

        // Get the actual facingMode from MediaTrackSettings (most reliable method)
        const trackSettings = newVideoTrack.getMediaStreamTrack()?.getSettings();
        let detectedFacing = null;

        if (trackSettings && trackSettings.facingMode) {
          // facingMode can be 'user' (front) or 'environment' (back)
          detectedFacing = trackSettings.facingMode;
          console.log('[Camera Switch] Detected facingMode from track settings:', detectedFacing);
        } else {
          // Fallback to device label detection if facingMode is not available
          const deviceLabel = (nextDevice.label || '').toLowerCase();

          // Check for back/rear/environment keywords first
          const isBackCamera = deviceLabel.includes('back') ||
            deviceLabel.includes('rear') ||
            deviceLabel.includes('environment') ||
            deviceLabel.includes('world');

          // Front camera keywords
          const isFrontCamera = deviceLabel.includes('front') ||
            deviceLabel.includes('user') ||
            (deviceLabel.includes('facing') && deviceLabel.includes('user'));

          // Determine facing from label
          detectedFacing = isBackCamera ? 'environment' : (isFrontCamera ? 'user' : 'environment');
          console.log('[Camera Switch] Detected facingMode from device label:', detectedFacing, 'Label:', deviceLabel);
        }

        // Update camera facing state
        setCameraFacing(detectedFacing);
        console.log('[Camera Switch] Switched camera to device:', nextDevice.label || nextDevice.deviceId, 'Facing:', detectedFacing);

        // Set enabled state to match previous state
        await newVideoTrack.setEnabled(wasVideoEnabled);

        // Update the ref to point to the new track
        localVideoTrackRef.current = newVideoTrack;

        // Publish the new video track (audio track remains unchanged)
        try {
          await clientRef.current.publish([newVideoTrack]);
          console.log('[Camera Switch] New video track published successfully');
        } catch (publishErr) {
          console.error('[Camera Switch] Error publishing new video track:', publishErr);
          throw publishErr;
        }

        // Stop and close the old video track to free resources
        try {
          oldVideoTrack.stop();
          oldVideoTrack.close();
          console.log('[Camera Switch] Old video track stopped and closed');
        } catch (closeErr) {
          console.warn('[Camera Switch] Error closing old track:', closeErr);
        }

        // Play the new video track in the container
        if (localVideoContainerRef.current && newVideoTrack && newVideoTrack.enabled) {
          try {
            await newVideoTrack.play(localVideoContainerRef.current);
            console.log('[Camera Switch] New video track playing successfully');

            // Apply correct transform to video element after switch
            setTimeout(() => {
              const videoElement = localVideoContainerRef.current?.querySelector('video') ||
                (localVideoContainerRef.current?.tagName === 'VIDEO' ? localVideoContainerRef.current : null);
              if (videoElement) {
                // Front camera (user): mirror for selfie view
                // Back camera (environment): no mirror for natural view
                if (detectedFacing === 'user') {
                  videoElement.style.transform = 'scaleX(-1)';
                } else {
                  videoElement.style.transform = 'scaleX(1)';
                }
                videoElement.style.transition = 'transform 0.2s ease-in-out';
                console.log('[Camera Switch] Applied video transform:', detectedFacing);
              }
            }, 100);
          } catch (playErr) {
            console.warn('[Camera Switch] Error playing new video track:', playErr);
            // Retry after a short delay
            setTimeout(async () => {
              if (localVideoContainerRef.current && newVideoTrack && newVideoTrack.enabled) {
                try {
                  await newVideoTrack.play(localVideoContainerRef.current);
                  // Apply transform after retry
                  setTimeout(() => {
                    const videoElement = localVideoContainerRef.current?.querySelector('video');
                    if (videoElement) {
                      videoElement.style.transform = detectedFacing === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
                      videoElement.style.transition = 'transform 0.2s ease-in-out';
                    }
                  }, 100);
                } catch (retryErr) {
                  console.error('[Camera Switch] Error replaying video on retry:', retryErr);
                }
              }
            }, 300);
          }
        }

        // Update status via socket
        if (socketRef.current) {
          socketRef.current.emit('participant-status', {
            liveClassId: id,
            isMuted: !localAudioTrackRef.current?.enabled,
            isVideoEnabled: newVideoTrack.enabled
          });
        }

        console.log('[Camera Switch] Camera switch completed successfully');
      } else {
        console.warn('[Camera Switch] No alternative camera found to switch');
      }
    } catch (err) {
      console.error('[Camera Switch] Error switching camera:', err);
      setError('Failed to switch camera. Please try again.');
    }
  };

  // Mute participant (teacher only)
  const muteParticipant = async (userId) => {
    try {
      // Find the participant to get their Agora UID
      const participant = students.find(p => {
        const pUserId = p.userId?._id?.toString() || p.userId?.toString();
        return pUserId === userId?.toString();
      });

      // Get Agora UID from participant or find in remote users
      let agoraUid = null;
      if (participant && participant.agoraUid) {
        agoraUid = participant.agoraUid;
      } else {
        // Try to find in remote users - check all remote users
        const remoteUser = Object.values(remoteUsersRef.current)[0]; // Get first remote user (student)
        if (remoteUser) {
          agoraUid = remoteUser.uid;
        }
      }

      // Use Agora's remote mute functionality to mute on teacher's side
      if (clientRef.current && agoraUid) {
        try {
          await clientRef.current.muteRemoteAudioStream(agoraUid, true);
          console.log('Muted remote user audio via Agora, UID:', agoraUid);
        } catch (agoraErr) {
          console.error('Error muting via Agora:', agoraErr);
        }
      }

      // Emit socket event to tell student to mute their local track
      if (socketRef.current) {
        socketRef.current.emit('participant-mute', {
          liveClassId: id,
          targetUserId: userId,
          muted: true
        });
        refreshParticipants();
      }
    } catch (err) {
      console.error('Error muting participant:', err);
    }
  };

  // Unmute participant
  const unmuteParticipant = async (userId) => {
    try {
      // Find the participant to get their Agora UID
      const participant = students.find(p => {
        const pUserId = p.userId?._id?.toString() || p.userId?.toString();
        return pUserId === userId?.toString();
      });

      // Get Agora UID from participant or find in remote users
      let agoraUid = null;
      if (participant && participant.agoraUid) {
        agoraUid = participant.agoraUid;
      } else {
        // Try to find in remote users
        const remoteUser = Object.values(remoteUsersRef.current)[0]; // Get first remote user (student)
        if (remoteUser) {
          agoraUid = remoteUser.uid;
        }
      }

      // Use Agora's remote unmute functionality
      if (clientRef.current && agoraUid) {
        try {
          await clientRef.current.muteRemoteAudioStream(agoraUid, false);
          console.log('Unmuted remote user audio via Agora, UID:', agoraUid);
        } catch (agoraErr) {
          console.error('Error unmuting via Agora:', agoraErr);
        }
      }

      // Emit socket event to tell student to unmute their local track
      if (socketRef.current) {
        socketRef.current.emit('participant-mute', {
          liveClassId: id,
          targetUserId: userId,
          muted: false
        });
        refreshParticipants();
      }
    } catch (err) {
      console.error('Error unmuting participant:', err);
    }
  };

  // Kick student
  const kickStudent = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this student from the class?')) {
      return;
    }

    try {
      if (socketRef.current) {
        // Immediately remove from local state for instant UI update
        setAllParticipants(prev => prev.filter(p => {
          const pUserId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
          return pUserId !== userId?.toString();
        }));

        socketRef.current.emit('kick-student', {
          liveClassId: id,
          targetUserId: userId
        });

        // Refresh from backend after a short delay to ensure consistency
        setTimeout(() => refreshParticipants(), 1000);
      }
    } catch (err) {
      console.error('Error kicking student:', err);
      // Revert on error by refreshing
      refreshParticipants();
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      if (unreadMessageCount > 0) {
        const response = await liveClassAPI.markChatAsRead(id);
        if (response.success) {
          setUnreadMessageCount(0);
          // Update local messages to mark them as read
          setChatMessages(prev => prev.map(msg => {
            const currentUserId = getCurrentUserId();
            const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
            const isOwnMessage = currentUserId && msgUserId && currentUserId.toString() === msgUserId.toString();

            if (isOwnMessage) return msg; // Own messages are already considered read

            const hasRead = msg.readBy && msg.readBy.some(
              read => read.userId?.toString() === currentUserId?.toString()
            );

            if (!hasRead) {
              return {
                ...msg,
                readBy: [
                  ...(msg.readBy || []),
                  { userId: currentUserId, readAt: new Date() }
                ]
              };
            }
            return msg;
          }));
        }
      }
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('dvision_teacher_token');
      if (!token) {
        setError('Session expired. Please log in again.');
        navigate('/teacher/login', { replace: true });
        return;
      }

      if (!socketRef.current) {
        console.error('Socket not initialized, re-initializing...');
        initializeSocket();
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!socketRef.current || !socketRef.current.connected) {
          alert('Connection not established. Please refresh the page.');
          return;
        }
      }

      if (!socketRef.current.connected) {
        console.error('Socket not connected, attempting to reconnect...');
        socketRef.current.connect();
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!socketRef.current.connected) {
          alert('Connection lost. Please refresh the page.');
          return;
        }
      }

      const messageText = newMessage.trim();
      console.log('Teacher sending chat message:', messageText);
      console.log('Socket connected:', socketRef.current.connected);
      console.log('Socket ID:', socketRef.current.id);

      // Optimistically add message to UI (will be confirmed by socket event)
      const tempMessage = {
        userId: liveClass?.teacherId?._id || liveClass?.teacherId,
        userType: 'Teacher',
        userName: 'You',
        message: messageText,
        timestamp: new Date(),
        _id: `temp-${Date.now()}`
      };

      setChatMessages(prev => [...prev, tempMessage]);
      setNewMessage('');

      // Emit to socket
      socketRef.current.emit('chat-message', {
        liveClassId: id,
        message: messageText
      });

      console.log('Chat message emitted to socket');

      // Scroll to bottom after sending
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    }
  };



  // Start local recording
  const startLocalRecording = async (skipBackendCall = false) => {
    try {
      if (!localVideoTrackRef.current || !localAudioTrackRef.current) {
        throw new Error('Audio/Video tracks not ready');
      }

      const stream = new MediaStream();
      if (localVideoTrackRef.current) stream.addTrack(localVideoTrackRef.current.getMediaStreamTrack());
      if (localAudioTrackRef.current) stream.addTrack(localAudioTrackRef.current.getMediaStreamTrack());
      // Make sure we have a video track if available, else just audio?
      // For class recording, video is expected.

      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        delete options.mimeType; // use default
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options.mimeType ? options : undefined);
      // Don't rely on memory only, simple buffer for immediate logic
      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
          // Save to IndexedDB for persistence
          await saveChunkToDB(id, e.data);
        }
      };

      mediaRecorderRef.current.start(1000); // 1s chunks

      // Start timer tracking
      recordingStartTimeRef.current = Date.now();

      // Call Backend to update status (Only if not skipping)
      if (!skipBackendCall) {
        await liveClassAPI.startRecording(id);
      }

      setRecordingStatus('recording');
      console.log('[Recording] Local MediaRecorder started and synced');

    } catch (err) {
      console.error('[Recording] Start failed:', err);
      setRecordingStatus('idle');
      alert('Failed to start recording: ' + err.message);
    }
  };

  // Stop local recording
  const stopLocalRecording = async () => {
    return new Promise((resolve) => {
      // If inactive, just cleanup
      if (!mediaRecorderRef.current) {
        setRecordingStatus('idle');
        resolve();
        return;
      }

      setRecordingStatus('processing');

      // We need to stop the recorder first to get final chunk
      // We need to stop the recorder first to get final chunk
      const finishUpload = async () => {
        // Prevent upload if component is unmounted (e.g. leaving class)
        // This ensures we don't create "Partial Recordings".
        // The chunks stay in IDB and will be merged on next session join.
        if (!isComponentMounted.current) {
          console.log('[Recording] Component unmounted, skipping upload. Chunks preserved in DB.');
          return;
        }

        try {
          // Get all chunks from DB (Persisted source of truth)
          const persistedChunks = await getChunksFromDB(id);
          // Fallback to ref if DB fails or is empty (rare in this flow)
          const finalChunks = persistedChunks.length > 0 ? persistedChunks : recordedChunksRef.current;

          if (finalChunks.length === 0) {
            console.warn('[Recording] No chunks found to upload');
            setRecordingStatus('idle');
            resolve();
            return;
          }

          const blob = new Blob(finalChunks, { type: 'video/webm' });
          const file = new File([blob], `recording_${id}_${Date.now()}.webm`, { type: 'video/webm' });

          // Calculate duration
          let sessionDuration = 0;
          if (recordingStartTimeRef.current) {
            sessionDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
            recordingStartTimeRef.current = null;
          }
          const totalDuration = Math.round(accumulatedDurationRef.current + sessionDuration);
          accumulatedDurationRef.current = totalDuration; // Update Ref
          await saveDurationToDB(id, totalDuration); // Persist

          console.log('[Recording] Uploading to server...', file.size, 'Duration:', totalDuration);
          const response = await liveClassAPI.uploadRecording(id, file, totalDuration);

          if (response.success) {
            console.log('[Recording] Upload complete');
            alert('Recording uploaded successfully!');
            // Clear DB after successful upload
            await clearChunksFromDB(id);
            setRecordingStatus('idle');
            resolve(response.data);
          } else {
            throw new Error(response.message || 'Upload failed');
          }
        } catch (err) {
          console.error('[Recording] Upload failed:', err);
          alert('Failed to upload recording: ' + err.message);
          setRecordingStatus('idle'); // Or 'failed'
          resolve();
        }
      };

      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = finishUpload;
        mediaRecorderRef.current.stop();
      } else {
        finishUpload();
      }
    });
  };

  const handleStartRecording = () => {
    startLocalRecording();
  };

  const handleStopRecording = async () => {
    await stopLocalRecording(); // Uploads and finalizes
    // Backend status is updated by uploadRecording, but we could explicitly stop if needed.
    // Assuming uploadRecording sets 'completed'.
  };

  // Pause local recording
  const handlePauseRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();

      // Track duration
      if (recordingStartTimeRef.current) {
        accumulatedDurationRef.current += (Date.now() - recordingStartTimeRef.current) / 1000;
        recordingStartTimeRef.current = null;
        await saveDurationToDB(id, accumulatedDurationRef.current);
      }

      setRecordingStatus('paused');
      try {
        await liveClassAPI.pauseRecording(id);
      } catch (err) {
        console.error('Failed to sync pause status', err);
      }
    }
  };

  // Resume local recording
  const handleResumeRecording = async () => {
    // If recorder exists and paused (simple resume)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();

      recordingStartTimeRef.current = Date.now();

      setRecordingStatus('recording');
      try {
        await liveClassAPI.resumeRecording(id);
      } catch (err) {
        console.error('Failed to sync resume status', err);
      }
    }
    // If recorder missing but status was paused (Rejoin scenario)
    else if (!mediaRecorderRef.current && recordingStatus === 'paused') {
      // Start new recorder instance (Skip start API, we call resume API below)
      await startLocalRecording(true);

      // Update backend status to paused -> recording (semantic update)
      await liveClassAPI.resumeRecording(id);

      // setRecordingStatus('recording'); // startLocalRecording does this
      console.log('[Recording] Resumed');
    }
  };

  // Check for existing recording state on mount
  useEffect(() => {
    const checkRecordingState = async () => {
      if (!liveClass) return;

      // Sync valid status from backend
      if (liveClass.recording?.status === 'recording' || liveClass.recording?.status === 'paused') {
        console.log('[Recording] Found active session:', liveClass.recording.status);

        // Check if we have local chunks
        const chunks = await getChunksFromDB(id);
        if (chunks.length > 0) {
          console.log(`[Recording] Found ${chunks.length} local chunks. Ready to resume.`);
          recordedChunksRef.current = chunks;

          // Restore Duration
          const duration = await getDurationFromDB(id);
          accumulatedDurationRef.current = duration;
          console.log('[Recording] Restored Duration:', duration);

          setRecordingStatus(liveClass.recording.status);

          // If status is 'recording', we must RESUME capture
          if (liveClass.recording.status === 'recording') {
            console.log('[Recording] Resuming capture for active session...');
            // We call startLocalRecording directly. It will append to IDB.
            // Skip backend call as it's already status='recording'
            startLocalRecording(true).catch(err => console.error('Failed to auto-resume:', err));
          }
        } else {
          // Status is active but no local data.
          // This implies different device or cache cleared.
          console.warn('[Recording] Active session on server but no local data found.');
          // We can't really "Resume". We must start fresh or warn user.
          // For now, reset to idle to allow fresh start, or set 'paused' but warn?
          // Best: Set 'paused' but with empty buffer.
          // If they Resume -> New chunks added. Final file = New chunks only.
          // Old chunks are lost on different device.
          // BUT user asked for "app hta de ... vps se open ... resume". IndexedDB persists this!
          // So safe.
          if (liveClass.recording.status === 'paused') {
            setRecordingStatus('paused');
          } else if (liveClass.recording.status === 'recording') {
            // Active recording but app was closed.
            setRecordingStatus('paused'); // Show "Resume" option rather than auto-start
          }
        }
      }
    };
    checkRecordingState();
  }, [liveClass?.recording?.status, id]);

  // End class
  const handleEndClass = async () => {
    if (window.confirm('Are you sure you want to end this class? All students will be disconnected.')) {
      try {
        // Check if class is already ended
        if (liveClass?.status === 'ended') {
          console.log('[End Class] Class is already ended, cleaning up...');
          cleanup();
          navigate('/teacher/live-classes');
          return;
        }

        // If recording is active or paused, stop it first
        if (recordingStatus === 'recording' || recordingStatus === 'paused') {
          console.log('[End Class] Stopping recording before ending class...');
          try {
            await handleStopRecording();
          } catch (recordingError) {
            console.error('[End Class] Error stopping recording:', recordingError);
            // Continue with ending class even if recording stop fails
          }
        }

        // End class immediately
        await liveClassAPI.endLiveClass(id);

        // Cleanup and navigate immediately
        cleanup();
        navigate('/teacher/live-classes');
      } catch (err) {
        // If class is already ended, just navigate
        if (err.message && err.message.includes('already ended')) {
          console.log('[End Class] Class was already ended, cleaning up...');
          cleanup();
          navigate('/teacher/live-classes');
        } else {
          alert(err.message || 'Failed to end class');
        }
      }
    }
  };

  // Cleanup
  const cleanup = async () => {
    try {
      // Leave socket room
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.emit('leave-live-class', { liveClassId: id });
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Stop and close tracks
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }

      // Leave Agora channel
      if (clientRef.current) {
        try {
          await clientRef.current.leave();
        } catch (e) {
          console.warn('Error leaving Agora channel:', e);
        }
        clientRef.current = null;
      }

      // Clear remote users
      remoteUsersRef.current = {};

      // Reset connection state
      setConnectionState('disconnected');
      setIsReconnecting(false);
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Joining class...</p>
        </div>
      </div>
    );
  }

  if (error && !liveClass) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate('/teacher/live-classes')}
            className="bg-blue-600 px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Filter students who haven't left
  const students = allParticipants.filter(p => p.userType === 'Student' && !p.leftAt);
  const raisedHandCount = handRaisedStudents.length;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      {showChrome && (
        <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                cleanup();
                navigate('/teacher/live-classes');
              }}
              className="p-2 hover:bg-gray-700 rounded-lg"
            >
              <FiArrowLeft className="text-xl" />
            </button>
            <div>
              <h1 className="font-bold text-lg">{liveClass?.title || 'Live Class'}</h1>
              <p className="text-sm text-gray-400">
                {liveClass?.subjectId?.name} • {students.length} students
                {isReconnecting && <span className="text-yellow-500 ml-2">• Reconnecting...</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {raisedHandCount > 0 && (
              <div className="bg-yellow-500 text-black px-3 py-1 rounded-lg font-bold flex items-center gap-2">
                <PiHandPalm className="text-lg" /> {raisedHandCount} Hand{raisedHandCount > 1 ? 's' : ''} Raised
              </div>
            )}
            <button
              onClick={() => {
                if (showChat) {
                  setShowChat(false);
                  setTimeout(() => setShowParticipants(true), 100);
                } else {
                  setShowParticipants(!showParticipants);
                }
              }}
              className="p-2 hover:bg-gray-700 rounded-lg relative"
              title="Participants"
            >
              <FiUsers className="text-xl" />
              {raisedHandCount > 0 && (
                <span className="absolute top-0 right-0 bg-yellow-500 text-xs rounded-full w-5 h-5 flex items-center justify-center text-black font-bold">
                  {raisedHandCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                const newShowChat = !showChat;
                if (showParticipants) {
                  setShowParticipants(false);
                  setTimeout(() => {
                    setShowChat(true);
                    // Mark messages as read when opening chat
                    if (unreadMessageCount > 0) {
                      markMessagesAsRead();
                    }
                  }, 100);
                } else {
                  setShowChat(newShowChat);
                  // Mark messages as read when opening chat
                  if (newShowChat && unreadMessageCount > 0) {
                    markMessagesAsRead();
                  }
                }
              }}
              className="p-2 hover:bg-gray-700 rounded-lg relative"
            >
              <FiMessageSquare className="text-xl" />
              {unreadMessageCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <div
        className="flex-1 relative overflow-hidden"
        onClick={handleUserActivity}
        onMouseMove={handleUserActivity}
        onTouchStart={handleUserActivity}
      >
        {/* Teacher's Video - Full Screen */}
        <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
          <div
            ref={localVideoContainerRef}
            className="w-full h-full flex items-center justify-center"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%'
            }}
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-10">
              <FiVideoOff className="text-6xl text-gray-500 mb-4" />
              <span className="text-lg text-gray-400">Camera Off</span>
            </div>
          )}
          {(isReconnecting || connectionState === 'connecting') && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white">Connecting...</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-2 rounded-lg z-10">
            <p className="text-sm font-semibold text-white">You {isMuted && '(Muted)'}</p>
          </div>
        </div>

        {/* Participants Sidebar - Overlay */}
        {showParticipants && (
          <div className="absolute top-0 right-0 w-80 h-full bg-gray-800 border-l border-gray-700 flex flex-col z-30 shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-bold">Participants ({students.length + 1})</h2>
              <button
                onClick={() => setShowParticipants(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <FiX />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* Teacher */}
              <div className="bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                    T
                  </div>
                  <div>
                    <p className="text-sm font-semibold">You (Teacher)</p>
                    <p className="text-xs text-gray-400">
                      {isMuted ? 'Muted' : 'Unmuted'} • {isVideoEnabled ? 'Video On' : 'Video Off'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Students */}
              {students.map((participant) => {
                const participantUserId = participant.userId?._id?.toString() || participant.userId?.toString();
                const hasRaisedHand = handRaisedStudents.find(s => {
                  const sUserId = s.userId?.toString();
                  return sUserId === participantUserId;
                });
                return (
                  <div
                    key={participant._id || participant.userId?._id}
                    className={`bg-gray-700 p-3 rounded-lg flex items-center justify-between ${hasRaisedHand ? 'ring-2 ring-yellow-500' : ''
                      }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {participant.userId?.name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {participant.userId?.name || participant.userName || 'Student'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {participant.isMuted ? 'Muted' : 'Unmuted'} • {participant.isVideoEnabled ? 'Video On' : 'Video Off'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {hasRaisedHand && (
                        <div className="bg-yellow-500 px-2 py-1 rounded text-xs font-bold text-black flex items-center">
                          <PiHandPalm className="text-sm" />
                        </div>
                      )}
                      <button
                        onClick={() => participant.isMuted ? unmuteParticipant(participant.userId?._id || participant.userId) : muteParticipant(participant.userId?._id || participant.userId)}
                        className="p-1 hover:bg-gray-600 rounded"
                        title={participant.isMuted ? 'Unmute' : 'Mute'}
                      >
                        {participant.isMuted ? <FiVolumeX /> : <FiVolume2 />}
                      </button>
                      <button
                        onClick={() => kickStudent(participant.userId?._id || participant.userId)}
                        className="p-1 hover:bg-red-600 rounded text-red-400"
                        title="Remove"
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat Sidebar - Overlay */}
        {showChat && (
          <div className="absolute top-0 right-0 w-80 h-full bg-gray-800 border-l border-gray-700 flex flex-col z-30 shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-bold">Chat</h2>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <FiX />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, idx) => {
                // Get current user ID
                const currentUserId = liveClass?.teacherId?._id?.toString() || liveClass?.teacherId?.toString();
                const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
                const isOwnMessage = currentUserId === msgUserId;

                return (
                  <div
                    key={msg._id || `${msg.userId}-${msg.timestamp}-${idx}`}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] p-2 rounded-lg ${isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-white'
                      }`}>
                      {!isOwnMessage && (
                        <p className="text-xs opacity-80 mb-1">{msg.userName}</p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatMessagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <FiSend />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {showChrome && (
        <div className="bg-gray-800/95 backdrop-blur-md px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-center gap-2 sm:gap-6 fixed bottom-0 left-0 right-0 z-50 border-t border-gray-700">
          {/* Mic */}
          <button
            onClick={toggleMute}
            className={`p-2.5 sm:p-4 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-700/80'} hover:bg-opacity-80 transition-all active:scale-95 shadow-lg`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <FiMicOff className="text-lg sm:text-2xl" /> : <FiMic className="text-lg sm:text-2xl" />}
          </button>

          {/* Video */}
          <button
            onClick={toggleVideo}
            className={`p-2.5 sm:p-4 rounded-full ${!isVideoEnabled ? 'bg-red-600' : 'bg-gray-700/80'} hover:bg-opacity-80 transition-all active:scale-95 shadow-lg`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <FiVideo className="text-lg sm:text-2xl" /> : <FiVideoOff className="text-lg sm:text-2xl" />}
          </button>

          {/* Switch Camera */}
          <button
            onClick={switchCamera}
            className="p-2.5 sm:p-4 rounded-full bg-gray-700/80 hover:bg-opacity-80 transition-all active:scale-95 shadow-lg"
            title="Switch camera"
          >
            <RiCameraSwitchLine className="text-lg sm:text-2xl" />
          </button>

          {/* Recording Control (Toggles between Start/Pause/Resume) */}
          <div className="flex items-center gap-2">
            {recordingStatus === 'idle' || recordingStatus === 'processing' ? (
              <button
                onClick={handleStartRecording}
                className="p-2.5 sm:p-4 rounded-full bg-gray-700/80 hover:bg-gray-600 transition-all active:scale-95 shadow-lg flex items-center gap-2"
                title="Start recording"
                disabled={recordingStatus === 'starting' || recordingStatus === 'processing'}
              >
                {recordingStatus === 'processing' ? (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FiCircle className="text-lg sm:text-2xl text-red-500 animate-pulse" />
                )}
              </button>
            ) : recordingStatus === 'starting' || recordingStatus === 'stopping' ? (
              <div className="p-2.5 sm:p-4 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center">
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Pause/Resume button replaces Start button */}
                <button
                  onClick={recordingStatus === 'recording' ? handlePauseRecording : handleResumeRecording}
                  className="p-2.5 sm:p-4 rounded-full bg-gray-700/80 hover:bg-gray-600 transition-all active:scale-95 shadow-lg border border-gray-600"
                  title={recordingStatus === 'recording' ? "Pause recording" : "Resume recording"}
                >
                  {recordingStatus === 'recording' ?
                    <FiPause className="text-lg sm:text-2xl text-white" /> :
                    <FiPlay className="text-lg sm:text-2xl text-green-400" />
                  }
                </button>
              </>
            )}
          </div>

          {/* End Call / End Class */}
          <button
            onClick={handleEndClass}
            className="p-2.5 sm:p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all active:scale-75 shadow-lg"
            title="End class"
          >
            <FiPhone className="text-lg sm:text-2xl rotate-135" />
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveClassRoom;

