// Per-category presentation: which facets to show, what a card leads with, table columns, extra sorts.
import type { AnySpecs, Item } from './data';
import { GRADE_LABEL } from './data';
import type { FacetDef, FacetGroup } from './facets';

export interface Col { label: string; key: string; }
export interface CatConfig {
  facets: FacetGroup[];
  /** bold left text on a card, e.g. builder / brand */
  head: (s: AnySpecs) => string | null;
  /** bold right text on a card, e.g. size / teeth */
  size: (s: AnySpecs) => string | null;
  /** grey line under the head */
  sub: (s: AnySpecs) => string | null;
  cols: Col[];
  sorts: { key: string; label: string }[];
}

const NA = 'not stated / pending';
const list = (key: string, label: string, opt: Partial<Extract<FacetDef, { type: 'list' }>> = {}): FacetDef => ({ key, type: 'list', label, ...opt });
const range = (key: string, label: string, step: number, unit: string, prefix = false): FacetDef => ({ key, type: 'range', label, step, unit, prefix });
const flags = (key: string, fl: string[], label?: string): FacetDef => ({ key, type: 'flags', flags: fl, label });
const mm = (v: string | null) => (v == null ? NA : `${v} mm`);
const cm = (v: string | null) => (v == null ? NA : `${v} cm`);
const teeth = (v: string | null) => (v == null ? NA : `${v}T`);
const priceF: FacetGroup = { title: 'Price', items: [range('_price', 'Price', 10, '$', true)] };
const condF = (extraFlags: string[] = []): FacetGroup => ({ title: 'Condition & status', items: [
  list('condition_score', 'Condition', { order: ['10', '8', '6', '4', null], fmt: v => (v == null ? 'not described' : `${v} · ${GRADE_LABEL[+v] ?? ''}`) }),
  list('njs_approved', 'NJS approved', { order: ['yes', 'no', 'unknown'] }),
  flags('status', ['never_used', 'vintage', 'rare', 'girls_keirin', 'missing_parts', ...extraFlags]),
] });
const brandF = (key = 'brand', title = 'Brand & model', model = 'model'): FacetGroup => ({ title, items: [list(key, 'Brand', { search: true, limit: 10 }), list(model, 'Model', { limit: 10 })] });
const fmtOr = (v: unknown, f: (x: number) => string) => (typeof v === 'number' ? f(v) : null);
const str = (v: unknown) => (v == null || v === 'unknown' ? null : String(v));
const commonCols: Col[] = [{ label: 'cond', key: 'condition_score' }, { label: 'njs', key: 'njs_approved' }, { label: 'price', key: '_price' }, { label: 'listed', key: '_created_at' }];
const cfg = (facets: FacetGroup[], head: CatConfig['head'], size: CatConfig['size'], sub: CatConfig['sub'], cols: Col[], sorts: CatConfig['sorts'] = []): CatConfig =>
  ({ facets, head, size, sub, cols: [...cols, ...commonCols], sorts });

