import React from 'react';

// --- Hanko seal rating badge (signature element) ---
export function Seal({ score, size = '' }) {
  return (
    <span className={`hanko ${size}`}>{score}</span>
  );
}
