import { ExternalLink, Link as LinkIcon, X } from 'lucide-react';
import type { AnySpecs, Catalog, Item, Specs } from '../data';
import { BASE, FRAME_DUPES, GRADE_LABEL } from '../data';
import { FLAG_LABEL } from '../categories';
import { Price } from './Cards';
import { Gallery } from './Gallery';
import { Star } from '../favs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props { p: Item; catalog: Catalog; onClose: () => void; }

export function Detail({ p, catalog, onClose }: Props) {
  const colls = catalog.collections.filter(c => p.colls.includes(c.handle) && !FRAME_DUPES.has(c.handle)).map(c => c.title).join(', ');
  return (
    <Dialog open onOpenChange={o => { if (!o && !document.querySelector('[data-lightbox]')) onClose(); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-[1000px] sm:w-[calc(100vw-2rem)] sm:max-h-[calc(100dvh-2rem)] max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-screen max-sm:max-w-none max-sm:h-dvh max-sm:max-h-dvh max-sm:rounded-none max-sm:border-0 overflow-y-auto overflow-x-hidden p-0 gap-0 detail [&_*]:min-w-0 break-words [overflow-wrap:anywhere]" data-testid="detail">
        {/* sticky close row: always reachable even when the title wraps to several lines */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 sm:px-6 py-2 bg-card/95 backdrop-blur border-b">
          <span className="text-xs text-muted-foreground truncate">{p.product_type}</span>
          <Button size="sm" variant="outline" className="h-8" onClick={onClose} data-testid="detail-close"><X className="size-4" />Close</Button>
        </div>
        <div className="p-4 sm:p-6 pt-3 sm:pt-4 space-y-3">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-lg leading-snug flex items-start gap-1.5"><Star id={p.id} className="text-[22px] -mt-0.5 shrink-0" />{p.title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <Price p={p} /> · {p.product_type} · {colls} · listed {p.created_at.slice(0, 10)} · updated {p.updated_at.slice(0, 10)}
            <Button variant="link" size="xs" className="h-auto p-0 text-xs" onClick={e => { navigator.clipboard?.writeText(location.href); (e.currentTarget as HTMLElement).textContent = 'link copied'; }}><LinkIcon className="size-3" />copy link to this view</Button>
          </DialogDescription>
        </DialogHeader>
        {/* the one call to action: this site sells nothing, the shop does */}
        <Button asChild className="w-full sm:w-auto sm:self-start" data-testid="shop-cta"><a href={`${BASE}/products/${p.handle}`} target="_blank" rel="noreferrer">View / buy on njs-export.com <ExternalLink className="size-4" /></a></Button>
        <Gallery images={p.images} title={p.title} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 min-w-0">
          <div>{p.specs ? (p.isFrame ? <FrameSpecTables s={p.specs as Specs} /> : <GenericSpecTable s={p.specs} />) : p.primaryCat && <div className="text-xs text-muted-foreground">specs not parsed yet</div>}</div>
          <div>
            <H>Seller description</H>
            <div className="raw rounded-md border bg-muted/40 p-2.5 text-[13px] leading-relaxed [&_p]:my-1" dangerouslySetInnerHTML={{ __html: p.body_html || '—' }} />
            <H>Tags</H><div className="flex flex-wrap gap-1">{p.tags.length ? p.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px] h-4 px-1.5">{t}</Badge>) : '—'}</div>
            {p.variants.length > 1 && <><H>Variants</H><div className="flex flex-wrap gap-1">{p.variants.map(v => <Badge key={v.id} variant={v.available ? 'secondary' : 'destructive'} className="text-[10px] h-4 px-1.5">{(v as unknown as { title?: string }).title ?? v.id} ${v.price}</Badge>)}</div></>}
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const H = ({ children }: { children: React.ReactNode }) => <h5 className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">{children}</h5>;
const Tbl = ({ children }: { children: React.ReactNode }) => <table className="w-full text-[13px] border-collapse"><tbody>{children}</tbody></table>;
function Row({ l, v, conf }: { l: string; v: React.ReactNode; conf?: unknown }) {
  const low = typeof conf === 'number' && conf < 0.6;
  return <tr className="border-b border-border/60 last:border-0"><td className="py-0.5 pr-2 text-muted-foreground w-[38%] align-top">{l}</td><td className="py-0.5 align-top">{v ?? '—'}{low && <span className="ml-1 text-[11px] text-amber-700 dark:text-amber-400" title={`Jev confidence ${conf}`}>low confidence</span>}</td></tr>;
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
    <H>Specs</H><Tbl>
      {keys.map(k => <Row key={k} l={k === 'condition_score' ? 'condition' : k.replace(/_/g, ' ')} conf={s[k + '_confidence'] ?? s[k + '_probability']}
        v={k === 'condition_score' && typeof s[k] === 'number' ? `${s[k]} · ${GRADE_LABEL[s[k]] ?? ''}` : fmt(s[k])} />)}
    </Tbl>
    {s.desc_text && <><H>Description text used</H><div className="rounded-md border bg-muted/40 p-2.5 text-[13px]">{String(s.desc_text)}</div></>}
  </>;
}

function FrameSpecTables({ s }: { s: Specs }) {
  return <>
    <H>Geometry</H><Tbl>
      <Row l="Seat tube (c-t)" v={s.seat_tube_cm && `${s.seat_tube_cm} cm`} /><Row l="Top tube (c-c)" v={s.top_tube_cm && `${s.top_tube_cm} cm`} />
      <Row l="Standover" v={s.standover_cm && `${s.standover_cm} cm`} />{s.headtube_cm && <Row l="Head tube" v={`${s.headtube_cm} cm`} />}
      <Row l="Rear spacing" v={s.rear_spacing_mm && `${s.rear_spacing_mm} mm`} /><Row l="Seatpost" v={s.seatpost_mm && `${s.seatpost_mm.toFixed(1)} mm`} />
      {s.size_conflict && <Row l="Size sources" v={`spec ${s.size_sources.spec} / title ${s.size_sources.title} / tag ${s.size_sources.tag}`} />}
    </Tbl>
    <H>Build</H><Tbl>
      <Row l="Builder" v={s.builder} conf={s.builder_confidence} /><Row l="Frame type" v={s.frame_type as string} /><Row l="Material" v={s.material} conf={s.material_confidence} />
      <Row l="Tubing" v={s.tubing} conf={s.tubing_confidence} /><Row l="Fork" v={s.fork} conf={s.fork_confidence} />
      <Row l="Construction" v={s.construction} /><Row l="Dropouts" v={s.dropouts} />
      <Row l="Headset" v={s.headset} conf={s.headset_confidence} /><Row l="Bottom bracket" v={s.bottom_bracket} conf={s.bottom_bracket_confidence} />
      <Row l="Seatpost included" v={yn(s.seatpost_included)} /><Row l="Sloping top tube" v={yn(s.sloping as boolean)} />
    </Tbl>
    <H>Color</H><Tbl>
      <Row l="Raw" v={s.color_raw} /><Row l="Primary" v={s.color_primary} conf={s.color_primary_confidence} /><Row l="Secondary" v={s.color_secondary} />
      <Row l="Finish" v={list(s, ['metallic', 'flake', 'fade', 'matte', 'two_tone', 'chrome_finish'], 'none')} />
    </Tbl>
    <H>Condition</H><Tbl>
      <Row l="Grade" v={s.condition_score != null ? `${s.condition_score} · ${GRADE_LABEL[s.condition_score]}` : 'not stated'} conf={s.condition_grade_confidence} />
      <Row l="Defects" v={list(s, ['has_chips', 'has_dents', 'has_rust', 'has_cracks', 'has_scratches', 'repainted'], 'none mentioned')} />
      <Row l="Text" v={s.condition_raw} />
    </Tbl>
    <H>Provenance</H><Tbl>
      <Row l="NJS approved" v={s.njs_approved} conf={s.njs_approved_confidence} /><Row l="Model year" v={s.model_year ?? s.model_year_raw} />
      <Row l="Flags" v={list(s, ['never_used', 'vintage', 'girls_keirin', 'uci_approved', 'road_frame', 'drilled'], '—')} />
      {s.sku_note && <Row l="Seller ref" v={s.sku_note} />}
    </Tbl>
    {s.extra_lines?.length > 0 && <><H>Other notes</H><div className="rounded-md border bg-muted/40 p-2.5 text-[13px]">{s.extra_lines.map((l, i) => <div key={i}>{l}</div>)}</div></>}
  </>;
}
