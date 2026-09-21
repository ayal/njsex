import { useEffect, useRef } from 'react';
import { Search, Star, X } from 'lucide-react';
import type { Catalog } from '../data';
import { FRAME_DUPES } from '../data';
import { FLAG_LABEL, type CatConfig } from '../categories';
import { SORTS, type FacetDef, type FacetState, type RangeState } from '../facets';
import type { UIState } from '../useHashState';
import { SavedViews } from './SavedViews';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Props { catalog: Catalog; config: CatConfig | null; defs: Map<string, FacetDef>; state: UIState; resultCount: number; catCount: number; favCount: number; update: (p: Partial<UIState>) => void; }

export function TopBar({ catalog, config, defs, state, resultCount, catCount, favCount, update }: Props) {
  // keep --topH in sync with the bar's real height so sticky sidebar/table headers sit right under it
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const sync = () => document.documentElement.style.setProperty('--topH', el.offsetHeight + 'px');
    sync(); const ro = new ResizeObserver(sync); ro.observe(el); return () => ro.disconnect();
  }, []);
  const cats = [{ handle: '', title: 'All', n: catalog.items.length }].concat(
    catalog.collections.filter(c => !FRAME_DUPES.has(c.handle) && catalog.membership[c.handle]?.length)
      .map(c => ({ handle: c.handle, title: c.title, n: catalog.membership[c.handle].length }))
      .sort((a, b) => b.n - a.n));
  const specSorts = (config?.sorts ?? []).flatMap(s => [[`${s.key}_asc`, `${s.label} ↑`], [`${s.key}_desc`, `${s.label} ↓`]]);
  return (
    <div className="sticky top-0 z-20 bg-card border-b" ref={ref}>
      <div className="flex gap-1.5 px-4 pt-2 overflow-x-auto [scrollbar-width:none]">
        {cats.map(c => <Button key={c.handle} size="sm" variant={c.handle === state.cat ? 'default' : 'outline'} className="rounded-full h-7 shrink-0"
          onClick={() => update({ cat: c.handle, facets: {}, open: null, sort: SORTS[state.sort] ? state.sort : 'created_desc' })}>
          {c.title}<span className="opacity-60 text-xs">{c.n}</span></Button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="search title, description, tags" value={state.q} onChange={e => update({ q: e.target.value })} />
        </div>
        <Select value={state.sort} onValueChange={v => update({ sort: v })}>
          <SelectTrigger className="w-[190px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>{Object.entries(SORTS).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}</SelectGroup>
            {specSorts.length > 0 && <SelectGroup><SelectLabel>by spec</SelectLabel>{specSorts.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectGroup>}
          </SelectContent>
        </Select>
        <ToggleGroup type="single" variant="outline" size="sm" value={state.favs ? '' : state.avail} disabled={state.favs} onValueChange={v => v && update({ avail: v as UIState['avail'] })}>
          <ToggleGroupItem value="all">all</ToggleGroupItem><ToggleGroupItem value="in">in stock</ToggleGroupItem><ToggleGroupItem value="sold">sold out</ToggleGroupItem>
        </ToggleGroup>
        <Button size="sm" variant={state.favs ? 'default' : 'outline'} className={cn('h-9', state.favs && 'bg-amber-500 hover:bg-amber-500/90 border-amber-500')} title="show only favourites" onClick={() => update({ favs: !state.favs })}>
          <Star className={cn('size-4', state.favs && 'fill-current')} />favs{favCount ? ` (${favCount})` : ''}
        </Button>
        <ToggleGroup type="single" variant="outline" size="sm" value={state.view} onValueChange={v => v && update({ view: v as UIState['view'] })}>
          <ToggleGroupItem value="grid">grid</ToggleGroupItem><ToggleGroupItem value="table">table</ToggleGroupItem>
        </ToggleGroup>
        <SavedViews state={state} apply={s => update(s)} />
        <span className="text-muted-foreground tabular-nums" data-testid="count">{resultCount} of {catCount}</span>
      </div>
      <Chips facets={state.facets} defs={defs} onChange={facets => update({ facets })} />
    </div>
  );
}

function Chips({ facets, defs, onChange }: { facets: FacetState; defs: Map<string, FacetDef>; onChange: (f: FacetState) => void }) {
  const chips: { k: string; v: string | null; label: string }[] = [];
  for (const [k, st] of Object.entries(facets)) {
    const def = defs.get(k); if (!def) continue;
    if (def.type === 'range') { const [a, b] = st as RangeState; const u = (v: number) => (def.prefix ? def.unit + v : v + def.unit); chips.push({ k, v: null, label: `${def.label} ${u(a)}–${u(b)}` }); continue; }
    for (const v of st as string[]) {
      let label: string;
      if (def.type === 'flags') label = FLAG_LABEL[v] ?? v;
      else if (def.type === 'exclude') label = 'no ' + (FLAG_LABEL[v] ?? v);
      else if (def.type === 'list' && def.fmt) label = def.fmt(v === 'null' ? null : v);
      else label = v === 'null' ? `${def.label}: not stated` : v;
      chips.push({ k, v, label });
    }
  }
  if (!chips.length) return null;
  const remove = (k: string, v: string | null) => {
    const f = { ...facets };
    if (v == null) delete f[k]; else { const rest = (f[k] as string[]).filter(x => x !== v); if (rest.length) f[k] = rest; else delete f[k]; }
    onChange(f);
  };
  return (
    <div className="flex flex-wrap gap-1.5 px-4 pb-2" data-testid="chips">
      {chips.map((c, i) => <Badge key={i} variant="secondary" className="cursor-pointer gap-1 pr-1.5 hover:bg-accent" onClick={() => remove(c.k, c.v)}>{c.label}<X className="size-3" /></Badge>)}
      <Badge variant="outline" className="cursor-pointer text-muted-foreground hover:bg-accent" onClick={() => onChange({})}>reset all</Badge>
    </div>
  );
}
