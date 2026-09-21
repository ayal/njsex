import { useEffect } from 'react';
import type { AnySpecs, Catalog, Item, Specs } from '../data';
import { BASE, FRAME_DUPES, GRADE_LABEL } from '../data';
import { FLAG_LABEL } from '../categories';
import { Price } from './Cards';

interface Props { p: Item; catalog: Catalog; onClose: () => void; }

export function Detail({ p, catalog, onClose }: Props) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const colls = catalog.collections.filter(c => p.colls.includes(c.handle) && !FRAME_DUPES.has(c.handle)).map(c => c.title).join(', ');
  return (
    <div className="detail" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="panel">
        <span className="close" onClick={onClose}>✕</span>
        <h2>{p.title}</h2>
        <div className="sub"><Price p={p} /> · {p.product_type} · {colls} · listed {p.created_at.slice(0, 10)} · updated {p.updated_at.slice(0, 10)} · <a href={`${BASE}/products/${p.handle}`} target="_blank" rel="noreferrer">open on njs-export.com ↗</a></div>
        <div className="cols">
          <div>{p.specs ? (p.isFrame ? <FrameSpecTables s={p.specs as Specs} /> : <GenericSpecTable s={p.specs} />) : p.primaryCat && <div className="hint">specs not parsed yet</div>}</div>
          <div>
            <h5>Seller description</h5>
            <div className="raw" dangerouslySetInnerHTML={{ __html: p.body_html || '—' }} />
            <h5>Tags</h5><div>{p.tags.length ? p.tags.map(t => <span key={t} className="bd">{t}</span>) : '—'}</div>
            {p.variants.length > 1 && <><h5>Variants</h5><div>{p.variants.map(v => <span key={v.id} className={`bd ${v.available ? '' : 'njsno'}`}>{(v as unknown as { title?: string }).title ?? v.id} ${v.price}</span>)}</div></>}
          </div>
        </div>
        <div className="imgs">{p.images.map(i => <img key={i.id} loading="lazy" src={i.src} alt="" />)}</div>
      </div>
    </div>
  );
}

function Row({ l, v, conf }: { l: string; v: React.ReactNode; conf?: unknown }) {
  const low = typeof conf === 'number' && conf < 0.6;
  return <tr><td>{l}</td><td>{v ?? '—'}{low && <span className="lc" title={`Jev confidence ${conf}`}> low confidence</span>}</td></tr>;
}
const yn = (v: boolean | null | undefined) => (v == null ? '—' : v ? 'yes' : 'no');
const list = (s: AnySpecs, keys: string[], empty: string) => keys.filter(k => s[k]).map(k => FLAG_LABEL[k] ?? k).join(', ') || empty;

/** Parts: every non-meta spec field, in order, with confidence markers. */
function GenericSpecTable({ s }: { s: AnySpecs }) {
  const skip = new Set(['desc_text', 'condition', 'regex_error']);
  // hide meta fields, confidences, nulls and false flags so the table reads like a spec sheet
  const keys = Object.keys(s).filter(k => !skip.has(k) && !k.endsWith('_confidence') && !k.endsWith('_probability') && s[k] != null && s[k] !== false && s[k] !== 'unknown' && !(Array.isArray(s[k]) && !s[k].length));
  const fmt = (v: unknown) => v == null ? null : typeof v === 'boolean' ? (v ? 'yes' : 'no') : Array.isArray(v) ? v.join(', ') : String(v);
  return <>
    <h5>Specs</h5><table><tbody>
      {keys.map(k => <Row key={k} l={k === 'condition_score' ? 'condition' : k.replace(/_/g, ' ')} conf={s[k + '_confidence'] ?? s[k + '_probability']}
        v={k === 'condition_score' && typeof s[k] === 'number' ? `${s[k]} · ${GRADE_LABEL[s[k]] ?? ''}` : fmt(s[k])} />)}
    </tbody></table>
    {s.desc_text && <><h5>Description text used</h5><div className="raw">{String(s.desc_text)}</div></>}
  </>;
}

function FrameSpecTables({ s }: { s: Specs }) {
  return <>
    <h5>Geometry</h5><table><tbody>
      <Row l="Seat tube (c-t)" v={s.seat_tube_cm && `${s.seat_tube_cm} cm`} /><Row l="Top tube (c-c)" v={s.top_tube_cm && `${s.top_tube_cm} cm`} />
      <Row l="Standover" v={s.standover_cm && `${s.standover_cm} cm`} />{s.headtube_cm && <Row l="Head tube" v={`${s.headtube_cm} cm`} />}
      <Row l="Rear spacing" v={s.rear_spacing_mm && `${s.rear_spacing_mm} mm`} /><Row l="Seatpost" v={s.seatpost_mm && `${s.seatpost_mm.toFixed(1)} mm`} />
      {s.size_conflict && <Row l="Size sources" v={`spec ${s.size_sources.spec} / title ${s.size_sources.title} / tag ${s.size_sources.tag}`} />}
    </tbody></table>
    <h5>Build</h5><table><tbody>
      <Row l="Builder" v={s.builder} conf={s.builder_confidence} /><Row l="Material" v={s.material} conf={s.material_confidence} />
      <Row l="Tubing" v={s.tubing} conf={s.tubing_confidence} /><Row l="Fork" v={s.fork} conf={s.fork_confidence} />
      <Row l="Construction" v={s.construction} /><Row l="Dropouts" v={s.dropouts} />
      <Row l="Headset" v={s.headset} conf={s.headset_confidence} /><Row l="Bottom bracket" v={s.bottom_bracket} conf={s.bottom_bracket_confidence} />
      <Row l="Seatpost included" v={yn(s.seatpost_included)} />
    </tbody></table>
    <h5>Color</h5><table><tbody>
      <Row l="Raw" v={s.color_raw} /><Row l="Primary" v={s.color_primary} conf={s.color_primary_confidence} /><Row l="Secondary" v={s.color_secondary} />
      <Row l="Finish" v={list(s, ['metallic', 'flake', 'fade', 'matte', 'two_tone', 'chrome_finish'], 'none')} />
    </tbody></table>
    <h5>Condition</h5><table><tbody>
      <Row l="Grade" v={s.condition_score != null ? `${s.condition_score} · ${GRADE_LABEL[s.condition_score]}` : 'not stated'} conf={s.condition_grade_confidence} />
      <Row l="Defects" v={list(s, ['has_chips', 'has_dents', 'has_rust', 'has_cracks', 'has_scratches', 'repainted'], 'none mentioned')} />
      <Row l="Text" v={s.condition_raw} />
    </tbody></table>
    <h5>Provenance</h5><table><tbody>
      <Row l="NJS approved" v={s.njs_approved} conf={s.njs_approved_confidence} /><Row l="Model year" v={s.model_year ?? s.model_year_raw} />
      <Row l="Flags" v={list(s, ['never_used', 'vintage', 'girls_keirin', 'uci_approved', 'road_frame', 'drilled'], '—')} />
      {s.sku_note && <Row l="Seller ref" v={s.sku_note} />}
    </tbody></table>
    {s.extra_lines?.length > 0 && <><h5>Other notes</h5><div className="raw">{s.extra_lines.map((l, i) => <div key={i}>{l}</div>)}</div></>}
  </>;
}
