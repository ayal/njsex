import { useEffect, useRef } from 'react';
import { ExternalLink, LayoutGrid, Moon, Rows3, Search, SlidersHorizontal, Star, Sun, Table2, X } from 'lucide-react';
import type { Catalog } from '../data';
import { BASE, FRAME_DUPES } from '../data';
import { FLAG_LABEL, type CatConfig } from '../categories';
import { SORTS, type FacetDef, type FacetState, type RangeState } from '../facets';
import type { UIState } from '../useHashState';
import { useTheme } from '../theme';
import { SavedViews } from './SavedViews';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props {
  catalog: Catalog; config: CatConfig | null; defs: Map<string, FacetDef>; state: UIState; resultCount: number; catCount: number; favCount: number;
  update: (p: Partial<UIState>) => void; onFilters?: () => void;   // onFilters: open the mobile filter drawer
}

export function TopBar({ catalog, config, defs, state, resultCount, catCount, favCount, update, onFilters }: Props) {
  // keep --topH in sync with the bar's real height so sticky sidebar/table headers sit right under it
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const sync = () => document.documentElement.style.setProperty('--topH', el.offsetHeight + 'px');
    sync(); const ro = new ResizeObserver(sync); ro.observe(el); return () => ro.disconnect();
  }, []);
  const theme = useTheme();
  const cats = catalog.collections.filter(c => !FRAME_DUPES.has(c.handle) && catalog.membership[c.handle]?.length)
    .map(c => ({ handle: c.handle, title: c.title, n: catalog.membership[c.handle].length }))
    .sort((a, b) => b.n - a.n);
  const specSorts = (config?.sorts ?? []).flatMap(s => [[`${s.key}_asc`, `${s.label} ↑`], [`${s.key}_desc`, `${s.label} ↓`]]);
  const nFacets = Object.keys(state.facets).length;
  return (
    <div className="md:sticky top-0 z-20 bg-card border-b" ref={ref}>   {/* on phones the bar scrolls away: 200px of sticky chrome is too much */}
      {/* header: brand + link to the shop + theme */}
      <div className="flex items-center gap-3 px-4 pt-2">
        <span className="font-semibold tracking-tight">NJS Export <span className="text-muted-foreground font-normal">browser</span></span>
        <a href={BASE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">njs-export.com <ExternalLink className="size-3" /></a>
        <span className="hidden sm:inline text-[11px] text-muted-foreground">unofficial · read-only · every listing links to the shop</span>
        <Tooltip><TooltipTrigger asChild>
          <Button size="icon-sm" variant="ghost" className="ml-auto" onClick={theme.toggle} aria-label="toggle dark mode" title={theme.resolved === 'dark' ? 'switch to light mode' : 'switch to dark mode'}>{theme.resolved === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button>
        </TooltipTrigger><TooltipContent>{theme.resolved === 'dark' ? 'light mode' : 'dark mode'}</TooltipContent></Tooltip>
      </div>
      <div className="flex gap-1.5 px-4 pt-2 overflow-x-auto [scrollbar-width:none]">
        {cats.map(c => <Button key={c.handle} size="sm" variant={c.handle === state.cat && !state.favs ? 'default' : 'outline'} className="rounded-full h-7 shrink-0"
          onClick={() => update({ cat: c.handle, facets: {}, open: null, favs: false, sort: SORTS[state.sort] ? state.sort : 'created_desc' })}>
          {c.title}<span className="opacity-60 text-xs">{c.n}</span></Button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        {onFilters && config && !state.favs && <Button size="sm" variant="outline" className="h-9 md:hidden" onClick={onFilters}><SlidersHorizontal className="size-4" />filters{nFacets ? ` (${nFacets})` : ''}</Button>}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="search" value={state.q} onChange={e => update({ q: e.target.value })} />
        </div>
        <Select value={state.sort} onValueChange={v => update({ sort: v })}>
          <SelectTrigger className="w-[160px] sm:w-[190px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>{Object.entries(SORTS).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}</SelectGroup>
            {specSorts.length > 0 && <SelectGroup><SelectLabel>by spec</SelectLabel>{specSorts.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectGroup>}
          </SelectContent>
        </Select>
        <ToggleGroup type="single" variant="outline" size="sm" value={state.favs ? '' : state.avail} disabled={state.favs} onValueChange={v => v && update({ avail: v as UIState['avail'] })}>
          <ToggleGroupItem value="all">all</ToggleGroupItem><ToggleGroupItem value="in">in stock</ToggleGroupItem><ToggleGroupItem value="sold">sold out</ToggleGroupItem>
        </ToggleGroup>
        <Button size="sm" variant={state.favs ? 'default' : 'outline'} className={cn('h-9', state.favs && 'bg-amber-500 hover:bg-amber-500/90 border-amber-500 text-white')} title="show favourites from every category" onClick={() => update({ favs: !state.favs, open: null })}>
          <Star className={cn('size-4', state.favs && 'fill-current')} /><span className="hidden sm:inline">favs</span>{favCount ? ` (${favCount})` : ''}
        </Button>
        <ToggleGroup type="single" variant="outline" size="sm" value={state.view} onValueChange={v => v && update({ view: v as UIState['view'] })} aria-label="view">
          {([['grid', 'Grid: compact cards', LayoutGrid], ['showcase', 'Showcase: one big card per row with photos and specs', Rows3], ['table', 'Table: sortable columns for comparing', Table2]] as const).map(([v, tip, Icon]) =>
            <Tooltip key={v}><TooltipTrigger asChild><ToggleGroupItem value={v} aria-label={tip} title={tip}><Icon className="size-4" /></ToggleGroupItem></TooltipTrigger><TooltipContent>{tip}</TooltipContent></Tooltip>)}
        </ToggleGroup>
        <SavedViews state={state} apply={s => update(s)} />
        <span className="text-muted-foreground tabular-nums" data-testid="count">{state.favs ? `${resultCount} favourites` : `${resultCount} of ${catCount}`}</span>
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
