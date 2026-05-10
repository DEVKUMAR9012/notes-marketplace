import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

export default function RippleButton({ children, onClick, className, ...props }) {
  const [ripples, setRipples] = useState([]);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);
  
  const handleClick = (e) => {
    // ✅ FIX 1: Event object ko parent tak safely forward karo
    if (onClick) onClick(e);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { id: Date.now(), x, y };
    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      // ✅ FIX 2: Unmount hone ke baad state update rok do (Memory leak fixed)
      if (isMounted.current) {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }
    }, 600);
  };
  
  return (
    <button onClick={handleClick} className={`relative overflow-hidden ${className}`} {...props}>
      {children}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 20, opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'absolute', left: ripple.x, top: ripple.y,
            transform: 'translate(-50%, -50%)', width: '10px', height: '10px',
            background: 'rgba(255,255,255,0.5)', borderRadius: '50%', pointerEvents: 'none'
          }}
        />
      ))}
    </button>
  );
}