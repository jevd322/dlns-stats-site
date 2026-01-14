import{r as d,v as A,w as f,j as e,x as v,e as U,R as $}from"./chunks/api.js";const E=`
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
`;function R(){const[l,x]=d.useState(""),[g,y]=d.useState(!1),[j,n]=d.useState("Saved"),[k,w]=d.useState(0),[S,C]=d.useState(0),[r,p]=d.useState({zip:null,images:[],videos:[]}),u=d.useRef(null),m=d.useRef("");d.useEffect(()=>{(async()=>{var t,o,s;try{const i=await A(),a=i.content||i,c=a.markdown||a.html||"",T={zip:((t=a.assets)==null?void 0:t.zip)||null,images:Array.isArray((o=a.assets)==null?void 0:o.images)?a.assets.images:[],videos:Array.isArray((s=a.assets)==null?void 0:s.videos)?a.assets.videos:[]};x(c),p(T),m.current=c}catch(i){console.error("Failed to load content:",i)}})()},[]),d.useEffect(()=>{const t=l.trim(),o=t.split(/\s+/).filter(Boolean).length,s=t.length;return w(o),C(s),l!==m.current&&(n("Unsaved"),u.current&&clearTimeout(u.current),u.current=setTimeout(async()=>{try{n("Saving..."),await f({markdown:l,assets:r}),n("Saved"),m.current=l}catch(i){n("Error"),console.error("Autosave failed:",i)}},3e3)),()=>{u.current&&clearTimeout(u.current)}},[l,r]);const z=async()=>{try{n("Saving..."),await f({markdown:l,assets:r}),n("Saved"),m.current=l}catch(t){n("Error"),console.error("Save failed:",t)}},h=async(t,o)=>{if(!(!o||o.length===0))try{if(t==="zip"){const s=o[0];n("Uploading...");const i=await v(s);p(a=>({...a,zip:i})),n("Saved")}else if(t==="image"||t==="video"){n("Uploading...");const s=Array.from(o).map(c=>v(c)),i=await Promise.all(s),a=t==="image"?"images":"videos";p(c=>({...c,[a]:[...c[a]||[],...i]})),n("Saved")}}catch(s){n("Upload failed"),console.error("Upload error:",s)}},b=(t,o)=>{t==="zip"?p(s=>({...s,zip:null})):t==="image"?p(s=>({...s,images:s.images.filter((i,a)=>a!==o)})):t==="video"&&p(s=>({...s,videos:s.videos.filter((i,a)=>a!==o)}))},N=()=>{x(l+`| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Data | Data | Data |
| Data | Data | Data |

`)},M=t=>t.replace(/^### (.*$)/gim,"<h3>$1</h3>").replace(/^## (.*$)/gim,"<h2>$1</h2>").replace(/^# (.*$)/gim,"<h1>$1</h1>").replace(/\*\*(.*)\*\*/gim,"<strong>$1</strong>").replace(/\*(.*)\*/gim,"<em>$1</em>").replace(/!\[(.*?)\]\((.*?)\)/gim,'<img alt="$1" src="$2" />').replace(/\[(.*?)\]\((.*?)\)/gim,'<a href="$2">$1</a>').replace(/\n/gim,"<br />");return e.jsxs("div",{style:{minHeight:"100vh",background:"#121212",color:"#eee",padding:"20px",fontFamily:"'Segoe UI', sans-serif"},children:[e.jsx("style",{children:E}),e.jsx("h1",{style:{marginBottom:"30px"},children:"Admin: Edit Community VO Content"}),e.jsxs("div",{className:"md-editor-container",children:[e.jsxs("div",{className:"md-toolbar",children:[e.jsxs("div",{children:[e.jsx("h2",{style:{display:"inline-block",margin:0},children:"Markdown Editor"}),e.jsx("span",{className:"md-status",children:j}),e.jsxs("span",{className:"md-count",children:[k," words, ",S," chars"]})]}),e.jsxs("div",{style:{display:"flex",gap:"10px"},children:[e.jsx("button",{onClick:N,style:{background:"#2ecc71",color:"white",border:"none",padding:"5px 10px",borderRadius:"4px",cursor:"pointer",fontSize:"14px"},onMouseOver:t=>t.target.style.background="#27ae60",onMouseOut:t=>t.target.style.background="#2ecc71",children:"📊 Insert Table"}),e.jsx("button",{onClick:()=>y(!g),style:{background:"#555",color:"white",border:"none",padding:"5px 10px",borderRadius:"4px",cursor:"pointer"},onMouseOver:t=>t.target.style.background="#777",onMouseOut:t=>t.target.style.background="#555",children:g?"Edit":"Preview"})]})]}),g?e.jsx("div",{className:"md-preview",dangerouslySetInnerHTML:{__html:M(l)}}):e.jsx("textarea",{className:"md-textarea",value:l,onChange:t=>x(t.target.value),placeholder:`# Community VO Hub

Write your content in **Markdown**...

## Example:
- Use **bold** with **text**
- Use *italic* with *text*
- Add images: ![alt](url)
- Add links: [text](url)`}),e.jsxs("div",{className:"asset-upload-section",children:[e.jsxs("div",{className:"upload-box",children:[e.jsxs("label",{style:{cursor:"pointer",display:"block"},children:[e.jsx("div",{style:{fontSize:"40px"},children:"📦"}),e.jsx("div",{style:{fontWeight:600,marginTop:"10px"},children:"Upload ZIP"}),e.jsx("div",{style:{fontSize:"12px",color:"#888",marginTop:"5px"},children:r.zip?r.zip.name:"Click to upload"}),e.jsx("input",{type:"file",accept:".zip",onChange:t=>h("zip",t.target.files)})]}),r.zip&&e.jsx("div",{className:"asset-list",children:e.jsxs("div",{className:"asset-item",children:[e.jsx("span",{children:r.zip.name}),e.jsx("button",{onClick:()=>b("zip"),children:"×"})]})})]}),e.jsxs("div",{className:"upload-box",children:[e.jsxs("label",{style:{cursor:"pointer",display:"block"},children:[e.jsx("div",{style:{fontSize:"40px"},children:"🖼️"}),e.jsx("div",{style:{fontWeight:600,marginTop:"10px"},children:"Upload Images"}),e.jsxs("div",{style:{fontSize:"12px",color:"#888",marginTop:"5px"},children:[(r.images||[]).length," uploaded"]}),e.jsx("input",{type:"file",accept:"image/*",multiple:!0,onChange:t=>h("image",t.target.files)})]}),(r.images||[]).length>0&&e.jsx("div",{className:"asset-list",children:(r.images||[]).map((t,o)=>e.jsxs("div",{className:"asset-item",children:[e.jsx("span",{children:t.name}),e.jsx("button",{onClick:()=>b("image",o),children:"×"})]},t.id))})]}),e.jsxs("div",{className:"upload-box",children:[e.jsxs("label",{style:{cursor:"pointer",display:"block"},children:[e.jsx("div",{style:{fontSize:"40px"},children:"🎥"}),e.jsx("div",{style:{fontWeight:600,marginTop:"10px"},children:"Upload Videos"}),e.jsxs("div",{style:{fontSize:"12px",color:"#888",marginTop:"5px"},children:[(r.videos||[]).length," uploaded"]}),e.jsx("input",{type:"file",accept:"video/*",multiple:!0,onChange:t=>h("video",t.target.files)})]}),(r.videos||[]).length>0&&e.jsx("div",{className:"asset-list",children:(r.videos||[]).map((t,o)=>e.jsxs("div",{className:"asset-item",children:[e.jsx("span",{children:t.name}),e.jsx("button",{onClick:()=>b("video",o),children:"×"})]},t.id))})]})]}),e.jsx("button",{onClick:z,style:{backgroundColor:"#3498db",color:"white",padding:"10px 18px",border:"none",borderRadius:"5px",fontSize:"16px",cursor:"pointer",marginTop:"20px"},onMouseOver:t=>t.target.style.backgroundColor="#2980b9",onMouseOut:t=>t.target.style.backgroundColor="#3498db",children:"Save Content"})]})]})}U.createRoot(document.getElementById("root")).render(e.jsx($.StrictMode,{children:e.jsx(R,{})}));
