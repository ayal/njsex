import { useMemo, useState } from 'react';
import type { Item } from '../data';
import { COLOR_CSS } from '../data';
import { FLAG_LABEL } from '../categories';
import { filterItems, strVal, val, type FacetDef, type FacetGroup, type FacetState, type Query, type RangeState, type SetState } from '../facets';

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
    <aside className="side">
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
  return <div className={`facet ${open ? '' : 'closed'}`}><h4 onClick={() => setOpen(o => !o)}>{title}</h4>{open && <div className="body">{children}</div>}</div>;
}

// ---------------------------------------------------------------- range (dual slider)
function RangeFacet({ def, catItems, pool, state, onChange }: { def: Extract<FacetDef, { type: 'range' }>; catItems: Item[]; pool: Item[]; state?: RangeState; onChange: (s: RangeState | null) => void }) {
  const [mn, mx] = useMemo(() => {
    const vs = catItems.map(p => val(p, def.key)).filter((v): v is number => typeof v === 'number');
    if (!vs.length) return [0, 0];
    return [Math.floor(Math.min(...vs) / def.step) * def.step, Math.ceil(Math.max(...vs) / def.step) * def.step];
  }, [catItems, def]);
  if (mx <= mn) return null;
  const [lo, hi] = state ?? [mn, mx];
  const u = (v: number) => (def.prefix ? def.unit + v : v + def.unit);
  const commit = (a: number, b: number) => { if (a > b) [a, b] = [b, a]; onChange(a <= mn && b >= mx ? null : [a, b]); };
  const pct = (v: number) => ((v - mn) / (mx - mn)) * 100;
  const withValue = pool.filter(p => val(p, def.key) != null).length;
  return (
    <div className="range">
      <div className="lbl"><span>{def.label}</span><b>{u(lo)} – {u(hi)}</b></div>
      <div className="dual">
        <div className="track" />
        <div className="fill" style={{ left: `calc(8px + ${pct(lo)} * (100% - 16px) / 100)`, width: `calc(${pct(hi) - pct(lo)} * (100% - 16px) / 100)` }} />
        <input type="range" min={mn} max={mx} step={def.step} value={lo} onChange={e => commit(+e.target.value, hi)} />
        <input type="range" min={mn} max={mx} step={def.step} value={hi} onChange={e => commit(lo, +e.target.value)} />
      </div>
      <div className="hint">{withValue} with a value</div>
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
  if (def.type === 'list' && def.order) { for (const k of allVals) if (!keys.includes(k)) keys.push(k); }  // values outside the declared order still show
  if (q) keys = keys.filter(k => label(k).toLowerCase().includes(q.toLowerCase()));
  const limit = def.type === 'list' ? def.limit : undefined;
  const collapsible = !!limit && keys.length > limit + 2;
  const visible = collapsible && !expanded ? keys.filter((k, i) => i < limit! || state.includes(k)) : keys;
  const toggle = (k: string) => onChange(state.includes(k) ? state.filter(x => x !== k) : [...state, k]);
  if (keys.length <= 1 && !q) return null;   // nothing to choose
  return (
    <div>
      {showLabel && <div className="hint">{def.label}</div>}
      {def.type === 'list' && def.search && <input type="search" placeholder="filter…" value={q} onChange={e => setQ(e.target.value)} />}
      {visible.map(k => { const n = counts.get(k) ?? 0; return (
        <label key={k} className={`opt ${n ? '' : 'zero'}`}>
          <input type="checkbox" checked={state.includes(k)} onChange={() => toggle(k)} />
          {def.type === 'swatch' && <span className="sw" style={{ background: COLOR_CSS[k] ?? '#fff' }} />}
          <span>{label(k)}</span><span className="n">{n}</span>
        </label>); })}
      {collapsible && <div className="more" onClick={() => setExpanded(e => !e)}>{expanded ? 'show less' : `show all ${keys.length}`}</div>}
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
    <div>
      {def.label && <div className="hint">{def.label}</div>}
      <div className="tog">
        {flagsShown.map(f => <button key={f} className={state.includes(f) ? (ex ? 'ex' : 'on') : ''} onClick={() => toggle(f)}>
          {ex ? 'no ' : ''}{FLAG_LABEL[f] ?? f} <small>{n(f)}</small></button>)}
      </div>
    </div>
  );
}
