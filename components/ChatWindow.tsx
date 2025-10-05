import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageSender } from '../types';
import MessageBubble from './MessageBubble';
import ThemeToggleButton from './ThemeToggleButton';

interface ChatWindowProps {
  messages: Message[];
  isStrangerTyping: boolean;
  onSendMessage: (message: string) => void;
  onSkip: () => void;
  onStop: () => void;
}

const SendIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isStrangerTyping, onSendMessage, onSkip, onStop }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStrangerTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };
  
  return (
    <div className="flex flex-col w-full max-w-2xl h-[95vh] sm:h-[90vh] mx-auto bg-surface-light dark:bg-surface-dark shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 animate-fade-in">
      <header className="flex items-center justify-between p-4 bg-slate-100/80 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700/50">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">You're chatting with a stranger</h1>
        <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-4">
                 <button
                    onClick={onStop}
                    className="px-4 py-2 font-semibold text-white bg-danger rounded-md hover:bg-danger-hover focus:outline-none focus:ring-2 focus:ring-danger focus:ring-opacity-50 transition-colors"
                  >
                    Stop
                  </button>
                  <button
                    onClick={onSkip}
                    className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors"
                  >
                    Skip
                  </button>
            </div>
            <ThemeToggleButton />
        </div>
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
        <form onSubmit={handleSend} className="flex items-center space-x-3">
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
        <div className="mt-4 flex sm:hidden items-center justify-center space-x-4">
            <button
                onClick={onStop}
                className="px-4 py-2 font-semibold text-white bg-danger rounded-md hover:bg-danger-hover focus:outline-none focus:ring-2 focus:ring-danger focus:ring-opacity-50 transition-colors"
              >
                Stop
              </button>
              <button
                onClick={onSkip}
                className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors"
              >
                Skip
              </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatWindow;