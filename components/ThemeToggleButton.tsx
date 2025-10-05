import React from 'react';
import { useTheme } from '../hooks/useTheme';

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);


const ThemeToggleButton: React.FC<{className?: string}> = ({ className }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-background-dark ${isDark ? 'bg-slate-700' : 'bg-blue-300'} ${className}`}
      aria-label="Toggle theme"
    >
      <span
        className={`absolute inset-y-0 left-0 flex items-center justify-center h-8 w-8 transform transition-transform duration-300 ${isDark ? 'translate-x-6' : 'translate-x-0'}`}
      >
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-surface-light dark:bg-surface-dark shadow-lg">
           {isDark ? <MoonIcon /> : <SunIcon />}
        </span>
      </span>
    </button>
  );
};

export default ThemeToggleButton;