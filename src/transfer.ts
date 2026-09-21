// Move localStorage state (saved views, favourites, theme) between origins, e.g. localhost -> the live site.
// Export builds `https://<live>/#import=<base64 json>`; the receiving page merges it into its own storage.
export const LIVE = 'https://ayal.github.io/njsex/';
const KEYS = ['njsex.savedViews.v1', 'njsex.savedViews.active', 'njsex.favs.v1', 'njsex.theme.v1'] as const;

export function exportJson(): string {
  const o: Record<string, string> = {};
  for (const k of KEYS) { try { const v = localStorage.getItem(k); if (v != null) o[k] = v; } catch { /* ignore */ } }
  return JSON.stringify(o);
}
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
const unb64 = (s: string) => decodeURIComponent(escape(atob(s)));
export const exportUrl = (base = LIVE) => `${base}#import=${b64(exportJson())}`;
export const onLiveSite = () => location.origin + location.pathname === LIVE || location.hostname.endsWith('github.io');

/** Merge an exported blob into this origin's storage. Views merge by name (incoming wins), favourites union. */
export function importJson(json: string): { views: number; favs: number } {
  const o = JSON.parse(json) as Record<string, string>;
  let views = 0, favs = 0;
  if (o['njsex.savedViews.v1']) {
    const inc = JSON.parse(o['njsex.savedViews.v1']) as { name: string }[];
    const cur = JSON.parse(localStorage.getItem('njsex.savedViews.v1') ?? '[]') as { name: string }[];
    const names = new Set(inc.map(v => v.name));
    const merged = [...inc, ...cur.filter(v => !names.has(v.name))];
    localStorage.setItem('njsex.savedViews.v1', JSON.stringify(merged)); views = inc.length;
  }
  if (o['njsex.favs.v1']) {
    const inc = JSON.parse(o['njsex.favs.v1']) as number[];
    const cur = JSON.parse(localStorage.getItem('njsex.favs.v1') ?? '[]') as number[];
    localStorage.setItem('njsex.favs.v1', JSON.stringify([...new Set([...cur, ...inc])])); favs = inc.length;
  }
  if (o['njsex.savedViews.active']) localStorage.setItem('njsex.savedViews.active', o['njsex.savedViews.active']);
  if (o['njsex.theme.v1'] && !localStorage.getItem('njsex.theme.v1')) localStorage.setItem('njsex.theme.v1', o['njsex.theme.v1']);
  return { views, favs };
}

/** Called once at startup: consume `#import=...` if present, then reload so every store re-reads storage. */
/** Returns true when an import was consumed and a reload is pending, so the caller must not mount the app. */
export function consumeImportFromHash(): boolean {
  const m = /(?:^#|&)import=([^&]+)/.exec(location.hash); if (!m) return false;
  try {
    const r = importJson(unb64(decodeURIComponent(m[1])));
    sessionStorage.setItem('njsex.imported', JSON.stringify(r));
  } catch (e) { sessionStorage.setItem('njsex.imported', JSON.stringify({ error: String(e) })); }
  history.replaceState(null, '', location.pathname + location.search + location.hash.replace(/(^#|&)import=[^&]+/, '$1').replace(/^#&/, '#').replace(/^#$/, ''));
  location.reload();
  return true;
}
