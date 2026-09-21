import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Item } from '../data';
import { BASE, COLOR_CSS, thumb } from '../data';
import { configFor, itemBadges, type CatConfig } from '../categories';
import { val } from '../facets';
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

export function Badges({ p, size = 'sm' }: { p: Item; size?: 'sm' | 'md' }) {
  const b = itemBadges(p);
  if (!b.length) return null;
  return <div className="flex flex-wrap gap-1">{b.map((x, i) => <Badge key={i} title={x.title} className={cn('font-medium border-0 rounded-md', size === 'sm' ? 'h-4 px-1.5 text-[10px]' : 'h-5 px-2 text-[11px]', BADGE_CLS[x.cls] ?? BADGE_CLS[''])}>{x.text}</Badge>)}</div>;
}

export function ColorDot({ color }: { color?: string | null }) {
  if (!color || color === 'unknown') return null;
  return <span className="inline-block size-2.5 rounded-full border border-black/10 align-[-1px] mr-1" style={{ background: COLOR_CSS[color] }} />;
}

export function Price({ p, className }: { p: Item; className?: string }) {
  return <span className={cn('font-semibold', p.avail ? 'text-foreground' : 'text-red-700 dark:text-red-400', className)}>{p.avail ? `$${p.price}` : 'sold out'}</span>;
}

/** Small link to the original listing; stops the card click. */
export function ShopLink({ p, className }: { p: Item; className?: string }) {
  return <a href={`${BASE}/products/${p.handle}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title="open on njs-export.com"
    className={cn('inline-flex items-center gap-1 text-muted-foreground hover:text-primary', className)} data-testid="shop-link"><ExternalLink className="size-3.5" /></a>;
}

/** Card layout uses the config of the item's own category, so mixed favourites still read right. */
const cfgFor = (p: Item, config: CatConfig | null) => config ?? configFor(p.primaryCat);

function Card({ p, config, onOpen }: { p: Item; config: CatConfig | null; onOpen: (p: Item) => void }) {
  const s = p.specs, c = cfgFor(p, config);
  const last = p.images.length > 1 ? p.images[p.images.length - 1] : null;   // the seller's last photo is usually the frame built up
  const head = c && s ? c.head(s) : null, size = c && s ? c.size(s) : null, sub = c && s ? c.sub(s) : null;
  return (
    <div className="group flex flex-col rounded-md border bg-card overflow-hidden cursor-pointer hover:border-foreground/40 transition-colors" onClick={() => onOpen(p)} data-testid="card">
      <div className="relative aspect-[4/3] bg-muted">
        <img loading="lazy" src={thumb(p.images[0]?.src)} alt="" className="absolute inset-0 size-full object-cover" />
        {last && <img loading="lazy" src={thumb(last.src)} alt="" className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-150 group-hover:opacity-100" />}
        <Star id={p.id} className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 data-[on=true]:opacity-100 max-md:opacity-100 bg-white/80 dark:bg-black/60 rounded-full size-7 text-[17px]" />
      </div>
      <div className="flex flex-col gap-1 p-2.5 flex-1">
        {head || size ? <>
          <div className="flex justify-between items-baseline gap-1.5"><span className="font-semibold text-sm">{head ?? '?'}</span>{size && <span className="font-bold text-[15px] whitespace-nowrap">{size}{p.isFrame && <small className="font-normal text-muted-foreground text-[10px] ml-0.5">st/tt</small>}</span>}</div>
          {sub && <div className="text-xs text-muted-foreground leading-snug"><ColorDot color={s?.color_primary} />{sub}</div>}
        </> : <div className="text-[13px] leading-snug">{p.title}</div>}
        <Badges p={p} />
        <div className="flex justify-between items-center gap-1 text-xs text-muted-foreground mt-auto pt-1"><Price p={p} /><span className="flex items-center gap-2">{p.created_at.slice(0, 10)}<ShopLink p={p} /></span></div>
      </div>
    </div>
  );
}

/** Large view: one wide card per row with a big photo and the key spec columns inline. */
function LargeCard({ p, config, onOpen }: { p: Item; config: CatConfig | null; onOpen: (p: Item) => void }) {
  const s = p.specs, c = cfgFor(p, config);
  const head = c && s ? c.head(s) : null, size = c && s ? c.size(s) : null, sub = c && s ? c.sub(s) : null;
  const specs = (c?.cols ?? []).filter(col => !col.key.startsWith('_')).map(col => [col.label, val(p, col.key)] as const).filter(([, v]) => v != null && v !== 'unknown' && v !== false).slice(0, 8);
  const pics = p.images.slice(0, 4);
  return (
    <div className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] rounded-lg border bg-card overflow-hidden cursor-pointer hover:border-foreground/40 transition-colors" onClick={() => onOpen(p)} data-testid="large-card">
      <div className="relative bg-muted">
        <img loading="lazy" src={p.images[0] ? p.images[0].src.replace(/(\.[a-z]+)(\?|$)/i, '_1200x$1$2') : ''} alt="" className="w-full aspect-[4/3] object-cover" />
        {pics.length > 1 && <div className="absolute bottom-2 left-2 flex gap-1">{pics.slice(1).map(im => <img key={im.id} loading="lazy" src={thumb(im.src)} alt="" className="w-14 h-10 object-cover rounded border border-white/70 shadow" />)}</div>}
        <Star id={p.id} className="absolute top-2 right-2 bg-white/80 dark:bg-black/60 rounded-full size-8 text-[19px]" />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex justify-between items-baseline gap-2">
          <span className="font-semibold text-base">{head ?? p.title}</span>
          {size && <span className="font-bold text-xl whitespace-nowrap">{size}{p.isFrame && <small className="font-normal text-muted-foreground text-[11px] ml-1">st/tt</small>}</span>}
        </div>
        {head && <div className="text-xs text-muted-foreground leading-snug">{p.title}</div>}
        {sub && <div className="text-sm text-muted-foreground"><ColorDot color={s?.color_primary} />{sub}</div>}
        <Badges p={p} size="md" />
        {specs.length > 0 && <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px] mt-1">
          {specs.map(([l, v]) => <div key={l} className="contents"><dt className="text-muted-foreground capitalize">{l}</dt><dd className="truncate">{Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v)}</dd></div>)}
        </dl>}
        <div className="flex justify-between items-center mt-auto pt-2 text-xs text-muted-foreground">
          <Price p={p} className="text-base" />
          <span className="flex items-center gap-3">listed {p.created_at.slice(0, 10)}<a href={`${BASE}/products/${p.handle}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-primary hover:underline">on njs-export.com <ExternalLink className="size-3" /></a></span>
        </div>
      </div>
    </div>
  );
}

