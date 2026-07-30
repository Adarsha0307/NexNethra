import React, { useEffect, useRef } from 'react';

export default function CyberBackground() {
  const mCanvasRef = useRef<HTMLCanvasElement>(null);
  const pCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    /* ── MATRIX RAIN ── */
    const mCanvas = mCanvasRef.current;
    if (!mCanvas) return;
    const mCtx = mCanvas.getContext('2d');
    if (!mCtx) return;

    const resizeMatrix = () => { mCanvas.width = window.innerWidth; mCanvas.height = window.innerHeight; };
    resizeMatrix();
    window.addEventListener('resize', resizeMatrix);

    const CHARS = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF<>{}[]|\\/:;01アイウエオネクセヒラ∂∑∏∆Ω∞⊕⊗≈≠≤≥';
    const FONT_SIZE = 14;
    let COLS = Math.floor(mCanvas.width / FONT_SIZE);
    let cols: { y: number; speed: number; bright: number }[] = [];

    const initCols = () => {
      COLS = Math.floor(mCanvas.width / FONT_SIZE);
      cols = [];
      for (let i = 0; i < COLS; i++) {
        cols.push({ y: Math.random() * -200, speed: 0.3 + Math.random() * 1.2, bright: Math.random() });
      }
    };
    initCols();

    const drawMatrix = () => {
      mCtx.fillStyle = 'rgba(0, 0, 0, 0.045)';
      mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * FONT_SIZE;
        const y = c.y * FONT_SIZE;
        if (Math.random() > 0.92) {
          mCtx.fillStyle = '#ffffff'; mCtx.shadowBlur = 8; mCtx.shadowColor = '#00ff41';
        } else if (c.bright > 0.8) {
          mCtx.fillStyle = `rgba(0,255,65,${0.5 + Math.random() * 0.5})`;
          mCtx.shadowBlur = 4; mCtx.shadowColor = '#00ff41';
        } else {
          mCtx.fillStyle = `rgba(0,${Math.floor(100 + Math.random() * 80)},20,${0.1 + Math.random() * 0.25})`;
          mCtx.shadowBlur = 0;
        }
        mCtx.font = `${FONT_SIZE}px "Share Tech Mono", monospace`;
        mCtx.fillText(ch, x, y);
        mCtx.shadowBlur = 0;
        c.y += c.speed;
        if (y > mCanvas.height && Math.random() > 0.975) {
          c.y = 0; c.speed = 0.3 + Math.random() * 1.2; c.bright = Math.random();
        }
      }
    };
    const matrixInterval = setInterval(drawMatrix, 40);

    return () => {
      clearInterval(matrixInterval);
      window.removeEventListener('resize', resizeMatrix);
    };
  }, []);

  useEffect(() => {
    /* ── PARTICLE NETWORK ── */
    const pCanvas = pCanvasRef.current;
    if (!pCanvas) return;
    const pCtx = pCanvas.getContext('2d');
    if (!pCtx) return;

    const resizeParticle = () => { pCanvas.width = window.innerWidth; pCanvas.height = window.innerHeight; };
    resizeParticle();
    window.addEventListener('resize', resizeParticle);

    const PARTICLE_COUNT = 55;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; pulse: number }[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1, pulse: Math.random() * Math.PI * 2
      });
    }
    const MAX_DIST = 160;
    let animId: number;

    const drawParticles = () => {
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.pulse += 0.02;
        if (p.x < 0 || p.x > pCanvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > pCanvas.height) p.vy *= -1;
        const alpha = 0.4 + Math.sin(p.pulse) * 0.3;
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        pCtx.fillStyle = `rgba(0,255,65,${alpha})`;
        pCtx.shadowBlur = 6; pCtx.shadowColor = '#00ff41';
        pCtx.fill();
        pCtx.shadowBlur = 0;
      });
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.18;
            pCtx.beginPath();
            pCtx.moveTo(particles[a].x, particles[a].y);
            pCtx.lineTo(particles[b].x, particles[b].y);
            pCtx.strokeStyle = `rgba(0,255,65,${alpha})`;
            pCtx.lineWidth = 0.8;
            pCtx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(drawParticles);
    };
    drawParticles();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeParticle);
    };
  }, []);

  return (
    <>
      <canvas ref={mCanvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
      <canvas ref={pCanvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, opacity: 0.5 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 3, pointerEvents: 'none', animation: 'flicker 0.15s infinite', background: 'rgba(0,255,65,0.01)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 4, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.6) 100%)' }} />
      <div id="scan-beam" style={{
        position: 'fixed', left: 0, width: '100%', height: '3px', zIndex: 5, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,65,0.15) 20%, rgba(0,255,65,0.4) 50%, rgba(0,255,65,0.15) 80%, transparent 100%)',
        animation: 'scanBeam 8s linear infinite',
        boxShadow: '0 0 10px rgba(0,255,65,0.3), 0 0 30px rgba(0,255,65,0.1)'
      }} />
      <div id="glitch-lines" style={{
        position: 'fixed', inset: 0, zIndex: 5, pointerEvents: 'none', animation: 'glitchLines 6s infinite'
      }} />
      <style>{`
        @keyframes flicker {
          0% { opacity: 1; } 92% { opacity: 1; } 93% { opacity: 0.92; } 94% { opacity: 1; }
          96% { opacity: 0.95; } 100% { opacity: 1; }
        }
        @keyframes scanBeam {
          0% { top: -5px; opacity: 0; } 2% { opacity: 1; } 98% { opacity: 1; } 100% { top: 100vh; opacity: 0; }
        }
        @keyframes glitchLines {
          0%, 94%, 100% { opacity: 0; }
          95% { opacity: 1; background: linear-gradient(transparent 40%, rgba(0,255,65,0.05) 40%, rgba(0,255,65,0.05) 41%, transparent 41%), linear-gradient(transparent 70%, rgba(0,229,255,0.04) 70%, rgba(0,229,255,0.04) 71%, transparent 71%); }
          96% { opacity: 0; }
          97% { opacity: 1; background: linear-gradient(transparent 20%, rgba(255,0,64,0.04) 20%, rgba(255,0,64,0.04) 21%, transparent 21%); }
          98% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
