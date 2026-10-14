import { useEffect } from 'react';

function stamp(root: ParentNode) {
  for (const cell of root.querySelectorAll('thead th')) {
    if (cell.getAttribute('scope') !== 'col') cell.setAttribute('scope', 'col');
  }
}

/**
 * react-aria renders the header cells for us and filters `scope` out of the
 * props it accepts, so a list table cannot declare it in JSX. AC-6 still wants
 * every header cell to carry `scope`, so it is stamped on the rendered cells.
 * A MutationObserver covers header cells react-aria creates or replaces after
 * mount, which a render effect alone races with.
 *
 * Call it from the page component that renders the HeroUI table. The shared
 * `DataTable` already emits `scope` in its own markup and does not need it.
 */
export function useTableHeaderScope() {
  useEffect(() => {
    const target = document.getElementById('main-content') ?? document.body;
    stamp(target);
    // ponytail: observe childList only, our own setAttribute never re-triggers it
    const observer = new MutationObserver(() => stamp(target));
    observer.observe(target, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