export function Grid({ items, config, view, onOpen }: { items: Item[]; config: CatConfig | null; view: 'grid' | 'large'; onOpen: (p: Item) => void }) {
  const page = view === 'large' ? 30 : PAGE;
  const [shown, setShown] = useState(page);
  const [prev, setPrev] = useState({ items, view });
  if (prev.items !== items || prev.view !== view) { setPrev({ items, view }); setShown(page); }   // reset paging when results or view change
  // Everything is in memory; chunked rendering only keeps the DOM small. Grow the chunk as the sentinel scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current; if (!el || shown >= items.length) return;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) setShown(n => Math.min(n + page, items.length)); }, { rootMargin: '1200px' });
    io.observe(el); return () => io.disconnect();
  }, [shown, items, page]);
  return (
    <>
      {view === 'large'
        ? <div className="flex flex-col gap-3 max-w-[1100px]">{items.slice(0, shown).map(p => <LargeCard key={p.id} p={p} config={config} onOpen={onOpen} />)}</div>
        : <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">{items.slice(0, shown).map(p => <Card key={p.id} p={p} config={config} onOpen={onOpen} />)}</div>}
      {shown < items.length && <div ref={sentinel} className="text-center text-xs text-muted-foreground p-6">loading {Math.min(page, items.length - shown)} more of {items.length - shown}…</div>}
    </>
  );
}
