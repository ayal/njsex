// Types for the catalog data files and the per-product specs, plus loading/merging.

export interface Variant { id: number; price: string; available: boolean; grams: number; sku: string | null; }
export interface Image { id: number; src: string; position: number; width: number; height: number; }
export interface RawProduct {
  id: number; title: string; handle: string; body_html: string | null; _gone_at?: string; _first_seen?: string;
  published_at: string; created_at: string; updated_at: string;
  vendor: string; product_type: string; tags: string[]; variants: Variant[]; images: Image[];
}
export interface Collection { id: number; handle: string; title: string; products_count: number; }

export type Grade = 10 | 9 | 8 | 6 | 4 | 2;
export interface Specs {
  // regex-derived
  seat_tube_cm: number | null; top_tube_cm: number | null; standover_cm: number | null; headtube_cm: number | null;
  rear_spacing_mm: number | null; seatpost_mm: number | null;
  size_conflict: boolean; size_sources: { spec: number | null; title: number | null; tag: number | null };
  model_year: number | null; model_year_raw: string | null; sku_note: string | null;
  color_raw: string | null; condition_raw: string | null; condition_stated: boolean;
  headset_raw: string | null; bb_raw: string | null; drilled: boolean;
  spec_keys_found: string[]; extra_lines: string[];
  // categorical fields (with `${field}_confidence` / `${field}_probability` companions)
  builder: string; headset: string; bottom_bracket: string; material: string; tubing: string; fork: string;
  construction: string; dropouts: string; njs_approved: 'yes' | 'no' | 'unknown'; model_decade: string;
  color_primary: string; color_secondary: string; condition_grade: string; condition_score: Grade | null;
  headset_included: boolean; bb_included: boolean; seatpost_included: boolean; chrome_finish: boolean; road_frame: boolean;
  never_used: boolean; girls_keirin: boolean; vintage: boolean; uci_approved: boolean;
  metallic: boolean; flake: boolean; fade: boolean; matte: boolean; two_tone: boolean;
  has_chips: boolean; has_dents: boolean; has_rust: boolean; has_cracks: boolean; repainted: boolean; has_scratches: boolean;
  // confidences: `${field}_confidence` / `${field}_probability`
  [k: string]: unknown;
}

/** Specs for any category: frames have the full `Specs` shape, parts a flat category-specific dict. */
export type AnySpecs = Record<string, any>;

export interface Item extends RawProduct {
  price: number; avail: boolean; colls: string[]; text: string; isFrame: boolean;
  gone: boolean;   // no longer listed on the store (kept for history)
  /** the collection whose extractor owns this product ('frames', 'hubs', ...), '' if none */
  primaryCat: string;
  specs: AnySpecs | null;
}

export interface Meta { generated_at: string; products: number; live: number; in_stock: number; frames_with_specs: number; parts_with_specs: number; jev_pending?: number; last_refresh?: Record<string, unknown>; }

export interface Catalog {
  items: Item[]; collections: Collection[]; membership: Record<string, number[]>; meta: Meta | null;
  /** per category: how many products have specs */
  specsCount: Record<string, number>;
}

export const BASE = 'https://www.njs-export.com';
export const FRAME_DUPES = new Set(['frames-by-price', 'frames-by-date', 'frame-listings', 'frontpage']);

function parseJsonl<T>(text: string): T[] {
  const out: T[] = [];
  for (const line of text.split('\n')) { if (!line.trim()) continue; try { out.push(JSON.parse(line)); } catch { /* skip partial line */ } }
  return out;
}

const D = `${import.meta.env.BASE_URL}data/`;   // relative to the page, so it works on GitHub Pages sub-paths
const text = (url: string) => fetch(D + url).then(r => (r.ok ? r.text() : '')).catch(() => '');
const json = <T,>(url: string, fallback: T) => fetch(D + url).then(r => (r.ok ? (r.json() as Promise<T>) : fallback)).catch(() => fallback);

export async function loadCatalog(): Promise<Catalog> {
  const [pl, cl, ml, frameSpecs, index, meta] = await Promise.all([
    text('products.jsonl'),
    json<Collection[]>('collections.json', []),
    json<Record<string, number[]>>('collection_products.json', {}),
    text('frame_specs.jsonl'),
    json<Record<string, { file: string }>>('specs/index.json', {}),
    json<Meta | null>('meta.json', null),
  ]);
  if (!pl) throw new Error('products.jsonl not found under ' + D);
  const partFiles = await Promise.all(Object.entries(index).map(async ([cat, v]) => [cat, await text(v.file)] as const));
  const specsById = new Map<number, AnySpecs>();
  const primary = new Map<number, string>();
  const specsCount: Record<string, number> = {};
  for (const r of parseJsonl<{ id: number; specs?: AnySpecs }>(frameSpecs)) if (r.specs) { specsById.set(r.id, r.specs); primary.set(r.id, 'frames'); }
  specsCount.frames = specsById.size;
  for (const [cat, body] of partFiles) {
    let n = 0;
    for (const r of parseJsonl<{ id: number; specs?: AnySpecs }>(body)) if (r.specs) { specsById.set(r.id, r.specs); primary.set(r.id, cat); n++; }
    specsCount[cat] = n;
  }
  const inColl = new Map<number, string[]>();
  for (const [h, ids] of Object.entries(ml)) for (const id of ids) { const a = inColl.get(id) ?? []; a.push(h); inColl.set(id, a); }
  const items: Item[] = parseJsonl<RawProduct>(pl).map(p => {
    const colls = inColl.get(p.id) ?? [];
    const isFrame = p.product_type === 'Bicycle Frame';
    return {
      ...p,
      price: parseFloat(p.variants[0]?.price ?? '0'),
      avail: !p._gone_at && p.variants.some(v => v.available),
      gone: !!p._gone_at,
      colls,
      text: `${p.title} ${p.body_html ?? ''} ${p.tags.join(' ')} ${p.vendor} ${p.product_type}`.toLowerCase(),
      isFrame,
      primaryCat: primary.get(p.id) ?? (isFrame ? 'frames' : colls.find(c => !FRAME_DUPES.has(c)) ?? ''),
      specs: specsById.get(p.id) ?? null,
    };
  });
  return { items, collections: cl, membership: ml, specsCount, meta };
}

export const thumb = (src?: string) => (src ? src.replace(/(\.[a-z]+)(\?|$)/i, '_400x$1$2') : '');
export const GRADE_LABEL: Record<number, string> = { 10: 'never used', 9: 'mint', 8: 'small chips', 6: 'good used', 4: 'dents/rust', 2: 'damaged' };
export const COLOR_CSS: Record<string, string> = {
  white: '#fff', black: '#111', 'silver/grey': '#aaa', red: '#d22', orange: '#f80', yellow: '#fd0', gold: '#d4af37',
  green: '#2a2', blue: '#24c', purple: '#82c', pink: '#f6a', 'brown/champagne': '#a67b5b',
  chrome: 'linear-gradient(135deg,#eee,#888,#eee)', multi: 'linear-gradient(90deg,red,orange,yellow,green,blue,purple)', unknown: 'transparent',
};
