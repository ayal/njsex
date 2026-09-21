import { useEffect, useRef, useState } from 'react';
import type { Item } from '../data';
import { COLOR_CSS, thumb } from '../data';
import { itemBadges, type CatConfig } from '../categories';
import { Star } from '../favs';

const PAGE = 120;

export function Badges({ p }: { p: Item }) {
  const b = itemBadges(p);
  if (!b.length) return null;
  return <div className="badges">{b.map((x, i) => <span key={i} className={`bd ${x.cls}`} title={x.title}>{x.text}</span>)}</div>;
}

export function ColorDot({ color }: { color?: string | null }) {
  if (!color || color === 'unknown') return null;
  return <span className="sw mini" style={{ background: COLOR_CSS[color] }} />;
}

export function Price({ p }: { p: Item }) {
  return <span className={`price ${p.avail ? '' : 'sold'}`}>{p.avail ? `$${p.price}` : 'sold out'}</span>;
}

function Card({ p, config, onOpen }: { p: Item; config: CatConfig | null; onOpen: (p: Item) => void }) {
  const s = p.specs;
  const last = p.images.length > 1 ? p.images[p.images.length - 1] : null;   // the seller's last photo is usually the frame built up
  const head = config && s ? config.head(s) : null;
  const size = config && s ? config.size(s) : null;
  const sub = config && s ? config.sub(s) : null;
  return (
    <div className="card" onClick={() => onOpen(p)}>
      {/* both thumbnails are in the DOM and lazy-load together as the card scrolls into view, so hover is a pure CSS swap */}
      <div className="pic">
        <img loading="lazy" src={thumb(p.images[0]?.src)} alt="" />
        {last && <img loading="lazy" className="alt" src={thumb(last.src)} alt="" />}
        <Star id={p.id} className="card-star" />
      </div>
      <div className="body">
        {head || size ? <>
          <div className="h"><span className="b">{head ?? '?'}</span>{size && <span className="sz">{size}{p.isFrame && <small>st/tt</small>}</span>}</div>
          {sub && <div className="t"><ColorDot color={s?.color_primary} />{sub}</div>}
        </> : <div className="t title">{p.title}</div>}
        <Badges p={p} />
        <div className="meta"><Price p={p} /><span>{p.created_at.slice(0, 10)}</span></div>
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
      <div className="grid">{items.slice(0, shown).map(p => <Card key={p.id} p={p} config={config} onOpen={onOpen} />)}</div>
      {shown < items.length && <div ref={sentinel} className="sentinel">loading {Math.min(PAGE, items.length - shown)} more of {items.length - shown}…</div>}
    </>
  );
}
