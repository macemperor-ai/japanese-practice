const KEY='jpLearningV03';
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {}}}
function say(t){speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';speechSynthesis.speak(u)}
function summary(D){
 let S=load(),vals=Object.values(S),attempts=vals.reduce((a,x)=>a+(x.attempts||0),0),ok=vals.reduce((a,x)=>a+(x.correct||0),0);
 let weak=vals.filter(x=>(x.level||0)<=1&&(x.attempts||0)>0).length;
 stats.innerHTML=`<div class=stat><b>${attempts}</b><small>累計作答</small></div><div class=stat><b>${attempts?Math.round(ok/attempts*100):0}%</b><small>正確率</small></div><div class=stat><b>${weak}</b><small>待加強句型</small></div>`;
}
fetch('content.json').then(r=>r.json()).then(D=>{
 summary(D);
 cats.innerHTML=Object.entries(D.names).map(([k,n])=>`<section class=card><h2>${n[0]} ${n[1]}</h2><p>500 個練習位置｜會依熟悉度調整出題</p><div class=words>${D.keywords[k].map(x=>{let [j,z]=x.split('|');return `<button onclick="say('${j}')"><b>${j}</b><small>${z}</small> 🔊</button>`}).join('')}</div><a href="practice.html?cat=${k}&mode=listen&smart=1">🧠 智慧聽力</a><a href="practice.html?cat=${k}&mode=speak&smart=1">🎙️ 智慧口說</a></section>`).join('');
 reset.onclick=()=>{if(confirm('確定要清除所有學習紀錄嗎？')){localStorage.removeItem(KEY);summary(D)}}
});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');