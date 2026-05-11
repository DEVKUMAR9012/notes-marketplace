/**
 * useGuestGuard — Hook for gating protected actions behind guest conversion modal.
 *
 * Usage:
 *   const { guard, GuestModal } = useGuestGuard('uploading notes');
 *
 *   <button onClick={() => guard(() => navigate('/upload'))}>Upload</button>
 *   <GuestModal />
 */
import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import GuestConversionModal from '../components/GuestConversionModal';

export function useGuestGuard(triggerReason = 'this action') {
  const { isGuest } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  /**
   * Wrap any onClick/action with this.
   * If user is guest → show conversion modal.
   * If user is logged in → execute the action directly.
   */
  const guard = useCallback((action) => {
    if (isGuest) {
      setPendingAction(() => action);
      setModalOpen(true);
    } else {
      action?.();
    }
  }, [isGuest]);

  const handleClose = () => {
    setModalOpen(false);
    setPendingAction(null);
  };

  const GuestModal = () => (
    <GuestConversionModal
      isOpen={modalOpen}
      onClose={handleClose}
      triggerReason={triggerReason}
    />
  );

  return { guard, GuestModal, isGuest };
}
