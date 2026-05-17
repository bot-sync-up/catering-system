export default function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {children}
        {footer && <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-start' }}>{footer}</div>}
      </div>
    </div>
  );
}
