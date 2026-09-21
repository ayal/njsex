import { useEffect, useRef } from 'react';
import type { Catalog } from '../data';
import { FRAME_DUPES } from '../data';
import { FLAG_LABEL, type CatConfig } from '../categories';
import { SORTS, type FacetDef, type FacetState, type RangeState } from '../facets';
import type { UIState } from '../useHashState';
import { SavedViews } from './SavedViews';

interface Props { catalog: Catalog; config: CatConfig | null; defs: Map<string, FacetDef>; state: UIState; resultCount: number; catCount: number; update: (p: Partial<UIState>) => void; }


export function TopBar({ catalog, config, defs, state, resultCount, catCount, update }: Props) {
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
    <div className="top" ref={ref}>
      <div className="cats">
        {cats.map(c => <button key={c.handle} className={c.handle === state.cat ? 'on' : ''}
          onClick={() => update({ cat: c.handle, facets: {}, sort: SORTS[state.sort] ? state.sort : 'created_desc' })}>
          {c.title}<small>{c.n}</small></button>)}
      </div>
      <div className="bar">
        <input type="search" placeholder="search title, description, tags" value={state.q} onChange={e => update({ q: e.target.value })} />
        <select value={state.sort} onChange={e => update({ sort: e.target.value })}>
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          {specSorts.length > 0 && <optgroup label="by spec">{specSorts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</optgroup>}
        </select>
        <span className="seg">
          {(['all', 'in', 'sold'] as const).map(a => <button key={a} className={state.avail === a ? 'on' : ''} onClick={() => update({ avail: a })}>{{ all: 'all', in: 'in stock', sold: 'sold out' }[a]}</button>)}
        </span>
        <span className="seg">
          <button className={state.view === 'grid' ? 'on' : ''} onClick={() => update({ view: 'grid' })}>grid</button>
          <button className={state.view === 'table' ? 'on' : ''} onClick={() => update({ view: 'table' })}>table</button>
        </span>
        <SavedViews state={state} apply={s => update(s)} />
        <span className="count">{resultCount} of {catCount}</span>
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
    <div className="chips">
      {chips.map((c, i) => <span key={i} className="chip" onClick={() => remove(c.k, c.v)}>{c.label} ✕</span>)}
      <span className="chip reset" onClick={() => onChange({})}>reset all</span>
    </div>
  );
}
