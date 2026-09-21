import { useEffect, useRef, useState } from 'react';
import type { UIState } from '../useHashState';

interface Saved { name: string; state: UIState; savedAt: string; }
const KEY = 'njsex.savedViews.v1';

function load(): Saved[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } }
function store(v: Saved[]) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } }

/** Human summary of a saved state for the list: category, availability, #filters, search. */
function summary(s: UIState) {
  const n = Object.keys(s.facets).length;
  return [s.cat || 'all', s.avail === 'in' ? 'in stock' : s.avail === 'sold' ? 'sold out' : 'all stock', n ? `${n} filter${n > 1 ? 's' : ''}` : null, s.q ? `"${s.q}"` : null, s.view === 'table' ? 'table' : null].filter(Boolean).join(' · ');
}

export function SavedViews({ state, apply }: { state: UIState; apply: (s: UIState) => void }) {
  const [views, setViews] = useState<Saved[]>(load);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away); return () => document.removeEventListener('mousedown', away);
  }, [open]);
  const save = () => {
    const n = name.trim() || summary(state);
    const next = [{ name: n, state, savedAt: new Date().toISOString() }, ...views.filter(v => v.name !== n)];   // same name overwrites
    setViews(next); store(next); setName('');
  };
  const remove = (n: string) => { const next = views.filter(v => v.name !== n); setViews(next); store(next); };
  const clear = () => { if (confirm(`Delete all ${views.length} saved views?`)) { setViews([]); store([]); } };
  return (
    <div className="saved" ref={box}>
      <button className={`saved-btn ${open ? 'on' : ''}`} onClick={() => setOpen(o => !o)}>saved views{views.length ? ` (${views.length})` : ''} ▾</button>
      {open && <div className="saved-pop">
        <div className="saved-row save">
          <input type="text" placeholder={`name (default: ${summary(state)})`} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} autoFocus />
          <button onClick={save}>save current</button>
        </div>
        {views.length === 0 && <div className="hint">nothing saved yet — set some filters, name them, save.</div>}
        {views.map(v => <div key={v.name} className="saved-row">
          <div className="saved-name" onClick={() => { apply(v.state); setOpen(false); }} title={summary(v.state)}>
            <b>{v.name}</b><small>{summary(v.state)} · {v.savedAt.slice(0, 10)}</small>
          </div>
          <button className="x" title="delete" onClick={() => remove(v.name)}>✕</button>
        </div>)}
        {views.length > 1 && <div className="saved-row"><button className="danger" onClick={clear}>clear all</button></div>}
      </div>}
    </div>
  );
}
