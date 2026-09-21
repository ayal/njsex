import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Item } from '../data';
import { COLOR_CSS } from '../data';
import { FLAG_LABEL } from '../categories';
import { filterItems, strVal, val, type FacetDef, type FacetGroup, type FacetState, type Query, type RangeState, type SetState } from '../facets';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

interface Props {
  groups: FacetGroup[]; defs: Map<string, FacetDef>;
  items: Item[];            // whole catalog (filtered by query inside)
  catItems: Item[];         // items of the current category, for slider bounds / option universe
  query: Query; onChange: (facets: FacetState) => void;
}

export function Sidebar({ groups, defs, items, catItems, query, onChange }: Props) {
  const set = (key: string, st: RangeState | SetState | null) => {
    const f = { ...query.facets };
    if (st == null) delete f[key]; else f[key] = st;
    onChange(f);
  };
  return (
    <aside className="w-[270px] shrink-0 sticky top-[var(--topH)] max-h-[calc(100vh-var(--topH))] overflow-y-auto pl-4 pr-3 py-3 space-y-2.5 max-md:static max-md:w-full max-md:max-h-none" data-testid="sidebar">
      {groups.map(g => <FacetGroupBox key={g.title} title={g.title}>
        {g.items.map(def => {
          // pool = items matching every OTHER filter, so counts show what selecting this option would leave
          const pool = filterItems(items, query, defs, def.key);
          const state = query.facets[def.key];
          const showLabel = g.items.length > 1 && (def.type === 'list' || def.type === 'swatch');
          switch (def.type) {
            case 'range': return <RangeFacet key={def.key} def={def} catItems={catItems} pool={pool} state={state as RangeState | undefined} onChange={st => set(def.key, st)} />;
            case 'list': case 'swatch': return <ListFacet key={def.key} def={def} catItems={catItems} pool={pool} state={(state as SetState) ?? []} showLabel={showLabel} onChange={st => set(def.key, st.length ? st : null)} />;
            default: return <FlagFacet key={def.key} def={def} pool={pool} state={(state as SetState) ?? []} onChange={st => set(def.key, st.length ? st : null)} />;
          }
        })}
      </FacetGroupBox>)}
    </aside>
  );
}

