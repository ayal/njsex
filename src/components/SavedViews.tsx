import { useState } from 'react';
import { Bookmark, Check, Pencil, RotateCcw, Save, Trash2, X } from 'lucide-react';
import type { UIState } from '../useHashState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Saved { name: string; state: UIState; savedAt: string; }
const KEY = 'njsex.savedViews.v1';
const ACTIVE_KEY = 'njsex.savedViews.active';

function load(): Saved[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } }
function store(v: Saved[]) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } }
function loadActive(): string | null { try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } }
function storeActive(n: string | null) { try { n ? localStorage.setItem(ACTIVE_KEY, n) : localStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ } }

/** What a view captures: everything except the open product. */
const capture = (s: UIState): UIState => ({ ...s, open: null });
const sig = (s: UIState) => JSON.stringify({ cat: s.cat, view: s.view, sort: s.sort, q: s.q, facets: s.facets, favs: s.favs });

/** Human summary of a saved state for the list: category, availability, #filters, search. */
function summary(s: UIState) {
  const n = Object.keys(s.facets).length;
  return [s.favs ? 'favourites' : s.cat || 'all', n ? `${n} filter${n > 1 ? 's' : ''}` : null, s.q ? `"${s.q}"` : null, s.view !== 'grid' ? s.view : null].filter(Boolean).join(' · ');
}

export function SavedViews({ state, apply }: { state: UIState; apply: (s: UIState) => void }) {
  const [views, setViews] = useState<Saved[]>(load);
  const [active, setActiveState] = useState<string | null>(loadActive);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);
  const setActive = (n: string | null) => { setActiveState(n); storeActive(n); };
  const persist = (next: Saved[]) => { setViews(next); store(next); };

  const activeView = views.find(v => v.name === active) ?? null;
  const modified = !!activeView && sig(activeView.state) !== sig(state);

  const saveAs = () => {
    const n = name.trim(); if (!n) return;
    persist([{ name: n, state: capture(state), savedAt: new Date().toISOString() }, ...views.filter(v => v.name !== n)]);   // same name overwrites
    setActive(n); setName('');
  };
  const update = (n: string) => persist(views.map(v => (v.name === n ? { ...v, state: capture(state), savedAt: new Date().toISOString() } : v)));
  const revert = (v: Saved) => { apply({ ...v.state, open: null }); };
  const loadView = (v: Saved) => { apply({ ...v.state, open: null }); setActive(v.name); setOpen(false); };
  const remove = (n: string) => { persist(views.filter(v => v.name !== n)); if (active === n) setActive(null); };
  const rename = () => {
    if (!renaming) return; const to = renaming.to.trim(); if (!to || to === renaming.from) { setRenaming(null); return; }
    persist(views.filter(v => v.name !== to).map(v => (v.name === renaming.from ? { ...v, name: to } : v)));
    if (active === renaming.from) setActive(to); setRenaming(null);
  };
  const clear = () => { if (confirm(`Delete all ${views.length} saved views?`)) { persist([]); setActive(null); } };

  const label = activeView ? activeView.name : 'saved views';
  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setRenaming(null); }}>
      <PopoverTrigger asChild>
        <Button size="sm" variant={activeView ? 'secondary' : 'outline'} className="h-9 max-w-[220px]" data-testid="saved-btn" title={activeView ? `active view: ${activeView.name}${modified ? ' (modified)' : ''}` : 'saved views'}>
          <Bookmark className={cn('size-4 shrink-0', activeView && 'fill-current')} />
          <span className={cn('truncate', !activeView && 'hidden sm:inline')}>{label}</span>
          {modified && <span className="size-2 rounded-full bg-amber-500 shrink-0" title="filters changed since this view was saved" data-testid="modified-dot" />}
          {!activeView && views.length > 0 && <span className="text-muted-foreground">({views.length})</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] max-w-[95vw] p-2">
        {/* active view: update / revert */}
        {activeView && <div className="rounded-md border bg-accent/40 p-2 mb-2" data-testid="active-view">
          <div className="flex items-center gap-2">
            <Bookmark className="size-4 fill-current shrink-0" />
            <div className="flex-1 min-w-0"><div className="font-medium text-[13px] truncate">{activeView.name}</div><div className="text-[11px] text-muted-foreground truncate">{modified ? 'filters changed since saved' : 'matches the saved filters'} · saved {activeView.savedAt.slice(0, 10)}</div></div>
          </div>
          {modified && <div className="flex gap-1.5 mt-2">
            <Button size="sm" className="h-7 flex-1" onClick={() => update(activeView.name)} data-testid="update-btn"><Save className="size-3.5" />Update "{activeView.name}" with current filters</Button>
            <Button size="sm" variant="outline" className="h-7" onClick={() => revert(activeView)} title="discard changes, back to the saved filters"><RotateCcw className="size-3.5" />Revert</Button>
          </div>}
        </div>}
        {/* save as new */}
        <div className="flex gap-1.5 pb-2">
          <Input className="h-8 text-xs" placeholder={activeView ? 'save as a new view…' : `name (e.g. ${summary(state)})`} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveAs()} autoFocus={!activeView} />
          <Button size="sm" variant={activeView ? 'outline' : 'default'} className="h-8" onClick={saveAs} disabled={!name.trim()}>{activeView ? 'save as new' : 'save'}</Button>
        </div>
        {!activeView && !name.trim() && <div className="text-[11px] text-muted-foreground px-1 -mt-1 pb-2">type a name and press Enter to save the current filters</div>}
        {views.length === 0 && <div className="text-xs text-muted-foreground px-1 py-2">nothing saved yet.</div>}
        {views.map(v => <div key={v.name}>
          <Separator />
          <div className={cn('flex items-center gap-1 py-1', v.name === active && 'opacity-70')}>
            {renaming?.from === v.name
              ? <><Input className="h-7 text-xs flex-1" value={renaming.to} autoFocus onChange={e => setRenaming({ from: v.name, to: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') setRenaming(null); }} />
                  <Button size="icon-xs" variant="ghost" onClick={rename} title="save name"><Check className="size-3" /></Button></>
              : <>
                  <button className="flex-1 min-w-0 text-left rounded px-1 py-0.5 hover:bg-accent" onClick={() => loadView(v)} title={`load: ${summary(v.state)}`}>
                    <div className="font-medium text-[13px] truncate">{v.name}{v.name === active && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">active</span>}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{summary(v.state)} · {v.savedAt.slice(0, 10)}</div>
                  </button>
                  <Button size="icon-xs" variant="ghost" title="rename" onClick={() => setRenaming({ from: v.name, to: v.name })}><Pencil className="size-3" /></Button>
                  <Button size="icon-xs" variant="ghost" title="delete" onClick={() => remove(v.name)}><X className="size-3" /></Button>
                </>}
          </div>
        </div>)}
        {views.length > 1 && <><Separator /><div className="flex justify-between items-center pt-1.5">
          {activeView && <Button size="xs" variant="ghost" onClick={() => setActive(null)} title="keep the filters, just stop tracking this view">detach</Button>}
          <Button size="xs" variant="ghost" className="text-destructive ml-auto" onClick={clear}><Trash2 className="size-3" />clear all</Button>
        </div></>}
      </PopoverContent>
    </Popover>
  );
}
