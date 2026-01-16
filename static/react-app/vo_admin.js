import{r as p,v as W,w as z,j as e,x as S,e as D,R as F}from"./chunks/api.js";const _=`
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
  .progress-bar {
    width: 100%;
    height: 8px;
    background: #1a1a1a;
    border: 1px solid #444;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 8px;
  }
  .progress-fill {
    height: 100%;
    width: 0%;
    background: #3498db;
    transition: width 0.2s ease;
  }
  .progress-text {
    font-size: 11px;
    color: #aaa;
    margin-top: 4px;
    text-align: right;
  }
`;function B(){const[g,v]=p.useState(""),[b,C]=p.useState(!1),[N,l]=p.useState("Saved"),[M,$]=p.useState(0),[T,U]=p.useState(0),[n,m]=p.useState({zip:null,images:[],videos:[]}),[d,x]=p.useState({save:0,zip:0,image:0,video:0}),u=p.useRef(null),h=p.useRef("");p.useEffect(()=>{(async()=>{var s,a,r;try{const i=await W(),t=i.content||i,c=t.markdown||t.html||"",o={zip:((s=t.assets)==null?void 0:s.zip)||null,images:Array.isArray((a=t.assets)==null?void 0:a.images)?t.assets.images:[],videos:Array.isArray((r=t.assets)==null?void 0:r.videos)?t.assets.videos:[]};v(c),m(o),h.current=c}catch(i){console.error("Failed to load content:",i)}})()},[]),p.useEffect(()=>{const s=g.trim(),a=s.split(/\s+/).filter(Boolean).length,r=s.length;return $(a),U(r),g!==h.current&&(l("Unsaved"),u.current&&clearTimeout(u.current),u.current=setTimeout(async()=>{try{l("Saving..."),await z({markdown:g,assets:n},(i,t)=>{const c=t?Math.round(i/t*100):i?100:0;x(o=>({...o,save:c}))}),l("Saved"),x(i=>({...i,save:0})),h.current=g}catch(i){l("Error"),console.error("Autosave failed:",i)}},3e3)),()=>{u.current&&clearTimeout(u.current)}},[g,n]);const A=async()=>{try{l("Saving..."),await z({markdown:g,assets:n},(s,a)=>{const r=a?Math.round(s/a*100):s?100:0;x(i=>({...i,save:r}))}),l("Saved"),x(s=>({...s,save:0})),h.current=g}catch(s){l("Error"),console.error("Save failed:",s)}},f=async(s,a)=>{if(!(!a||a.length===0))try{if(s==="zip"){const r=a[0];l("Uploading...");const i=await S(r,(t,c)=>{const o=c?Math.round(t/c*100):t?100:0;x(y=>({...y,zip:o}))});m(t=>({...t,zip:i})),x(t=>({...t,zip:0})),l("Saved")}else if(s==="image"||s==="video"){l("Uploading...");const r=s==="image"?"images":"videos",i=s==="image"?"image":"video",t=[],c=Array.from(a);for(let o=0;o<c.length;o++){const y=c[o],P=await S(y,(k,w)=>{const I=w?k/w*100:k?100:0,O=Math.round((o+I/100)/c.length*100);x(V=>({...V,[i]:O}))});t.push(P)}m(o=>({...o,[r]:[...o[r]||[],...t]})),x(o=>({...o,[i]:0})),l("Saved")}}catch(r){l("Upload failed"),console.error("Upload error:",r)}},j=(s,a)=>{s==="zip"?m(r=>({...r,zip:null})):s==="image"?m(r=>({...r,images:r.images.filter((i,t)=>t!==a)})):s==="video"&&m(r=>({...r,videos:r.videos.filter((i,t)=>t!==a)}))},E=()=>{v(g+`| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Data | Data | Data |
| Data | Data | Data |

`)},R=s=>s.replace(/^### (.*$)/gim,"<h3>$1</h3>").replace(/^## (.*$)/gim,"<h2>$1</h2>").replace(/^# (.*$)/gim,"<h1>$1</h1>").replace(/\*\*(.*)\*\*/gim,"<strong>$1</strong>").replace(/\*(.*)\*/gim,"<em>$1</em>").replace(/!\[(.*?)\]\((.*?)\)/gim,'<img alt="$1" src="$2" />').replace(/\[(.*?)\]\((.*?)\)/gim,'<a href="$2">$1</a>').replace(/\n/gim,"<br />");return e.jsxs("div",{style:{minHeight:"100vh",background:"#121212",color:"#eee",padding:"20px",fontFamily:"'Segoe UI', sans-serif"},children:[e.jsx("style",{children:_}),e.jsx("h1",{style:{marginBottom:"30px"},children:"Admin: Edit Community VO Content"}),e.jsxs("div",{className:"md-editor-container",children:[e.jsxs("div",{className:"md-toolbar",children:[e.jsxs("div",{children:[e.jsx("h2",{style:{display:"inline-block",margin:0},children:"Markdown Editor"}),e.jsx("span",{className:"md-status",children:N}),e.jsxs("span",{className:"md-count",children:[M," words, ",T," chars"]})]}),e.jsxs("div",{style:{display:"flex",gap:"10px"},children:[e.jsx("button",{onClick:E,style:{background:"#2ecc71",color:"white",border:"none",padding:"5px 10px",borderRadius:"4px",cursor:"pointer",fontSize:"14px"},onMouseOver:s=>s.target.style.background="#27ae60",onMouseOut:s=>s.target.style.background="#2ecc71",children:"📊 Insert Table"}),e.jsx("button",{onClick:()=>C(!b),style:{background:"#555",color:"white",border:"none",padding:"5px 10px",borderRadius:"4px",cursor:"pointer"},onMouseOver:s=>s.target.style.background="#777",onMouseOut:s=>s.target.style.background="#555",children:b?"Edit":"Preview"})]})]}),b?e.jsx("div",{className:"md-preview",dangerouslySetInnerHTML:{__html:R(g)}}):e.jsx("textarea",{className:"md-textarea",value:g,onChange:s=>v(s.target.value),placeholder:`# Community VO Hub

Write your content in **Markdown**...

## Example:
- Use **bold** with **text**
- Use *italic* with *text*
- Add images: ![alt](url)
- Add links: [text](url)`}),d.save>0&&e.jsxs("div",{style:{marginTop:"8px"},children:[e.jsx("div",{className:"progress-bar",children:e.jsx("div",{className:"progress-fill",style:{width:`${d.save}%`,background:"#3498db"}})}),e.jsxs("div",{className:"progress-text",children:["Saving... ",d.save,"%"]})]}),e.jsxs("div",{className:"asset-upload-section",children:[e.jsxs("div",{className:"upload-box",children:[e.jsxs("label",{style:{cursor:"pointer",display:"block"},children:[e.jsx("div",{style:{fontSize:"40px"},children:"📦"}),e.jsx("div",{style:{fontWeight:600,marginTop:"10px"},children:"Upload ZIP"}),e.jsx("div",{style:{fontSize:"12px",color:"#888",marginTop:"5px"},children:n.zip?n.zip.name:"Click to upload"}),e.jsx("input",{type:"file",accept:".zip",onChange:s=>f("zip",s.target.files)})]}),d.zip>0&&e.jsxs("div",{children:[e.jsx("div",{className:"progress-bar",children:e.jsx("div",{className:"progress-fill",style:{width:`${d.zip}%`,background:"#2ecc71"}})}),e.jsxs("div",{className:"progress-text",children:["Uploading ZIP... ",d.zip,"%"]})]}),n.zip&&e.jsx("div",{className:"asset-list",children:e.jsxs("div",{className:"asset-item",children:[e.jsx("span",{children:n.zip.name}),e.jsx("button",{onClick:()=>j("zip"),children:"×"})]})})]}),e.jsxs("div",{className:"upload-box",children:[e.jsxs("label",{style:{cursor:"pointer",display:"block"},children:[e.jsx("div",{style:{fontSize:"40px"},children:"🖼️"}),e.jsx("div",{style:{fontWeight:600,marginTop:"10px"},children:"Upload Images"}),e.jsxs("div",{style:{fontSize:"12px",color:"#888",marginTop:"5px"},children:[(n.images||[]).length," uploaded"]}),e.jsx("input",{type:"file",accept:"image/*",multiple:!0,onChange:s=>f("image",s.target.files)})]}),d.image>0&&e.jsxs("div",{children:[e.jsx("div",{className:"progress-bar",children:e.jsx("div",{className:"progress-fill",style:{width:`${d.image}%`,background:"#2ecc71"}})}),e.jsxs("div",{className:"progress-text",children:["Uploading Images... ",d.image,"%"]})]}),(n.images||[]).length>0&&e.jsx("div",{className:"asset-list",children:(n.images||[]).map((s,a)=>e.jsxs("div",{className:"asset-item",children:[e.jsx("span",{children:s.name}),e.jsx("button",{onClick:()=>j("image",a),children:"×"})]},s.id))})]}),e.jsxs("div",{className:"upload-box",children:[e.jsxs("label",{style:{cursor:"pointer",display:"block"},children:[e.jsx("div",{style:{fontSize:"40px"},children:"🎥"}),e.jsx("div",{style:{fontWeight:600,marginTop:"10px"},children:"Upload Videos"}),e.jsxs("div",{style:{fontSize:"12px",color:"#888",marginTop:"5px"},children:[(n.videos||[]).length," uploaded"]}),e.jsx("input",{type:"file",accept:"video/*",multiple:!0,onChange:s=>f("video",s.target.files)})]}),d.video>0&&e.jsxs("div",{children:[e.jsx("div",{className:"progress-bar",children:e.jsx("div",{className:"progress-fill",style:{width:`${d.video}%`,background:"#2ecc71"}})}),e.jsxs("div",{className:"progress-text",children:["Uploading Videos... ",d.video,"%"]})]}),(n.videos||[]).length>0&&e.jsx("div",{className:"asset-list",children:(n.videos||[]).map((s,a)=>e.jsxs("div",{className:"asset-item",children:[e.jsx("span",{children:s.name}),e.jsx("button",{onClick:()=>j("video",a),children:"×"})]},s.id))})]})]}),e.jsx("button",{onClick:A,style:{backgroundColor:"#3498db",color:"white",padding:"10px 18px",border:"none",borderRadius:"5px",fontSize:"16px",cursor:"pointer",marginTop:"20px"},onMouseOver:s=>s.target.style.backgroundColor="#2980b9",onMouseOut:s=>s.target.style.backgroundColor="#3498db",children:"Save Content"})]})]})}D.createRoot(document.getElementById("root")).render(e.jsx(F.StrictMode,{children:e.jsx(B,{})}));
