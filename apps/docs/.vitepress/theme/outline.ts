/**
 * Hide the outline entries that belong to the half you are not reading.
 *
 * The right-hand outline is built from the markdown at BUILD time, so it lists
 * every heading on the page — both audiences. The headings themselves are
 * hidden by CSS; their outline links are not, and an outline listing sections
 * that are not on the screen is worse than no outline.
 *
 * Done in the DOM rather than by filtering `page.headers`, because the heading
 * list VitePress hands the theme carries no record of which container a heading
 * came from. The DOM does.
 */
export function syncOutline(): void {
  const current = document.documentElement.dataset.audience;
  if (!current) return;

  const hidden = new Set<string>();
  document.querySelectorAll<HTMLElement>('.aud[data-aud]').forEach((block) => {
    if (block.dataset.aud === current) return;
    block.querySelectorAll<HTMLElement>('[id]').forEach((node) => hidden.add(node.id));
  });

  const links = document.querySelectorAll<HTMLAnchorElement>(
    '.VPDocAsideOutline .outline-link, .VPLocalNavOutlineDropdown .outline-link',
  );
  links.forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    if (!href.startsWith('#')) return;
    const id = decodeURIComponent(href.slice(1));
    const item = link.closest('li');
    if (!item) return;
    item.style.display = hidden.has(id) ? 'none' : '';
  });
}
