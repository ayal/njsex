import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Image } from '../data';

/** Shopify CDN resizer: insert _WIDTHx before the extension. */
export const sized = (src: string, w: number) => src.replace(/(\.[a-z]+)(\?|$)/i, `_${w}x$1$2`);

/** Decode an image off-screen; resolves when it can be painted without a blank frame. */
function decode(src: string): Promise<void> {
  const im = new window.Image(); im.src = src;
  return (im.decode ? im.decode() : Promise.resolve()).catch(() => undefined);
}

/**
 * Progressive source: show `low` (expected to be cached) at once, swap to `high` only after it has fully decoded,
 * so the <img> never goes blank. Returns the src to render and whether the high-res is still on its way.
 */
function useProgressive(low: string, high: string) {
  const [src, setSrc] = useState(low);
  const [loading, setLoading] = useState(low !== high);
  useEffect(() => {
    let alive = true;
    setSrc(prev => (prev === high ? prev : low)); setLoading(low !== high);
    if (low !== high) decode(high).then(() => { if (alive) { setSrc(high); setLoading(false); } });
    return () => { alive = false; };
  }, [low, high]);
  return { src, loading };
}

const LoadingPill = ({ text }: { text: string }) => <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 text-white text-[11px] px-2 py-0.5 pointer-events-none"><span className="size-2.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />{text}</span>;

/** Detail-panel gallery: one large image + thumbnail strip; click the large image for the lightbox. */
export function Gallery({ images, title }: { images: Image[]; title: string }) {
  const [i, setI] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const n = images.length;
  const cur = images[Math.min(i, n - 1)];
  const { src, loading } = useProgressive(sized(cur?.src ?? '', 400), sized(cur?.src ?? '', 1600));
  // warm the neighbours (and the lightbox size of the current one) while the user looks at this photo
  useEffect(() => { if (!n) return; for (const d of [1, -1]) decode(sized(images[(i + d + n) % n].src, 1600)); decode(sized(cur.src, 2048)); }, [i, images, n, cur]);
  if (!n) return null;
  return (
    <div className="gallery my-1" data-testid="gallery">
      {/* fixed box: photos letterbox inside, nothing below moves */}
      <div className="relative h-[min(60vh,560px)] rounded-md bg-neutral-900 overflow-hidden cursor-zoom-in" onClick={() => setLightbox(true)} title="click to view full size" data-testid="g-main">
        <img src={src} alt={title} className={`size-full object-contain block ${loading ? 'blur-[0.4px]' : ''}`} />
        {loading && <span className="absolute left-2.5 bottom-2"><LoadingPill text="loading" /></span>}
        {n > 1 && <>
          <button className={NAV + ' left-2'} onClick={e => { e.stopPropagation(); setI((i - 1 + n) % n); }}>‹</button>
          <button className={NAV + ' right-2'} onClick={e => { e.stopPropagation(); setI((i + 1) % n); }} data-testid="g-next">›</button>
        </>}
        <span className="absolute bottom-2 right-2.5 rounded-full bg-black/60 text-white text-[11px] px-2 py-0.5">{i + 1} / {n} · click to zoom</span>
      </div>
      {n > 1 && <div className="flex gap-1.5 overflow-x-auto h-[70px] pt-2 pb-1">
        {images.map((im, k) => <img key={im.id} src={sized(im.src, 200)} className={THUMB + (k === i ? ' opacity-100 border-primary' : '')} onClick={() => setI(k)} alt="" loading="lazy" />)}
      </div>}
      {/* portal: the dialog is centred with a transform, which would otherwise trap a fixed-position lightbox inside it */}
      {lightbox && createPortal(<Lightbox images={images} index={i} onIndex={setI} onClose={() => setLightbox(false)} />, document.body)}
    </div>
  );
}

const NAV = 'absolute top-1/2 -translate-y-1/2 rounded bg-black/50 hover:bg-black/75 text-white text-[34px] leading-none px-3 pt-1.5 pb-2.5 cursor-pointer';
const THUMB = 'w-[72px] h-[54px] object-cover rounded-sm cursor-pointer opacity-55 hover:opacity-100 border-2 border-transparent shrink-0';

type Zoom = 0 | 1 | 2;   // fit to screen, actual pixels, 200%

