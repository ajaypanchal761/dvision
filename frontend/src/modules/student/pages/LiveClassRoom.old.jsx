import React, { useState, useEffect, useRef } from 'react';
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
  FiHelpCircle
} from 'react-icons/fi';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { liveClassAPI } from '../services/api';

/**
 * Live Class Room Component for Students
 * Student interface for live classes using Agora with hand raise feature
 */
const LiveClassRoom = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [liveClass, setLiveClass] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [showChat, setShowChat] = useState(true);
  
  // Agora refs
  const clientRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const remoteUsersRef = useRef({});
  const remoteVideoContainersRef = useRef({});
  const localVideoContainerRef = useRef(null);

  useEffect(() => {
    initializeClass();
    return () => {
      leaveClass();
    };
  }, [id]);

  // Ensure remote videos are played when DOM is ready
  useEffect(() => {
    Object.values(remoteUsersRef.current).forEach((user) => {
      if (user.videoTrack) {
        const container = document.getElementById(`remote-video-${user.uid}`);
        if (container) {
          user.videoTrack.play(container).catch(err => {
            console.error('Error playing remote video:', err);
          });
        } else {
          // If container doesn't exist, try again after a delay
          setTimeout(() => {
            const retryContainer = document.getElementById(`remote-video-${user.uid}`);
            if (retryContainer && user.videoTrack) {
              user.videoTrack.play(retryContainer).catch(err => {
                console.error('Error playing remote video on retry:', err);
              });
            }
          }, 200);
        }
      }
    });
  }, [participants]);

  const initializeClass = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await liveClassAPI.joinLiveClass(id);
      if (response.success && response.data) {
        const { liveClass: classData, agoraToken, agoraAppId, agoraChannelName, agoraUid } = response.data;
        setLiveClass(classData);
        setChatMessages(classData.chatMessages || []);
        setParticipants(classData.participants || []);

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

  const initializeAgora = async (appId, token, channelName, uid = null) => {
    try {
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);
      client.on('user-left', handleUserLeft);

      await client.join(appId, channelName, token, uid);

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const videoTrack = await AgoraRTC.createCameraVideoTrack();
      
      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;

      if (localVideoContainerRef.current) {
        videoTrack.play(localVideoContainerRef.current);
      }

      await client.publish([audioTrack, videoTrack]);
    } catch (err) {
      console.error('Error initializing Agora:', err);
      setError('Failed to initialize video/audio');
    }
  };

  const handleUserPublished = async (user, mediaType) => {
    await clientRef.current.subscribe(user, mediaType);
    
    if (mediaType === 'video') {
      const remoteVideoTrack = user.videoTrack;
      if (remoteVideoTrack) {
        remoteUsersRef.current[user.uid] = user;
        setParticipants(prev => {
          if (prev.find(p => p.uid === user.uid)) return prev;
          return [...prev, { uid: user.uid, ...user }];
        });
        
        // Wait for DOM element to be created
        const playVideo = () => {
          const container = document.getElementById(`remote-video-${user.uid}`);
          if (container && remoteVideoTrack) {
            remoteVideoTrack.play(container).catch(err => {
              console.error('Error playing remote video:', err);
            });
          } else {
            // Retry after a short delay
            setTimeout(playVideo, 100);
          }
        };
        playVideo();
      }
    }
    
    if (mediaType === 'audio') {
      const remoteAudioTrack = user.audioTrack;
      if (remoteAudioTrack) {
        remoteAudioTrack.play();
      }
    }
  };

  const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === 'video') {
      delete remoteUsersRef.current[user.uid];
      setParticipants(prev => prev.filter(p => p.uid !== user.uid));
    }
  };

  const handleUserLeft = (user) => {
    delete remoteUsersRef.current[user.uid];
    setParticipants(prev => prev.filter(p => p.uid !== user.uid));
  };

  const toggleMute = async () => {
    if (localAudioTrackRef.current) {
      await localAudioTrackRef.current.setEnabled(!isMuted);
      setIsMuted(!isMuted);
      try {
        await liveClassAPI.toggleMute(id);
      } catch (err) {
        console.error('Error updating mute status:', err);
      }
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrackRef.current) {
      await localVideoTrackRef.current.setEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
      try {
        await liveClassAPI.toggleVideo(id);
      } catch (err) {
        console.error('Error updating video status:', err);
      }
    }
  };

  const toggleHandRaise = async () => {
    try {
      const response = await liveClassAPI.toggleHandRaise(id);
      if (response.success) {
        setHasRaisedHand(response.data.hasRaisedHand);
      }
    } catch (err) {
      console.error('Error toggling hand raise:', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await liveClassAPI.sendChatMessage(id, newMessage.trim());
      if (response.success) {
        setChatMessages(prev => [...prev, response.data.message]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const leaveClass = async () => {
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
      }
      if (clientRef.current) {
        await clientRef.current.leave();
      }
    } catch (err) {
      console.error('Error leaving class:', err);
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate('/live-classes')}
            className="bg-blue-600 px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              leaveClass();
              navigate('/live-classes');
            }}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="font-bold text-lg">{liveClass?.title || 'Live Class'}</h1>
            <p className="text-sm text-gray-400">
              {liveClass?.subjectId?.name} • {participants.length + 1} participants
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 hover:bg-gray-700 rounded-lg relative"
          >
            <FiMessageSquare className="text-xl" />
            {chatMessages.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {chatMessages.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            {/* Local Video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <div
                ref={localVideoContainerRef}
                className="w-full h-full min-h-[200px]"
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                  <FiVideoOff className="text-4xl text-gray-500" />
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
                You {isMuted && '(Muted)'}
              </div>
            </div>

            {/* Remote Videos - Teacher should be first */}
            {Object.values(remoteUsersRef.current)
              .sort((a, b) => {
                // Teacher first, then students
                const aIsTeacher = liveClass?.participants?.find(p => {
                  const userId = p.userId?._id?.toString() || p.userId?.toString();
                  const userUid = a.uid?.toString();
                  // Try to match by checking if participant userId matches
                  return userId && userUid && userId.includes(userUid.slice(-8));
                })?.userType === 'Teacher';
                const bIsTeacher = liveClass?.participants?.find(p => {
                  const userId = p.userId?._id?.toString() || p.userId?.toString();
                  const userUid = b.uid?.toString();
                  return userId && userUid && userId.includes(userUid.slice(-8));
                })?.userType === 'Teacher';
                if (aIsTeacher && !bIsTeacher) return -1;
                if (!aIsTeacher && bIsTeacher) return 1;
                return 0;
              })
              .map((user) => {
                // Find participant by matching userId with UID
                // UID is derived from last 8 chars of userId converted to number
                const userUidNum = user.uid;
                const participantInfo = liveClass?.participants?.find(p => {
                  const userId = p.userId?._id?.toString() || p.userId?.toString();
                  if (!userId) return false;
                  // Convert last 8 chars of userId to number and compare
                  const userIdNum = parseInt(userId.slice(-8), 16) || 0;
                  return userIdNum === userUidNum;
                });
                const isTeacher = participantInfo?.userType === 'Teacher';
                return (
                  <div key={user.uid} className="relative bg-gray-800 rounded-lg overflow-hidden">
                    <div
                      id={`remote-video-${user.uid}`}
                      className="w-full h-full min-h-[200px]"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
                      {isTeacher ? 'Teacher' : participantInfo?.userId?.name || participantInfo?.userName || `User ${user.uid}`}
                      {participantInfo?.isMuted && ' (Muted)'}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
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
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="bg-gray-700 p-2 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">{msg.userName}</p>
                  <p className="text-sm">{msg.message}</p>
                </div>
              ))}
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
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-center gap-4">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-700'} hover:bg-opacity-80`}
        >
          {isMuted ? <FiMicOff className="text-xl" /> : <FiMic className="text-xl" />}
        </button>
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${!isVideoEnabled ? 'bg-red-600' : 'bg-gray-700'} hover:bg-opacity-80`}
        >
          {isVideoEnabled ? <FiVideo className="text-xl" /> : <FiVideoOff className="text-xl" />}
        </button>
        <button
          onClick={toggleHandRaise}
          className={`p-3 rounded-full ${hasRaisedHand ? 'bg-yellow-600' : 'bg-gray-700'} hover:bg-opacity-80`}
          title={hasRaisedHand ? 'Lower Hand' : 'Raise Hand'}
        >
          <FiHelpCircle className="text-xl" />
        </button>
        <button
          onClick={() => {
            leaveClass();
            navigate('/live-classes');
          }}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700"
        >
          <FiPhone className="text-xl rotate-135" />
        </button>
      </div>
    </div>
  );
};

export default LiveClassRoom;

