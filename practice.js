const KEY='jpRentalLearningV04';
const P=new URLSearchParams(location.search);
const chapter=P.get('chapter')||'airport';
const mode=P.get('mode')||'listen';
const smart=P.get('smart')==='1';
const phone=P.get('phone')==='1';

const el={
  title:document.getElementById('title'),
  prog:document.getElementById('prog'),
  chapterName:document.getElementById('chapterName'),
  playScene:document.getElementById('playScene'),
  slow:document.getElementById('slow'),
  again:document.getElementById('again'),
  replayCount:document.getElementById('replayCount'),
  questionBtn:document.getElementById('questionBtn'),
  questionText:document.getElementById('questionText'),
  choices:document.getElementById('choices'),
  feedback:document.getElementById('feedback'),
  reveal:document.getElementById('reveal'),
  text:document.getElementById('text'),
  sentenceBtn:document.getElementById('sentenceBtn'),
  ja:document.getElementById('ja'),
  meaning:document.getElementById('meaning'),
  chunks:document.getElementById('chunks'),
  speakBox:document.getElementById('speakBox'),
  mic:document.getElementById('mic'),
  heard:document.getElementById('heard'),
  replyButtons:document.getElementById('replyButtons'),
  metrics:document.getElementById('metrics'),
  next:document.getElementById('next')
};

let D=null,current=null,count=0,signals={},answered=false;

function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {}}}
function save(S){localStorage.setItem(KEY,JSON.stringify(S))}
function keyOf(q){return q.chapter+'|'+q.intent}
function statOf(q){
  const S=load();
  return S[keyOf(q)]||{attempts:0,correct:0,wrong:0,replays:0,slow:0,reveals:0,mastery:0,last:0,due:0};
}
function interval(m){
  if(m>=85)return 14*864e5;
  if(m>=70)return 7*864e5;
  if(m>=55)return 3*864e5;
  if(m>=40)return 864e5;
  if(m>=20)return 10*60e3;
  return 0;
}
function record(q,ok){
  const S=load();
  const x=S[keyOf(q)]||{attempts:0,correct:0,wrong:0,replays:0,slow:0,reveals:0,mastery:0,last:0,due:0};
  x.attempts++; x.last=Date.now();
  x.replays+=signals.replays||0; x.slow+=signals.slow||0; x.reveals+=signals.revealed?1:0;
  if(ok)x.correct++; else x.wrong++;
  let quality=ok?1:0;
  if(ok){
    quality-=Math.min(.55,(signals.replays||0)*.18);
    if(signals.slow)quality-=.22;
    if(signals.revealed)quality-=.38;
    quality=Math.max(.08,quality);
    x.mastery=Math.min(100,(x.mastery||0)+12*quality);
  }else{
    x.mastery=Math.max(0,(x.mastery||0)-10);
  }
  x.due=Date.now()+interval(x.mastery||0);
  S[keyOf(q)]=x; save(S);
  return {x,quality};
}
function weight(q){
  const x=statOf(q), now=Date.now();
  let w=2;
  if(!x.attempts)w+=7;
  const acc=x.attempts?x.correct/x.attempts:0;
  if(x.attempts&&acc<.7)w+=9;
  if((x.mastery||0)<40&&x.attempts)w+=8;
  if(x.due&&x.due<=now)w+=8;
  const ar=x.attempts?(x.replays||0)/x.attempts:0;
  if(ar>=1)w+=Math.min(8,Math.ceil(ar*2));
  if((x.slow||0)>0)w+=3;
  if((x.reveals||0)>0)w+=3;
  return w;
}
function pool(){
  const a=D.items;
  return chapter==='all'?a:a.filter(q=>q.chapter===chapter);
}
function pick(){
  const a=pool();
  if(!a.length) throw new Error('這個章節沒有題目');
  const bag=[];
  a.forEach(q=>{
    const w=smart?weight(q):1;
    for(let i=0;i<w;i++)bag.push(q);
  });
  return bag[Math.floor(Math.random()*bag.length)];
}
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function chapterInfo(id){return D.chapters.find(c=>c.id===id)||{icon:'🎧',name:'聽解'}}

