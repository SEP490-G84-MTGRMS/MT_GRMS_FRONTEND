import { useEffect, useRef } from 'react';
import { generateUuidV7 } from '../../../utils/uuid';

export function useCashbookSubmissionKey(isOpen: boolean) {
  const keys = useRef(new Map<string, string>());
  useEffect(() => {
    if (!isOpen) keys.current.clear();
  }, [isOpen]);

  return (request: object) => {
    const signature = JSON.stringify(request);
    const previousKey = keys.current.get(signature);
    if (previousKey) return previousKey;

    const key = generateUuidV7();
    keys.current.set(signature, key);
    return key;
  };
}
