// src/hooks/use-toast.js
import { ToastContext } from '@/components/ToastProvider'; // Import the Context object
import { useContext } from 'react';

export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  
  return context;
};