export const CATEGORIES: Record<string, CatConfig> = {
  frames: cfg(
    [
      { title: 'Size', items: [range('seat_tube_cm', 'Seat tube (c-t)', 0.5, 'cm'), range('top_tube_cm', 'Top tube (c-c)', 0.5, 'cm'), range('standover_cm', 'Standover', 0.5, 'cm')] },
      { title: 'Builder', items: [list('builder', 'Builder', { search: true, limit: 12 })] },
      priceF,
      { title: 'Condition', items: [
        list('condition_score', 'Condition', { order: ['10', '9', '8', '6', '4', '2', null], fmt: v => (v == null ? NA : `${v} · ${GRADE_LABEL[+v]}`) }),
        { key: 'defects', type: 'exclude', label: 'Hide frames with', flags: ['has_dents', 'has_rust', 'has_cracks', 'repainted', 'has_scratches'] },
      ] },
      { title: 'Color', items: [{ key: 'color_primary', type: 'swatch', label: 'Color' }, flags('finish', ['metallic', 'flake', 'fade', 'matte', 'two_tone', 'chrome_finish'])] },
      { title: 'Build', items: [list('material', 'Material'), list('rear_spacing_mm', 'Rear spacing', { fmt: mm }), list('tubing', 'Tubing', { limit: 8 }), list('fork', 'Fork', { limit: 6 }),
        list('headset', 'Headset', { limit: 6 }), list('bottom_bracket', 'Bottom bracket', { limit: 6 }), list('seatpost_mm', 'Seatpost', { fmt: v => (v == null ? NA : `${(+v).toFixed(1)} mm`) })] },
      { title: 'Provenance', items: [list('frame_type', 'Frame type', { order: ['track', 'pursuit/low-pro', 'time trial/aero', 'road'] }), list('njs_approved', 'NJS approved', { order: ['yes', 'no', 'unknown'] }),
        flags('prov', ['sloping', 'never_used', 'vintage', 'girls_keirin', 'uci_approved', 'road_frame', 'drilled', 'size_conflict']), range('model_year', 'Model year', 1, '')] },
    ],
    s => str(s.builder), s => (s.seat_tube_cm != null || s.top_tube_cm != null ? `${s.seat_tube_cm ?? '?'}|st|${s.top_tube_cm ?? '?'}|tt` : null),
    () => null,
    [{ label: 'builder', key: 'builder' }, { label: 'seat', key: 'seat_tube_cm' }, { label: 'top', key: 'top_tube_cm' }, { label: 'stand', key: 'standover_cm' }, { label: 'rear', key: 'rear_spacing_mm' },
     { label: 'year', key: 'model_year' }, { label: 'color', key: 'color_raw' }, { label: 'tubing', key: 'tubing' }, { label: 'fork', key: 'fork' }, { label: 'headset', key: 'headset' }, { label: 'bb', key: 'bottom_bracket' }],
    [{ key: 'seat_tube_cm', label: 'seat tube' }, { key: 'top_tube_cm', label: 'top tube' }, { key: 'builder', label: 'builder' }]),

  chainrings: cfg(
    [{ title: 'Teeth & fit', items: [range('teeth', 'Teeth', 1, 'T'), list('bcd', 'BCD', { fmt: v => (v == null ? NA : `${v} BCD`) }), list('pitch', 'Pitch'), flags('fin', ['matte', 'bia'])] }, brandF(), priceF, condF()],
    s => str(s.model) ?? str(s.brand), s => fmtOr(s.teeth, v => `${v}T`), s => [fmtOr(s.bcd, v => `${v}BCD`), s.pitch, s.matte ? 'matte' : null].filter(Boolean).join(' · '),
    [{ label: 'model', key: 'model' }, { label: 'teeth', key: 'teeth' }, { label: 'bcd', key: 'bcd' }, { label: 'pitch', key: 'pitch' }], [{ key: 'teeth', label: 'teeth' }]),

  hubs: cfg(
    [{ title: 'Fit', items: [list('position', 'Position', { order: ['front', 'rear', 'set', null] }), list('spacing_mm', 'Spacing', { fmt: mm }), list('axle_mm', 'Axle', { fmt: mm }), list('holes', 'Holes', { fmt: v => (v == null ? NA : `${v}H`) }), list('part', 'Part')] },
     brandF(), priceF, condF(['nuts_included', 'quick_release'])],
    s => str(s.model) ?? str(s.brand), s => str(s.position), s => [fmtOr(s.holes, v => `${v}H`), fmtOr(s.spacing_mm, v => `${v}mm`), fmtOr(s.axle_mm, v => `${v}mm axle`)].filter(Boolean).join(' · '),
    [{ label: 'model', key: 'model' }, { label: 'pos', key: 'position' }, { label: 'holes', key: 'holes' }, { label: 'spacing', key: 'spacing_mm' }, { label: 'axle', key: 'axle_mm' }, { label: 'part', key: 'part' }], [{ key: 'spacing_mm', label: 'spacing' }]),

  stems: cfg(
    [{ title: 'Geometry', items: [range('length_mm', 'Length', 5, 'mm'), list('angle_deg', 'Angle', { fmt: v => (v == null ? NA : `${v}°`) }), list('material', 'Material'), list('clamp_mm', 'Bar clamp', { fmt: mm }), flags('type', ['ahead'])] },
     brandF(), priceF, condF(['bolts_included'])],
    s => str(s.model) ?? str(s.brand), s => fmtOr(s.length_mm, v => `${v}mm`), s => [fmtOr(s.angle_deg, v => `${v}°`), s.material, s.color].filter(Boolean).join(' · '),
    [{ label: 'model', key: 'model' }, { label: 'length', key: 'length_mm' }, { label: 'angle', key: 'angle_deg' }, { label: 'material', key: 'material' }, { label: 'clamp', key: 'clamp_mm' }], [{ key: 'length_mm', label: 'length' }]),

  cogs: cfg(
    [{ title: 'Type', items: [list('part', 'Part', { order: ['cog', 'lockring'] }), range('teeth', 'Teeth', 1, 'T'), list('pitch', 'Pitch'), flags('f', ['stepped', 'bia'])] }, brandF(), priceF, condF()],
    s => str(s.model) ?? str(s.brand), s => fmtOr(s.teeth, v => `${v}T`) ?? str(s.part), s => [s.part, s.pitch].filter(Boolean).join(' · '),
    [{ label: 'part', key: 'part' }, { label: 'model', key: 'model' }, { label: 'teeth', key: 'teeth' }, { label: 'pitch', key: 'pitch' }], [{ key: 'teeth', label: 'teeth' }]),

  handlebars: cfg(
    [{ title: 'Size & material', items: [range('width_cm', 'Width', 1, 'cm'), list('material', 'Material'), list('clamp_mm', 'Clamp', { fmt: mm }), list('bar_type', 'Type'), flags('f', ['cut'])] }, brandF(), priceF, condF()],
    s => str(s.model) ?? str(s.brand), s => fmtOr(s.width_cm, v => `${v}cm`), s => [s.material, fmtOr(s.clamp_mm, v => `${v}mm clamp`), s.cut ? 'CUT' : null].filter(Boolean).join(' · '),
    [{ label: 'model', key: 'model' }, { label: 'width', key: 'width_cm' }, { label: 'material', key: 'material' }, { label: 'clamp', key: 'clamp_mm' }, { label: 'cut', key: 'cut' }], [{ key: 'width_cm', label: 'width' }]),

  'handlebar-stem-grip-sets': cfg(
    [{ title: 'Handlebar', items: [list('bar_model', 'Bar'), range('bar_width_cm', 'Bar width', 1, 'cm'), list('bar_material', 'Bar material')] },
     { title: 'Stem', items: [list('stem_model', 'Stem'), range('stem_length_mm', 'Stem length', 5, 'mm'), list('stem_angle_deg', 'Stem angle', { fmt: v => (v == null ? NA : `${v}°`) }), list('stem_material', 'Stem material'), list('grips', 'Grips')] },
     priceF, condF()],
    s => [s.bar_model, s.bar_material].filter(Boolean).join(' ') || null, s => fmtOr(s.bar_width_cm, v => `${v}cm`),
    s => [s.stem_model, fmtOr(s.stem_length_mm, v => `${v}mm`), fmtOr(s.stem_angle_deg, v => `${v}°`), s.grips ? `${s.grips} grips` : null].filter(Boolean).join(' · '),
    [{ label: 'bar', key: 'bar_model' }, { label: 'width', key: 'bar_width_cm' }, { label: 'bar mat', key: 'bar_material' }, { label: 'stem', key: 'stem_model' }, { label: 'stem len', key: 'stem_length_mm' }, { label: 'angle', key: 'stem_angle_deg' }, { label: 'grips', key: 'grips' }],
    [{ key: 'bar_width_cm', label: 'bar width' }, { key: 'stem_length_mm', label: 'stem length' }]),

  pedals: cfg(
    [{ title: 'Type', items: [list('side', 'Side', { order: ['pair', 'left', 'right'] }), flags('f', ['with_clips_straps'])] }, brandF(), priceF, condF()],
    s => str(s.model) ?? str(s.brand), s => (s.with_clips_straps ? 'set' : null), s => [s.side !== 'pair' ? `${s.side} only` : null, s.with_clips_straps ? 'with clips & straps' : null].filter(Boolean).join(' · '),
    [{ label: 'model', key: 'model' }, { label: 'side', key: 'side' }, { label: 'clips/straps', key: 'with_clips_straps' }]),

  saddles: cfg(
    [{ title: 'Fit', items: [list('rail_mm', 'Rail width', { fmt: mm }), list('padded', 'Padding', { fmt: v => (v == null ? NA : v === 'true' ? 'padded' : 'unpadded') })] }, brandF(), priceF, condF()],
    s => str(s.model) ?? str(s.brand), s => fmtOr(s.rail_mm, v => `${v}mm`), s => (s.padded == null ? null : s.padded ? 'padded' : 'unpadded'),
    [{ label: 'model', key: 'model' }, { label: 'rail', key: 'rail_mm' }, { label: 'padded', key: 'padded' }]),

  wheelsets: cfg(
    [{ title: 'Wheel', items: [list('position', 'Position', { order: ['front', 'rear', 'set', null] }), list('tire_type', 'Tire type'), list('size', 'Size'), list('spacing_mm', 'Spacing', { fmt: mm }), list('holes', 'Holes'), flags('f', ['with_tires', 'quick_release', 'disc', 'carbon'])] },
     { title: 'Rim', items: [list('rim_brand', 'Rim brand'), list('rim_model', 'Rim model', { limit: 8 })] }, { title: 'Hub', items: [list('hub_brand', 'Hub brand'), list('hub_model', 'Hub model', { limit: 8 })] }, priceF, condF()],
    s => str(s.rim_model) ?? str(s.rim_brand), s => str(s.position), s => [s.tire_type, str(s.hub_model) ?? str(s.hub_brand), fmtOr(s.spacing_mm, v => `${v}mm`)].filter(Boolean).join(' · '),
    [{ label: 'rim', key: 'rim_model' }, { label: 'pos', key: 'position' }, { label: 'tire', key: 'tire_type' }, { label: 'hub', key: 'hub_model' }, { label: 'spacing', key: 'spacing_mm' }, { label: 'holes', key: 'holes' }]),

  forks: cfg(
    [{ title: 'Fit', items: [range('steerer_mm', 'Steerer length', 5, 'mm'), list('slot_mm', 'Axle slot', { fmt: mm }), flags('f', ['columbus_max'])] }, { title: 'Builder', items: [list('builder', 'Builder', { search: true, limit: 12 })] }, priceF, condF()],
    s => str(s.builder), s => fmtOr(s.steerer_mm, v => `${v}mm`), s => [fmtOr(s.slot_mm, v => `${v}mm slot`), s.columbus_max ? 'Columbus Max' : null].filter(Boolean).join(' · '),
    [{ label: 'builder', key: 'builder' }, { label: 'steerer', key: 'steerer_mm' }, { label: 'slot', key: 'slot_mm' }, { label: 'columbus', key: 'columbus_max' }], [{ key: 'steerer_mm', label: 'steerer length' }]),

  seatposts: cfg(
    [{ title: 'Fit', items: [list('diameter_mm', 'Diameter', { fmt: mm }), list('rail_mm', 'Rail clamp', { fmt: mm }), list('length_mm', 'Length', { fmt: mm }), list('fluted', 'Fluted', { fmt: v => (v == null ? NA : v === 'true' ? 'fluted' : 'smooth') })] }, brandF(), priceF, condF(['clamps_included'])],
    s => str(s.model) ?? str(s.brand), s => fmtOr(s.diameter_mm, v => `${v.toFixed(1)}`), s => [fmtOr(s.rail_mm, v => `${v}mm rail`), fmtOr(s.length_mm, v => `${v}mm long`)].filter(Boolean).join(' · '),
    [{ label: 'model', key: 'model' }, { label: 'dia', key: 'diameter_mm' }, { label: 'rail', key: 'rail_mm' }, { label: 'length', key: 'length_mm' }, { label: 'fluted', key: 'fluted' }]),

  cranks: cfg(
    [{ title: 'Fit', items: [list('length_mm', 'Length', { fmt: mm }), list('bcd', 'BCD'), list('part', 'Part', { order: ['set', 'drive arm', 'non-drive arm'] })] }, brandF(), priceF, condF(['with_chainring'])],
    s => str(s.model) ?? str(s.brand), s => fmtOr(s.length_mm, v => `${v}mm`), s => [fmtOr(s.bcd, v => `${v}BCD`), s.part !== 'set' ? s.part : null].filter(Boolean).join(' · '),
    [{ label: 'model', key: 'model' }, { label: 'length', key: 'length_mm' }, { label: 'bcd', key: 'bcd' }, { label: 'part', key: 'part' }], [{ key: 'length_mm', label: 'length' }]),

  'clips-and-straps': cfg(
    [{ title: 'Type', items: [list('part', 'Part'), list('size', 'Size', { order: ['S', 'M', 'L', 'XL', null] }), list('material', 'Material'), flags('f', ['pair', 'screws_included'])] }, brandF(), priceF, condF()],
    s => str(s.model) ?? str(s.brand), s => str(s.size), s => [s.part, s.material, s.pair === false ? 'single' : null].filter(Boolean).join(' · '),
    [{ label: 'model', key: 'model' }, { label: 'part', key: 'part' }, { label: 'size', key: 'size' }, { label: 'material', key: 'material' }]),

  'bottom-brackets': cfg(
    [{ title: 'Type', items: [list('part', 'Part'), list('spindle_mm', 'Spindle', { fmt: mm }), list('interface', 'Interface'), list('shell_mm', 'Shell', { fmt: mm })] }, brandF(), priceF, condF()],
    s => str(s.model) ?? str(s.brand), s => fmtOr(s.spindle_mm, v => `${v}mm`), s => [s.part !== 'complete' ? s.part : null, s.interface, fmtOr(s.shell_mm, v => `${v}mm shell`)].filter(Boolean).join(' · '),
    [{ label: 'model', key: 'model' }, { label: 'part', key: 'part' }, { label: 'spindle', key: 'spindle_mm' }, { label: 'interface', key: 'interface' }]),

  chains: cfg(
    [{ title: 'Type', items: [list('part', 'Part'), list('color', 'Color'), list('links', 'Links'), list('pitch', 'Pitch')] }, brandF(), priceF, condF()],
    s => str(s.model) ?? str(s.brand), s => str(s.color), s => [fmtOr(s.links, v => `${v} links`), s.pitch, s.part !== 'chain' ? s.part : null].filter(Boolean).join(' · '),
    [{ label: 'model', key: 'model' }, { label: 'color', key: 'color' }, { label: 'links', key: 'links' }, { label: 'lot', key: 'lot_no' }]),

  tools: cfg([{ title: 'Tool', items: [list('tool_type', 'Type'), list('brand', 'Brand')] }, priceF, condF()],
    s => str(s.brand), s => null, s => [s.tool_type, Array.isArray(s.sizes_mm) && s.sizes_mm.length ? s.sizes_mm.map((x: string) => x + 'mm').join('/') : null].filter(Boolean).join(' · '),
    [{ label: 'type', key: 'tool_type' }, { label: 'brand', key: 'brand' }]),

  'tools-gear': cfg([{ title: 'Item', items: [list('item_type', 'Type'), list('brand', 'Brand'), list('fits_up_to_t', 'Fits rings up to', { fmt: teeth })] }, priceF, condF()],
    s => str(s.brand), s => null, s => [s.item_type, fmtOr(s.fits_up_to_t, v => `up to ${v}T`)].filter(Boolean).join(' · '),
    [{ label: 'type', key: 'item_type' }, { label: 'brand', key: 'brand' }, { label: 'fits', key: 'fits_up_to_t' }]),

  headsets: cfg([{ title: 'Headset', items: [list('model', 'Model'), list('part', 'Part')] }, priceF, condF()],
    s => str(s.model), s => null, s => str(s.part === 'complete' ? null : s.part), [{ label: 'model', key: 'model' }, { label: 'part', key: 'part' }]),

  grips: cfg([{ title: 'Grips', items: [list('brand', 'Brand'), list('thickness_mm', 'Thickness', { fmt: mm })] }, priceF, condF()],
    s => str(s.brand), s => fmtOr(s.thickness_mm, v => `${v}mm`), () => null, [{ label: 'brand', key: 'brand' }, { label: 'thickness', key: 'thickness_mm' }]),

  't-shirts': cfg([{ title: 'Item', items: [list('item_type', 'Type')] }, priceF],
    s => str(s.item_type), s => null, () => null, [{ label: 'type', key: 'item_type' }]),

  'bric-a-brac': cfg(
    [{ title: 'Item', items: [list('item_type', 'Type', { search: true, limit: 10 }), list('brand', 'Brand', { search: true, limit: 10 })] },
     { title: 'Size', items: [list('size_jp', 'Japanese size', { order: ['XS', 'S', 'M', 'L', 'LL', 'XL', '3L', 'XXL', '2XL', '3XL', '4L', 'O', 'F', null] }), list('size_us', 'American size', { order: ['XS', 'S', 'M', 'L', 'XL', 'XXL', null] }), list('head_cm', 'Helmet size')] },
     priceF, condF(['authentic_keirin', 'one_left'])],
    s => str(s.brand) ?? str(s.item_type), s => (s.size_jp ? `JP ${s.size_jp}` : null), s => [s.item_type, s.size_us ? `US ${s.size_us}` : null, s.head_cm, s.poster_cm].filter(Boolean).join(' · '),
    [{ label: 'type', key: 'item_type' }, { label: 'brand', key: 'brand' }, { label: 'JP size', key: 'size_jp' }, { label: 'US size', key: 'size_us' }, { label: 'authentic', key: 'authentic_keirin' }]),
};

