import React from 'react';

export default function Logo({ size = 40, showText = true, textColor = 'var(--text-primary)' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', verticalAlign: 'middle' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="top-grad" x1="35" y1="35" x2="65" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="left-grad" x1="35" y1="65" x2="35" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="bottom-grad" x1="65" y1="65" x2="35" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="right-grad" x1="65" y1="35" x2="65" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#D1D5DB" />
            <stop offset="100%" stopColor="#9CA3AF" />
          </linearGradient>
        </defs>

        {/* Top Figure (Purple) */}
        <path d="M 35,35 Q 50,29 65,35 Q 50,44 35,35 Z" fill="url(#top-grad)" />
        <circle cx="50" cy="20" r="5.5" fill="#7C3AED" />

        {/* Right Figure (Gray) */}
        <path d="M 65,35 Q 71,50 65,65 Q 56,50 65,35 Z" fill="url(#right-grad)" />
        <circle cx="80" cy="50" r="5.5" fill="#9CA3AF" />

        {/* Bottom Figure (Light Blue) */}
        <path d="M 65,65 Q 50,71 35,65 Q 50,56 65,65 Z" fill="url(#bottom-grad)" />
        <circle cx="50" cy="80" r="5.5" fill="#3B82F6" />

        {/* Left Figure (Blue) */}
        <path d="M 35,65 Q 29,50 35,35 Q 44,50 35,65 Z" fill="url(#left-grad)" />
        <circle cx="20" cy="50" r="5.5" fill="#2563EB" />
      </svg>

      {showText && (
        <span style={{
          fontFamily: 'var(--font-family)',
          fontWeight: 700,
          fontSize: `${size * 0.7}px`,
          color: textColor,
          letterSpacing: '-0.04em',
          userSelect: 'none',
          lineHeight: 1
        }}>
          Mehfil
        </span>
      )}
    </div>
  );
}
