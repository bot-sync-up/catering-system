// =================================================================
// API client לתקשורת עם השרת
// =================================================================
const API = {
    base: '',

    async req(method, path, body, isForm = false) {
        const opts = { method, headers: {} };
        if (body) {
            if (isForm) {
                opts.body = body;  // FormData
            } else {
                opts.headers['Content-Type'] = 'application/json';
                opts.body = JSON.stringify(body);
            }
        }
        const res = await fetch(this.base + path, opts);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'שגיאה');
        return data;
    },

    get:  (p)        => API.req('GET',    p),
    post: (p, b, f)  => API.req('POST',   p, b, f),
    put:  (p, b)     => API.req('PUT',    p, b),
    del:  (p)        => API.req('DELETE', p),

    // עזרי נוחות לפי משאב
    deliveries: {
        list:    (q={}) => API.get('/api/deliveries' + buildQS(q)),
        get:     (id)   => API.get(`/api/deliveries/${id}`),
        create:  (d)    => API.post('/api/deliveries', d),
        assign:  (id, body) => API.post(`/api/deliveries/${id}/assign`, body),
        status:  (id, body) => API.post(`/api/deliveries/${id}/status`, body),
        proof:   (id, fd)   => API.post(`/api/deliveries/${id}/proof`, fd, true),
        del:     (id)   => API.del(`/api/deliveries/${id}`),
        stats:   ()     => API.get('/api/deliveries/stats/summary'),
    },
    drivers: {
        list:   (q={}) => API.get('/api/drivers' + buildQS(q)),
        create: (d)    => API.post('/api/drivers', d),
        update: (id,d) => API.put(`/api/drivers/${id}`, d),
        stats:  (id)   => API.get(`/api/drivers/${id}/stats`),
        del:    (id)   => API.del(`/api/drivers/${id}`),
    },
    vehicles: {
        list:   ()  => API.get('/api/vehicles'),
        create: (d) => API.post('/api/vehicles', d),
        update: (id,d) => API.put(`/api/vehicles/${id}`, d),
        location: (id, ll) => API.post(`/api/vehicles/${id}/location`, ll),
        del:    (id) => API.del(`/api/vehicles/${id}`),
    },
    invoices: {
        list:    (q={}) => API.get('/api/invoices' + buildQS(q)),
        get:     (id)   => API.get(`/api/invoices/${id}`),
        generate:(d)    => API.post('/api/invoices/generate', d),
        status:  (id, status) => API.post(`/api/invoices/${id}/status`, { status }),
        del:     (id)   => API.del(`/api/invoices/${id}`),
    },
    eta: {
        notify:   (d)  => API.post('/api/eta/notify', d),
        navLinks: (id) => API.get(`/api/eta/nav-links/${id}`),
        history:  (id) => API.get(`/api/eta/notifications/${id}`),
    },
    geofence: {
        list:   ()  => API.get('/api/geofence'),
        create: (d) => API.post('/api/geofence', d),
        check:  (q) => API.get('/api/geofence/check' + buildQS(q)),
        events: (q={}) => API.get('/api/geofence/events' + buildQS(q)),
        del:    (id) => API.del(`/api/geofence/${id}`),
    },
    route: {
        plan: (d) => API.post('/api/route/plan', d),
    }
};

function buildQS(obj) {
    const entries = Object.entries(obj).filter(([k,v]) => v != null && v !== '');
    if (!entries.length) return '';
    return '?' + entries.map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

// ===== Toast =====
function toast(message, type = 'info') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = message;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

// ===== Modal =====
function openModal(title, bodyHtml) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    document.getElementById('modal').classList.remove('hidden');
}
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modalBody').innerHTML = '';
}

// ===== Helpers =====
function fmtDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('he-IL', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}
function fmtCurrency(n) {
    if (n == null) return '—';
    return '₪' + Number(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const STATUS_HE = {
    pending:   'ממתין',
    assigned:  'שובץ',
    en_route:  'בדרך',
    arrived:   'הגיע',
    delivered: 'נמסר',
    cancelled: 'בוטל'
};
const VEHICLE_STATUS_HE = {
    available:   'זמין',
    in_use:      'בשימוש',
    maintenance: 'תחזוקה'
};
const DRIVER_TYPE_HE = {
    internal:   'פנימי',
    contractor: 'קבלן'
};
const INVOICE_STATUS_HE = {
    draft:  'טיוטה',
    issued: 'הופקה',
    paid:   'שולמה'
};
