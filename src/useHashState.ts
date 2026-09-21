// Keeps the whole UI state in the URL hash so any view is bookmarkable/shareable.
import { useCallback, useEffect, useState } from 'react';
import type { FacetState } from './facets';

export interface UIState {
  cat: string; view: 'grid' | 'table'; sort: string; q: string; avail: 'all' | 'in' | 'sold'; facets: FacetState;
}
export const DEFAULT_STATE: UIState = { cat: 'frames', view: 'grid', sort: 'created_desc', q: '', avail: 'in', facets: {} };

function read(): UIState {
  try {
    const raw = location.hash.slice(1);
    if (!raw) return DEFAULT_STATE;
    const o = JSON.parse(decodeURIComponent(raw));
    const avail = o.avail === true ? 'in' : (['all', 'in', 'sold'].includes(o.avail) ? o.avail : 'in');   // old hashes stored a boolean
    return { ...DEFAULT_STATE, ...o, avail, facets: o.facets ?? {} };
  } catch { return DEFAULT_STATE; }
}
function write(s: UIState) {
  const o: Partial<UIState> = { cat: s.cat, view: s.view, sort: s.sort, facets: s.facets };
  if (s.q) o.q = s.q; if (s.avail !== 'in') o.avail = s.avail;
  history.replaceState(null, '', '#' + encodeURIComponent(JSON.stringify(o)));
}

export function useHashState() {
  const [state, setState] = useState<UIState>(read);
  useEffect(() => { write(state); }, [state]);
  useEffect(() => {
    const onHash = () => setState(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const update = useCallback((patch: Partial<UIState> | ((s: UIState) => Partial<UIState>)) =>
    setState(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })), []);
  return [state, update] as const;
}