function speak(text,rate=1,onEnd=null){
  if(!text || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang='ja-JP'; u.rate=rate;
  if(onEnd)u.onend=onEnd;
  speechSynthesis.speak(u);
}
function playSceneThenQuestion(){
  if(!current)return;
  speak(current.ja,1,()=>setTimeout(()=>speak(current.quiz_question_ja),350));
}
function showMetrics(x){
  const ar=x.attempts?((x.replays||0)/x.attempts).toFixed(1):'0.0';
  el.metrics.innerHTML=`熟悉度 <b>${Math.round(x.mastery||0)}/100</b>｜平均重播 <b>${ar}</b> 次｜作答 <b>${x.attempts||0}</b> 次`;
}
function render(){
  current=pick(); answered=false; signals={replays:0,slow:0,revealed:false}; count++;
  const q=current, x=statOf(q), c=chapterInfo(q.chapter);

  el.title.textContent=phone?'📞 機場接駁 JLPT式聽解':(mode==='speak'?'聽解＋口說':'JLPT式聽解');
  el.prog.textContent=`第 ${count} 題｜熟悉度 ${Math.round(x.mastery||0)}/100`;
  el.chapterName.textContent=`${c.icon} ${c.name}｜${q.intent}`;
  el.questionText.textContent=q.quiz_question_ja;
  el.ja.textContent=q.ja;
  el.meaning.textContent='意思：'+q.answer_zh;
  el.text.classList.add('hidden');
  el.feedback.innerHTML='';
  el.replayCount.textContent='0';
  el.speakBox.classList.toggle('hidden',mode!=='speak');
  el.heard.textContent='辨識結果會顯示在這裡';

  el.chunks.innerHTML=(q.chunks||[]).map(z=>
    `<button type="button" class="chunk" data-ja="${z.ja.replace(/"/g,'&quot;')}">
      <b>${z.ja}</b><small>${z.zh}</small><span>🔊</span>
    </button>`).join('');
  el.chunks.querySelectorAll('.chunk').forEach(b=>b.addEventListener('click',()=>speak(b.dataset.ja)));

  el.replyButtons.innerHTML=(q.replies||[]).map(r=>
    `<button type="button" class="reply" data-ja="${r.replace(/"/g,'&quot;')}">${r}<span>🔊</span></button>`).join('');
  el.replyButtons.querySelectorAll('.reply').forEach(b=>b.addEventListener('click',()=>speak(b.dataset.ja)));

  const opts=shuffle([...q.quiz_options_ja]);
  el.choices.innerHTML=opts.map((opt,i)=>
    `<button class="choice" type="button" data-ja="${opt.replace(/"/g,'&quot;')}">
      <span class="num">${i+1}</span><span class="opt">${opt}</span><span class="speakerIcon">🔊</span>
    </button>`).join('');

  el.choices.querySelectorAll('.choice').forEach(b=>{
    const icon=b.querySelector('.speakerIcon');
    icon.addEventListener('click',e=>{e.stopPropagation();speak(b.dataset.ja)});
    b.addEventListener('click',()=>{
      if(answered)return;
      answered=true;
      el.choices.querySelectorAll('.choice').forEach(z=>z.disabled=true);
      const val=b.querySelector('.opt').textContent;
      const ok=val===q.quiz_answer_ja;
      const res=record(q,ok);
      if(ok){
        b.classList.add('ok');
        el.feedback.innerHTML=`<div class="good">✓ ${res.quality>=.85?'一次就抓到這次考的資訊！':'答對；重播、慢速等仍會納入複習權重。'}</div>`;
      }else{
        b.classList.add('bad');
        const rr=[...el.choices.querySelectorAll('.choice')].find(z=>z.querySelector('.opt').textContent===q.quiz_answer_ja);
        if(rr)rr.classList.add('right');
        el.feedback.innerHTML=`<div class="warn">✗ 正解：<b>${q.quiz_answer_ja}</b><br>再聽原句，確認這次問題究竟在考哪個資訊。</div>`;
      }
      showMetrics(res.x);
    });
  });

  showMetrics(x);
  setTimeout(playSceneThenQuestion,300);
}

el.playScene.addEventListener('click',()=>current&&speak(current.ja));
el.again.addEventListener('click',()=>{
  if(!current)return;
  signals.replays++;
  el.replayCount.textContent=signals.replays;
  playSceneThenQuestion();
});
el.slow.addEventListener('click',()=>{
  if(!current)return;
  signals.slow++;
  speak(current.ja,.72,()=>setTimeout(()=>speak(current.quiz_question_ja,.82),350));
});
el.questionBtn.addEventListener('click',()=>current&&speak(current.quiz_question_ja));
el.reveal.addEventListener('click',()=>{
  if(!current)return;
  signals.revealed=true;
  el.text.classList.toggle('hidden');
});
el.sentenceBtn.addEventListener('click',()=>current&&speak(current.ja));
el.next.addEventListener('click',()=>{ if(D) render(); });

el.mic.addEventListener('click',()=>{
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){el.heard.textContent='此瀏覽器未提供網頁語音辨識';return}
  const r=new SR();
  r.lang='ja-JP';
  r.onresult=e=>el.heard.textContent='你說的是：'+e.results[0][0].transcript;
  r.onerror=e=>el.heard.textContent='辨識失敗：'+e.error;
  r.start();
});

fetch('./rental_content.json',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()})
  .then(x=>{D=x;render()})
  .catch(err=>{
    el.feedback.innerHTML=`<div class="warn"><b>題庫載入失敗</b><br>${err.message}<br>請重新整理；若剛更新 GitHub，請稍等 Pages 部署完成。</div>`;
  });
