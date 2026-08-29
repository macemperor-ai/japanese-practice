const KEY='jpRentalLearningV04';

const el = {
  stats: document.getElementById('stats'),
  chapters: document.getElementById('chapters'),
  reset: document.getElementById('reset')
};

function loadProgress(){
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch(e){ return {}; }
}

function renderSummary(){
  const S=loadProgress(), v=Object.values(S);
  const attempts=v.reduce((n,x)=>n+(x.attempts||0),0);
  const correct=v.reduce((n,x)=>n+(x.correct||0),0);
  const replays=v.reduce((n,x)=>n+(x.replays||0),0);
  const weak=v.filter(x=>(x.mastery||0)<45 && (x.attempts||0)>0).length;
  el.stats.innerHTML=
    `<div class="stat"><b>${attempts}</b><small>作答</small></div>
     <div class="stat"><b>${attempts?Math.round(correct/attempts*100):0}%</b><small>正確率</small></div>
     <div class="stat"><b>${attempts?(replays/attempts).toFixed(1):'0.0'}</b><small>平均重播</small></div>
     <div class="stat"><b>${weak}</b><small>待加強</small></div>`;
}

fetch('./rental_content.json', {cache:'no-store'})
  .then(r => { if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
  .then(D => {
    renderSummary();
    el.chapters.innerHTML = D.chapters.map(c =>
      `<section class="card"><h2>${c.icon} ${c.name}</h2>
       <div class="actions">
         <a href="practice.html?chapter=${encodeURIComponent(c.id)}&mode=listen&smart=1">🎧 JLPT式聽解</a>
         <a href="practice.html?chapter=${encodeURIComponent(c.id)}&mode=speak&smart=1">🎙️ 聽解＋口說</a>
       </div></section>`
    ).join('');
  })
  .catch(err => {
    el.chapters.innerHTML = `<section class="card"><b>題庫載入失敗</b><p>${err.message}</p><p>請重新整理頁面；若剛更新 GitHub，請稍等 Pages 部署完成後再試。</p></section>`;
  });

el.reset.addEventListener('click', () => {
  if(confirm('確定清除所有學習紀錄？')){
    localStorage.removeItem(KEY);
    renderSummary();
  }
});

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
