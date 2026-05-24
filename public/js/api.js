// API client - עטיפה דקה ל-fetch
const API = {
  async req(method, url, body) {
    const opts = { method, headers: {} };
    if (body && !(body instanceof FormData)) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    } else if (body) {
      opts.body = body;
    }
    const r = await fetch(url, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data.ok === false) {
      throw new Error(data.error || `שגיאה ${r.status}`);
    }
    return data;
  },
  get(url) { return this.req('GET', url); },
  post(url, body) { return this.req('POST', url, body); },
  put(url, body) { return this.req('PUT', url, body); },
  del(url) { return this.req('DELETE', url); },

  // Endpoints
  deliveries: {
    list: (params = {}) => API.get('/api/deliveries?' + new URLSearchParams(params)),
    get: (id) => API.get(`/api/deliveries/${id}`),
    create: (data) => API.post('/api/deliveries', data),
    updateStatus: (id, status, lat, lng) =>
      API.put(`/api/deliveries/${id}/status`, { status, lat, lng }),
    location: (id, lat, lng, accuracy) =>
      API.post(`/api/deliveries/${id}/location`, { lat, lng, accuracy }),
    proof: (id, formData) => API.post(`/api/deliveries/${id}/proof`, formData),
    navigation: (id) => API.get(`/api/deliveries/${id}/navigation`),
  },
  drivers: {
    list: (params = {}) => API.get('/api/drivers?' + new URLSearchParams(params)),
    get: (id) => API.get(`/api/drivers/${id}`),
    create: (data) => API.post('/api/drivers', data),
    update: (id, data) => API.put(`/api/drivers/${id}`, data),
    recommend: (deliveryId) => API.get(`/api/drivers/recommend/${deliveryId}`),
    assign: (driverId, deliveryId, vehicleId) =>
      API.post(`/api/drivers/${driverId}/assign/${deliveryId}`, { vehicle_id: vehicleId }),
  },
  vehicles: {
    list: (params = {}) => API.get('/api/vehicles?' + new URLSearchParams(params)),
    create: (data) => API.post('/api/vehicles', data),
    update: (id, data) => API.put(`/api/vehicles/${id}`, data),
    location: (id, lat, lng) => API.put(`/api/vehicles/${id}/location`, { lat, lng }),
    fleet: () => API.get('/api/vehicles/fleet/live'),
  },
  contractors: {
    list: () => API.get('/api/contractors'),
    pending: (driverId, from, to) =>
      API.get(`/api/contractors/${driverId}/pending?` + new URLSearchParams({ from, to })),
    invoices: (params = {}) => API.get('/api/contractors/invoices?' + new URLSearchParams(params)),
    invoice: (id) => API.get(`/api/contractors/invoices/${id}`),
    createInvoice: (data) => API.post('/api/contractors/invoices', data),
    updateInvoiceStatus: (id, status) =>
      API.put(`/api/contractors/invoices/${id}/status`, { status }),
  },
  geofences: {
    list: () => API.get('/api/geofences'),
    create: (data) => API.post('/api/geofences', data),
    update: (id, data) => API.put(`/api/geofences/${id}`, data),
    del: (id) => API.del(`/api/geofences/${id}`),
  },
  routes: {
    plan: (data) => API.post('/api/routes/plan', data),
  },
};
