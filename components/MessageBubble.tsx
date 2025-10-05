import React from 'react';
import { Message, MessageSender } from '../types';

interface MessageBubbleProps {
  message: Message;
  isTyping?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isTyping = false }) => {
  const { sender, text } = message;
  const isUser = sender === MessageSender.USER;
  const isSystem = sender === MessageSender.SYSTEM;

  if (isSystem) {
    return (
      <div className="w-full text-center my-2 animate-fade-in">
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">{text}</p>
      </div>
    );
  }

  const typingIndicator = () => (
    <div className="flex items-center space-x-1 p-2">
      <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
    </div>
  );

  return (
    <div className={`flex w-full my-1 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%]`}>
        <div className={`px-4 py-2 rounded-2xl shadow-md ${
            isUser 
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-none' 
              : 'bg-slate-200 dark:bg-surface-dark text-slate-800 dark:text-slate-100 rounded-bl-none'
          }`}>
          {isTyping ? typingIndicator() : <p className="text-base break-words">{text}</p>}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;