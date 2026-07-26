import React from 'react';
import { BrushDivider } from './BrushDivider';

// --- Section header: brush mark + title, replaces the plain accent bar ---
export function SectionHeader({ title, className = '', size = 'text-4xl' }) {
  return (
    <div className={`flex items-center gap-5 ${className}`}>
      <BrushDivider size="lg" />
      <h2 className={`${size} font-display font-extrabold tracking-tight text-white`}>{title}</h2>
    </div>
  );
}
