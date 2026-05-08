import React, { useMemo } from 'react';
import './AnimatedLogo.css';

const AnimatedLogo = ({ size = 'medium' }) => {
  // useMemo ensures particles only calculate once per size change
  const particles = useMemo(() => {
    const particleCount = size === 'small' ? 15 : 30;
    
    return Array.from({ length: particleCount }).map((_, index) => ({
      id: index,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${5 + Math.random() * 5}s`
    }));
  }, [size]);

  return (
    <div className={`animated-logo-wrapper ${size}`}>
      {/* 🚀 React-way of rendering particles */}
      <div className="particles">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: p.left,
              top: '100%',
              animation: `particle-float ${p.duration} linear infinite`,
              animationDelay: p.delay
            }}
          />
        ))}
      </div>
      
      <div className="glow-orb orb1"></div>
      <div className="glow-orb orb2"></div>

      <div className="logo-container">
        <div className="logo-icon">
          <div className="note-card"></div>
          <div className="note-card second"></div>
        </div>
        
        <div className="logo-text-wrapper">
          <div className="main-text">Notes<br/>Marketplace</div>
          <div className="subtitle">STUDY SMARTER</div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedLogo;
