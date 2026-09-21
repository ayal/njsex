// Facet definitions and pure filtering/sorting logic. No DOM here.
import type { Item } from './data';

export type RangeState = [number, number];
export type SetState = string[];               // arrays (not Sets) so they serialize to the URL hash
export type FacetState = Record<string, RangeState | SetState>;

export type FacetDef =
  | { key: string; type: 'range'; label: string; step: number; unit: string; prefix?: boolean }
  | { key: string; type: 'list'; label: string; search?: boolean; limit?: number; order?: (string | null)[]; fmt?: (v: string | null) => string }
  | { key: string; type: 'swatch'; label: string }
  | { key: string; type: 'flags'; label?: string; flags: string[] }
  | { key: string; type: 'exclude'; label: string; flags: string[] };

export interface FacetGroup { title: string; items: FacetDef[]; }

export function defsOf(groups: FacetGroup[]): Map<string, FacetDef> {
  const m = new Map<string, FacetDef>();
  for (const g of groups) for (const it of g.items) m.set(it.key, it);
  return m;
}

/** Value of a facet key on an item: `_price`-style keys read the item, others read specs. */
export function val(p: Item, key: string): unknown {
  if (key.startsWith('_')) return (p as unknown as Record<string, unknown>)[key.slice(1)];
  return p.specs ? p.specs[key] : undefined;
}
export const strVal = (p: Item, key: string) => String(val(p, key) ?? null);

type Pred = (p: Item) => boolean;
function predicate(def: FacetDef, state: RangeState | SetState): Pred {
  switch (def.type) {
    case 'range': { const [lo, hi] = state as RangeState; return p => { const v = val(p, def.key); return typeof v === 'number' && v >= lo && v <= hi; }; }
    case 'exclude': { const fl = state as SetState; return p => (p.specs ? !fl.some(f => p.specs![f]) : true); }
    case 'flags': { const fl = state as SetState; return p => (p.specs ? fl.every(f => !!p.specs![f]) : false); }
    default: { const set = new Set(state as SetState); return p => set.has(strVal(p, def.key)); }
  }
}

export interface Query { cat: string; q: string; avail: 'all' | 'in' | 'sold'; facets: FacetState; }

export function filterItems(items: Item[], query: Query, defs: Map<string, FacetDef>, exceptKey: string | null = null): Item[] {
  const q = query.q.trim().toLowerCase();
  const preds: Pred[] = [];
  for (const [k, st] of Object.entries(query.facets)) {
    if (k === exceptKey) continue;
    const def = defs.get(k); if (def) preds.push(predicate(def, st));
  }
  return items.filter(p =>
    (!query.cat || p.colls.includes(query.cat)) &&
    (query.avail === 'all' || (query.avail === 'in') === p.avail) &&
    (!q || p.text.includes(q)) &&
    preds.every(f => f(p)));
}

// ---------------------------------------------------------------- sorting
type Cmp = (a: Item, b: Item) => number;
const numSort = (k: string, dir: 1 | -1): Cmp => (a, b) => {
  const x = val(a, k) as number | null | undefined, y = val(b, k) as number | null | undefined;
  if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x - y) * dir;
};
export const SORTS: Record<string, { label: string; cmp: Cmp }> = {
  created_desc: { label: 'newest first', cmp: (a, b) => b.created_at.localeCompare(a.created_at) },
  created_asc: { label: 'oldest first', cmp: (a, b) => a.created_at.localeCompare(b.created_at) },
  updated_desc: { label: 'recently updated', cmp: (a, b) => b.updated_at.localeCompare(a.updated_at) },
  price_asc: { label: 'price ↑', cmp: (a, b) => a.price - b.price },
  price_desc: { label: 'price ↓', cmp: (a, b) => b.price - a.price },
  cond_desc: { label: 'best condition first', cmp: colSort('condition_score', -1) },
  cond_asc: { label: 'worst condition first', cmp: colSort('condition_score', 1) },
  year_desc: { label: 'model year newest', cmp: colSort('model_year', -1) },
  year_asc: { label: 'model year oldest', cmp: colSort('model_year', 1) },
};
/** Per-category spec sorts: `${key}_asc` / `${key}_desc`. */
export function specSort(sortKey: string): Cmp | null {
  const m = /^(.*)_(asc|desc)$/.exec(sortKey); if (!m) return null;
  return colSort(m[1], m[2] === 'asc' ? 1 : -1);
}

/** Column sort for the table view: numeric when both numbers, else string. */
export function colSort(k: string, dir: 1 | -1): Cmp { return (a, b) => {
  const x = val(a, k), y = val(b, k);
  if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
  return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
}; }
