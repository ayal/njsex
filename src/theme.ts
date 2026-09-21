// Dark mode: follows the OS by default, overridable and remembered in localStorage.
import { useEffect, useSyncExternalStore } from 'react';

const KEY = 'njsex.theme.v1';
type Pref = 'light' | 'dark' | 'system';
let pref: Pref = (() => { try { return (localStorage.getItem(KEY) as Pref) || 'system'; } catch { return 'system'; } })();
const listeners = new Set<() => void>();
const mq = window.matchMedia('(prefers-color-scheme: dark)');

export const resolved = (): 'light' | 'dark' => (pref === 'system' ? (mq.matches ? 'dark' : 'light') : pref);
function apply() { document.documentElement.classList.toggle('dark', resolved() === 'dark'); for (const l of listeners) l(); }
mq.addEventListener('change', apply);
apply();

export function setTheme(p: Pref) { pref = p; try { localStorage.setItem(KEY, p); } catch { /* ignore */ } apply(); }
export function useTheme() {
  const cur = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => `${pref}:${resolved()}`, () => `${pref}:${resolved()}`);
  useEffect(apply, []);
  const [p, r] = cur.split(':') as [Pref, 'light' | 'dark'];
  return { pref: p, resolved: r, toggle: () => setTheme(r === 'dark' ? 'light' : 'dark') };
}
