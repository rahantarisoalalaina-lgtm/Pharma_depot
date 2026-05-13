import React, { useEffect } from 'react';

export function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />)}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const id = setTimeout(onRemove, 3500);
    return () => clearTimeout(id);
  }, [onRemove]);

  const varMap = {
    success: 'var(--accent)',
    error:   'var(--danger)',
    warning: 'var(--warning)',
    info:    'var(--info)',
  };
  const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };
  const col = varMap[toast.type] || 'var(--info)';

  return (
    <div className={`toast ${toast.type}`} onClick={onRemove} style={{ cursor: 'pointer' }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: col, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '.73rem', fontWeight: 700, flexShrink: 0,
      }}>
        {icons[toast.type]}
      </span>
      <span className="toast-text">{toast.message}</span>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = React.useState([]);
  const add = (message, type = 'info') => setToasts(p => [...p, { id: Date.now(), message, type }]);
  const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));
  return {
    toasts, removeToast,
    success: m => add(m, 'success'),
    error:   m => add(m, 'error'),
    warning: m => add(m, 'warning'),
    info:    m => add(m, 'info'),
  };
}
