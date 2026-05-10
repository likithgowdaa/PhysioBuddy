// ============================================================
// useStore.ts — React Hook for PhysioBuddy Store
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  getState,
  setState as setStoreState,
  subscribe,
  type AppState,
} from '../utils/store';

/**
 * React hook that subscribes to the PhysioBuddy shared store.
 * Returns [state, updater]. Components re-render when state changes.
 */
export function useStore(): [AppState, (partial: Partial<AppState>) => void] {
  const [state, setLocalState] = useState<AppState>(getState);

  useEffect(() => {
    // Sync local state whenever the store changes
    const unsub = subscribe(() => {
      setLocalState({ ...getState() });
    });
    return unsub;
  }, []);

  const update = useCallback((partial: Partial<AppState>) => {
    setStoreState(partial);
  }, []);

  return [state, update];
}
