import{r as l,v as T,w as f,j as e,x as v,e as U,R as $}from"./chunks/api.js";const E=`
  .md-editor-container {
    background-color: #1e1e1e;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 30px;
  }
  .md-textarea {
    width: 100%;
    min-height: 400px;
    background: #2c2c2c;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 15px;
    color: #f1f1f1;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    line-height: 1.6;
    resize: vertical;
  }
  .md-textarea:focus {
    outline: none;
    border-color: #3498db;
  }
  .md-preview {
    background: #2c2c2c;
    border: 1px solid #444;
    padding: 15px;
    border-radius: 6px;
    color: #f1f1f1;
    min-height: 400px;
    line-height: 1.6;
  }
  .md-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .md-status {
    font-size: 0.9em;
    color: #bbb;
    margin-left: 15px;
  }
  .md-count {
    font-size: 0.9em;
    color: #bbb;
    margin-left: 15px;
  }
  .asset-upload-section {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-top: 20px;
  }
  .upload-box {
    background: #2c2c2c;
    border: 2px dashed #444;
    border-radius: 6px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  .upload-box:hover {
    border-color: #3498db;
    background: #333;
  }
  .upload-box input {
    display: none;
  }
  .asset-list {
    margin-top: 10px;
    font-size: 12px;
    color: #aaa;
  }
  .asset-item {
    background: #222;
    padding: 5px 8px;
    border-radius: 4px;
    margin-top: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .asset-item button {
    background: #d9534f;
    border: none;
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
  }
`;function M(){const[d,b]=l.useState(""),[x,y]=l.useState(!1),[j,a]=l.useState("Saved"),[k,w]=l.useState(0),[S,z]=l.useState(0),[i,p]=l.useState({zip:null,images:[],videos:[]}),m=l.useRef(null),u=l.useRef("");l.useEffect(()=>{(async()=>{var s,o,t;try{const n=await T(),r=n.content||n,c=r.markdown||r.html||"",A={zip:((s=r.assets)==null?void 0:s.zip)||null,images:Array.isArray((o=r.assets)==null?void 0:o.images)?r.assets.images:[],videos:Array.isArray((t=r.assets)==null?void 0:t.videos)?r.assets.videos:[]};b(c),p(A),u.current=c}catch(n){console.error("Failed to load content:",n)}})()},[]),l.useEffect(()=>{const s=d.trim(),o=s.split(/\s+/).filter(Boolean).length,t=s.length;return w(o),z(t),d!==u.current&&(a("Unsaved"),m.current&&clearTimeout(m.current),m.current=setTimeout(async()=>{try{a("Saving..."),await f({markdown:d,assets:i}),a("Saved"),u.current=d}catch(n){a("Error"),console.error("Autosave failed:",n)}},3e3)),()=>{m.current&&clearTimeout(m.current)}},[d,i]);const C=async()=>{try{a("Saving..."),await f({markdown:d,assets:i}),a("Saved"),u.current=d}catch(s){a("Error"),console.error("Save failed:",s)}},g=async(s,o)=>{if(!(!o||o.length===0))try{if(s==="zip"){const t=o[0];a("Uploading...");const n=await v(t);p(r=>({...r,zip:n})),a("Saved")}else if(s==="image"||s==="video"){a("Uploading...");const t=Array.from(o).map(c=>v(c)),n=await Promise.all(t),r=s==="image"?"images":"videos";p(c=>({...c,[r]:[...c[r]||[],...n]})),a("Saved")}}catch(t){a("Upload failed"),console.error("Upload error:",t)}},h=(s,o)=>{s==="zip"?p(t=>({...t,zip:null})):s==="image"?p(t=>({...t,images:t.images.filter((n,r)=>r!==o)})):s==="video"&&p(t=>({...t,videos:t.videos.filter((n,r)=>r!==o)}))},N=s=>s.replace(/^### (.*$)/gim,"<h3>$1</h3>").replace(/^## (.*$)/gim,"<h2>$1</h2>").replace(/^# (.*$)/gim,"<h1>$1</h1>").replace(/\*\*(.*)\*\*/gim,"<strong>$1</strong>").replace(/\*(.*)\*/gim,"<em>$1</em>").replace(/!\[(.*?)\]\((.*?)\)/gim,'<img alt="$1" src="$2" />').replace(/\[(.*?)\]\((.*?)\)/gim,'<a href="$2">$1</a>').replace(/\n/gim,"<br />");return e.jsxs("div",{style:{minHeight:"100vh",background:"#121212",color:"#eee",padding:"20px",fontFamily:"'Segoe UI', sans-serif"},children:[e.jsx("style",{children:E}),e.jsx("h1",{style:{marginBottom:"30px"},children:"Admin: Edit Community VO Content"}),e.jsxs("div",{className:"md-editor-container",children:[e.jsxs("div",{className:"md-toolbar",children:[e.jsxs("div",{children:[e.jsx("h2",{style:{display:"inline-block",margin:0},children:"Markdown Editor"}),e.jsx("span",{className:"md-status",children:j}),e.jsxs("span",{className:"md-count",children:[k," words, ",S," chars"]})]}),e.jsx("button",{onClick:()=>y(!x),style:{background:"#555",color:"white",border:"none",padding:"5px 10px",borderRadius:"4px",cursor:"pointer"},onMouseOver:s=>s.target.style.background="#777",onMouseOut:s=>s.target.style.background="#555",children:x?"Edit":"Preview"})]}),x?e.jsx("div",{className:"md-preview",dangerouslySetInnerHTML:{__html:N(d)}}):e.jsx("textarea",{className:"md-textarea",value:d,onChange:s=>b(s.target.value),placeholder:`# Community VO Hub

Write your content in **Markdown**...

## Example:
- Use **bold** with **text**
- Use *italic* with *text*
- Add images: ![alt](url)
- Add links: [text](url)`}),e.jsxs("div",{className:"asset-upload-section",children:[e.jsxs("div",{className:"upload-box",children:[e.jsxs("label",{style:{cursor:"pointer",display:"block"},children:[e.jsx("div",{style:{fontSize:"40px"},children:"📦"}),e.jsx("div",{style:{fontWeight:600,marginTop:"10px"},children:"Upload ZIP"}),e.jsx("div",{style:{fontSize:"12px",color:"#888",marginTop:"5px"},children:i.zip?i.zip.name:"Click to upload"}),e.jsx("input",{type:"file",accept:".zip",onChange:s=>g("zip",s.target.files)})]}),i.zip&&e.jsx("div",{className:"asset-list",children:e.jsxs("div",{className:"asset-item",children:[e.jsx("span",{children:i.zip.name}),e.jsx("button",{onClick:()=>h("zip"),children:"×"})]})})]}),e.jsxs("div",{className:"upload-box",children:[e.jsxs("label",{style:{cursor:"pointer",display:"block"},children:[e.jsx("div",{style:{fontSize:"40px"},children:"🖼️"}),e.jsx("div",{style:{fontWeight:600,marginTop:"10px"},children:"Upload Images"}),e.jsxs("div",{style:{fontSize:"12px",color:"#888",marginTop:"5px"},children:[(i.images||[]).length," uploaded"]}),e.jsx("input",{type:"file",accept:"image/*",multiple:!0,onChange:s=>g("image",s.target.files)})]}),(i.images||[]).length>0&&e.jsx("div",{className:"asset-list",children:(i.images||[]).map((s,o)=>e.jsxs("div",{className:"asset-item",children:[e.jsx("span",{children:s.name}),e.jsx("button",{onClick:()=>h("image",o),children:"×"})]},s.id))})]}),e.jsxs("div",{className:"upload-box",children:[e.jsxs("label",{style:{cursor:"pointer",display:"block"},children:[e.jsx("div",{style:{fontSize:"40px"},children:"🎥"}),e.jsx("div",{style:{fontWeight:600,marginTop:"10px"},children:"Upload Videos"}),e.jsxs("div",{style:{fontSize:"12px",color:"#888",marginTop:"5px"},children:[(i.videos||[]).length," uploaded"]}),e.jsx("input",{type:"file",accept:"video/*",multiple:!0,onChange:s=>g("video",s.target.files)})]}),(i.videos||[]).length>0&&e.jsx("div",{className:"asset-list",children:(i.videos||[]).map((s,o)=>e.jsxs("div",{className:"asset-item",children:[e.jsx("span",{children:s.name}),e.jsx("button",{onClick:()=>h("video",o),children:"×"})]},s.id))})]})]}),e.jsx("button",{onClick:C,style:{backgroundColor:"#3498db",color:"white",padding:"10px 18px",border:"none",borderRadius:"5px",fontSize:"16px",cursor:"pointer",marginTop:"20px"},onMouseOver:s=>s.target.style.backgroundColor="#2980b9",onMouseOut:s=>s.target.style.backgroundColor="#3498db",children:"Save Content"})]})]})}U.createRoot(document.getElementById("root")).render(e.jsx($.StrictMode,{children:e.jsx(M,{})}));
