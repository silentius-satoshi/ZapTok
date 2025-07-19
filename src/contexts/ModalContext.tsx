import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface ModalContextType {
  isAnyModalOpen: boolean;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }
  return context;
}

interface ModalProviderProps {
  children: ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [openModals, setOpenModals] = useState<Set<string>>(new Set());

  const openModal = useCallback((modalId: string) => {
    setOpenModals(prev => new Set(prev).add(modalId));
  }, []);

  const closeModal = useCallback((modalId: string) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      newSet.delete(modalId);
      return newSet;
    });
  }, []);

  const isAnyModalOpen = openModals.size > 0;

  // Pause all videos when any modal is open
  useEffect(() => {
    const videoElements = document.querySelectorAll('video');
    
    if (isAnyModalOpen) {
      // Store current play state and pause all videos
      videoElements.forEach(video => {
        if (!video.paused) {
          video.dataset.wasPlaying = 'true';
          video.pause();
        }
      });
    } else {
      // Resume videos that were playing before modal opened
      videoElements.forEach(video => {
        if (video.dataset.wasPlaying === 'true') {
          video.play().catch(() => {
            // Ignore play failures
          });
          delete video.dataset.wasPlaying;
        }
      });
    }
  }, [isAnyModalOpen]);

  return (
    <ModalContext.Provider value={{ isAnyModalOpen, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}