function FacetGroupBox({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
        {title}<ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2.5 pb-2.5 space-y-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

const Hint = ({ children }: { children: React.ReactNode }) => <div className="text-[11px] text-muted-foreground mb-1">{children}</div>;

// ---------------------------------------------------------------- range (two-thumb slider)
function RangeFacet({ def, catItems, pool, state, onChange }: { def: Extract<FacetDef, { type: 'range' }>; catItems: Item[]; pool: Item[]; state?: RangeState; onChange: (s: RangeState | null) => void }) {
  const [mn, mx] = useMemo(() => {
    const vs = catItems.map(p => val(p, def.key)).filter((v): v is number => typeof v === 'number');
    if (!vs.length) return [0, 0];
    return [Math.floor(Math.min(...vs) / def.step) * def.step, Math.ceil(Math.max(...vs) / def.step) * def.step];
  }, [catItems, def]);
  // local value while dragging so the slider feels instant; results update on commit (mouse up)
  const [live, setLive] = useState<RangeState | null>(null);
  if (mx <= mn) return null;
  const [lo, hi] = live ?? state ?? [mn, mx];
  const u = (v: number) => (def.prefix ? def.unit + v : v + def.unit);
  const withValue = pool.filter(p => val(p, def.key) != null).length;
  return (
    <div data-testid={`range-${def.key}`}>
      <div className="flex justify-between text-xs mb-2"><span>{def.label}</span><b className="tabular-nums">{u(lo)} – {u(hi)}</b></div>
      <Slider min={mn} max={mx} step={def.step} value={[lo, hi]} minStepsBetweenThumbs={0}
        onValueChange={v => setLive([v[0], v[1]])}
        onValueCommit={v => { setLive(null); onChange(v[0] <= mn && v[1] >= mx ? null : [v[0], v[1]]); }} />
      <Hint>{withValue} with a value</Hint>
    </div>
  );
}

// ---------------------------------------------------------------- list / swatch
function ListFacet({ def, catItems, pool, state, showLabel, onChange }: { def: Extract<FacetDef, { type: 'list' | 'swatch' }>; catItems: Item[]; pool: Item[]; state: SetState; showLabel: boolean; onChange: (s: SetState) => void }) {
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(false);
  const counts = useMemo(() => { const m = new Map<string, number>(); for (const p of pool) { const v = strVal(p, def.key); m.set(v, (m.get(v) ?? 0) + 1); } return m; }, [pool, def.key]);
  const allVals = useMemo(() => new Set(catItems.map(p => strVal(p, def.key))), [catItems, def.key]);
  const fmt = def.type === 'list' && def.fmt ? def.fmt : (v: string | null) => (v == null ? 'not stated / pending' : v);
  const label = (k: string) => fmt(k === 'null' || k === 'undefined' ? null : k);
  let keys: string[] = def.type === 'list' && def.order
    ? def.order.map(String).filter(k => allVals.has(k))
    : [...allVals].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b));
  if (def.type === 'list' && def.order) { for (const k of allVals) if (!keys.includes(k)) keys.push(k); }
  if (q) keys = keys.filter(k => label(k).toLowerCase().includes(q.toLowerCase()));
  const limit = def.type === 'list' ? def.limit : undefined;
  const collapsible = !!limit && keys.length > limit + 2;
  const visible = collapsible && !expanded ? keys.filter((k, i) => i < limit! || state.includes(k)) : keys;
  const toggle = (k: string) => onChange(state.includes(k) ? state.filter(x => x !== k) : [...state, k]);
  if (keys.length <= 1 && !q) return null;
  return (
    <div data-testid={`list-${def.key}`}>
      {showLabel && <Hint>{def.label}</Hint>}
      {def.type === 'list' && def.search && <Input className="h-7 text-xs mb-1.5" placeholder="filter…" value={q} onChange={e => setQ(e.target.value)} />}
      <div className="space-y-0.5">
        {visible.map(k => { const n = counts.get(k) ?? 0; return (
          <label key={k} className={cn('flex items-center gap-2 text-[13px] cursor-pointer rounded px-1 py-0.5 hover:bg-accent/60', !n && 'opacity-40')}>
            <Checkbox checked={state.includes(k)} onCheckedChange={() => toggle(k)} className="size-3.5" />
            {def.type === 'swatch' && <span className="size-3.5 rounded-full border border-black/10 shrink-0" style={{ background: COLOR_CSS[k] ?? '#fff' }} />}
            <span className="truncate">{label(k)}</span><span className="ml-auto text-[11px] text-muted-foreground tabular-nums">{n}</span>
          </label>); })}
      </div>
      {collapsible && <button className="text-xs text-primary hover:underline mt-1" onClick={() => setExpanded(e => !e)}>{expanded ? 'show less' : `show all ${keys.length}`}</button>}
    </div>
  );
}

// ---------------------------------------------------------------- flags / exclude toggles
function FlagFacet({ def, pool, state, onChange }: { def: Extract<FacetDef, { type: 'flags' | 'exclude' }>; pool: Item[]; state: SetState; onChange: (s: SetState) => void }) {
  const ex = def.type === 'exclude';
  const n = (f: string) => pool.filter(p => p.specs && p.specs[f]).length;
  const flagsShown = def.flags.filter(f => ex || n(f) > 0 || state.includes(f));
  if (!flagsShown.length) return null;
  const toggle = (f: string) => onChange(state.includes(f) ? state.filter(x => x !== f) : [...state, f]);
  return (
    <div data-testid={`flags-${def.key}`}>
      {def.label && <Hint>{def.label}</Hint>}
      <div className="flex flex-wrap gap-1">
        {flagsShown.map(f => <Toggle key={f} size="sm" variant="outline" pressed={state.includes(f)} onPressedChange={() => toggle(f)}
          className={cn('h-6 rounded-full px-2.5 text-xs font-normal', ex ? 'data-[state=on]:bg-destructive data-[state=on]:text-white data-[state=on]:border-destructive' : 'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary')}>
          {ex ? 'no ' : ''}{FLAG_LABEL[f] ?? f} <span className="opacity-60 text-[10px]">{n(f)}</span></Toggle>)}
      </div>
    </div>
  );
}
