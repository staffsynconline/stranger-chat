import React from 'react';

interface StrangerVisualizerProps {
  isSpeaking: boolean;
}

const StrangerVisualizer: React.FC<StrangerVisualizerProps> = ({ isSpeaking }) => {
  return (
    <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center">
      <div className={`absolute inset-0 bg-primary/20 dark:bg-primary/30 rounded-full transition-all duration-500 ${isSpeaking ? 'scale-100' : 'scale-75'}`}></div>
      {isSpeaking && (
        <div className="absolute inset-0 border-2 border-primary/50 rounded-full animate-ripple"></div>
      )}
      <div className={`w-24 h-24 md:w-32 md:h-32 bg-surface-light dark:bg-surface-dark rounded-full flex items-center justify-center relative shadow-lg transition-transform duration-300 ${isSpeaking ? 'scale-105' : 'scale-100'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-16 h-16 md:w-20 md:h-20 text-slate-400 dark:text-slate-500 transition-colors duration-300 ${isSpeaking ? 'text-primary' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </div>
    </div>
  );
};

export default StrangerVisualizer;