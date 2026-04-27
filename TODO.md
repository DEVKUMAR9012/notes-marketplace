# Chat Fixes Implementation TODO

## FIX 1 — Typing Indicator (WhatsApp-style)
- [x] Add `TypingBubble` component inside Chat.jsx
- [x] Display typing bubble inside messages area (when `typingUser` is set)
- [x] Fix `onUserStoppedTyping` to check `userId` before clearing
- [x] Add `typingUser` to scroll dependency so it auto-scrolls
- [x] Add bouncing dots animation in Chat.css

## FIX 2 — Online / LastSeen Status
- [x] Add relative time helper (e.g. "2 min ago")
- [x] Dynamic status line: `typing…` → `Online` → `Last seen: 5 min ago`
- [x] Add `.typing-status` CSS class (purple italic)

## FIX 3 — Offline Delivery & Reconnect
- [x] On socket `connect`, reload active chat messages (not just conversations)
- [x] Handle `messages_delivery_update` to update local message states real-time


