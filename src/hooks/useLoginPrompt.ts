import { useCallback } from 'react';
import { useCurrentUser } from './useCurrentUser';

export function useLoginPrompt() {
  const { canSign, checkLogin } = useCurrentUser();

  // Check if user needs login for a specific action
  const requiresLogin = useCallback((action?: string) => {
    return !canSign;
  }, [canSign]);

  // Execute action with login check (following Jumble's checkLogin pattern)
  const withLoginCheck = useCallback(async (
    callback: () => void | Promise<void>,
    options?: {
      loginMessage?: string;
      onLoginRequired?: () => void;
    }
  ) => {
    if (canSign) {
      // User is fully authenticated, execute callback
      return await Promise.resolve(callback());
    }
    
    // User needs to login
    if (options?.onLoginRequired) {
      options.onLoginRequired();
    } else {
      // Default behavior - show alert for login requirement
      const message = options?.loginMessage || 'Login required to perform this action';
      console.warn(message);
      // User feedback for login requirement
      alert(`${message}. Please sign in to continue.`);
    }
  }, [canSign]);

  // Check if specific features are available
  const canPerformAction = useCallback((action: 'post' | 'comment' | 'like' | 'zap' | 'follow' | 'share-enhanced') => {
    switch (action) {
      case 'post':
      case 'comment':
      case 'like':
      case 'zap':
      case 'follow':
      case 'share-enhanced':
        return canSign;
      default:
        return true; // Default to allowing action
    }
  }, [canSign]);

  return {
    requiresLogin,
    withLoginCheck,
    canPerformAction,
    canSign,
    isReadOnly: !canSign
  };
}