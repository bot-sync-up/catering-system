// כלי UI כלליים — מודאל, טוסט, badges
const UI = {
  toast(msg, type='') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'show ' + type;
    setTimeout(() => el.className = '', 2500);
  },
  err(e) { UI.toast(e.message || String(e), 'error'); },
  ok(msg)  { UI.toast(msg, 'success'); },

  modal(html, opts={}) {
    return new Promise((resolve) => {
      const root = document.getElementById('modal-root');
      root.innerHTML = `<div class="modal-bg"><div class="modal">${html}</div></div>`;
      const close = (val) => { root.innerHTML = ''; resolve(val); };
      root.querySelector('.modal-bg').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-bg') && opts.dismissable !== false) close(null);
      });
      root._close = close;
    });
  },
  closeModal(val) {
    const root = document.getElementById('modal-root');
    if (root._close) root._close(val);
  },

  statusBadge(s) {
    const labels = {
      draft:'טיוטה', approved:'אושר', sent:'נשלח',
      partial:'נקלט חלקית', received:'נקלט', cancelled:'בוטל'
    };
    return `<span class="badge ${s}">${labels[s] || s}</span>`;
  },

  fmtMoney(n, cur='ILS') {
    if (n == null) return '—';
    return new Intl.NumberFormat('he-IL', { style:'currency', currency: cur }).format(n);
  },
  fmtDate(s) {
    if (!s) return '—';
    return new Date(s).toLocaleString('he-IL');
  },
  el(html) {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild;
  },
  confirm(msg) {
    return Promise.resolve(window.confirm(msg));
  },
};
