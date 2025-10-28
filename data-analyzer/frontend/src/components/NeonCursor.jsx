import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';

const NeonCursor = ({ targetSelector = '.cursor-target', hideDefaultCursor = true }) => {
  // Don't render on mobile/touch devices
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const cursorRef = useRef(null);
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  // Return null on mobile devices
  if (isMobile) {
    return null;
  }

  const moveCursor = useCallback((x, y) => {
    if (!cursorRef.current) return;
    gsap.to(cursorRef.current, {
      x,
      y,
      duration: 0,
      ease: 'none'
    });
  }, []);

  useEffect(() => {
    if (!cursorRef.current) return;

    const originalCursor = document.body.style.cursor;
    if (hideDefaultCursor) {
      document.body.style.cursor = 'none';
    }

    const cursor = cursorRef.current;
    const ring = ringRef.current;
    const dot = dotRef.current;

    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    });

    const moveHandler = e => moveCursor(e.clientX, e.clientY);
    window.addEventListener('mousemove', moveHandler);

    const enterHandler = e => {
      const target = e.target.closest(targetSelector);
      if (!target || !ring) return;

      gsap.to(ring, {
        scale: 2.5,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const leaveHandler = e => {
      const target = e.target.closest(targetSelector);
      if (!target || !ring) return;

      gsap.to(ring, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const mouseDownHandler = () => {
      if (!dot) return;
      gsap.to(dot, { scale: 0.7, duration: 0.1 });
      gsap.to(ring, { scale: 0.9, duration: 0.1 });
    };

    const mouseUpHandler = () => {
      if (!dot) return;
      gsap.to(dot, { scale: 1, duration: 0.1 });
      gsap.to(ring, { scale: 1, duration: 0.1 });
    };

    window.addEventListener('mouseover', enterHandler, { passive: true });
    window.addEventListener('mouseout', leaveHandler, { passive: true });
    window.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mouseup', mouseUpHandler);

    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseover', enterHandler);
      window.removeEventListener('mouseout', leaveHandler);
      window.removeEventListener('mousedown', mouseDownHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
      document.body.style.cursor = originalCursor;
    };
  }, [targetSelector, moveCursor, hideDefaultCursor]);

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div
        ref={dotRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '6px',
          height: '6px',
          background: 'var(--neon-cyan)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          willChange: 'transform',
          boxShadow: '0 0 10px var(--neon-cyan), 0 0 20px var(--neon-cyan)'
        }}
      />
      <div
        ref={ringRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '32px',
          height: '32px',
          border: '2px solid var(--neon-cyan)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          willChange: 'transform',
          boxShadow: '0 0 5px var(--neon-cyan)',
          opacity: 0.6
        }}
      />
    </div>
  );
};

export default NeonCursor;
