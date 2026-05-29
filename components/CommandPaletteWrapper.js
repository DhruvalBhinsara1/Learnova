'use client';

import { useState, useEffect } from 'react';
import CommandPalette from './CommandPalette';

export default function CommandPaletteWrapper() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('learnova:open-search', handleOpen);
    window.addEventListener('learnova:open-shortcuts', handleOpen);

    // Support standard Ctrl+K (or Cmd+K) shortcut for instant premium command search
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('learnova:open-search', handleOpen);
      window.removeEventListener('learnova:open-shortcuts', handleOpen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return <CommandPalette isOpen={isOpen} onClose={() => setIsOpen(false)} />;
}
