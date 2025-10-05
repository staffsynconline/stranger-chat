import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMode, Message, MessageSender } from '../types';
import { streamAudio, streamImage, sendMessageToAI } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { blobToBase64 } from '../utils/imageUtils';
import StrangerVisualizer from './StrangerVisualizer';
import MessageBubble from './MessageBubble';
import ThemeToggleButton from './ThemeToggleButton';

const FRAME_RATE = 1; // Send 1 frame per second
const JPEG_QUALITY = 0.7;

interface LiveChatWindowProps {
  userStream: MediaStream;
  chatMode: ChatMode;
  onSkip: () => void;
  onStop: () => void;
}

const SendIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const MuteIcon = ({className = 'h-6 w-6'}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>;
const UnmuteIcon = ({className = 'h-6 w-6'}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>;
const CameraOnIcon = ({className = 'h-6 w-6'}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const CameraOffIcon = ({className = 'h-6 w-6'}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>;


const LiveChatWindow: React.FC<LiveChatWindowProps> = ({ userStream, chatMode, onSkip, onStop }) => {
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(chatMode === ChatMode.AUDIO);
  const [isStrangerSpeaking, setIsStrangerSpeaking] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStrangerTyping, setIsStrangerTyping] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const strangerAudioQueue = useRef<Array<{buffer: AudioBuffer, startTime: number}>>([]);
  const nextAudioStartTime = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isStrangerTyping]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const text = inputValue.trim();
    setInputValue('');

    const userMessage: Message = {
      id: crypto.randomUUID(),
      text,
      sender: MessageSender.USER,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsStrangerTyping(true);

    try {
      const aiResponse = await sendMessageToAI(text);
      setTimeout(() => {
        const strangerMessage: Message = {
          id: crypto.randomUUID(),
          text: aiResponse,
          sender: MessageSender.STRANGER,
        };
        setMessages((prev) => [...prev, strangerMessage]);
        setIsStrangerTyping(false);
      }, 500 + Math.random() * 800);
    } catch (e) {
       const errorText = e instanceof Error ? e.message : "An unknown error occurred.";
       const errorMessage: Message = {
        id: crypto.randomUUID(),
        text: `Message failed to send: ${errorText}`,
        sender: MessageSender.SYSTEM,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsStrangerTyping(false);
    }
  }, [inputValue]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const processAudioQueue = useCallback((outputAudioContext: AudioContext) => {
    while(strangerAudioQueue.current.length > 0 && strangerAudioQueue.current[0].startTime < outputAudioContext.currentTime + 0.1) {
        const { buffer, startTime } = strangerAudioQueue.current.shift()!;
        const source = outputAudioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(outputAudioContext.destination);
        source.onended = () => {
            if (strangerAudioQueue.current.length === 0) {
                setIsStrangerSpeaking(false);
            }
        };
        source.start(startTime);
    }
    requestAnimationFrame(() => processAudioQueue(outputAudioContext));
  }, []);

  useEffect(() => {
    setMessages([
        {
          id: crypto.randomUUID(),
          text: "You're now connected. You can also chat with text here!",
          sender: MessageSender.SYSTEM,
        },
      ]);
      
    const outputAudioContext = new window.AudioContext({ sampleRate: 24000 });
    const inputAudioContext = new window.AudioContext({ sampleRate: 16000 });

    if (userVideoRef.current) {
        userVideoRef.current.srcObject = userStream;
    }
    
    const mediaStreamSource = inputAudioContext.createMediaStreamSource(userStream);
    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        streamAudio(inputData);
    };

    mediaStreamSource.connect(scriptProcessor);
    scriptProcessor.connect(inputAudioContext.destination);
    
    let frameInterval: number | undefined;
    if (chatMode === ChatMode.VIDEO) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        frameInterval = window.setInterval(() => {
          if (!userVideoRef.current) return;
          canvas.width = userVideoRef.current.videoWidth;
          canvas.height = userVideoRef.current.videoHeight;
          ctx.drawImage(userVideoRef.current, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(async (blob) => {
            if(blob) {
              const base64Data = await blobToBase64(blob);
              streamImage(base64Data);
            }
          }, 'image/jpeg', JPEG_QUALITY);
        }, 1000 / FRAME_RATE);
      }
    }
      
    const onMessage = async (message: any) => {
        const audioDataB64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (audioDataB64) {
            setIsStrangerSpeaking(true);
            const audioBytes = decode(audioDataB64);
            const audioBuffer = await decodeAudioData(audioBytes, outputAudioContext, 24000, 1);
            
            const currentTime = outputAudioContext.currentTime;
            const startTime = Math.max(currentTime, nextAudioStartTime.current);
            
            strangerAudioQueue.current.push({ buffer: audioBuffer, startTime });
            nextAudioStartTime.current = startTime + audioBuffer.duration;
        }
        if (message.serverContent?.interrupted) {
            strangerAudioQueue.current = [];
            nextAudioStartTime.current = 0;
            setIsStrangerSpeaking(false);
        }
    };

    if ((window as any).geminiLiveSessionCallbacks) {
        (window as any).geminiLiveSessionCallbacks.onMessage = onMessage;
    }

    const animationFrameId = requestAnimationFrame(() => processAudioQueue(outputAudioContext));

    return () => {
      mediaStreamSource.disconnect();
      scriptProcessor.disconnect();
      inputAudioContext.close();
      outputAudioContext.close();
      if (frameInterval) {
        clearInterval(frameInterval);
      }
      cancelAnimationFrame(animationFrameId);
      if ((window as any).geminiLiveSessionCallbacks) {
        (window as any).geminiLiveSessionCallbacks.onMessage = undefined;
      }
    };
  }, [userStream, chatMode, processAudioQueue]);

  const toggleMute = () => {
    setIsMuted(prev => {
      const newMuted = !prev;
      userStream.getAudioTracks().forEach(track => track.enabled = !newMuted);
      return newMuted;
    });
  };

  const toggleCamera = () => {
    if (chatMode !== ChatMode.VIDEO) return;
    setIsCameraOff(prev => {
      const newCameraOff = !prev;
       userStream.getVideoTracks().forEach(track => track.enabled = !newCameraOff);
       return newCameraOff;
    });
  };
  
  const desktopControls = (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/30 backdrop-blur-sm hidden md:flex justify-center items-center space-x-4">
        <button onClick={toggleMute} className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            {isMuted ? <UnmuteIcon className="h-6 w-6 text-white"/> : <MuteIcon className="h-6 w-6 text-white"/>}
        </button>
        {chatMode === ChatMode.VIDEO && (
            <button onClick={toggleCamera} className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                {isCameraOff ? <CameraOnIcon className="h-6 w-6 text-white"/> : <CameraOffIcon className="h-6 w-6 text-white"/>}
            </button>
        )}
        <button onClick={onStop} className="px-6 py-3 font-semibold text-white bg-danger rounded-full hover:bg-danger-hover transition-colors">
            Stop
        </button>
        <button onClick={onSkip} className="px-6 py-3 font-semibold text-white bg-primary rounded-full hover:bg-primary-hover transition-colors">
            Skip
        </button>
    </div>
  );
  
  const mobileControls = (
      <div className="mt-4 flex md:hidden items-center justify-center space-x-2">
          <button onClick={toggleMute} className="p-3 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
              {isMuted ? <UnmuteIcon className="h-6 w-6 text-slate-700 dark:text-slate-200"/> : <MuteIcon className="h-6 w-6 text-slate-700 dark:text-slate-200"/>}
          </button>
          {chatMode === ChatMode.VIDEO && (
              <button onClick={toggleCamera} className="p-3 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                  {isCameraOff ? <CameraOnIcon className="h-6 w-6 text-slate-700 dark:text-slate-200"/> : <CameraOffIcon className="h-6 w-6 text-slate-700 dark:text-slate-200"/>}
              </button>
          )}
          <div className="flex-grow"></div>
          <button onClick={onStop} className="px-4 py-2 font-semibold text-white bg-danger rounded-md hover:bg-danger-hover transition-colors text-sm">
              Stop
          </button>
          <button onClick={onSkip} className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-hover transition-colors text-sm">
              Skip
          </button>
      </div>
  );

  return (
    <div className="flex flex-col md:flex-row w-full max-w-6xl h-[95vh] sm:h-[90vh] mx-auto bg-surface-light dark:bg-surface-dark shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 animate-fade-in">
        <div className="flex-1 relative flex items-center justify-center bg-slate-100 dark:bg-slate-900 overflow-hidden">
          <StrangerVisualizer isSpeaking={isStrangerSpeaking} />
        
          <div className="absolute top-4 right-4 w-1/4 max-w-[200px] rounded-lg overflow-hidden shadow-lg border-2 border-surface-light dark:border-slate-700 aspect-[3/4]">
              <video
                  ref={userVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${isCameraOff ? 'hidden' : 'block'}`}
              />
              <div className={`w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center ${!isCameraOff ? 'hidden' : 'flex'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
              </div>
          </div>
          {desktopControls}
        </div>

        <div className="flex flex-col w-full md:w-96 h-1/2 md:h-full border-t-2 md:border-t-0 md:border-l-2 border-slate-200 dark:border-slate-700/50">
            <header className="flex items-center justify-between p-4 bg-slate-100/80 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700/50">
                <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Chat</h1>
                <ThemeToggleButton />
            </header>
            <main className="flex-1 p-4 overflow-y-auto">
                <div className="flex flex-col space-y-2">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                {isStrangerTyping && (
                    <MessageBubble 
                        message={{
                        id: 'typing-indicator',
                        text: '',
                        sender: MessageSender.STRANGER,
                        }} 
                        isTyping={true}
                    />
                )}
                <div ref={messagesEndRef} />
                </div>
            </main>
            <footer className="p-4 bg-slate-100/80 dark:bg-slate-900/50 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700/50">
                <form onSubmit={handleFormSubmit} className="flex items-center space-x-3">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-5 py-3 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 bg-slate-200 dark:bg-slate-700 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        autoFocus
                    />
                    <button
                        type="submit"
                        aria-label="Send message"
                        className="p-3 text-white rounded-full bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 disabled:opacity-50 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all"
                        disabled={!inputValue.trim()}
                    >
                        <SendIcon className="w-6 h-6" />
                    </button>
                </form>
                {mobileControls}
            </footer>
        </div>
    </div>
  );
};


declare global {
  interface Window {
    geminiLiveSessionCallbacks: {
        onMessage?: (message: any) => void;
    }
  }
}

export default LiveChatWindow;