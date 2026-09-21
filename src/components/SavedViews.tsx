import { useState } from 'react';
import { Bookmark, Trash2, X } from 'lucide-react';
import type { UIState } from '../useHashState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

interface Saved { name: string; state: UIState; savedAt: string; }
const KEY = 'njsex.savedViews.v1';

function load(): Saved[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } }
function store(v: Saved[]) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } }

/** Human summary of a saved state for the list: category, availability, #filters, search. */
function summary(s: UIState) {
  const n = Object.keys(s.facets).length;
  return [s.cat || 'all', s.favs ? 'favourites' : s.avail === 'in' ? 'in stock' : s.avail === 'sold' ? 'sold out' : 'all stock', n ? `${n} filter${n > 1 ? 's' : ''}` : null, s.q ? `"${s.q}"` : null, s.view === 'table' ? 'table' : null].filter(Boolean).join(' · ');
}

export function SavedViews({ state, apply }: { state: UIState; apply: (s: UIState) => void }) {
  const [views, setViews] = useState<Saved[]>(load);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const save = () => {
    const n = name.trim() || summary(state);
    const next = [{ name: n, state: { ...state, open: null }, savedAt: new Date().toISOString() }, ...views.filter(v => v.name !== n)];   // same name overwrites
    setViews(next); store(next); setName('');
  };
  const remove = (n: string) => { const next = views.filter(v => v.name !== n); setViews(next); store(next); };
  const clear = () => { if (confirm(`Delete all ${views.length} saved views?`)) { setViews([]); store([]); } };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-9" data-testid="saved-btn"><Bookmark className="size-4" />saved views{views.length ? ` (${views.length})` : ''}</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-2">
        <div className="flex gap-1.5 pb-2">
          <Input className="h-8 text-xs" placeholder={`name (default: ${summary(state)})`} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} autoFocus />
          <Button size="sm" className="h-8" onClick={save}>save current</Button>
        </div>
        {views.length === 0 && <div className="text-xs text-muted-foreground px-1 py-2">nothing saved yet — set some filters, name them, save.</div>}
        {views.map(v => <div key={v.name}>
          <Separator />
          <div className="flex items-center gap-1 py-1">
            <button className="flex-1 min-w-0 text-left rounded px-1 py-0.5 hover:bg-accent" onClick={() => { apply(v.state); setOpen(false); }} title={summary(v.state)}>
              <div className="font-medium text-[13px] truncate">{v.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{summary(v.state)} · {v.savedAt.slice(0, 10)}</div>
            </button>
            <Button size="icon-xs" variant="ghost" title="delete" onClick={() => remove(v.name)}><X className="size-3" /></Button>
          </div>
        </div>)}
        {views.length > 1 && <><Separator /><div className="flex justify-end pt-1.5"><Button size="xs" variant="ghost" className="text-destructive" onClick={clear}><Trash2 className="size-3" />clear all</Button></div></>}
      </PopoverContent>
    </Popover>
  );
}
