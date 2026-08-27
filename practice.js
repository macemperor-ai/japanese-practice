const KEY='jpLearningV03';
let P=new URLSearchParams(location.search),cat=P.get('cat')||'rental',mode=P.get('mode')||'listen',smart=P.get('smart')==='1',D,A=[],i=0,current=null,$=s=>document.querySelector(s);
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {}}}
function save(S){localStorage.setItem(KEY,JSON.stringify(S))}
function key(q){return q.id.split('-')[0]+'|'+q.intent}
function stat(q){let S=load();return S[key(q)]||{attempts:0,correct:0,streak:0,level:0,last:0,due:0}}
function update(q,correct){
 let S=load(),k=key(q),x=S[k]||{attempts:0,correct:0,streak:0,level:0,last:0,due:0};
 x.attempts++; x.last=Date.now();
 if(correct){x.correct++;x.streak++; if(x.streak>=2)x.level=Math.min(5,(x.level||0)+1)}
 else{x.streak=0;x.level=Math.max(0,(x.level||0)-1)}
 let gaps=[0,10*60e3,24*3600e3,3*24*3600e3,7*24*3600e3,14*24*3600e3];
 x.due=Date.now()+gaps[x.level||0]; S[k]=x;save(S);return x
}
function weight(q){
 let x=stat(q),now=Date.now(),w=1;
 if(!x.attempts) w+=5;                 // 沒看過：優先建立接觸
 if(x.attempts && x.correct/x.attempts<.65) w+=9; // 常錯：強力轟炸
 if(x.level<=1 && x.attempts) w+=6;
 if(x.due && x.due<=now) w+=7;          // 到期複習
 w+=Math.max(0,4-(x.level||0));          // 越不熟權重越高
 return w
}
function pick(){
 let pool=cat==='all'?Object.values(D.items).flat():D.items[cat], candidates=[];
 pool.forEach(q=>{let w=smart?weight(q):1;for(let j=0;j<w;j++)candidates.push(q)});
 let q=candidates[Math.floor(Math.random()*candidates.length)];
 if(current && candidates.length>1 && key(q)===key(current)){q=candidates[Math.floor(Math.random()*candidates.length)]}
 return q
}
function say(t,r=1){speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=r;speechSynthesis.speak(u)}
function sh(a){return a.sort(()=>Math.random()-.5)}
fetch('content.json').then(r=>r.json()).then(x=>{D=x;let nm=cat==='all'?['🧠','今日複習']:D.names[cat];title.textContent=nm.join(' ')+'｜'+(mode==='speak'?'聽力＋口說':'聽力');render()});
function render(){
 current=pick();let q=current,x=stat(q);i++;
 prog.textContent=`第 ${i} 題｜熟悉度 ${'●'.repeat(x.level||0)}${'○'.repeat(5-(x.level||0))}`;
 ja.textContent=q.ja;zh.textContent=q.zh;text.classList.add('hidden');speak.classList.toggle('hidden',mode!=='speak');heard.textContent='辨識結果會顯示在這裡';sampleText.textContent=q.answer;sampleText.classList.add('hidden');fb.innerHTML='';
 let pool=(cat==='all'?Object.values(D.items).flat():D.items[cat]).filter(x=>x.zh!==q.zh), o=sh([q.zh,...sh(pool).slice(0,3).map(x=>x.zh)]);
 choices.innerHTML=o.map(x=>`<button class=choice>${x}</button>`).join('');
 document.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{
   document.querySelectorAll('.choice').forEach(x=>x.disabled=true);
   let ok=b.textContent===q.zh,ns=update(q,ok);
   if(ok){b.classList.add('ok');fb.innerHTML=`<div class=good>✓ 聽懂了｜熟悉度 ${ns.level}/5</div>`}
   else{b.classList.add('bad');fb.innerHTML=`<div class=warn>✗ 這類句型會提高出題頻率。再聽一次抓關鍵詞。</div>`}
 });
 setTimeout(()=>say(q.ja),250)
}
play.onclick=again.onclick=()=>say(current.ja);slow.onclick=()=>say(current.ja,.72);reveal.onclick=()=>text.classList.toggle('hidden');sample.onclick=()=>sampleText.classList.toggle('hidden');next.onclick=render;
mic.onclick=()=>{let S=window.SpeechRecognition||window.webkitSpeechRecognition;if(!S){heard.textContent='此瀏覽器未提供網頁語音辨識';return}let r=new S();r.lang='ja-JP';r.onresult=e=>{let t=e.results[0][0].transcript;heard.textContent='你說的是：'+t};r.onerror=e=>heard.textContent='辨識失敗：'+e.error;r.start()}