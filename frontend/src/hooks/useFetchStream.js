import { useRef, useCallback } from 'react';

export const useFetchStream = () => {
  const abortRef = useRef(null);

  const stream = useCallback(async (url, options, onChunk, onError) => {
    // Abort any ongoing request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete chunk for next iteration

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) onChunk(data.text);
              else if (data.error) throw new Error(data.error);
            } catch (parseErr) {
              // Not a complete JSON yet – wait for next chunk
              console.debug('Incomplete chunk, waiting...');
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { stream, abort };
};
