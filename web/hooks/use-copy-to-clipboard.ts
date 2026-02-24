'use client';

import { useCallback, useState } from 'react';

interface UseCopyToClipboardResult {
  copyToClipboard: (text: string) => void;
  isCopied: boolean;
  error: Error | null;
}

export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setError(null);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      setError(err as Error);
      setIsCopied(false);
    }
  }, []);

  return { copyToClipboard, isCopied, error };
}
