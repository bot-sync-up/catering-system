// קליינט API פשוט
const API = {
  async req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch('/api' + path, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || ('שגיאה ' + r.status));
    return data;
  },
  get(p)        { return this.req('GET', p); },
  post(p, b)    { return this.req('POST', p, b); },
  put(p, b)     { return this.req('PUT', p, b); },
  del(p)        { return this.req('DELETE', p); },

  suppliers: {
    list:   (q='') => API.get('/suppliers' + (q ? `?q=${encodeURIComponent(q)}` : '')),
    get:    (id)   => API.get(`/suppliers/${id}`),
    create: (d)    => API.post('/suppliers', d),
    update: (id,d) => API.put(`/suppliers/${id}`, d),
    remove: (id)   => API.del(`/suppliers/${id}`),
    rating: (id)   => API.get(`/suppliers/${id}/rating`),
  },
  products: {
    list:   ()     => API.get('/products'),
    get:    (id)   => API.get(`/products/${id}`),
    create: (d)    => API.post('/products', d),
    update: (id,d) => API.put(`/products/${id}`, d),
    remove: (id)   => API.del(`/products/${id}`),
    prices: (id)   => API.get(`/products/${id}/prices`),
    recommend: (id)=> API.get(`/products/${id}/recommend`),
    setPrice: (d)  => API.post('/supplier-products', d),
  },
  pos: {
    list:    (q={})=> {
      const qs = new URLSearchParams(Object.entries(q).filter(([_,v])=>v!=null&&v!==''));
      return API.get('/purchase-orders' + (qs.toString() ? '?' + qs : ''));
    },
    get:     (id)  => API.get(`/purchase-orders/${id}`),
    create:  (d)   => API.post('/purchase-orders', d),
    approve: (id)  => API.post(`/purchase-orders/${id}/approve`),
    send:    (id)  => API.post(`/purchase-orders/${id}/send`),
    cancel:  (id)  => API.post(`/purchase-orders/${id}/cancel`),
    grn:     (id,d)=> API.post(`/purchase-orders/${id}/grn`, d),
  },
  ratings: {
    create: (d)    => API.post('/ratings', d),
  },
};
