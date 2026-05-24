import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  r => r.data,
  e => {
    const msg = e.response?.data?.message || e.message || 'שגיאה לא ידועה';
    return Promise.reject(new Error(msg));
  }
);

export const menusApi = {
  list: () => api.get('/menus'),
  get: (id) => api.get(`/menus/${id}`),
  create: (data) => api.post('/menus', data),
  update: (id, data) => api.put(`/menus/${id}`, data),
  remove: (id) => api.delete(`/menus/${id}`),
  duplicate: (id) => api.post(`/menus/${id}/duplicate`),
  reorder: (id, payload) => api.post(`/menus/${id}/reorder`, payload),
  addCategory: (id, data) => api.post(`/menus/${id}/categories`, data),
  removeCategory: (catId) => api.delete(`/menus/categories/${catId}`),
};

export const itemsApi = {
  list: () => api.get('/items'),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  remove: (id) => api.delete(`/items/${id}`),
};

export const packagesApi = {
  list: () => api.get('/packages'),
  get: (id) => api.get(`/packages/${id}`),
  create: (data) => api.post('/packages', data),
  update: (id, data) => api.put(`/packages/${id}`, data),
  remove: (id) => api.delete(`/packages/${id}`),
};

export const allergiesApi = {
  list: () => api.get('/allergies'),
  create: (data) => api.post('/allergies', data),
  remove: (id) => api.delete(`/allergies/${id}`),
};

export const dietsApi = {
  list: () => api.get('/diets'),
  create: (data) => api.post('/diets', data),
  remove: (id) => api.delete(`/diets/${id}`),
};

export const priceListsApi = {
  list: () => api.get('/price-lists'),
  get: (id) => api.get(`/price-lists/${id}`),
  create: (data) => api.post('/price-lists', data),
  update: (id, data) => api.put(`/price-lists/${id}`, data),
  remove: (id) => api.delete(`/price-lists/${id}`),
  setItemPrice: (id, payload) => api.post(`/price-lists/${id}/items`, payload),
};

export const couponsApi = {
  list: () => api.get('/coupons'),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  remove: (id) => api.delete(`/coupons/${id}`),
  validate: (payload) => api.post('/coupons/validate', payload),
};

export const loyaltyApi = {
  customer: (customerId) => api.get(`/loyalty/customer/${customerId}`),
  adjust: (customerId, payload) => api.post(`/loyalty/customer/${customerId}/adjust`, payload),
  tiers: () => api.get('/loyalty/tiers'),
  updateTier: (tier, data) => api.put(`/loyalty/tiers/${tier}`, data),
};

export const seasonalApi = {
  list: () => api.get('/seasonal'),
  create: (data) => api.post('/seasonal', data),
  update: (id, data) => api.put(`/seasonal/${id}`, data),
  remove: (id) => api.delete(`/seasonal/${id}`),
};

export const customersApi = {
  list: () => api.get('/customers'),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  remove: (id) => api.delete(`/customers/${id}`),
};

export const ordersApi = {
  list: () => api.get('/orders'),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  confirm: (id) => api.post(`/orders/${id}/confirm`),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
  addGuest: (id, data) => api.post(`/orders/${id}/guests`, data),
  removeGuest: (id, guestId) => api.delete(`/orders/${id}/guests/${guestId}`),
  allergyReport: (id) => api.get(`/orders/${id}/allergy-report`),
};

export const pricingApi = {
  itemPrice: (payload) => api.post('/pricing/item-price', payload),
  calculate: (payload) => api.post('/pricing/calculate', payload),
};

export default api;
