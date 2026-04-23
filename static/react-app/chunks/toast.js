var e=null;function t(){return e||(e=document.createElement(`div`),e.id=`toast-container`,e.style.cssText=`
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  `,document.body.appendChild(e),e)}function n(e,n=`info`,r=3e3){let i=t(),a=document.createElement(`div`);a.style.cssText=`
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
    pointer-events: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;let o={success:`#1db954`,error:`#ff1744`,info:`#00d8ff`,warning:`#ffa500`};if(a.style.backgroundColor=o[n]||o.info,a.style.color=`#fff`,a.textContent=e,!i.querySelector(`style[data-toast]`)){let e=document.createElement(`style`);e.setAttribute(`data-toast`,``),e.textContent=`
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }
    `,document.head.appendChild(e)}i.appendChild(a),setTimeout(()=>{a.style.animation=`slideOut 0.3s ease`,setTimeout(()=>{a.remove()},300)},r)}function r(e){n(e,`success`)}function i(e){n(e,`error`,4e3)}function a(e){n(e,`info`)}export{a as n,r,i as t};