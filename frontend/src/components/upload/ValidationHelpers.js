export const MAX_FILE_SIZE_USER = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE_ADMIN = 100 * 1024 * 1024; // 100MB
export const MAX_FILE_SIZE = MAX_FILE_SIZE_USER; // Default legacy support

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain'
];

export const validateFile = (file) => {
  if (!file) return 'Please select a file to upload.';

  if (file.size > MAX_FILE_SIZE) {
    return `File size too large (Max ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB). Please compress the file and try again.`;
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Invalid file type. Executables and unsupported formats are blocked for security.';
  }

  // Double extension check (e.g., malicious.pdf.exe)
  const parts = file.name.split('.');
  if (parts.length > 2 && parts[parts.length - 1] === 'exe') {
    return 'Malicious file pattern detected.';
  }

  return null; // Valid
};

let hashWorker = null;
let resolveQueue = {};
let msgId = 0;

export const calculateFileHash = (file) => {
  return new Promise((resolve, reject) => {
    // Fallback if workers aren't supported (e.g. testing environments)
    if (typeof window === 'undefined' || !window.Worker) {
      file.arrayBuffer().then(buffer => crypto.subtle.digest('SHA-256', buffer))
        .then(hashBuffer => resolve(Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')))
        .catch(reject);
      return;
    }

    if (!hashWorker) {
      const workerScript = `
        self.onmessage = async function(e) {
          try {
            const { file, id } = e.data;
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            self.postMessage({ id, hash });
          } catch(err) {
            self.postMessage({ id, error: err.message });
          }
        };
      `;
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      hashWorker = new Worker(URL.createObjectURL(blob));
      hashWorker.onmessage = (e) => {
        const { id, hash, error } = e.data;
        if (error) resolveQueue[id].reject(new Error(error));
        else resolveQueue[id].resolve(hash);
        delete resolveQueue[id];
      };
    }
    const id = msgId++;
    resolveQueue[id] = { resolve, reject };
    hashWorker.postMessage({ file, id });
  });
};
