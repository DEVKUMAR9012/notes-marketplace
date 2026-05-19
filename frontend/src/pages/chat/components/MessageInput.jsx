import React, { useRef, useState, useEffect, memo } from 'react';
import { FiSend } from 'react-icons/fi';
import imageCompression from 'browser-image-compression';
import API from '../../../utils/api';

const MessageInput = memo(function MessageInput({
  inputText, setInputText, handleTyping, handleSend,
  replyingTo, setReplyingTo,
  activeChat, uploading, setUploading, showToast
}) {
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);

  // Voice Note states and refs
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const durationIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        if (audioBlob.size > 0) {
          const formData = new FormData();
          const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
          formData.append('file', audioFile);

          try {
            setUploading(true);
            showToast("Sending Voice Note...", "success");
            await API.post(`/chat/${activeChat._id}/upload`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          } catch (err) {
            console.error("Upload failed", err);
            showToast("Failed to send Voice Note", "error");
          } finally {
            setUploading(false);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      showToast("Could not access microphone", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    showToast("Voice Note discarded", "success");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;
    if (file.size > 10 * 1024 * 1024) return showToast("File size must be under 10MB", "error");

    let finalFile = file;

    // Image Compression Pipeline
    if (file.type.startsWith('image/')) {
      try {
        setUploading(true);
        showToast("Compressing image...", "success");
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        };
        finalFile = await imageCompression(file, options);
      } catch (error) {
        console.error("Compression error:", error);
      }
    }

    const formData = new FormData();
    formData.append('file', finalFile);

    try {
      setUploading(true);
      await API.post(`/chat/${activeChat._id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (err) {
      console.error("Upload failed", err);
      showToast("Failed to upload file", "error");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  return (
    <div className="chat-input-wrapper-embedded">
      {replyingTo && (
        <div className="reply-preview">
          <div className="reply-content">
            <span className="reply-name">Replying to {replyingTo.sender?.name || 'Member'}</span>
            <p>{replyingTo.text || (replyingTo.fileUrl ? '📎 Attachment' : 'Message')}</p>
          </div>
          <button type="button" className="cancel-reply" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">✕</button>
        </div>
      )}

      {/* Flex row: input + send button — no absolute positioning */}
      <div className="embedded-input-row">
        <div className="embedded-input-container">
          <div className="embedded-tools-left">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              aria-hidden="true"
            />
            <button
              type="button"
              className="embedded-tool-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach image or PDF"
              title="Attach image or PDF only"
              disabled={uploading}
            >
              {uploading ? '⏳' : '📎'}
            </button>
            <span className="text-[10px] text-gray-600 hidden sm:inline leading-none" aria-hidden="true">img/PDF</span>
          </div>

          {isRecording ? (
            <div className="flex items-center gap-3 flex-1 px-2 text-red-400">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold">Recording Voice Note... {formatDuration(duration)}</span>
              <button 
                type="button" 
                onClick={cancelRecording}
                className="ml-auto text-[11px] bg-white/5 hover:bg-white/10 hover:text-white transition-all px-2.5 py-1 rounded-full font-medium"
              >
                ✕ Discard
              </button>
            </div>
          ) : (
            <input
              type="text"
              ref={textInputRef}
              value={inputText}
              onChange={handleTyping}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a secure message..."
              className="embedded-text-field"
              aria-label="Message input"
              autoComplete="off"
            />
          )}

          <div className="embedded-tools-right">
            <button
              type="button"
              className={`embedded-tool-btn mic-btn ${isRecording ? 'text-red-500 animate-pulse font-bold' : 'text-violet-400'}`}
              onClick={isRecording ? stopRecording : startRecording}
              aria-label={isRecording ? "Stop and Send Voice Note" : "Record voice note"}
              title={isRecording ? "Stop & Send" : "Record Voice Note"}
              disabled={uploading}
            >
              {isRecording ? '✔️' : '🎙️'}
            </button>
          </div>
        </div>

        {/* Send button in flex row — eliminates absolute overlap on small phones */}
        <button
          type="button"
          className="circular-send-btn"
          onClick={handleSend}
          aria-label="Send message"
          title="Send Message"
          disabled={!inputText.trim() || isRecording}
        >
          <FiSend size={16} />
        </button>
      </div>
    </div>
  );
});

export default MessageInput;
