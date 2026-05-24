// Signature canvas - חתימה במגע/עכבר
class SignatureCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.drawing = false;
    this.hasContent = false;
    this.lastX = 0;
    this.lastY = 0;
    this._setup();
  }

  _setup() {
    this.ctx.strokeStyle = '#1a237e';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // עכבר
    this.canvas.addEventListener('mousedown', e => this._start(e.offsetX, e.offsetY));
    this.canvas.addEventListener('mousemove', e => {
      if (this.drawing) this._draw(e.offsetX, e.offsetY);
    });
    this.canvas.addEventListener('mouseup', () => this._stop());
    this.canvas.addEventListener('mouseleave', () => this._stop());

    // מגע (טאצ')
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      const r = this.canvas.getBoundingClientRect();
      this._start(t.clientX - r.left, t.clientY - r.top);
    });
    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!this.drawing) return;
      const t = e.touches[0];
      const r = this.canvas.getBoundingClientRect();
      this._draw(t.clientX - r.left, t.clientY - r.top);
    });
    this.canvas.addEventListener('touchend', () => this._stop());
  }

  _start(x, y) {
    this.drawing = true;
    this.lastX = x;
    this.lastY = y;
  }
  _draw(x, y) {
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.lastX = x;
    this.lastY = y;
    this.hasContent = true;
  }
  _stop() { this.drawing = false; }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasContent = false;
  }

  toDataURL() {
    return this.hasContent ? this.canvas.toDataURL('image/png') : null;
  }
}
window.SignatureCanvas = SignatureCanvas;
