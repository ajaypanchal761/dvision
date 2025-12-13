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
  FiPhone
} from 'react-icons/fi';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { liveClassAPI } from '../services/api';

/**
 * Live Class Room Component
 * Teacher/Student interface for live classes using Agora
 */
const LiveClassRoom = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [liveClass, setLiveClass] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]); // Full participant list from backend
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  
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

  // Poll for participants updates (hand raise, etc.)
  useEffect(() => {
    if (!liveClass || liveClass.status !== 'live') return;

    const pollParticipants = async () => {
      try {
        const response = await liveClassAPI.getLiveClass(id);
        if (response.success && response.data?.liveClass) {
          const updatedParticipants = response.data.liveClass.participants || [];
          setAllParticipants(updatedParticipants);
          
          // Also update chat messages if changed
          if (response.data.liveClass.chatMessages) {
            setChatMessages(response.data.liveClass.chatMessages);
          }
        }
      } catch (err) {
        console.error('Error fetching participants:', err);
      }
    };

    // Poll every 2 seconds for real-time updates
    const interval = setInterval(pollParticipants, 2000);
    pollParticipants(); // Initial fetch

    return () => clearInterval(interval);
  }, [id, liveClass?.status]);

  const initializeClass = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get live class details and join token
      const response = await liveClassAPI.joinLiveClass(id);
      if (response.success && response.data) {
        const { liveClass: classData, agoraToken, agoraAppId, agoraChannelName, agoraUid } = response.data;
        setLiveClass(classData);
        setChatMessages(classData.chatMessages || []);
        setParticipants(classData.participants || []);
        setAllParticipants(classData.participants || []);

        // Initialize Agora with UID
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
      // Create Agora client
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // Set up event handlers
      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);
      client.on('user-left', handleUserLeft);

      // Join channel with UID
      await client.join(appId, channelName, token, uid);

      // Create and publish local tracks
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const videoTrack = await AgoraRTC.createCameraVideoTrack();
      
      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;

      // Play local video
      if (localVideoContainerRef.current) {
        videoTrack.play(localVideoContainerRef.current);
      }

      // Publish tracks
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
      // Update backend
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
      // Update backend
      try {
        await liveClassAPI.toggleVideo(id);
      } catch (err) {
        console.error('Error updating video status:', err);
      }
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
      // Unpublish and stop local tracks
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
      }

      // Leave channel
      if (clientRef.current) {
        await clientRef.current.leave();
      }

      // If teacher, end class
      if (liveClass?.status === 'live') {
        // Could add end class logic here for teachers
      }
    } catch (err) {
      console.error('Error leaving class:', err);
    }
  };

  const handleEndClass = async () => {
    if (window.confirm('Are you sure you want to end this class?')) {
      try {
        await liveClassAPI.endLiveClass(id);
        navigate('/teacher/live-classes');
      } catch (err) {
        alert(err.message || 'Failed to end class');
      }
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
            onClick={() => navigate('/teacher/live-classes')}
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
              navigate('/teacher/live-classes');
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
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-2 hover:bg-gray-700 rounded-lg relative"
            title="Participants"
          >
            <FiUsers className="text-xl" />
            {allParticipants.filter(p => p.hasRaisedHand).length > 0 && (
              <span className="absolute top-0 right-0 bg-yellow-500 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {allParticipants.filter(p => p.hasRaisedHand).length}
              </span>
            )}
          </button>
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

            {/* Remote Videos */}
            {Object.values(remoteUsersRef.current).map((user) => {
              // Find participant by matching UID (derived from userId)
              const userUidNum = user.uid;
              const participantInfo = allParticipants.find(p => {
                const userId = p.userId?._id?.toString() || p.userId?.toString();
                if (!userId) return false;
                // Convert last 8 chars of userId to number and compare
                const userIdNum = parseInt(userId.slice(-8), 16) || 0;
                return userIdNum === userUidNum;
              });
              return (
                <div key={user.uid} className="relative bg-gray-800 rounded-lg overflow-hidden">
                  <div
                    id={`remote-video-${user.uid}`}
                    className="w-full h-full min-h-[200px]"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
                    {participantInfo?.userId?.name || participantInfo?.userName || `User ${user.uid}`}
                    {participantInfo?.isMuted && ' (Muted)'}
                  </div>
                  {participantInfo?.hasRaisedHand && (
                    <div className="absolute top-2 right-2 bg-yellow-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <span>✋</span> Hand Raised
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Participants Sidebar */}
        {showParticipants && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-bold">Participants ({allParticipants.length + 1})</h2>
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
              {allParticipants
                .filter(p => p.userType === 'Student')
                .map((participant) => (
                  <div
                    key={participant._id || participant.userId?._id}
                    className={`bg-gray-700 p-3 rounded-lg flex items-center justify-between ${
                      participant.hasRaisedHand ? 'ring-2 ring-yellow-500' : ''
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
                    {participant.hasRaisedHand && (
                      <div className="bg-yellow-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <span>✋</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

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
          onClick={() => {
            leaveClass();
            navigate('/teacher/live-classes');
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

