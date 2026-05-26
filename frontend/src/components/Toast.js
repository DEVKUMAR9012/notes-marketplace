/**
 * Toast.js – thin wrapper around react-hot-toast
 * Import { showToast } from this file anywhere in the app.
 *
 * Usage:
 *   showToast('Saved!', 'success')
 *   showToast('Something went wrong', 'error')
 *   showToast('Loading...', 'loading')
 *   showToast('Note added to cart')  // default (neutral)
 */
import toast from 'react-hot-toast';

/**
 * @param {string} message
 * @param {'success'|'error'|'loading'|'info'} [type='info']
 * @param {object} [options]  – react-hot-toast options
 */
export function showToast(message, type = 'info', options = {}) {
  const defaults = {
    style: {
      background: '#1a1a2e',
      color: '#fff',
      border: '1px solid rgba(139,92,246,0.25)',
      fontSize: '13px',
      fontWeight: 600,
      borderRadius: '12px',
    },
    ...options,
  };

  switch (type) {
    case 'success':
      return toast.success(message, defaults);
    case 'error':
      return toast.error(message, defaults);
    case 'loading':
      return toast.loading(message, defaults);
    default:
      return toast(message, defaults);
  }
}

export default showToast;
