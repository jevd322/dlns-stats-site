/**
 * Toast notification system
 */

let toastContainer = null;

function getOrCreateContainer() {
  if (toastContainer) return toastContainer;
  
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  `;
  document.body.appendChild(toastContainer);
  return toastContainer;
}

export function showToast(message, type = 'info', duration = 3000) {
  const container = getOrCreateContainer();
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
    pointer-events: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  
  const colors = {
    success: '#1db954',
    error: '#ff1744',
    info: '#00d8ff',
    warning: '#ffa500',
  };
  
  toast.style.backgroundColor = colors[type] || colors.info;
  toast.style.color = '#fff';
  toast.textContent = message;
  
  if (!container.querySelector('style[data-toast]')) {
    const style = document.createElement('style');
    style.setAttribute('data-toast', '');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

export function showSuccess(message) {
  showToast(message, 'success');
}

export function showError(message) {
  showToast(message, 'error', 4000);
}

export function showInfo(message) {
  showToast(message, 'info');
}
