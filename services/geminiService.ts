// Real stranger chat implementation using WebSocket server
import io, { Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentRoomId: string | null = null;
let currentChatMode: string | null = null;
let connectedUsersCount = 0;
let remoteStreamCallback: ((stream: MediaStream) => void) | null = null;

// Export function to set remote stream callback
export const setRemoteStreamCallback = (callback: (stream: MediaStream) => void) => {
  remoteStreamCallback = callback;
};

// Initialize socket connection
function initSocket() {
  if (!socket) {
    const SERVER_URL = window.location.origin.includes('localhost')
      ? 'http://localhost:3001'
      : window.location.origin;

    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
    });

    socket.on('onlineCountUpdate', (data) => {
      connectedUsersCount = data.count;
    });
  }
}

// --- Text Chat Service ---

export const startChatSession = (): void => {
  initSocket();
  connectedUsersCount = 0;

  if (socket) {
    socket.emit('getOnlineCount');
    socket.emit('updateOnlineCount');
  }

  console.log('Chat session initialized');
};

export const sendMessageToAI = async (message: string): Promise<string> => {
  // This function is now used for sending messages to the partner
  // The actual sending happens in the chat components directly via socket
  throw new Error("Use sendMessageToPartner function instead");
};

// New function to send message to partner
export const sendMessageToPartner = (message: string, type: string = 'text'): void => {
  if (socket && currentRoomId) {
    socket.emit('message', {
      roomId: currentRoomId,
      message: message,
      type: type
    });
  }
};

export const connectToStranger = (chatMode: string, callbacks: {
  onConnected?: (data: any) => void;
  onWaiting?: (message: string) => void;
  onMessage?: (message: any) => void;
  onDisconnected?: (reason: string) => void;
}): void => {
  if (!socket) return;

  currentChatMode = chatMode;

  // Set up event listeners
  socket.on('connected', (data) => {
    currentRoomId = data.roomId;
    console.log('Connected to partner:', data.partnerId, 'in room:', currentRoomId);
    if (callbacks.onConnected) callbacks.onConnected(data);
  });

  socket.on('waiting', (data) => {
    console.log('Waiting:', data.message);
    if (callbacks.onWaiting) callbacks.onWaiting(data.message);
  });

  socket.on('message', (data) => {
    console.log('Received message:', data.message);
    if (callbacks.onMessage) callbacks.onMessage(data.message);
  });

  socket.on('partnerDisconnected', (data) => {
    console.log('Partner disconnected:', data.reason);
    currentRoomId = null;
    if (callbacks.onDisconnected) callbacks.onDisconnected(data.reason);
  });

  // Join chat
  socket.emit('joinChat', { chatMode });
};

export const findNewPartner = (): void => {
  if (socket && currentChatMode) {
    socket.emit('findNewPartner', {
      oldRoomId: currentRoomId,
      chatMode: currentChatMode
    });
    currentRoomId = null; // Clear current room
  }
};

export const stopCurrentChat = (): void => {
  if (socket && currentRoomId) {
    socket.emit('stopChat', {
      roomId: currentRoomId,
      continueWaiting: false
    });
    currentRoomId = null;
  }
};

export const getConnectedUsersCount = (): number => {
  return connectedUsersCount;
};

export const endChatSession = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentRoomId = null;
  currentChatMode = null;
  console.log('Chat session ended');
};

// --- Live Audio/Video Chat Service (WebRTC) ---

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;

// WebRTC configuration
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Start live session with WebRTC
export const startLiveSession = (callbacks: {
  onMessage: (message: any) => void;
  onError: (error: Event) => void;
  onClose: (event: Event) => void;
  onOpen: () => void;
}): void => {
  console.log('Starting WebRTC live session');

  peerConnection = new RTCPeerConnection(rtcConfig);

  // Set up peer connection event handlers
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit('webrtc-signal', {
        roomId: currentRoomId,
        signal: { type: 'candidate', candidate: event.candidate }
      });
    }
  };

  peerConnection.ontrack = (event) => {
    console.log('Received remote track:', event.track.kind);
    const remoteStream = event.streams[0];
    if (remoteStream && remoteStreamCallback) {
      console.log('Passing remote stream to component');
      remoteStreamCallback(remoteStream);
    }
  };

  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection?.connectionState);

    if (peerConnection?.connectionState === 'connected') {
      if (callbacks.onOpen) callbacks.onOpen();
    } else if (peerConnection?.connectionState === 'disconnected' ||
               peerConnection?.connectionState === 'failed' ||
               peerConnection?.connectionState === 'closed') {
      if (callbacks.onClose) callbacks.onClose(new Event('close'));
    }
  };

  // Listen for WebRTC signals
  if (socket) {
    socket.on('webrtc-signal', async (data) => {
      try {
        const { signal } = data;

        if (signal.type === 'offer') {
          await peerConnection?.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await peerConnection?.createAnswer();
          if (answer) {
            await peerConnection.setLocalDescription(answer);
            socket.emit('webrtc-signal', {
              roomId: currentRoomId,
              signal: answer
            });
          }
        } else if (signal.type === 'answer') {
          await peerConnection?.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.type === 'candidate') {
          await peerConnection?.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (error) {
        console.error('WebRTC signaling error:', error);
        if (callbacks.onError) callbacks.onError(error as Event);
      }
    });

    socket.on('webrtc-ready', async () => {
      // Create offer when both users are ready
      try {
        const offer = await peerConnection?.createOffer();
        if (offer) {
          await peerConnection.setLocalDescription(offer);
          socket.emit('webrtc-signal', {
            roomId: currentRoomId,
            signal: offer
          });
        }
      } catch (error) {
        console.error('Error creating offer:', error);
        if (callbacks.onError) callbacks.onError(error as Event);
      }
    });
  }
};

// Get local media stream
export const getUserMedia = async (audio: boolean, video: boolean): Promise<MediaStream> => {
  try {
    const constraints = {
      audio: audio,
      video: video ? { facingMode: 'user' } : false
    };

    localStream = await navigator.mediaDevices.getUserMedia(constraints);

    // Add tracks to peer connection
    if (peerConnection) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream!);
      });

      // Signal that we're ready for WebRTC
      if (socket) {
        socket.emit('webrtc-ready', { roomId: currentRoomId });
      }
    }

    return localStream;
  } catch (error) {
    console.error('Error accessing media:', error);
    throw error;
  }
};

// Stream audio through WebRTC
export const streamAudio = (audioData: Float32Array) => {
  // In WebRTC, audio is already streaming through the peer connection
  // This function can be used for additional processing if needed
  console.log('Audio streaming through WebRTC');
};

// Stream video frame
export const streamImage = (base64Data: string) => {
  // In WebRTC, video is already streaming through the peer connection
  // This function can be used for additional processing if needed
  console.log('Video streaming through WebRTC');
};

// Stop live session and cleanup
export const endLiveSession = (): void => {
  console.log('Ending live session');

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  // Clean up WebRTC listeners
  if (socket) {
    socket.off('webrtc-signal');
    socket.off('webrtc-ready');
  }
};
