// Shared top nav for internal pages (not report.html, which is public-facing).
const NAV_ITEMS = [
  { key: 'new', href: 'index.html', label: 'New Lead' },
  { key: 'leads', href: 'hub.html', label: 'Leads' },
  { key: 'contractors', href: 'contractors.html', label: 'Contractors' },
  { key: 'batch', href: 'qr-generator.html', label: 'Batch Generate' },
  { key: 'render', href: 'render.html', label: 'Render' },
];

function renderNav(active) {
  const el = document.getElementById('mainNav');
  if (!el) return;
  el.innerHTML = NAV_ITEMS.map(item =>
    `<a href="${item.href}" class="nav-link${item.key === active ? ' active' : ''}">${item.label}</a>`
  ).join('');
}
