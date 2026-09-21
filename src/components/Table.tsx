import { useMemo, useState } from 'react';
import type { Item } from '../data';
import { thumb } from '../data';
import type { Col } from '../categories';
import { colSort, val } from '../facets';
import { Price } from './Cards';
import { Table as T, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

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
    if (v == null || v === 'unknown') return <span className="text-muted-foreground">—</span>;
    if (typeof v === 'boolean') return v ? 'yes' : 'no';
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
  };
  return (
    <div className="rounded-md border bg-card overflow-x-auto" data-testid="table">
      <T className="text-xs">
        <TableHeader className="sticky top-0 md:top-[var(--topH)] bg-card z-10">
          <TableRow><TableHead className="w-14" />{columns.map(c => <TableHead key={c.key} className={cn('cursor-pointer select-none whitespace-nowrap h-8', sort?.key === c.key && 'text-primary')} onClick={() => click(c.key)}>
            {c.label}{sort && sort.key === c.key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, MAX).map(p => <TableRow key={p.id} onClick={() => onOpen(p)} className="cursor-pointer">
            <TableCell className="py-1"><img loading="lazy" src={thumb(p.images[0]?.src)} alt="" className="w-12 h-9 object-cover rounded-sm" /></TableCell>
            {columns.map(c => <TableCell key={c.key} className={cn('py-1 whitespace-nowrap', c.key === '_title' && 'whitespace-normal min-w-[260px]')}>{cell(p, c)}</TableCell>)}
          </TableRow>)}
          {rows.length > MAX && <TableRow><TableCell colSpan={columns.length + 1} className="text-muted-foreground">showing {MAX} of {rows.length}, narrow the filters</TableCell></TableRow>}
        </TableBody>
      </T>
    </div>
  );
}