/** Categories without a config (e.g. 'All') get search/sort only. */
export const configFor = (cat: string): CatConfig | null => CATEGORIES[cat] ?? null;

export const FLAG_LABEL: Record<string, string> = {
  has_dents: 'dents', has_rust: 'rust', has_cracks: 'cracks', repainted: 'repainted', has_scratches: 'scratches', has_chips: 'chips',
  metallic: 'metallic', flake: 'flake', fade: 'fade', matte: 'matte', two_tone: 'two-tone', chrome_finish: 'chrome',
  sloping: 'sloping top tube', never_used: 'never used', vintage: 'vintage', girls_keirin: "girls' keirin", uci_approved: 'UCI', road_frame: 'road', drilled: 'drilled', size_conflict: 'size conflict',
  rare: 'rare', missing_parts: 'parts missing', nuts_included: 'with nuts', quick_release: 'quick release', bolts_included: 'with bolts', ahead: 'ahead', bia: 'BIA',
  stepped: 'stepped', cut: 'cut', with_clips_straps: 'with clips & straps', with_tires: 'with tires', disc: 'disc', carbon: 'carbon', columbus_max: 'Columbus Max',
  clamps_included: 'with clamps', with_chainring: 'with chainring', pair: 'pair', screws_included: 'with screws', authentic_keirin: 'authentic keirin', one_left: 'one left',
};

