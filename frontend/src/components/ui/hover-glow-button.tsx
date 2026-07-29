import React, { useRef, useState, MouseEvent, ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  glowColor?: string;
  backgroundColor?: string;
  textColor?: string;
  hoverTextColor?: string;
}

const HoverButton: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  className = '', 
  disabled = false,
  glowColor = '#2b7fff',
  backgroundColor = '#111827',
  textColor = '#ffffff',
  hoverTextColor = '#67e8f9'
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setGlowPosition({ x, y });
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative inline-block border-none cursor-pointer overflow-hidden transition-colors duration-300 z-10 font-sans ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      style={{
        backgroundColor: backgroundColor,
        color: isHovered ? hoverTextColor : textColor,
      }}
    >
      <div
        className={`absolute w-[200px] h-[200px] rounded-full opacity-50 pointer-events-none transition-transform duration-400 ease-out -translate-x-1/2 -translate-y-1/2 ${isHovered ? 'scale-120' : 'scale-0'}`}
        style={{
          left: `${glowPosition.x}px`,
          top: `${glowPosition.y}px`,
          background: `radial-gradient(circle, ${glowColor} 10%, transparent 70%)`,
          zIndex: 0,
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export { HoverButton };
