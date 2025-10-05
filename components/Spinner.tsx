import React from 'react';

interface SpinnerProps {
  text: string;
}

const Spinner: React.FC<SpinnerProps> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
};

export default Spinner;