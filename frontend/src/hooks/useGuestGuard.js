/**
 * Backward-compatible re-export.
 * The real implementation has moved to context/GuestGuardContext.jsx
 * to use a single global portal pattern (no duplicate modal instances).
 */
export { useGuestGuard } from '../context/GuestGuardContext';
