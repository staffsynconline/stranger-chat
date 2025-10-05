import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChatState, Message, MessageSender, ChatMode } from './types';
import { startChatSession, connectToStranger, sendMessageToPartner, findNewPartner, stopCurrentChat, endChatSession, startLiveSession, endLiveSession, getUserMedia, getConnectedUsersCount } from './services/geminiService';
import ChatWindow from './components/ChatWindow';
import LiveChatWindow from './components/LiveChatWindow';
import Spinner from './components/Spinner';
import ThemeToggleButton from './components/ThemeToggleButton';

const WelcomeIcons = {
  Chat: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  Audio: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
  Video: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
};

const WelcomeOption: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  className?: string;
}> = ({ icon, title, description, onClick, className }) => (
    <button
        onClick={onClick}
        className={`group relative w-full flex flex-col items-center text-center p-4 md:p-6 rounded-2xl transition-all duration-300 bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700/50 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 ${className ?? ''}`}
        style={{ animationDelay: `${Math.random() * 0.3}s` }}
    >
        <div className="mb-4 transition-transform duration-300 group-hover:scale-110">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400">{description}</p>
    </button>
);


const App: React.FC = () => {
  const [chatState, setChatState] = useState<ChatState>(ChatState.IDLE);
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStrangerTyping, setIsStrangerTyping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(0);

  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Update online count periodically from server
    const intervalId = setInterval(() => {
      setOnlineCount(getConnectedUsersCount());
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  const cleanupMedia = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);
  
  const handleStartChat = useCallback(async (mode: ChatMode) => {
    setMessages([]);
    setError(null);
    setChatState(ChatState.SEARCHING);
    setChatMode(mode);

    try {
      if (mode === ChatMode.TEXT) {
        startChatSession();
        connectToStranger(mode.toLowerCase(), {
          onConnected: (data: any) => {
            console.log('Connected to text chat:', data);
            setChatState(ChatState.CHATTING);
            setMessages([data.initialMessage]);
          },
          onWaiting: (message: string) => {
            console.log('Text chat waiting:', message);
            // Could show waiting message
          },
          onMessage: (message: any) => {
            let strangerMessage: Message;

            if (message.type === 'image') {
              // Parse image message
              try {
                const imageData = JSON.parse(message.text);
                strangerMessage = {
                  id: message.id,
                  text: '📷 Image',
                  sender: MessageSender.STRANGER,
                  imageData: imageData.imageData,
                  fileName: imageData.fileName,
                };
              } catch (e) {
                // Fallback if parsing fails
                strangerMessage = {
                  id: message.id,
                  text: message.text,
                  sender: MessageSender.STRANGER,
                };
              }
            } else {
              // Regular text message
              strangerMessage = {
                id: message.id,
                text: message.text,
                sender: MessageSender.STRANGER,
              };
            }

            setMessages((prev) => [...prev, strangerMessage]);
            setIsStrangerTyping(false);
          },
          onDisconnected: (reason: string) => {
            console.log('Text chat disconnected:', reason);
            const systemMessage: Message = {
              id: crypto.randomUUID(),
              text: `The stranger ${reason === 'partner_left' ? 'disconnected' : 'found someone new'}. Finding another...`,
              sender: MessageSender.SYSTEM,
            };
            setMessages((prev) => [...prev, systemMessage]);
            setIsStrangerTyping(false);
          }
        });
      } else { // Simplicity - just text chat for now, WebRTC is complex for deployment
        startChatSession();

        // Direct connection for audio/video
        setChatState(ChatState.CHATTING);
        setMessages([
          {
            id: crypto.randomUUID(),
            text: "Connected! You can chat with text while your media is being prepared.",
            sender: MessageSender.SYSTEM,
          },
        ]);

        // For audio/video, get user media in background
        getUserMedia(true, mode === ChatMode.VIDEO).then(stream => {
          mediaStreamRef.current = stream;
          // Media ready - no message needed as it's working in background
        }).catch(mediaError => {
          console.error('Media error:', mediaError);
          // Could add error message here but keeping it quiet for now
        });


        // Connect to stranger matching (works even if WebRTC fails)
        connectToStranger(mode.toLowerCase(), {
          onConnected: (data: any) => {
            console.log('Connected for audio/video:', data);
            setMessages((prev) => [...prev, {
              id: crypto.randomUUID(),
              text: `🎯 Connected to ${mode} partner! (Type messages below)`,
              sender: MessageSender.SYSTEM,
              type: mode.toLowerCase()
            }]);
          },
          onWaiting: (message: string) => {
            console.log('Waiting:', message);
            setMessages((prev) => [...prev, {
              id: crypto.randomUUID(),
              text: `⏳ ${message}`,
              sender: MessageSender.SYSTEM,
            }]);
          },
          onMessage: (message: any) => {
            const strangerMessage: Message = {
              id: message.id,
              text: message.text || "Started audio/video chat!",
              sender: MessageSender.STRANGER,
              type: mode.toLowerCase()
            };
            setMessages((prev) => [...prev, strangerMessage]);
          },
          onDisconnected: (reason: string) => {
            console.log('Disconnected:', reason);
            cleanupMedia();
            setMessages((prev) => [...prev, {
              id: crypto.randomUUID(),
              text: `🔌 Partner ${reason === 'partner_left' ? 'disconnected' : 'switched partners'}. Finding new one...`,
              sender: MessageSender.SYSTEM,
            }]);
          }
        });
      }
    } catch (e) {
      console.error(e);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      setError(errorMessage);
      setChatState(ChatState.ERROR);
      cleanupMedia();
    }
  }, [cleanupMedia]);

  const stopCurrentSession = useCallback(() => {
    if(chatMode === ChatMode.TEXT) {
      endChatSession();
    } else {
      endLiveSession();
      endChatSession();
      cleanupMedia();
    }
  }, [chatMode, cleanupMedia]);

  const handleStop = useCallback(() => {
    stopCurrentSession();
    setChatState(ChatState.IDLE);
  }, [stopCurrentSession]);

  const [clearRemoteStream, setClearRemoteStream] = useState<(() => void) | null>(null);

  const handleSetClearRemoteStream = useCallback((callback: () => void) => {
    setClearRemoteStream(() => callback);
  }, []);

  const handleSkip = useCallback(() => {
    // Clear remote stream when skipping
    if (clearRemoteStream) {
      clearRemoteStream();
    }

    // For live chat, we skip to new partner
    if (chatMode && chatMode !== ChatMode.TEXT) {
      stopCurrentSession();

      // For audio/video, skip means finding a new partner
      // The text messaging should continue with the connection flow
      connectToStranger(chatMode.toLowerCase(), {
        onConnected: (data: any) => {
          setMessages((prev) => [...prev, {
            id: crypto.randomUUID(),
            text: `🎯 Found new partner!`,
            sender: MessageSender.SYSTEM,
          }]);
        },
        onWaiting: (message: string) => {
          setMessages((prev) => [...prev, {
            id: crypto.randomUUID(),
            text: `⏳ ${message}`,
            sender: MessageSender.SYSTEM,
          }]);
        },
        onMessage: (message: any) => {
          const strangerMessage: Message = {
            id: message.id,
            text: message.text || "Connected with new partner!",
            sender: MessageSender.STRANGER,
            type: chatMode.toLowerCase()
          };
          setMessages((prev) => [...prev, strangerMessage]);
        },
        onDisconnected: (reason: string) => {
          setMessages((prev) => [...prev, {
            id: crypto.randomUUID(),
            text: `🔌 Partner ${reason === 'partner_left' ? 'disconnected' : 'switched partners'}. Finding new one...`,
            sender: MessageSender.SYSTEM,
          }]);
        }
      });

      // Reset remote stream when skipping
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        text: `🔄 Skipping to new partner...`,
        sender: MessageSender.SYSTEM,
      }]);
    } else {
      // For text chat, regular skip behavior
      findNewPartner();
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        text: `🔄 Finding new text chat partner...`,
        sender: MessageSender.SYSTEM,
      }]);
    }
  }, [chatMode, stopCurrentSession, connectToStranger, findNewPartner, clearRemoteStream]);
  
  const handleSendMessage = useCallback((text: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      text,
      sender: MessageSender.USER,
    };

    // Add user message to the chat
    setMessages((prev) => [...prev, userMessage]);

    // Set typing indicator for the stranger
    setIsStrangerTyping(true);

    // Send message to the connected stranger
    sendMessageToPartner(text);

    // Clear typing indicator after sending
    setTimeout(() => setIsStrangerTyping(false), 500);
  }, []);

  const handleSendImage = useCallback((imageData: string, fileName: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      text: '📷 Image',
      sender: MessageSender.USER,
      imageData,
      fileName,
    };

    // Add image message to the chat
    setMessages((prev) => [...prev, userMessage]);

    // Send image data as json (you can extend the sendMessageToPartner to handle this)
    sendMessageToPartner(JSON.stringify({
      type: 'image',
      imageData,
      fileName,
    }), 'image');
  }, []);

  const ErrorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const renderContent = () => {
    switch (chatState) {
      case ChatState.SEARCHING:
        return <Spinner text="Connecting..." />;
      case ChatState.CHATTING:
        if (chatMode === ChatMode.TEXT) {
          return (
            <ChatWindow
              messages={messages}
              isStrangerTyping={isStrangerTyping}
              onSendMessage={handleSendMessage}
              onSendImage={handleSendImage}
              onSkip={handleSkip}
              onStop={handleStop}
            />
          );
        }
        if (mediaStreamRef.current) {
           return (
             <LiveChatWindow
                userStream={mediaStreamRef.current}
                chatMode={chatMode!}
                onSkip={handleSkip}
                onStop={handleStop}
                messages={messages}
                onSetClearRemoteStream={handleSetClearRemoteStream}
             />
           )
        }
        return null;
      case ChatState.ERROR:
        return (
            <div className="w-full max-w-sm text-center p-8 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-xl animate-fade-in border border-danger/50">
                <ErrorIcon />
                <h2 className="text-2xl mb-2 font-bold text-slate-800 dark:text-slate-100">An Error Occurred</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
                <button onClick={() => { setChatState(ChatState.IDLE); setError(null); }} className="px-5 py-2.5 font-bold text-white rounded-lg bg-primary hover:bg-primary-hover transition-all">
                    Go Back
                </button>
            </div>
        );
      case ChatState.IDLE:
      default:
        return (
          <div className="w-full max-w-4xl mx-auto animate-fade-in text-center p-4">
            <div className="mb-4">
                <p className="text-lg font-bold text-primary dark:text-blue-400">
                    {onlineCount.toLocaleString()}+ people online
                </p>
            </div>
            <div className="mb-8 md:mb-12">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 dark:text-slate-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">
                  Stranger Chat
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg mt-2">
                  Talk to random strangers (powered by AI)
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <WelcomeOption 
                  onClick={() => handleStartChat(ChatMode.TEXT)}
                  icon={<WelcomeIcons.Chat />}
                  title="Text Chat"
                  description="Simple, classic, anonymous text-based chat."
                  className="animate-fade-in"
              />
              <WelcomeOption 
                  onClick={() => handleStartChat(ChatMode.AUDIO)}
                  icon={<WelcomeIcons.Audio />}
                  title="Audio Chat"
                  description="Talk with real-time voice conversation."
                  className="animate-fade-in"
              />
              <WelcomeOption 
                  onClick={() => handleStartChat(ChatMode.VIDEO)}
                  icon={<WelcomeIcons.Video />}
                  title="Video Chat"
                  description="Face-to-face video calls for the full experience."
                  className="animate-fade-in"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-2 sm:p-4 font-sans relative">
      {chatState === ChatState.IDLE && (
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-20">
          <ThemeToggleButton />
        </div>
      )}
      {renderContent()}
    </div>
  );
};

export default App;
