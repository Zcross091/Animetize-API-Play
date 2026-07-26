import React from 'react';

// --- Brush-stroke section divider (signature element) ---
export function BrushDivider({ size = '' }) {
  return <span className={`brush-divider ${size}`} aria-hidden="true" />;
}
