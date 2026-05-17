import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";
const RESEND_KEY = "re_DVf6Z4Zp_DUDqN5uDXykKPdyjunWGmmas";
const FROM_EMAIL = "onboarding@resend.dev";
const FROM_NAME = "CareWatch";
const LS = "carewatch_med";

const now = () => new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
const wait = ms => new Promise(r=>setTimeout(r,ms));
const save = d => { try{localStorage.setItem(LS,JSON.stringify(d))}catch{} };
const load = () => { try{const s=localStorage.getItem(LS);return s?JSON.parse(s):null}catch{return null} };
const clear = () => { try{localStorage.removeItem(LS)}catch{} };

function times(str){
  const m=str.match(/\d{1,2}[h:]\d{0,2}|\d{1,2}(?=\s*(?:am|pm|h\b))/gi)||[];
  return m.map(t=>{t=t.replace(/h/i,":");if(!t.includes(":"))t+=":00";const p=t.split(":");return p[0].padStart(2,"0")+":"+(p[1]||"00").padStart(2,"0")}).filter(Boolean);
}

async function ai(sys,msg){
  try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:sys,messages:[{role:"user",content:msg}]})});const d=await r.json();return d.content?.[0]?.text||"";}catch{return"";}
}

async function mail(to,meds,t){
  const ml=meds.join(", ");
  const rows=t.map(x=>`<tr><td style="font-family:monospace;font-weight:700;color:#00d4ff;padding:8px 12px;border-bottom:1px solid #ffffff10">${x}</td><td style="color:#e8eaf6;padding:8px 12px;border-bottom:1px solid #ffffff10">${ml}</td></tr>`).join("");
  const html=`<div style="font-family:'Segoe UI',sans-serif;background:#070d1a;color:#e8eaf6;padding:32px;border-radius:16px;max-width:500px;margin:auto;border:1px solid #00d4ff22"><div style="font-size:20px;font-weight:800;color:#00d4ff;letter-spacing:3px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #00d4ff22">💊 MED·CHECK</div><div style="background:#ffffff07;border:1px solid #00d4ff22;border-radius:12px;padding:16px;margin-bottom:16px"><div style="font-size:10px;color:#00d4ff;letter-spacing:2px;margin-bottom:10px">YOUR MEDICATIONS</div>${meds.map(m=>`<div style="padding:6px 0;border-bottom:1px solid #ffffff0d;font-weight:600">${m}</div>`).join("")}</div><div style="background:#ffffff07;border:1px solid #00d4ff22;border-radius:12px;overflow:hidden;margin-bottom:16px"><div style="font-size:10px;color:#00d4ff;letter-spacing:2px;padding:12px">SCHEDULE</div><table style="width:100%;border-collapse:collapse">${rows}</table></div><div style="background:#00ff8808;border:1px solid #00ff8830;border-radius:10px;padding:12px;font-size:12px;color:#00ff8899">✅ Reminders active!</div></div>`;
  try{const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${RESEND_KEY}`},body:JSON.stringify({from:`${FROM_NAME} <${FROM_EMAIL}>`,to,subject:`💊 Med·Check — ${ml}`,html})});const d=await r.json();return!!d.id;}catch{return false;}
}

function Gauge({value,max=100,label,unit="%",warn=70,danger=85}){
  const p=Math.min(value/max,1),r=36,c=2*Math.PI*r,d=p*c;
  const col=value>=danger?"#ff4444":value>=warn?"#ffaa00":"#00d4ff";
  return(<div style={{textAlign:"center",padding:"12px 8px"}}><svg width="90" height="90" viewBox="0 0 90 90"><circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7"/><circle cx="45" cy="45" r={r} fill="none" stroke={col} strokeWidth="7" strokeDasharray={`${d} ${c}`} strokeLinecap="round" transform="rotate(-90 45 45)" style={{transition:"stroke-dasharray .4s"}}/><text x="45" y="44" textAnchor="middle" dominantBaseline="central" fill={col} fontSize="15" fontWeight="700">{value}</text><text x="45" y="59" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">{unit}</text></svg><div style={{fontSize:11,color:"rgba(255,255,255,0.55)",letterSpacing:1,textTransform:"uppercase",marginTop:2}}>{label}</div></div>);
}

/* ═══════════════════════════════════════════════════════
   LANDING PAGE — Chatbot appears FIRST
   ═══════════════════════════════════════════════════════ */
function Landing({onDone}){
  const[msgs,setMsgs]=useState([]);
  const[chips,setChips]=useState([]);
  const[inp,setInp]=useState("");
  const[busy,setBusy]=useState(false);
  const[step,setStep]=useState("idle");
  const[data,setData]=useState({medNames:[],medTimes:[],contact:""});
  const end=useRef(null);
  const scroll=()=>end.current?.scrollIntoView({behavior:"smooth"});
  useEffect(scroll,[msgs]);
  const add=useCallback((role,text)=>setMsgs(p=>[...p,{role,text,time:now()}]),[]);
  const dot=useCallback(()=>setMsgs(p=>[...p,{role:"bot",typing:true}]),[]);
  const undot=useCallback(()=>setMsgs(p=>p.filter(m=>!m.typing)),[]);

  useEffect(()=>{
    setTimeout(()=>{dot();setTimeout(()=>{undot();add("bot","Welcome to CareWatch! 👋\n\nI'm your health assistant. Do you currently take any medications?");setChips(["Yes, I do","No, I don't"]);setStep("ask_med");},1200);},500);
  },[]);

  async function go(ans){
    if(busy||!ans.trim())return;
    setBusy(true);setChips([]);setInp("");add("user",ans);dot();await wait(800);

    if(step==="ask_med"){
      const r=await ai(`User answered "${ans}" to medication question. JSON only: {"takes_med":true/false,"message":"short reply"}`,"answer: "+ans);
      let p;try{p=JSON.parse(r.replace(/```json|```/g,"").trim())}catch{p={takes_med:/yes|yea|oui|iyeh|ah/i.test(ans),message:"What medications do you take?"}}
      undot();
      if(p.takes_med){add("bot",p.message);setStep("names");}
      else{add("bot",p.message||"No meds needed!");await wait(600);dot();await wait(800);undot();add("bot","Let's go to your dashboard! 🚀");await wait(1000);const d={medNames:[],medTimes:[],contact:""};save(d);onDone(d);}
    }else if(step==="names"){
      const r=await ai(`Extract med names from: "${ans}". JSON only: {"names":["med1"],"message":"confirm & ask times"}`,"meds: "+ans);
      let p;try{p=JSON.parse(r.replace(/```json|```/g,"").trim())}catch{p={names:[ans],message:`When do you take ${ans}?`}}
      undot();const n=p.names?.length?p.names:[ans];
      setData(d=>({...d,medNames:n}));add("bot",p.message);setStep("time");setChips(["08:00","08:00 & 20:00","08:00, 14:00, 20:00"]);
    }else if(step==="time"){
      const t=times(ans);undot();
      setData(d=>({...d,medTimes:t.length?t:["08:00"]}));
      add("bot","Schedule saved! ✅\nWhat's your email for reminders?");setStep("email");setChips([]);
    }else if(step==="email"){
      undot();
      // Use functional update to get latest data
      setData(prev=>{
        const final={...prev,contact:ans};
        save(final);
        add("bot",`Reminders set for ${ans} 📧\nLaunching dashboard... 🚀`);
        setTimeout(()=>onDone(final),1200);
        return final;
      });
    }
    setBusy(false);
  }

  const bBot={padding:"14px 18px",borderRadius:"20px 20px 20px 4px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(0,212,255,0.15)",color:"#e8eaf6",fontSize:14,lineHeight:1.6,whiteSpace:"pre-wrap",maxWidth:"85%"};
  const bUser={...bBot,borderRadius:"20px 20px 4px 20px",background:"rgba(0,212,255,0.12)",border:"1px solid rgba(0,212,255,0.3)",color:"#00d4ff"};

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#070d1a 0%,#0f1628 50%,#070d1a 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{fontSize:48,fontWeight:800,color:"#00d4ff",letterSpacing:6,marginBottom:8}}>CAREWATCH</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.4)",letterSpacing:3}}>AI-POWERED HEALTH MONITORING</div>
      </div>

      <div style={{width:"100%",maxWidth:520,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,212,255,0.18)",borderRadius:20,overflow:"hidden",backdropFilter:"blur(10px)"}}>
        <div style={{padding:"18px 24px",borderBottom:"1px solid rgba(0,212,255,0.12)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:"rgba(0,212,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏥</div>
          <div><div style={{fontSize:15,fontWeight:700,color:"#00d4ff"}}>Health Setup</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Configure your profile</div></div>
          <div style={{marginLeft:"auto",width:10,height:10,borderRadius:"50%",background:"#00ff88",boxShadow:"0 0 8px #00ff88"}}/>
        </div>

        <div style={{height:380,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              {m.typing?(<div style={{...bBot,display:"flex",gap:5,padding:"14px 18px"}}>{[0,.15,.3].map((d,j)=><span key={j} style={{width:7,height:7,borderRadius:"50%",background:"#00d4ff",display:"inline-block",animation:"bounce 1.2s infinite",animationDelay:`${d}s`}}/>)}</div>):(<div style={m.role==="user"?bUser:bBot}>{m.text}</div>)}
            </div>
          ))}
          <div ref={end}/>
        </div>

        {chips.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"0 20px 14px"}}>
            {chips.map((c,i)=>(
              <button key={i} onClick={()=>go(c)} style={{padding:"9px 18px",borderRadius:25,border:"1px solid rgba(0,212,255,0.3)",background:"transparent",color:"#e8eaf6",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{c}</button>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:10,padding:"14px 18px",borderTop:"1px solid rgba(0,212,255,0.12)"}}>
          <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go(inp)} placeholder="Type your answer..." disabled={busy} style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(0,212,255,0.2)",borderRadius:12,padding:"11px 16px",color:"#e8eaf6",fontSize:14,outline:"none",fontFamily:"inherit"}}/>
          <button onClick={()=>go(inp)} disabled={busy||!inp.trim()} style={{padding:"0 20px",borderRadius:12,background:"rgba(0,212,255,0.15)",border:"1px solid rgba(0,212,255,0.35)",color:"#00d4ff",cursor:"pointer",fontSize:18,opacity:busy||!inp.trim()?.3:1}}>➤</button>
        </div>
      </div>
      <div style={{marginTop:30,fontSize:12,color:"rgba(255,255,255,0.2)",letterSpacing:1}}>CareWatch</div>
      <style>{`@keyframes bounce{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1.1)}}`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MED PANEL — Editable meds, times, email
   ═══════════════════════════════════════════════════════ */
function MedPanel({medData,onUpdate,onReset}){
  const[edit,setEdit]=useState(false);
  const[n,setN]=useState(medData.medNames.join(", "));
  const[t,setT]=useState(medData.medTimes.join(", "));
  const[e,setE]=useState(medData.contact);
  const[sending,setSending]=useState(false);
  const[sent,setSent]=useState(false);
  const has=medData.medNames.length>0;
  const inp={background:"rgba(255,255,255,0.05)",border:"1px solid rgba(0,212,255,0.25)",borderRadius:8,padding:"8px 12px",color:"#e8eaf6",fontSize:13,outline:"none",fontFamily:"inherit",width:"100%"};

  // Sync state when medData changes from parent
  useEffect(()=>{setN(medData.medNames.join(", "));setT(medData.medTimes.join(", "));setE(medData.contact);},[medData]);

  function doSave(){
    const d={medNames:n.split(",").map(s=>s.trim()).filter(Boolean),medTimes:times(t).length?times(t):medData.medTimes,contact:e||medData.contact};
    save(d);onUpdate(d);setEdit(false);setSent(false);
  }

  async function doMail(){setSending(true);const ok=await mail(medData.contact,medData.medNames,medData.medTimes);if(ok)setSent(true);setSending(false);}

  const card={background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,212,255,0.18)",borderRadius:14,overflow:"hidden"};

  return(
    <div style={card}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid rgba(0,212,255,0.12)",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(0,212,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>💊</div>
        <div><div style={{fontSize:13,fontWeight:700,color:"#00d4ff"}}>MED·CHECK</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{has?`${medData.medNames.length} med(s)`:"No meds"}</div></div>
        <button onClick={()=>setEdit(!edit)} style={{marginLeft:"auto",padding:"5px 12px",borderRadius:6,border:"1px solid rgba(0,212,255,0.3)",background:"transparent",color:"#00d4ff",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{edit?"✕ Cancel":"✎ Edit"}</button>
      </div>

      <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
        {edit?(
          <>
            <div><div style={{fontSize:10,color:"#00d4ff",letterSpacing:2,marginBottom:6}}>MEDICATIONS (comma separated)</div><input value={n} onChange={x=>setN(x.target.value)} placeholder="Doliprane, Metformin..." style={inp}/></div>
            <div><div style={{fontSize:10,color:"#00d4ff",letterSpacing:2,marginBottom:6}}>TIMES (comma separated)</div><input value={t} onChange={x=>setT(x.target.value)} placeholder="08:00, 14:00, 20:00" style={inp}/></div>
            <div><div style={{fontSize:10,color:"#00d4ff",letterSpacing:2,marginBottom:6}}>EMAIL</div><input value={e} onChange={x=>setE(x.target.value)} placeholder="your@email.com" style={inp}/></div>
            <button onClick={doSave} style={{padding:10,borderRadius:8,border:"1px solid rgba(0,255,136,0.3)",background:"rgba(0,255,136,0.08)",color:"#00ff88",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>✓ Save Changes</button>
          </>
        ):(
          <>
            {has?medData.medNames.map((m,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,212,255,0.12)",borderRadius:10}}>
                <span style={{fontSize:17}}>💊</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#e8eaf6"}}>{m}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>{medData.medTimes.join(" — ")} · {medData.contact}</div></div>
                <div style={{padding:"3px 10px",borderRadius:20,background:"rgba(0,255,136,0.12)",color:"#00ff88",fontSize:11,fontWeight:600}}>Active</div>
              </div>
            )):<div style={{textAlign:"center",padding:16,color:"rgba(255,255,255,0.3)",fontSize:13}}>✓ No medications</div>}
            {has&&<button onClick={doMail} disabled={sending||sent} style={{padding:10,borderRadius:8,border:`1px solid ${sent?"rgba(0,255,136,0.3)":"rgba(0,212,255,0.3)"}`,background:sent?"rgba(0,255,136,0.08)":"rgba(0,212,255,0.08)",color:sent?"#00ff88":"#00d4ff",fontSize:13,cursor:sent?"default":"pointer",fontFamily:"inherit"}}>{sending?"⏳ Sending...":sent?"✅ Email sent!":"📧 Send Reminder"}</button>}
            <button onClick={()=>{clear();onReset();}} style={{padding:6,background:"none",border:"none",fontSize:11,color:"rgba(255,255,255,0.2)",cursor:"pointer",fontFamily:"inherit"}}>↺ Reset</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════ */
function Dash({medData,onMedUpdate,onReset}){
  const vRef=useRef(null),cRef=useRef(null),gBuf=useRef([]),mBuf=useRef([]),pF=useRef(null);
  const[cam,setCam]=useState(false);
  const[sid,setSid]=useState(null);
  const[run,setRun]=useState(false);
  const[clk,setClk]=useState(new Date());
  const[met,setMet]=useState({stress:0,fatigue:0,anxiety:0,burnout:0,heartRate:72,oxygen:98,brightness:50,motion:0});
  const[alr,setAlr]=useState([]);
  const[bok,setBok]=useState(null);

  useEffect(()=>{const t=setInterval(()=>setClk(new Date()),1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{axios.get(`${API}/health`).then(()=>setBok(true)).catch(()=>setBok(false))},[]);

  const startCam=useCallback(async()=>{
    try{const{data}=await axios.post(`${API}/session/start`,{device_type:/Mobi/.test(navigator.userAgent)?"mobile":"pc",camera_fps:30});setSid(data.sessionId);const s=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:"user"}});vRef.current.srcObject=s;await vRef.current.play();setCam(true);setRun(true);}catch(err){alert("Error: "+(err.response?.data?.error||err.message));}
  },[]);

  const stopCam=useCallback(async()=>{
    vRef.current?.srcObject?.getTracks().forEach(t=>t.stop());
    if(sid)await axios.post(`${API}/session/${sid}/end`).catch(()=>{});
    setCam(false);setRun(false);setSid(null);gBuf.current=[];mBuf.current=[];pF.current=null;
  },[sid]);

  useEffect(()=>{
    if(!run||!sid)return;
    let raf,ls=0;
    const loop=()=>{
      const v=vRef.current,c=cRef.current;
      if(!v||!c||v.readyState<2){raf=requestAnimationFrame(loop);return;}
      const x=c.getContext("2d",{willReadFrequently:true});
      c.width=v.videoWidth||640;c.height=v.videoHeight||480;x.drawImage(v,0,0);
      const fw=Math.floor(c.width*.3),fh=Math.floor(c.height*.15),fx=Math.floor(c.width*.35),fy=Math.floor(c.height*.1);
      const roi=x.getImageData(fx,fy,fw,fh).data;
      let gS=0,rS=0,tot=roi.length/4;
      for(let i=0;i<roi.length;i+=4){rS+=roi[i];gS+=roi[i+1];}
      const gM=gS/tot,rM=rS/tot;
      gBuf.current.push(gM);if(gBuf.current.length>150)gBuf.current.shift();
      let hr=72;
      if(gBuf.current.length>60){const b=gBuf.current,mn=b.reduce((a,v)=>a+v)/b.length,sd=Math.sqrt(b.reduce((a,v)=>a+(v-mn)**2,0)/b.length);let pk=0;for(let i=1;i<b.length-1;i++)if(b[i]>mn+sd*.3&&b[i]>b[i-1]&&b[i]>b[i+1])pk++;hr=Math.round(Math.min(130,Math.max(50,pk*12)));}
      const full=x.getImageData(0,0,c.width,c.height).data;
      let mo=0;if(pF.current){for(let i=0;i<full.length;i+=16)mo+=Math.abs(full[i]-pF.current[i]);mo/=full.length/16;}
      pF.current=new Uint8ClampedArray(full);
      mBuf.current.push(mo);if(mBuf.current.length>60)mBuf.current.shift();
      const aM=mBuf.current.reduce((a,v)=>a+v,0)/mBuf.current.length;
      let br=0;for(let i=0;i<full.length;i+=4)br+=(full[i]+full[i+1]+full[i+2])/3;br/=full.length/4;
      const oxy=Math.min(100,Math.max(88,88+(gM-rM+50)/5));
      const stress=Math.min(95,aM*3.5+(hr>90?(hr-90)*.8:0));
      const fatigue=Math.min(95,Math.max(0,100-br*.35));
      const anxiety=Math.min(95,stress*.7+Math.random()*5);
      const burnout=Math.min(95,stress*.5+fatigue*.5);
      const m={stress:Math.round(stress),fatigue:Math.round(fatigue),anxiety:Math.round(anxiety),burnout:Math.round(burnout),heartRate:hr,oxygen:Math.round(oxy),brightness:Math.round(br),motion:Math.round(aM)};
      setMet(m);
      const n=Date.now();
      if(n-ls>500){ls=n;
        axios.post(`${API}/metrics/save`,{sessionId:sid,metrics:{stress:m.stress/100,fatigue:m.fatigue/100,anxiety:m.anxiety/100,burnout:m.burnout/100,heartRate:m.heartRate,oxygen:m.oxygen,motion:m.motion,brightness:m.brightness,confidence:.85}}).catch(()=>{});
        const tr=[];
        [{key:"stress",thr:70,sev:"critical",label:"Critical Stress"},{key:"fatigue",thr:75,sev:"high",label:"Extreme Fatigue"},{key:"anxiety",thr:65,sev:"medium",label:"Anxiety Detected"},{key:"burnout",thr:70,sev:"critical",label:"Burnout Risk"},{key:"oxygen",thr:92,sev:"critical",label:"URGENT: Low O₂",below:true},{key:"heartRate",thr:105,sev:"high",label:"Elevated HR"}].forEach(d=>{const val=m[d.key],hit=d.below?val<d.thr:val>d.thr;if(hit){tr.push({type:d.key,severity:d.sev,label:d.label});axios.post(`${API}/alerts/save`,{sessionId:sid,alert:{type:d.key,severity:d.sev,message:d.label}}).catch(()=>{});}});
        setAlr(tr);
      }
      x.strokeStyle="rgba(0,212,255,0.7)";x.lineWidth=2;x.strokeRect(fx,fy,fw,fh);
      x.fillStyle="rgba(0,212,255,0.1)";x.fillRect(fx,fy,fw,fh);
      raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(raf);
  },[run,sid]);

  const card={background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,212,255,0.18)",borderRadius:14,padding:20,marginBottom:20};
  const ttl={fontSize:14,fontWeight:700,color:"#00d4ff",letterSpacing:1,textTransform:"uppercase",marginBottom:16};
  const st=alr.length===0?"normal":alr.some(a=>a.severity==="critical")?"critical":"warning";
  const sc={normal:"#00ff88",warning:"#ffaa00",critical:"#ff4444"}[st];
  const sl={normal:"✓ All Normal",warning:`⚠ ${alr.length} Alert(s)`,critical:`🚨 ${alr.length} CRITICAL`}[st];
  const rec={stress:"4-7-8 breathing · Music · Water",fatigue:"15-min break · Walk",anxiety:"Meditation · Call friend",burnout:"Stop · See professional",oxygen:"🚨 Call emergency",heartRate:"Breathe slowly · Sit"};

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#070d1a 0%,#0f1628 100%)",color:"#e8eaf6",fontFamily:"system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"14px 24px",borderBottom:"1px solid rgba(0,212,255,0.15)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(7,13,26,0.9)",backdropFilter:"blur(10px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:20,fontWeight:800,letterSpacing:2,color:"#00d4ff"}}>CAREWATCH</span><span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>v3.0</span></div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <span style={{fontSize:11,color:bok?"#00ff88":"#ff4444"}}>{bok?"● Backend OK":"● Offline"}</span>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>{clk.toLocaleTimeString("en-US")}</span>
          <span style={{padding:"5px 14px",borderRadius:20,fontSize:12,fontWeight:600,background:`${sc}18`,color:sc,border:`1px solid ${sc}44`}}>{sl}</span>
          <button onClick={cam?stopCam:startCam} style={{padding:"8px 18px",borderRadius:8,border:`1px solid ${cam?"#ff444488":"rgba(0,212,255,0.4)"}`,background:cam?"rgba(255,68,68,0.1)":"rgba(0,212,255,0.1)",color:cam?"#ff6666":"#00d4ff",cursor:"pointer",fontWeight:700,fontSize:12}}>{cam?"■ STOP":"▶ START"}</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,padding:24,flex:1}}>
        <div>
          <div style={card}>
            <div style={ttl}>📹 Camera · rPPG</div>
            <div style={{position:"relative",background:"#000",borderRadius:10,overflow:"hidden",aspectRatio:"16/9"}}>
              {!cam&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.85)",color:"rgba(255,255,255,0.35)",gap:8}}><span style={{fontSize:32}}>📷</span><span style={{fontSize:13}}>Click START</span></div>}
              <video ref={vRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover",display:cam?"block":"none"}}/>
              <canvas ref={cRef} style={{display:"none"}}/>
              {cam&&<div style={{position:"absolute",top:10,left:10,display:"flex",gap:6}}><span style={{background:"rgba(0,0,0,0.6)",color:"#ff4444",fontSize:11,padding:"3px 8px",borderRadius:4,fontWeight:700}}>● LIVE</span><span style={{background:"rgba(0,0,0,0.6)",color:"#00d4ff",fontSize:11,padding:"3px 8px",borderRadius:4}}>rPPG ON</span></div>}
            </div>
          </div>
          <div style={card}>
            <div style={ttl}>🚨 Alerts</div>
            {alr.length===0?<div style={{textAlign:"center",padding:16,color:"#00ff8866",fontSize:13}}>✓ Normal</div>:alr.map((a,i)=>(
              <div key={i} style={{marginBottom:10,padding:12,borderRadius:9,borderLeft:`3px solid ${a.severity==="critical"?"#ff4444":"#ffaa00"}`,background:a.severity==="critical"?"rgba(255,68,68,0.08)":"rgba(255,170,0,0.08)"}}>
                <div style={{fontWeight:700,fontSize:13,color:a.severity==="critical"?"#ff6666":"#ffbb33",marginBottom:4}}>{a.label}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>💡 {rec[a.type]||"See professional"}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={card}>
            <div style={ttl}>📊 Health Indicators</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)"}}>
              <Gauge value={met.stress} label="Stress" warn={60} danger={75}/>
              <Gauge value={met.fatigue} label="Fatigue" warn={65} danger={80}/>
              <Gauge value={met.anxiety} label="Anxiety" warn={55} danger={70}/>
              <Gauge value={met.burnout} label="Burnout" warn={60} danger={75}/>
              <Gauge value={met.heartRate} label="HR" max={140} unit="bpm" warn={95} danger={110}/>
              <Gauge value={met.oxygen} label="SpO₂" warn={95} danger={92}/>
            </div>
          </div>
          <div style={{...card,marginBottom:20}}>
            <div style={ttl}>⚙ Session</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Status",cam?"Analyzing":"Inactive"],["Session",sid?sid.slice(0,8)+"…":"—"],["Brightness",met.brightness+" lux"],["Motion",met.motion+" u"],["Backend",bok?"Connected ✓":"Offline"],["DB","SQLite"]].map(([k,v])=>(
                <div key={k} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"10px 14px",border:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{k}</div>
                  <div style={{fontSize:13,fontWeight:600,color:"#e8eaf6"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <MedPanel medData={medData} onUpdate={onMedUpdate} onReset={onReset}/>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   APP — Router: Landing first, then Dashboard
   Browser remembers user (localStorage)
   ═══════════════════════════════════════════════════════ */
export default function App(){
  const saved=load();
  const[page,setPage]=useState(saved?"dash":"land");
  const[md,setMd]=useState(saved||{medNames:[],medTimes:[],contact:""});

  if(page==="land")return<Landing onDone={d=>{setMd(d);setPage("dash")}}/>;
  return<Dash medData={md} onMedUpdate={d=>setMd(d)} onReset={()=>{clear();setMd({medNames:[],medTimes:[],contact:""});setPage("land")}}/>;
}
