// Favourite products, persisted in localStorage. Shared across the app through a tiny external store.
import { useSyncExternalStore } from 'react';

const KEY = 'njsex.favs.v1';
let favs: Set<number> = load();
const listeners = new Set<() => void>();

function load(): Set<number> { try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify([...favs])); } catch { /* storage unavailable */ } }
function emit() { for (const l of listeners) l(); }

export function toggleFav(id: number) { favs = new Set(favs); favs.has(id) ? favs.delete(id) : favs.add(id); save(); emit(); }
export function clearFavs() { favs = new Set(); save(); emit(); }

export function useFavs(): Set<number> {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => favs, () => favs);
}

export function Star({ id, className = '' }: { id: number; className?: string }) {
  const f = useFavs(); const on = f.has(id);
  return <button className={`star ${on ? 'on' : ''} ${className}`} title={on ? 'remove from favourites' : 'add to favourites'}
    onClick={e => { e.stopPropagation(); toggleFav(id); }}>{on ? '★' : '☆'}</button>;
}
