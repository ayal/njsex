import { useCallback, useEffect, useRef, useState } from 'react';
import type { Image } from '../data';

/** Shopify CDN resizer: insert _WIDTHx before the extension. */
export const sized = (src: string, w: number) => src.replace(/(\.[a-z]+)(\?|$)/i, `_${w}x$1$2`);

/** Detail-panel gallery: one large image + thumbnail strip; click the large image for the lightbox. */
export function Gallery({ images, title }: { images: Image[]; title: string }) {
  const [i, setI] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  if (!images.length) return null;
  const cur = images[Math.min(i, images.length - 1)];
  return (
    <div className="gallery">
      <div className="g-main" onClick={() => setLightbox(true)} title="click to view full size">
        <img src={sized(cur.src, 1600)} alt={title} />
        {images.length > 1 && <>
          <button className="g-nav prev" onClick={e => { e.stopPropagation(); setI((i - 1 + images.length) % images.length); }}>‹</button>
          <button className="g-nav next" onClick={e => { e.stopPropagation(); setI((i + 1) % images.length); }}>›</button>
        </>}
        <span className="g-count">{i + 1} / {images.length} · click to zoom</span>
      </div>
      {images.length > 1 && <div className="g-strip">
        {images.map((im, k) => <img key={im.id} src={sized(im.src, 200)} className={k === i ? 'on' : ''} onClick={() => setI(k)} alt="" loading="lazy" />)}
      </div>}
      {lightbox && <Lightbox images={images} index={i} onIndex={setI} onClose={() => setLightbox(false)} />}
    </div>
  );
}

export function Lightbox({ images, index, onIndex, onClose }: { images: Image[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const [zoom, setZoom] = useState<0 | 1 | 2>(0);
  const [loaded, setLoaded] = useState(false);
  const pane = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const img = images[index];
  const go = useCallback((d: number) => { onIndex((index + d + images.length) % images.length); setZoom(0); setLoaded(false); }, [index, images.length, onIndex]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'z' || e.key === '+' || e.key === '=') setZoom(z => (z === 2 ? 0 : (z + 1) as 1 | 2));
      else if (e.key === '-') setZoom(z => (z === 0 ? 0 : (z - 1) as 0 | 1));
    };
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [go, onClose]);

  // preload neighbours at screen size so paging is instant
  useEffect(() => { for (const d of [1, -1]) { const im = new window.Image(); im.src = sized(images[(index + d + images.length) % images.length].src, 2048); } }, [index, images]);

  // click on the image: toggle zoom and centre on the clicked point once the (possibly new) image has laid out
  const pendingCenter = useRef<{ fx: number; fy: number; z: number } | null>(null);
  const applyCenter = (imgEl: HTMLImageElement) => {
    const el = pane.current, c = pendingCenter.current; if (!el || !c) return;
    const w = imgEl.naturalWidth * c.z, h = imgEl.naturalHeight * c.z;
    el.scrollLeft = c.fx * w - el.clientWidth / 2; el.scrollTop = c.fy * h - el.clientHeight / 2;
    pendingCenter.current = null;
  };
  const onImgClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    const imgEl = e.currentTarget;
    const rect = imgEl.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width, fy = (e.clientY - rect.top) / rect.height;
    const next = zoom === 0 ? 1 : zoom === 1 ? 2 : 0;
    setZoom(next);
    if (next > 0) {
      pendingCenter.current = { fx, fy, z: next };
      // same src (1x -> 2x) fires no load event, so apply after layout; a new src applies in onLoad
      if (zoom !== 0) requestAnimationFrame(() => applyCenter(imgEl));
    }
  };
  // drag to pan when zoomed
  const down = (e: React.MouseEvent) => { if (zoom === 0 || !pane.current) return; drag.current = { x: e.clientX, y: e.clientY, sl: pane.current.scrollLeft, st: pane.current.scrollTop }; e.preventDefault(); };
  const move = (e: React.MouseEvent) => { const d = drag.current, el = pane.current; if (!d || !el) return; el.scrollLeft = d.sl - (e.clientX - d.x); el.scrollTop = d.st - (e.clientY - d.y); };
  const up = () => { drag.current = null; };

  return (
    <div className="lb" onClick={onClose}>
      <div className="lb-top" onClick={e => e.stopPropagation()}>
        <span>{index + 1} / {images.length}</span>
        <span className="lb-hint">{zoom === 0 ? 'click image or Z: actual pixels' : zoom === 1 ? '100% · click: 200% · drag to pan' : '200% · click: fit'} · ← → · Esc</span>
        <a href={img.src} target="_blank" rel="noreferrer">open original ↗</a>
        <button className="lb-x" onClick={onClose}>✕</button>
      </div>
      <div ref={pane} className={`lb-pane z${zoom} ${drag.current ? 'dragging' : ''}`} onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        {!loaded && <div className="lb-loading">loading…</div>}
        <img src={zoom === 0 ? sized(img.src, 2048) : img.src} alt="" onLoad={e => { const el = e.currentTarget; setLoaded(true); requestAnimationFrame(() => applyCenter(el)); }} onClick={onImgClick} draggable={false} />
      </div>
      {images.length > 1 && <>
        <button className="lb-nav prev" onClick={e => { e.stopPropagation(); go(-1); }}>‹</button>
        <button className="lb-nav next" onClick={e => { e.stopPropagation(); go(1); }}>›</button>
        <div className="lb-strip" onClick={e => e.stopPropagation()}>
          {images.map((im, k) => <img key={im.id} src={sized(im.src, 200)} className={k === index ? 'on' : ''} onClick={() => { onIndex(k); setZoom(0); setLoaded(false); }} alt="" />)}
        </div>
      </>}
    </div>
  );
}
