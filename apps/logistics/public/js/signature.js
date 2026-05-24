// =================================================================
// Signature Pad - לוח חתימה (canvas)
// =================================================================
class SignaturePad {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.drawing = false;
        this.empty = true;

        // התאמה ל-DPR
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width  * ratio;
        canvas.height = rect.height * ratio;
        this.ctx.scale(ratio, ratio);
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = '#1f2937';

        this._bind();
    }

    _bind() {
        const pos = (e) => {
            const r = this.canvas.getBoundingClientRect();
            const t = e.touches && e.touches[0];
            return {
                x: (t ? t.clientX : e.clientX) - r.left,
                y: (t ? t.clientY : e.clientY) - r.top
            };
        };
        const start = (e) => {
            e.preventDefault();
            this.drawing = true;
            this.empty = false;
            const p = pos(e);
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
        };
        const move = (e) => {
            if (!this.drawing) return;
            e.preventDefault();
            const p = pos(e);
            this.ctx.lineTo(p.x, p.y);
            this.ctx.stroke();
        };
        const end = () => { this.drawing = false; };

        this.canvas.addEventListener('mousedown',  start);
        this.canvas.addEventListener('mousemove',  move);
        this.canvas.addEventListener('mouseup',    end);
        this.canvas.addEventListener('mouseleave', end);
        this.canvas.addEventListener('touchstart', start, { passive: false });
        this.canvas.addEventListener('touchmove',  move,  { passive: false });
        this.canvas.addEventListener('touchend',   end);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.empty = true;
    }
    isEmpty() { return this.empty; }
    toDataURL() { return this.canvas.toDataURL('image/png'); }
}
