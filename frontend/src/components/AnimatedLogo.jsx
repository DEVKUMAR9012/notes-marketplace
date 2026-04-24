import React, { useEffect } from 'react';
import './AnimatedLogo.css';

const AnimatedLogo = ({ size = 'medium' }) => {
  useEffect(() => {
    // Generate floating particles
    const container = document.getElementById('particles-container');
    if (container) {
      container.innerHTML = '';
      const particleCount = size === 'small' ? 15 : 30;
      
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const leftPos = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = 5 + Math.random() * 5;
        
        particle.style.left = leftPos + '%';
        particle.style.top = '100%';
        particle.style.animation = `particle-float ${duration}s linear infinite`;
        particle.style.animationDelay = delay + 's';
        
        container.appendChild(particle);
      }
    }
  }, [size]);

  return (
    <div className={`animated-logo-wrapper ${size}`}>
      <div id="particles-container" className="particles"></div>
      
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