export function itemBadges(p: Item): { cls: string; text: string; title?: string }[] {
  const s = p.specs, out: { cls: string; text: string; title?: string }[] = [];
  if (p.gone) out.push({ cls: 'njsno', text: 'no longer listed', title: `not on the store since ${p._gone_at?.slice(0, 10)}` });
  if (!s) return CATEGORIES[p.primaryCat] ? [{ cls: 'pend', text: 'specs pending' }] : [];
  if (s.jev_pending) out.push({ cls: 'pend', text: 'partial specs', title: 'new listing: numbers are parsed, brand / condition details are still being extracted' });
  if (typeof s.condition_score === 'number') out.push({ cls: `g${s.condition_score}`, text: `${s.condition_score} ${GRADE_LABEL[s.condition_score] ?? ''}` });
  if (s.never_used && s.condition_score !== 10) out.push({ cls: 'new', text: 'never used' });
  if (s.njs_approved === 'no') out.push({ cls: 'njsno', text: 'non-NJS' });
  const decade = typeof s.model_year === 'number' ? `${Math.floor(s.model_year / 10) * 10}` : (typeof s.model_decade === 'string' && s.model_decade !== 'unknown' ? s.model_decade.slice(0, 4) : null);
  if (decade) out.push({ cls: 'year', text: `${decade}s`, title: typeof s.model_year === 'number' ? `model year ${s.model_year}` : `${decade}s, exact year not stated` });
  if (s.material === 'carbon') out.push({ cls: '', text: 'carbon' });
  const known = (v: unknown) => typeof v === 'string' && v !== 'unknown' && v !== 'other' && !v.startsWith('carbon');
  if (known(s.tubing)) out.push({ cls: 'tube', text: String(s.tubing) });
  if (known(s.fork)) out.push({ cls: 'fork', text: `${s.fork === 'original steel unspecified' ? 'original' : s.fork} fork` });
  if (s.chrome_finish) out.push({ cls: '', text: 'chrome' });
  if (typeof s.frame_type === 'string' && s.frame_type !== 'track') out.push({ cls: 'ftype', text: s.frame_type });
  if (s.sloping) out.push({ cls: 'slope', text: '⟋ sloping', title: 'sloping top tube (semi-compact geometry)' });
  if (s.rare) out.push({ cls: '', text: 'rare' });
  if (s.missing_parts) out.push({ cls: 'warn', text: 'parts missing', title: String(s.desc_text ?? '') });
  if (s.size_conflict) out.push({ cls: '', text: 'size?', title: 'title, tag and spec sizes disagree' });
  return out;
}
