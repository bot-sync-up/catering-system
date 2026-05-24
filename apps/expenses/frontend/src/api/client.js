import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!location.pathname.includes('/login')) location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
};

export const coa = {
  tree: () => api.get('/coa'),
  flat: () => api.get('/coa/flat'),
  create: (d) => api.post('/coa', d),
  update: (id, d) => api.put(`/coa/${id}`, d),
  remove: (id) => api.delete(`/coa/${id}`),
};

export const expenses = {
  list: (params) => api.get('/expenses', { params }),
  summary: (year) => api.get('/expenses/summary', { params: { year } }),
  create: (formData) => api.post('/expenses', formData),
  update: (id, d) => api.put(`/expenses/${id}`, d),
  remove: (id) => api.delete(`/expenses/${id}`),
  vendors: () => api.get('/expenses/vendors/list'),
  createVendor: (d) => api.post('/expenses/vendors', d),
};

export const recurring = {
  list: () => api.get('/recurring'),
  create: (d) => api.post('/recurring', d),
  update: (id, d) => api.put(`/recurring/${id}`, d),
  remove: (id) => api.delete(`/recurring/${id}`),
  generate: (year, month) => api.post('/recurring/generate', { year, month }),
};

export const budget = {
  list: (year) => api.get('/budget', { params: { year } }),
  upsert: (d) => api.post('/budget', d),
  remove: (id) => api.delete(`/budget/${id}`),
  vsActual: (year, month) => api.get('/budget/vs-actual', { params: { year, month } }),
  alerts: (params) => api.get('/budget/alerts', { params }),
  ackAlert: (id) => api.put(`/budget/alerts/${id}/ack`),
};

export const petty = {
  list: () => api.get('/petty'),
  create: (d) => api.post('/petty', d),
  entries: (id) => api.get(`/petty/${id}/entries`),
  addEntry: (id, formData) => api.post(`/petty/${id}/entries`, formData),
};

export const bank = {
  accounts: () => api.get('/bank/accounts'),
  createAccount: (d) => api.post('/bank/accounts', d),
  statements: () => api.get('/bank/statements'),
  upload: (formData) => api.post('/bank/statements/upload', formData),
  transactions: (statementId) => api.get(`/bank/statements/${statementId}/transactions`),
  match: (txId, expenseId) => api.post(`/bank/transactions/${txId}/match`, { expenseId }),
  unmatch: (txId) => api.post(`/bank/transactions/${txId}/unmatch`),
  unmatched: () => api.get('/bank/unmatched'),
};

export const reimbursement = {
  list: (params) => api.get('/reimbursement', { params }),
  create: (formData) => api.post('/reimbursement', formData),
  approve: (id) => api.post(`/reimbursement/${id}/approve`),
  reject: (id, reason) => api.post(`/reimbursement/${id}/reject`, { reason }),
  pay: (id) => api.post(`/reimbursement/${id}/pay`),
};

export const ocr = {
  parse: (formData) => api.post('/ocr/parse', formData),
};
