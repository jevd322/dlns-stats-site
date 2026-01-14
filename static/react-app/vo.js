import{r as m,v as g,j as e,e as x,R as h}from"./chunks/api.js";const b=`
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
`;function v(d){if(!d||typeof d!="string")return"";let r=d;return r=r.replace(/^\|(.+?)\|[ \t]*\n\|[ \t]*[-:| ]+\|[ \t]*\n((?:^\|.+?\|[ \t]*\n?)*)/gm,o=>{const s=o.trim().split(`
`).filter(i=>i.trim());if(s.length<2)return o;const c=s[0].split("|").map(i=>i.trim()).filter(i=>i&&i!=="");if(c.length===0)return o;let t="<table><thead><tr>";c.forEach(i=>{t+=`<th>${i}</th>`}),t+="</tr></thead><tbody>";for(let i=2;i<s.length;i++){const l=s[i];if(l.includes("|")){const a=l.split("|").map(n=>n.trim()).filter(n=>n!=="");a.length>0&&(t+="<tr>",a.forEach(n=>{t+=`<td>${n}</td>`}),t+="</tr>")}}return t+="</tbody></table>",t}),r=r.replace(/^### (.*$)/gim,"<h3>$1</h3>").replace(/^## (.*$)/gim,"<h2>$1</h2>").replace(/^# (.*$)/gim,"<h1>$1</h1>").replace(/\*\*(.*?)\*\*/gim,"<strong>$1</strong>").replace(/\*(.*?)\*/gim,"<em>$1</em>").replace(/!\[(.*?)\]\((.*?)\)/gim,'<img alt="$1" src="$2" />').replace(/\[(.*?)\]\((.*?)\)/gim,'<a href="$2">$1</a>').replace(/\n/gim,"<br />"),r}function f(){const[d,r]=m.useState(""),[o,s]=m.useState({zip:null,images:[],videos:[]}),[p,c]=m.useState(!0);return m.useEffect(()=>{(async()=>{var t,i,l;try{const a=await g(),n=a.content||a;r(n.markdown||n.html||""),s({zip:((t=n.assets)==null?void 0:t.zip)||null,images:Array.isArray((i=n.assets)==null?void 0:i.images)?n.assets.images:[],videos:Array.isArray((l=n.assets)==null?void 0:l.videos)?n.assets.videos:[]})}catch(a){console.error("Failed to load content:",a)}finally{c(!1)}})()},[]),e.jsxs("div",{style:{minHeight:"100vh",background:"#0d0d12",color:"#fff"},children:[e.jsx("style",{children:b}),e.jsx("main",{style:{maxWidth:"900px",margin:"0 auto",padding:"60px 20px"},children:p?e.jsx("div",{style:{textAlign:"center",color:"#7a7a82"},children:"Loading..."}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"vo-content",dangerouslySetInnerHTML:{__html:v(d)||'<p style="color:#7a7a82">No content available yet.</p>'}}),o.zip&&e.jsxs("div",{className:"media-section",children:[e.jsx("h3",{style:{margin:0,marginBottom:"15px"},children:"📦 Download Pack"}),e.jsxs("div",{style:{background:"rgba(29, 185, 84, 0.1)",border:"1px solid rgba(29, 185, 84, 0.3)",borderRadius:"10px",padding:"15px",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:600},children:o.zip.name}),e.jsxs("div",{style:{fontSize:"12px",color:"#b2b2b8",marginTop:"4px"},children:[(o.zip.size/1024/1024).toFixed(2)," MB"]})]}),e.jsx("button",{style:{background:"linear-gradient(90deg, #1db954, #1ed760)",border:"none",color:"#000",padding:"10px 16px",borderRadius:"10px",fontWeight:700,cursor:"pointer"},children:"Download"})]})]}),o.images&&o.images.length>0&&e.jsxs("div",{className:"media-section",children:[e.jsx("h3",{style:{margin:0,marginBottom:"15px"},children:"🖼️ Images"}),e.jsx("div",{className:"media-grid",children:o.images.map((t,i)=>e.jsxs("div",{className:"media-item",children:[e.jsx("img",{src:`/vo/uploads/${t.name}`,alt:t.name}),e.jsx("div",{className:"media-item-title",children:t.name})]},t.id||i))})]}),o.videos&&o.videos.length>0&&e.jsxs("div",{className:"media-section",children:[e.jsx("h3",{style:{margin:0,marginBottom:"15px"},children:"🎥 Videos"}),e.jsx("div",{className:"media-grid",children:o.videos.map((t,i)=>e.jsxs("div",{className:"media-item",children:[e.jsx("video",{controls:!0,src:`/vo/uploads/${t.name}`}),e.jsx("div",{className:"media-item-title",children:t.name})]},t.id||i))})]})]})})]})}x.createRoot(document.getElementById("root")).render(e.jsx(h.StrictMode,{children:e.jsx(f,{})}));
