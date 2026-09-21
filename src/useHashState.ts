// Keeps the whole UI state in the URL hash so any view is bookmarkable/shareable.
//   #cat=frames&sort=seat_tube_cm_asc&f={"builder":["Makino"]}&p=makino-silver-52cm
// `p` is the open product's handle. Opening a product pushes a history entry so Back closes it.
import { useCallback, useEffect, useState } from 'react';
import type { FacetState } from './facets';

export interface UIState {
  cat: string; view: 'grid' | 'showcase' | 'table'; sort: string; q: string; avail: 'all' | 'in' | 'sold'; facets: FacetState;
  /** handle of the product open in the detail panel */
  open: string | null;
  /** show only favourites */
  favs: boolean;
}
export const DEFAULT_STATE: UIState = { cat: 'frames', view: 'grid', sort: 'created_desc', q: '', avail: 'in', facets: {}, open: null, favs: false };

function read(): UIState {
  const raw = location.hash.slice(1);
  if (!raw) return DEFAULT_STATE;
  try {
    if (raw.startsWith('%7B') || raw.startsWith('{')) {          // legacy JSON hash from earlier versions
      const o = JSON.parse(decodeURIComponent(raw));
      return { ...DEFAULT_STATE, ...o, avail: o.avail === true ? 'in' : o.avail ?? 'in', facets: o.facets ?? {}, open: null };
    }
    const q = new URLSearchParams(raw);
    const s: UIState = { ...DEFAULT_STATE, facets: {} };
    if (q.get('cat')) s.cat = q.get('cat')!;   // no 'All' category any more; empty falls back to frames
    const v = q.get('view'); if (v === 'table' || v === 'showcase' || v === 'large') s.view = v === 'large' ? 'showcase' : v;
    if (q.has('sort')) s.sort = q.get('sort')!;
    if (q.has('q')) s.q = q.get('q')!;
    const a = q.get('avail'); if (a === 'all' || a === 'sold') s.avail = a;
    if (q.has('f')) { try { s.facets = JSON.parse(q.get('f')!); } catch { /* ignore bad facets */ } }
    if (q.has('p')) s.open = q.get('p');
    if (q.get('favs') === '1') s.favs = true;
    return s;
  } catch { return DEFAULT_STATE; }
}

function serialize(s: UIState): string {
  const q = new URLSearchParams();
  q.set('cat', s.cat);
  if (s.view !== 'grid') q.set('view', s.view);
  if (s.sort !== 'created_desc') q.set('sort', s.sort);
  if (s.q) q.set('q', s.q);
  if (s.avail !== 'in') q.set('avail', s.avail);
  if (Object.keys(s.facets).length) q.set('f', JSON.stringify(s.facets));
  if (s.open) q.set('p', s.open);
  if (s.favs) q.set('favs', '1');
  // keep the facet JSON readable in the address bar
  return '#' + q.toString().replace(/%7B/gi, '{').replace(/%7D/gi, '}').replace(/%22/g, '"').replace(/%3A/gi, ':').replace(/%2C/gi, ',').replace(/%5B/gi, '[').replace(/%5D/gi, ']');
}

export function useHashState() {
  const [state, setState] = useState<UIState>(read);
  const [pushNext, setPushNext] = useState(false);
  useEffect(() => {
    const h = serialize(state);
    if (h === location.hash) return;
    if (pushNext) { history.pushState(null, '', h); setPushNext(false); } else history.replaceState(null, '', h);
  }, [state, pushNext]);
  useEffect(() => {
    const onHash = () => setState(read());          // Back/Forward and hand-edited URLs
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('popstate', onHash); };
  }, []);
  const update = useCallback((patch: Partial<UIState> | ((s: UIState) => Partial<UIState>), opts?: { push?: boolean }) => {
    if (opts?.push) setPushNext(true);
    setState(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);
  return [state, update] as const;
}
