import { useEffect, useRef, useState } from 'react';
import type { Item } from '../data';
import { COLOR_CSS, thumb } from '../data';
import { itemBadges, type CatConfig } from '../categories';
import { Star } from '../favs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PAGE = 120;

/** Badge colour classes by semantic key from itemBadges(). */
export const BADGE_CLS: Record<string, string> = {
  g10: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100', g9: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100',
  g8: 'bg-lime-100 text-lime-900 dark:bg-lime-900/50 dark:text-lime-100', g6: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100',
  g4: 'bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-100', g2: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100',
  new: 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100', njsno: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100',
  pend: 'bg-muted text-muted-foreground italic', warn: 'bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-100',
  tube: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100', fork: 'bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-100',
  year: 'bg-muted text-foreground tabular-nums', slope: 'bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-700',
  ftype: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/50 dark:text-cyan-100', '': 'bg-muted text-foreground',
};

export function Badges({ p }: { p: Item }) {
  const b = itemBadges(p);
  if (!b.length) return null;
  return <div className="flex flex-wrap gap-1">{b.map((x, i) => <Badge key={i} title={x.title} className={cn('h-4 px-1.5 text-[10px] font-medium border-0 rounded-md', BADGE_CLS[x.cls] ?? BADGE_CLS[''])}>{x.text}</Badge>)}</div>;
}

export function ColorDot({ color }: { color?: string | null }) {
  if (!color || color === 'unknown') return null;
  return <span className="inline-block size-2.5 rounded-full border border-black/10 align-[-1px] mr-1" style={{ background: COLOR_CSS[color] }} />;
}

export function Price({ p }: { p: Item }) {
  return <span className={cn('font-semibold', p.avail ? 'text-foreground' : 'text-red-700 dark:text-red-400')}>{p.avail ? `$${p.price}` : 'sold out'}</span>;
}

function Card({ p, config, onOpen }: { p: Item; config: CatConfig | null; onOpen: (p: Item) => void }) {
  const s = p.specs;
  const last = p.images.length > 1 ? p.images[p.images.length - 1] : null;   // the seller's last photo is usually the frame built up
  const head = config && s ? config.head(s) : null;
  const size = config && s ? config.size(s) : null;
  const sub = config && s ? config.sub(s) : null;
  return (
    <div className="group card flex flex-col rounded-md border bg-card overflow-hidden cursor-pointer hover:border-foreground/40 transition-colors" onClick={() => onOpen(p)} data-testid="card">
      {/* both thumbnails are in the DOM and lazy-load together as the card scrolls into view, so hover is a pure CSS swap */}
      <div className="relative aspect-[4/3] bg-muted">
        <img loading="lazy" src={thumb(p.images[0]?.src)} alt="" className="absolute inset-0 size-full object-cover" />
        {last && <img loading="lazy" src={thumb(last.src)} alt="" className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-150 group-hover:opacity-100" />}
        <Star id={p.id} className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 data-[on=true]:opacity-100 bg-white/80 rounded-full size-7 text-[17px]" />
      </div>
      <div className="flex flex-col gap-1 p-2.5 flex-1">
        {head || size ? <>
          <div className="flex justify-between items-baseline gap-1.5"><span className="font-semibold text-sm">{head ?? '?'}</span>{size && <span className="font-bold text-[15px] whitespace-nowrap">{size}{p.isFrame && <small className="font-normal text-muted-foreground text-[10px] ml-0.5">st/tt</small>}</span>}</div>
          {sub && <div className="text-xs text-muted-foreground leading-snug"><ColorDot color={s?.color_primary} />{sub}</div>}
        </> : <div className="text-[13px] leading-snug">{p.title}</div>}
        <Badges p={p} />
        <div className="flex justify-between items-center gap-1 text-xs text-muted-foreground mt-auto pt-1"><Price p={p} /><span>{p.created_at.slice(0, 10)}</span></div>
      </div>
    </div>
  );
}

export function Grid({ items, config, onOpen }: { items: Item[]; config: CatConfig | null; onOpen: (p: Item) => void }) {
  const [shown, setShown] = useState(PAGE);
  const [prev, setPrev] = useState(items);
  if (prev !== items) { setPrev(items); setShown(PAGE); }   // reset paging when the result set changes
  // Everything is in memory; chunked rendering only keeps the DOM small. Grow the chunk as the sentinel scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current; if (!el || shown >= items.length) return;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) setShown(n => Math.min(n + PAGE, items.length)); }, { rootMargin: '1200px' });
    io.observe(el); return () => io.disconnect();
  }, [shown, items]);
  return (
    <>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">{items.slice(0, shown).map(p => <Card key={p.id} p={p} config={config} onOpen={onOpen} />)}</div>
      {shown < items.length && <div ref={sentinel} className="text-center text-xs text-muted-foreground p-6">loading {Math.min(PAGE, items.length - shown)} more of {items.length - shown}…</div>}
    </>
  );
}
