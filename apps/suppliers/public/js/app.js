// בוטסטראפ — ניווט בין טאבים
const TABS = {
  suppliers:  SuppliersTab,
  products:   ProductsTab,
  orders:     OrdersTab,
  recommend:  RecommendTab,
  ratings:    RatingsTab,
};

function activate(name) {
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('active', a.dataset.tab === name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  const root = document.getElementById('tab-' + name);
  TABS[name].render(root);
}

document.querySelectorAll('nav a').forEach(a => {
  a.onclick = (e) => { e.preventDefault(); activate(a.dataset.tab); };
});

activate('suppliers');
