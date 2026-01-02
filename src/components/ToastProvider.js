"use client";

import { createContext, useContext, useState } from 'react';
import { XCircle, CheckCircle, AlertCircle } from 'lucide-react';
export const ToastContext = createContext();

export const useToast = () => {
  return useContext(ToastContext);
};



const Toast = ({ toast, removeToast }) => {
  const { title, description, variant } = toast;

  let iconElement;
  switch (variant) {
    case 'success':
      iconElement = <CheckCircle className="w-6 h-6 text-green-500" />;
      break;
    case 'error':
    case 'destructive': 
      iconElement = <XCircle className="w-6 h-6 text-red-500" />;
      break;
    case 'warning':
      iconElement = <AlertCircle className="w-6 h-6 text-yellow-500" />;
      break;
    default:
      iconElement = null;
  }

  return (
    <div
      className={`bg-white p-4 rounded-lg shadow-2xl flex items-center space-x-3 mb-3 min-w-[300px] border ${
        variant === 'success' ? 'border-l-4 border-l-green-500' : 
        variant === 'error' || variant === 'destructive' ? 'border-l-4 border-l-red-500' : 
        'border-l-4 border-l-yellow-500'
      }`}
    >
      {iconElement}
      <div className="flex-1">
        <strong className="block text-sm font-bold text-gray-900">{title}</strong>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = ({ title, description, variant }) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, title, description, variant }]);
    
    setTimeout(() => {
      removeToast(id);
    }, 5000); 
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Container for toasts */}
      <div className="fixed bottom-5 left-5 z-[9999] flex flex-col-reverse pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} removeToast={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
