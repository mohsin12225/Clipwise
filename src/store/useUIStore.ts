import { create } from 'zustand';
import { generateId } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface UIState {
  // Toasts
  toasts: Toast[];
  addToast: (
    message: string,
    variant?: ToastVariant,
    duration?: number
  ) => void;
  removeToast: (id: string) => void;

  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const MAX_TOASTS = 5;

export const useUIStore = create<UIState>((set) => ({
  toasts: [],

  addToast: (
    message: string,
    variant: ToastVariant = 'info',
    duration: number = 4000
  ) => {
    const toast: Toast = {
      id: generateId(),
      message,
      variant,
      duration,
    };

    set((state) => ({
      toasts: [toast, ...state.toasts].slice(0, MAX_TOASTS),
    }));

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== toast.id),
        }));
      }, duration);
    }
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  isSidebarOpen: true,
  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },
  setSidebarOpen: (open: boolean) => {
    set({ isSidebarOpen: open });
  },
}));