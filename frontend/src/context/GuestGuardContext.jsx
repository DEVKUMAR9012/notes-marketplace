/**
 * GuestGuardContext — Global portal for the GuestConversionModal.
 *
 * Place <GuestGuardProvider> once near the app root (inside AuthProvider).
 * Any component can then call useGuestGuard() to get a guard() function
 * that shows the modal when the user is a guest.
 *
 * Benefits over per-page <GuestModal /> instances:
 *  - Single DOM node = no duplicate event listeners or stale callbacks
 *  - Survives route changes (the modal stays mounted even during navigation)
 *  - Zero extra JSX in every consuming page/component
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import GuestConversionModal from '../components/GuestConversionModal';

const GuestGuardContext = createContext(null);

// ── Provider (render once in App.jsx / index.jsx) ────────────────────────────
export function GuestGuardProvider({ children }) {
  const { isGuest } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [triggerReason, setTriggerReason] = useState('this action');

  /**
   * guard(action, reason?)
   * If user is a guest → open the conversion modal.
   * If user is logged in → execute the action immediately.
   */
  const guard = useCallback((action, reason = 'this action') => {
    if (isGuest) {
      setTriggerReason(reason);
      setModalOpen(true);
    } else {
      action?.();
    }
  }, [isGuest]);

  const handleClose = () => setModalOpen(false);

  return (
    <GuestGuardContext.Provider value={{ guard, isGuest }}>
      {children}
      {/* Single global portal — always mounted, never duplicated */}
      <GuestConversionModal
        isOpen={modalOpen}
        onClose={handleClose}
        triggerReason={triggerReason}
      />
    </GuestGuardContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────
export function useGuestGuard(defaultReason) {
  const ctx = useContext(GuestGuardContext);
  if (!ctx) throw new Error('useGuestGuard must be used inside <GuestGuardProvider>');

  // If caller passes a default reason, pre-bind it so old usages still work:
  // const { guard } = useGuestGuard('checking out');
  // <button onClick={() => guard(() => fn())} />
  const guard = defaultReason
    ? (action) => ctx.guard(action, defaultReason)
    : ctx.guard;

  return { guard, isGuest: ctx.isGuest };
}
