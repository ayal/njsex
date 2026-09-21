import { useEffect, useMemo, useState } from 'react';
import { loadCatalog, type Catalog, type Item } from './data';
import { SORTS, defsOf, filterItems, specSort } from './facets';
import { configFor } from './categories';
import { useHashState } from './useHashState';
import { useFavs } from './favs';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Grid } from './components/Cards';
import { Table } from './components/Table';
import { Detail } from './components/Detail';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, update] = useHashState();
  const favs = useFavs();

  useEffect(() => { loadCatalog().then(setCatalog, e => setError(String(e))); }, []);

  const config = useMemo(() => configFor(state.cat), [state.cat]);
  const defs = useMemo(() => defsOf(config?.facets ?? []), [config]);
  const catItems = useMemo(() => (catalog ? catalog.items.filter(p => !state.cat || p.colls.includes(state.cat)) : []), [catalog, state.cat]);
  const query = useMemo(() => ({ cat: state.cat, q: state.q, avail: state.favs ? 'all' as const : state.avail, facets: state.facets, onlyIds: state.favs ? favs : null }), [state.cat, state.q, state.avail, state.facets, state.favs, favs]);
  const result = useMemo(() => {
    if (!catalog) return [];
    const cmp = SORTS[state.sort]?.cmp ?? specSort(state.sort) ?? SORTS.created_desc.cmp;
    return filterItems(catalog.items, query, defs).sort(cmp);
  }, [catalog, query, defs, state.sort]);

  // the open product lives in the URL (`p=handle`); opening pushes history so Back closes the panel
  const byHandle = useMemo(() => new Map(catalog?.items.map(p => [p.handle, p]) ?? []), [catalog]);
  const open: Item | null = state.open ? byHandle.get(state.open) ?? null : null;
  const setOpen = (p: Item | null) => { if (p) update({ open: p.handle }, { push: true }); else update({ open: null }); };

  if (error) return <div className="p-10 text-center text-muted-foreground">failed to load data: {error}</div>;
  if (!catalog) return <div className="p-10 text-center text-muted-foreground">loading catalog…</div>;
  const pending = config ? catItems.length - (catalog.specsCount[state.cat] ?? 0) : 0;
  return (
    <TooltipProvider>
      <TopBar catalog={catalog} config={config} defs={defs} state={state} resultCount={result.length} catCount={catItems.length} favCount={favs.size} update={update} />
      {state.favs && result.length === 0 && <div className="p-10 text-center text-muted-foreground">no favourites {state.cat ? 'in this category' : ''} yet — click ☆ on any card to save it</div>}
      <div className="flex items-start max-md:flex-col">
        {config && <Sidebar groups={config.facets} defs={defs} items={catalog.items} catItems={catItems} query={query} onChange={facets => update({ facets })} />}
        <div className="flex-1 min-w-0 px-4 py-3 pb-10">
          {pending > 0 && <div className="mb-2.5 rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-2.5 py-1.5 text-xs dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800">{pending} of {catItems.length} items in this category still waiting for parsed specs, reload later to pick them up.</div>}
          {state.view === 'table' ? <Table items={result} cols={config?.cols ?? null} onOpen={setOpen} /> : <Grid items={result} config={config} onOpen={setOpen} />}
        </div>
      </div>
      {open && <Detail p={open} catalog={catalog} onClose={() => setOpen(null)} />}
      <footer className="mt-6 border-t px-4 py-6 pb-10 text-xs text-muted-foreground leading-relaxed">
        Unofficial read-only browser of the public <a className="text-primary hover:underline" href="https://www.njs-export.com" target="_blank" rel="noreferrer">njs-export.com</a> catalog. Not affiliated with NJS Export.
        All listings, photos and prices are theirs; every item links to the original page, nothing is sold here.
        {catalog.meta && <> Data as of {catalog.meta.generated_at.slice(0, 16).replace('T', ' ')} · {catalog.meta.live} listings, {catalog.meta.in_stock} in stock.</>}
      </footer>
    </TooltipProvider>
  );
}
