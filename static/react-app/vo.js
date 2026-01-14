import{r as p,v as x,j as e,e as b,R as h}from"./chunks/api.js";const v=`
  .vo-content {
    line-height: 1.8;
    font-size: 16px;
  }
  .vo-content h1 {
    font-size: 32px;
    margin-bottom: 20px;
    font-weight: 800;
  }
  .vo-content h2 {
    font-size: 24px;
    margin-top: 30px;
    margin-bottom: 15px;
    font-weight: 700;
  }
  .vo-content h3 {
    font-size: 20px;
    margin-top: 25px;
    margin-bottom: 12px;
    font-weight: 600;
  }
  .vo-content p {
    margin-bottom: 15px;
  }
  .vo-content strong {
    font-weight: 700;
    color: #1db954;
  }
  .vo-content em {
    font-style: italic;
    color: #b2b2b8;
  }
  .vo-content a {
    color: #3498db;
    text-decoration: none;
  }
  .vo-content a:hover {
    text-decoration: underline;
  }
  .vo-content img {
    max-width: 100%;
    border-radius: 10px;
    margin: 20px 0;
  }
  .vo-content ul, .vo-content ol {
    margin-left: 20px;
    margin-bottom: 15px;
  }
  .vo-content li {
    margin-bottom: 8px;
  }
  .vo-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    overflow: hidden;
  }
  .vo-content table th {
    background: rgba(255,255,255,0.05);
    padding: 12px 16px;
    text-align: left;
    font-weight: 700;
    border-bottom: 2px solid rgba(255,255,255,0.12);
    color: #1db954;
  }
  .vo-content table td {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .vo-content table tr:last-child td {
    border-bottom: none;
  }
  .media-section {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 20px;
    margin-top: 30px;
  }
  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
    margin-top: 15px;
  }
  .media-item {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    overflow: hidden;
  }
  .media-item img, .media-item video {
    width: 100%;
    display: block;
  }
  .media-item-title {
    padding: 10px;
    font-size: 13px;
    color: #b2b2b8;
  }
`;function f(l){if(!l||typeof l!="string")return"";let a=l;const n=/\|(.+)\|\n\|[\s:|-]+\|\n((?:\|.+\|\n?)*)/gm;return a=a.replace(n,c=>{const d=c.trim().split(`
`).filter(i=>i.trim());if(d.length<2)return c;const t=d[0].split("|").map(i=>i.trim()).filter(i=>i!=="");if(t.length===0)return c;let o='<table style="width:100%; border-collapse:collapse; margin:20px 0;"><thead><tr style="background-color:#2ecc71;">';t.forEach(i=>{o+=`<th style="padding:12px; text-align:center; border:1px solid #444; font-weight:bold;">${i}</th>`}),o+="</tr></thead><tbody>";for(let i=2;i<d.length;i++){const s=d[i];if(s.includes("|")){const r=s.split("|").map(m=>m.trim()).filter(m=>m!=="");r.length>0&&(o+="<tr>",r.forEach(m=>{o+=`<td style="padding:10px; text-align:center; border:1px solid #444;">${m}</td>`}),o+="</tr>")}}return o+="</tbody></table>",o}),a=a.replace(/^### (.*$)/gim,"<h3>$1</h3>").replace(/^## (.*$)/gim,"<h2>$1</h2>").replace(/^# (.*$)/gim,"<h1>$1</h1>").replace(/\*\*(.*?)\*\*/gim,"<strong>$1</strong>").replace(/\*(.*?)\*/gim,"<em>$1</em>").replace(/!\[(.*?)\]\((.*?)\)/gim,'<img alt="$1" src="$2" />').replace(/\[(.*?)\]\((.*?)\)/gim,'<a href="$2">$1</a>').replace(/\n/gim,"<br />"),a}function u(){const[l,a]=p.useState(""),[n,c]=p.useState({zip:null,images:[],videos:[]}),[d,g]=p.useState(!0);return p.useEffect(()=>{(async()=>{var t,o,i;try{const s=await x(),r=s.content||s;a(r.markdown||r.html||""),c({zip:((t=r.assets)==null?void 0:t.zip)||null,images:Array.isArray((o=r.assets)==null?void 0:o.images)?r.assets.images:[],videos:Array.isArray((i=r.assets)==null?void 0:i.videos)?r.assets.videos:[]})}catch(s){console.error("Failed to load content:",s)}finally{g(!1)}})()},[]),e.jsxs("div",{style:{minHeight:"100vh",background:"#0d0d12",color:"#fff"},children:[e.jsx("style",{children:v}),e.jsx("main",{style:{maxWidth:"900px",margin:"0 auto",padding:"60px 20px"},children:d?e.jsx("div",{style:{textAlign:"center",color:"#7a7a82"},children:"Loading..."}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"vo-content",dangerouslySetInnerHTML:{__html:f(l)||'<p style="color:#7a7a82">No content available yet.</p>'}}),n.zip&&e.jsxs("div",{className:"media-section",children:[e.jsx("h3",{style:{margin:0,marginBottom:"15px"},children:"📦 Download Pack"}),e.jsxs("div",{style:{background:"rgba(29, 185, 84, 0.1)",border:"1px solid rgba(29, 185, 84, 0.3)",borderRadius:"10px",padding:"15px",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:600},children:n.zip.name}),e.jsxs("div",{style:{fontSize:"12px",color:"#b2b2b8",marginTop:"4px"},children:[(n.zip.size/1024/1024).toFixed(2)," MB"]})]}),e.jsx("button",{style:{background:"linear-gradient(90deg, #1db954, #1ed760)",border:"none",color:"#000",padding:"10px 16px",borderRadius:"10px",fontWeight:700,cursor:"pointer"},children:"Download"})]})]}),n.images&&n.images.length>0&&e.jsxs("div",{className:"media-section",children:[e.jsx("h3",{style:{margin:0,marginBottom:"15px"},children:"🖼️ Images"}),e.jsx("div",{className:"media-grid",children:n.images.map((t,o)=>e.jsxs("div",{className:"media-item",children:[e.jsx("img",{src:`/vo/uploads/${t.name}`,alt:t.name}),e.jsx("div",{className:"media-item-title",children:t.name})]},t.id||o))})]}),n.videos&&n.videos.length>0&&e.jsxs("div",{className:"media-section",children:[e.jsx("h3",{style:{margin:0,marginBottom:"15px"},children:"🎥 Videos"}),e.jsx("div",{className:"media-grid",children:n.videos.map((t,o)=>e.jsxs("div",{className:"media-item",children:[e.jsx("video",{controls:!0,src:`/vo/uploads/${t.name}`}),e.jsx("div",{className:"media-item-title",children:t.name})]},t.id||o))})]})]})})]})}b.createRoot(document.getElementById("root")).render(e.jsx(h.StrictMode,{children:e.jsx(u,{})}));
