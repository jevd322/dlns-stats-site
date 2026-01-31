let o=null;function d(){return o||(o=document.createElement("div"),o.id="toast-container",o.style.cssText=`
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  `,document.body.appendChild(o),o)}function s(t,i="info",c=3e3){const a=d(),e=document.createElement("div");e.style.cssText=`
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
    pointer-events: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;const r={success:"#1db954",error:"#ff1744",info:"#00d8ff",warning:"#ffa500"};if(e.style.backgroundColor=r[i]||r.info,e.style.color="#fff",e.textContent=t,!a.querySelector("style[data-toast]")){const n=document.createElement("style");n.setAttribute("data-toast",""),n.textContent=`
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }
    `,document.head.appendChild(n)}a.appendChild(e),setTimeout(()=>{e.style.animation="slideOut 0.3s ease",setTimeout(()=>{e.remove()},300)},c)}function f(t){s(t,"success")}function l(t){s(t,"error",4e3)}function p(t){s(t,"info")}export{f as a,p as b,l as s};
