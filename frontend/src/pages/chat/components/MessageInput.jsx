import React, { useRef, memo } from 'react';
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
            <p>{replyingTo.text || 'Attachment'}</p>
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

          <div className="embedded-tools-right" />
        </div>

        {/* Send button in flex row — eliminates absolute overlap on small phones */}
        <button
          type="button"
          className="circular-send-btn"
          onClick={handleSend}
          aria-label="Send message"
          title="Send Message"
          disabled={!inputText.trim()}
        >
          <FiSend size={16} />
        </button>
      </div>
    </div>
  );
});

export default MessageInput;
