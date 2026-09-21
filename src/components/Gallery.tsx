import { useCallback, useEffect, useRef, useState } from 'react';
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

const LoadingPill = ({ text }: { text: string }) => <span className="img-loading"><span className="spin" />{text}</span>;

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
    <div className="gallery">
      <div className="g-main" onClick={() => setLightbox(true)} title="click to view full size">
        <img src={src} alt={title} className={loading ? 'soft' : ''} />
        {loading && <LoadingPill text="loading" />}
        {n > 1 && <>
          <button className="g-nav prev" onClick={e => { e.stopPropagation(); setI((i - 1 + n) % n); }}>‹</button>
          <button className="g-nav next" onClick={e => { e.stopPropagation(); setI((i + 1) % n); }}>›</button>
        </>}
        <span className="g-count">{i + 1} / {n} · click to zoom</span>
      </div>
      {n > 1 && <div className="g-strip">
        {images.map((im, k) => <img key={im.id} src={sized(im.src, 200)} className={k === i ? 'on' : ''} onClick={() => setI(k)} alt="" loading="lazy" />)}
      </div>}
      {lightbox && <Lightbox images={images} index={i} onIndex={setI} onClose={() => setLightbox(false)} />}
    </div>
  );
}

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
    <div className="lb" onClick={onClose}>
      <div className="lb-top" onClick={e => e.stopPropagation()}>
        <span>{index + 1} / {n}</span>
        <span className="lb-hint">{zoom === 0 ? 'click image or Z: actual pixels' : zoom === 1 ? '100% · click: 200% · drag to pan' : '200% · click: fit'} · ← → · Esc</span>
        <span className="lb-pill-slot">{loading && <LoadingPill text={zoom === 0 ? 'loading' : 'loading full resolution'} />}</span>
        <a href={img.src} target="_blank" rel="noreferrer">open original ↗</a>
        <button className="lb-x" onClick={onClose}>✕</button>
      </div>
      <div ref={pane} className={`lb-pane z${zoom} ${drag.current ? 'dragging' : ''}`} onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <img src={src} alt="" onClick={onImgClick} draggable={false} className={loading ? 'soft' : ''}
          style={zoom > 0 && zoomW ? { width: zoomW, height: zoomH, maxWidth: 'none' } : undefined} />
      </div>
      {n > 1 && <>
        <button className="lb-nav prev" onClick={e => { e.stopPropagation(); go(-1); }}>‹</button>
        <button className="lb-nav next" onClick={e => { e.stopPropagation(); go(1); }}>›</button>
        <div className="lb-strip" onClick={e => e.stopPropagation()}>
          {images.map((im, k) => <img key={im.id} src={sized(im.src, 200)} className={k === index ? 'on' : ''} onClick={() => { onIndex(k); setZoom(0); }} alt="" />)}
        </div>
      </>}
    </div>
  );
}
