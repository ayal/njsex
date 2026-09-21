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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, update] = useHashState();
  const favs = useFavs();
  const [drawer, setDrawer] = useState(false);   // mobile filter drawer

  useEffect(() => { loadCatalog().then(setCatalog, e => setError(String(e))); }, []);

  // favourites mode spans every category, so category facets do not apply there
  const config = useMemo(() => (state.favs ? null : configFor(state.cat)), [state.cat, state.favs]);
  const defs = useMemo(() => defsOf(config?.facets ?? []), [config]);
  const catItems = useMemo(() => (catalog ? catalog.items.filter(p => !state.cat || p.colls.includes(state.cat)) : []), [catalog, state.cat]);
  // only depend on the favourites set while the favs filter is on; otherwise starring a card would rebuild the
  // result list and reset the grid's paging (which is what made the page jump)
  const onlyIds = state.favs ? favs : null;
  const query = useMemo(() => ({ cat: state.favs ? '' : state.cat, q: state.q, avail: state.favs ? 'all' as const : state.avail, facets: state.favs ? {} : state.facets, onlyIds }),
    [state.cat, state.q, state.avail, state.facets, state.favs, onlyIds]);
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
  const sidebar = config && <Sidebar groups={config.facets} defs={defs} items={catalog.items} catItems={catItems} query={query} onChange={facets => update({ facets })} />;
  return (
    <TooltipProvider>
      <TopBar catalog={catalog} config={config} defs={defs} state={state} resultCount={result.length} catCount={catItems.length} favCount={favs.size} update={update} onFilters={() => setDrawer(true)} />
      {state.favs && result.length === 0 && <div className="p-10 text-center text-muted-foreground">no favourites yet — click ☆ on any card to save it</div>}
      <div className="flex items-start">
        <div className="hidden md:block">{sidebar}</div>
        <div className="flex-1 min-w-0 px-3 sm:px-4 py-3 pb-10">
          {pending > 0 && <div className="mb-2.5 rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-2.5 py-1.5 text-xs dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800">{pending} of {catItems.length} items in this category still waiting for parsed specs, reload later to pick them up.</div>}
          {state.view === 'table' ? <Table items={result} cols={config?.cols ?? null} onOpen={setOpen} /> : <Grid items={result} config={config} view={state.view as 'grid' | 'showcase'} onOpen={setOpen} />}
        </div>
      </div>
      {/* mobile: the same sidebar in a drawer */}
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-[320px] max-w-[90vw] p-0 overflow-y-auto">
          <SheetHeader className="px-4 py-3 border-b"><SheetTitle className="text-sm">Filters</SheetTitle></SheetHeader>
          <div className="[&>aside]:static [&>aside]:w-full [&>aside]:max-h-none [&>aside]:px-3">{sidebar}</div>
        </SheetContent>
      </Sheet>
      {open && <Detail p={open} catalog={catalog} onClose={() => setOpen(null)} />}
      <footer className="mt-6 border-t px-4 py-6 pb-10 text-xs text-muted-foreground leading-relaxed">
        Unofficial read-only browser of the public <a className="text-primary hover:underline" href="https://www.njs-export.com" target="_blank" rel="noreferrer">njs-export.com</a> catalog. Not affiliated with NJS Export.
        All listings, photos and prices are theirs; every item links to the original page, nothing is sold here.
        {catalog.meta && <> Data as of {catalog.meta.generated_at.slice(0, 16).replace('T', ' ')} · {catalog.meta.live} listings, {catalog.meta.in_stock} in stock.</>}
      </footer>
    </TooltipProvider>
  );
}
