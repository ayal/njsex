import { useMemo, useState } from 'react';
import type { Item } from '../data';
import { thumb } from '../data';
import type { Col } from '../categories';
import { colSort, val } from '../facets';
import { Price } from './Cards';

const MAX = 400;
const DEFAULT_COLS: Col[] = [{ label: 'title', key: '_title' }, { label: 'type', key: '_product_type' }, { label: 'price', key: '_price' }, { label: 'listed', key: '_created_at' }];

export function Table({ items, cols, onOpen }: { items: Item[]; cols: Col[] | null; onOpen: (p: Item) => void }) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const columns = cols ?? DEFAULT_COLS;
  const rows = useMemo(() => (sort ? [...items].sort(colSort(sort.key, sort.dir)) : items), [items, sort]);
  const click = (k: string) => setSort(s => (s?.key === k ? { key: k, dir: s.dir === 1 ? -1 : 1 } : { key: k, dir: 1 }));
  const cell = (p: Item, c: Col) => {
    if (c.key === '_price') return <Price p={p} />;
    if (c.key === '_created_at') return p.created_at.slice(0, 10);
    const v = val(p, c.key);
    if (v == null || v === 'unknown') return <span className="dim">—</span>;
    if (typeof v === 'boolean') return v ? 'yes' : 'no';
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
  };
  return (
    <div className="tblwrap">
      <table className="tbl">
        <thead><tr><th />{columns.map(c => <th key={c.key} className={sort?.key === c.key ? 'on' : ''} onClick={() => click(c.key)}>
          {c.label}{sort && sort.key === c.key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, MAX).map(p => <tr key={p.id} onClick={() => onOpen(p)}>
            <td><img loading="lazy" src={thumb(p.images[0]?.src)} alt="" /></td>
            {columns.map(c => <td key={c.key} className={c.key === '_title' ? 'wrap' : ''}>{cell(p, c)}</td>)}
          </tr>)}
          {rows.length > MAX && <tr><td colSpan={columns.length + 1} className="muted">showing {MAX} of {rows.length}, narrow the filters</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