export function Lightbox({ images, index, onIndex, onClose }: { images: Image[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const [zoom, setZoom] = useState<Zoom>(0);
  const pane = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const n = images.length; const img = images[index];
  // fit: 1600 (cached from the gallery) -> 2048 ; zoomed: 2048 (cached) -> original
  const { src, loading } = useProgressive(zoom === 0 ? sized(img.src, 1600) : sized(img.src, 2048), zoom === 0 ? sized(img.src, 2048) : img.src);
  const go = useCallback((d: number) => { onIndex((index + d + n) % n); setZoom(0); }, [index, n, onIndex]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'z' || e.key === '+' || e.key === '=') setZoom(z => (z === 2 ? 0 : (z + 1) as Zoom));
      else if (e.key === '-') setZoom(z => (z === 0 ? 0 : (z - 1) as Zoom));
    };
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [go, onClose]);

  // preload neighbours at screen size so paging is instant
  useEffect(() => { for (const d of [1, -1]) decode(sized(images[(index + d + n) % n].src, 2048)); }, [index, images, n]);

  // zoomed sizes are known up front from the catalog dims, so the placeholder is already the final size
  const zoomW = img.width ? img.width * zoom : undefined, zoomH = img.height ? img.height * zoom : undefined;

  // click: toggle zoom and centre on the clicked point (sizes are known, so no need to wait for the load)
  const onImgClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    const el = pane.current; if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width, fy = (e.clientY - rect.top) / rect.height;
    const next: Zoom = zoom === 0 ? 1 : zoom === 1 ? 2 : 0;
    setZoom(next);
    if (next > 0) {
      const w = (img.width ?? e.currentTarget.naturalWidth) * next, h = (img.height ?? e.currentTarget.naturalHeight) * next;
      requestAnimationFrame(() => { el.scrollLeft = fx * w - el.clientWidth / 2; el.scrollTop = fy * h - el.clientHeight / 2; });
    }
  };
  const down = (e: React.MouseEvent) => { if (zoom === 0 || !pane.current) return; drag.current = { x: e.clientX, y: e.clientY, sl: pane.current.scrollLeft, st: pane.current.scrollTop }; e.preventDefault(); };
  const move = (e: React.MouseEvent) => { const d = drag.current, el = pane.current; if (!d || !el) return; el.scrollLeft = d.sl - (e.clientX - d.x); el.scrollTop = d.st - (e.clientY - d.y); };
  const up = () => { drag.current = null; };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-neutral-300 select-none" onClick={onClose} data-lightbox data-testid="lightbox">
      <div className="flex items-center gap-4 px-4 py-2.5 text-[13px] bg-black" onClick={e => e.stopPropagation()}>
        <span className="min-w-[52px] tabular-nums">{index + 1} / {n}</span>
        <span className="text-neutral-500">{zoom === 0 ? 'click image or Z: actual pixels' : zoom === 1 ? '100% · click: 200% · drag to pan' : '200% · click: fit'} · ← → · Esc</span>
        <span className="inline-block min-w-[170px]">{loading && <LoadingPill text={zoom === 0 ? 'loading' : 'loading full resolution'} />}</span>
        <a className="ml-auto text-sky-300 hover:underline" href={img.src} target="_blank" rel="noreferrer">open original ↗</a>
        <button className="text-white text-[22px] leading-none px-1 cursor-pointer" onClick={onClose}>✕</button>
      </div>
      <div ref={pane} className={`flex-1 overflow-auto relative ${zoom === 0 ? 'flex items-center justify-center' : 'block'} ${zoom > 0 ? (drag.current ? 'cursor-grabbing' : 'cursor-grab') : ''}`} data-testid="lb-pane" onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <img src={src} alt="" onClick={onImgClick} draggable={false} className={`block ${zoom === 0 ? 'max-w-full max-h-full object-contain cursor-zoom-in' : zoom === 1 ? 'max-w-none cursor-zoom-in' : 'max-w-none cursor-zoom-out'} ${loading ? 'blur-[0.4px]' : ''}`}
          style={zoom > 0 && zoomW ? { width: zoomW, height: zoomH } : undefined} />
      </div>
      {n > 1 && <>
        <button className={NAV + ' left-3 text-[48px] px-4 pt-2 pb-3.5'} onClick={e => { e.stopPropagation(); go(-1); }}>‹</button>
        <button className={NAV + ' right-3 text-[48px] px-4 pt-2 pb-3.5'} onClick={e => { e.stopPropagation(); go(1); }}>›</button>
        <div className="flex gap-1.5 overflow-x-auto justify-center h-[74px] px-3 py-2 bg-black" onClick={e => e.stopPropagation()}>
          {images.map((im, k) => <img key={im.id} src={sized(im.src, 200)} className={THUMB + (k === index ? ' opacity-100 border-primary' : '')} onClick={() => { onIndex(k); setZoom(0); }} alt="" />)}
        </div>
      </>}
    </div>
  );
}
