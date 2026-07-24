const {client,escapeHtml,formatDate,safeHttpUrl}=window.SSALMUCK;
let allEvents=[],session=null,currentEvent=null;
const list=document.getElementById('eventList');
const hotList=document.getElementById('hotEventList');
const hotSection=document.getElementById('hotSection');
const count=document.getElementById('eventCount');
const empty=document.getElementById('emptyState');
const loading=document.getElementById('loadingState');
const search=document.getElementById('searchInput');
const category=document.getElementById('categoryFilter');
const sort=document.getElementById('sortFilter');
const dialog=document.getElementById('eventDialog');
const dialogContent=document.getElementById('dialogContent');

function riceIcons(score=0){
  let out='<span class="rice-icons" aria-label="밥점수 '+Number(score).toFixed(1)+'점">';
  for(let i=1;i<=5;i++){
    const fill=score>=i?'full':score>=i-.5?'half':'empty';
    out+=`<span class="rice-icon ${fill}"><img src="assets/rice-bowl.svg" alt=""></span>`;
  }
  return out+'</span>';
}
function riceDisplay(score){
  if(!Number(score))return '<span class="small">아직 밥점수 없음</span>';
  return `<span class="rice-score">${riceIcons(Number(score))}<b>${Number(score).toFixed(1)}</b></span>`;
}
function rewardLabel(e){
  if(e.reward)return e.reward;
  const amount=e.reward_amount!=null?Number(e.reward_amount).toLocaleString('ko-KR')+'원':'';
  return [e.reward_type,e.reward_custom,amount].filter(Boolean).join(' ')||'보상 미정';
}
function paymentLabel(e){return e.payment_method==='직접입력'?(e.payment_method_custom||'직접 입력'):e.payment_method||'지급 방식 미정'}
function durationLabel(e){
  if(e.duration)return e.duration;
  if(e.duration_minutes!=null)return `약 ${e.duration_minutes}분`;
  return '소요시간 미정';
}
function rewardSortValue(e){return Number(e.reward_amount??-1)}
function durationSortValue(e){return Number(e.duration_minutes??Number.MAX_SAFE_INTEGER)}
function dday(deadline){return Math.max(0,Math.ceil((new Date(deadline)-new Date())/86400000))}
function participationSummary(e){
  return `<div class="participation-summary"><span>🍳 취사중 <b>${e.cooking_count||0}</b></span><span>✅ 완료 <b>${e.completed_count||0}</b></span></div>`;
}
function cardMarkup(e,{hot=false}={}){
  return `<article class="event-card ${hot?'hot-card':''}" data-id="${e.id}" tabindex="0">
    ${hot?'<div class="hot-ribbon">🔥 따끈한 밥</div>':''}
    <div class="card-image ${e.image_url?'':'card-placeholder'}">${e.image_url?`<img class="card-image" src="${escapeHtml(e.image_url)}" alt="">`:'<img class="placeholder-rice" src="assets/rice-bowl.svg" alt="">'}</div>
    <div class="card-body">
      <div class="card-top"><span class="badge">${escapeHtml(e.category)}</span><span class="deadline">D-${dday(e.deadline)} · ${formatDate(e.deadline)}</span></div>
      <h3>${escapeHtml(e.title)}</h3>
      <div class="priority-grid">
        <div class="priority-item reward-priority"><span>보상</span><strong>${escapeHtml(rewardLabel(e))}</strong><small>${escapeHtml(paymentLabel(e))}</small></div>
        <div class="priority-item time-priority"><span>귀찮음 · 시간</span><strong>${escapeHtml(durationLabel(e))}</strong><small>${e.duration_minutes!=null?`${e.duration_minutes}분 기준`:'작성자 안내'}</small></div>
      </div>
      <div class="eligibility-preview"><span>자격요건</span><p>${escapeHtml((e.eligibility||'자격요건 미입력').slice(0,95))}${(e.eligibility||'').length>95?'…':''}</p></div>
      ${participationSummary(e)}
      <div class="card-bottom"><div>${riceDisplay(e.avg_rating)} <span class="small">(${e.rating_count||0})</span></div><strong>자세히 →</strong></div>
    </div></article>`;
}

async function load(){
  if(!client){document.getElementById('setupNotice').hidden=false;loading.hidden=true;return}
  session=await window.SSALMUCK.getSession();
  const [{data:events,error},{data:notices}]=await Promise.all([
    client.from('events_with_stats').select('*').order('created_at',{ascending:false}),
    client.from('notices').select('*').order('created_at',{ascending:false}).limit(5)
  ]);
  loading.hidden=true;
  if(error){empty.hidden=false;empty.textContent=error.message;return}
  allEvents=events||[];
  const standardCategories=['금융','앱테크','경품','게임','기타'];
  [...new Set(allEvents.map(e=>e.category).filter(Boolean))].filter(c=>!standardCategories.includes(c)).forEach(c=>{if(![...category.options].some(o=>o.value===c))category.add(new Option(c,c));});
  document.getElementById('noticeList').innerHTML=(notices||[]).map(n=>`<article class="notice-item"><span class="badge notice-badge">공지</span><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.content)}</p></article>`).join('');
  renderHot();render();
  const requested=new URLSearchParams(location.search).get('event');
  if(requested&&allEvents.some(e=>e.id===requested))setTimeout(()=>openEvent(requested),0);
}
function renderHot(){
  const hot=[...allEvents].filter(e=>Number(e.hot_score||0)>0).sort((a,b)=>Number(b.hot_score||0)-Number(a.hot_score||0)||new Date(b.created_at)-new Date(a.created_at)).slice(0,4);
  hotSection.hidden=hot.length===0;
  hotList.innerHTML=hot.map(e=>cardMarkup(e,{hot:true})).join('');
}
function render(){
  const q=search.value.trim().toLowerCase(),cat=category.value;
  let filtered=allEvents.filter(e=>(cat==='all'||e.category===cat)&&`${e.title} ${e.content} ${rewardLabel(e)} ${e.eligibility||''} ${paymentLabel(e)}`.toLowerCase().includes(q));
  filtered=[...filtered].sort((a,b)=>{
    switch(sort.value){
      case'reward_desc':return rewardSortValue(b)-rewardSortValue(a);
      case'duration_asc':return durationSortValue(a)-durationSortValue(b);
      case'rating_desc':return Number(b.avg_rating||0)-Number(a.avg_rating||0);
      case'deadline_asc':return new Date(a.deadline)-new Date(b.deadline);
      default:return new Date(b.created_at)-new Date(a.created_at);
    }
  });
  count.textContent=`${filtered.length}개`;
  empty.hidden=filtered.length>0;
  list.innerHTML=filtered.map(e=>cardMarkup(e)).join('');
}
async function openEvent(id){
  currentEvent=allEvents.find(e=>e.id===id);if(!currentEvent)return;
  const [{data:comments},{data:myRating},{data:myParticipation}]=await Promise.all([
    client.from('comments_with_profiles').select('*').eq('event_id',id).order('created_at',{ascending:true}),
    session?client.from('ratings').select('rating').eq('event_id',id).eq('user_id',session.user.id).maybeSingle():Promise.resolve({data:null}),
    session?client.from('event_participations').select('status').eq('event_id',id).eq('user_id',session.user.id).maybeSingle():Promise.resolve({data:null})
  ]);
  const official=safeHttpUrl(currentEvent.url);
  const secondary=[];
  if(currentEvent.winner_announcement_date)secondary.push(`<div><span>당첨 발표</span><strong>${formatDate(currentEvent.winner_announcement_date)}</strong></div>`);
  if(currentEvent.winner_count!=null)secondary.push(`<div><span>당첨자 수</span><strong>${Number(currentEvent.winner_count).toLocaleString('ko-KR')}명</strong></div>`);
  secondary.push(`<div><span>마감</span><strong>${formatDate(currentEvent.deadline)}</strong></div>`);
  dialogContent.innerHTML=`${currentEvent.image_url?`<img class="dialog-image" src="${escapeHtml(currentEvent.image_url)}" alt="">`:''}<div class="dialog-body">
    <div class="dialog-title-row"><span class="badge">${escapeHtml(currentEvent.category)}</span><span class="deadline">D-${dday(currentEvent.deadline)}</span></div>
    <h2>${escapeHtml(currentEvent.title)}</h2><p class="small">작성자 ${escapeHtml(currentEvent.author_nickname||'익명')}</p>
    <div class="dialog-priority"><div class="detail-highlight reward-highlight"><span>받는 보상</span><strong>${escapeHtml(rewardLabel(currentEvent))}</strong><small>${escapeHtml(paymentLabel(currentEvent))}</small></div><div class="detail-highlight time-highlight"><span>귀찮음 · 예상시간</span><strong>${escapeHtml(durationLabel(currentEvent))}</strong></div></div>
    <section class="eligibility-box"><h3>참여 자격요건</h3><p>${escapeHtml(currentEvent.eligibility||'등록된 자격요건이 없습니다.')}</p></section>
    <div class="secondary-meta">${secondary.join('')}</div>
    <section class="participation-box"><div><h3>이 이벤트, 어떻게 할까요?</h3>${participationSummary(currentEvent)}</div>${session?`<div class="participation-actions"><button class="btn cooking ${myParticipation?.status==='cooking'?'selected':''}" data-status="cooking">🍳 취사중</button><button class="btn completed ${myParticipation?.status==='completed'?'selected':''}" data-status="completed">✅ 쌀먹완료</button></div>`:'<p><a class="text-link" href="auth.html">로그인</a>하면 취사 상태를 저장할 수 있습니다.</p>'}</section>
    <p class="dialog-description">${escapeHtml(currentEvent.content)}</p>${official?`<a class="btn link" href="${escapeHtml(official)}" target="_blank" rel="noopener">공식 이벤트 페이지</a>`:''}
    <section class="rating-box"><h3>이 이벤트에 밥 주기</h3><div>${riceDisplay(currentEvent.avg_rating)} <span class="small">${currentEvent.rating_count||0}명 평가</span></div>${session?`<div id="ricePicker" class="rice-picker">${Array.from({length:10},(_,i)=>{const v=(i+1)/2;return `<button class="rice-option ${Number(myRating?.rating)===v?'active':''}" data-rating="${v}" title="밥 ${v}개">${riceIcons(v)}<span>${v}</span></button>`}).join('')}</div>`:'<p class="muted">로그인하면 평가할 수 있습니다.</p>'}</section>
    <section class="comments-box"><h3>댓글 ${comments?.length||0}</h3><div class="comment-list">${(comments||[]).map(c=>`<article class="comment"><div class="comment-head"><strong>${escapeHtml(c.nickname||'익명')}</strong><span class="small">${new Date(c.created_at).toLocaleString('ko-KR')}</span></div><p>${escapeHtml(c.content)}</p>${session&&(session.user.id===c.user_id)?`<button class="btn danger" data-comment-delete="${c.id}">삭제</button>`:''}</article>`).join('')||'<p class="muted">첫 댓글을 남겨보세요.</p>'}</div>${session?`<form id="commentForm" class="comment-form"><textarea id="commentContent" rows="3" maxlength="1000" required placeholder="자유롭게 의견을 남겨주세요."></textarea><button class="btn primary">댓글 등록</button></form>`:'<p><a class="text-link" href="auth.html">로그인</a> 후 댓글을 작성할 수 있습니다.</p>'}</section>
  </div>`;
  dialog.showModal();bindDialogActions(myParticipation?.status||null);
}
function bindDialogActions(currentStatus){
  dialogContent.querySelectorAll('[data-status]').forEach(button=>button.addEventListener('click',async()=>{
    const status=button.dataset.status;
    let error;
    if(currentStatus===status){({error}=await client.from('event_participations').delete().eq('event_id',currentEvent.id).eq('user_id',session.user.id));}
    else {({error}=await client.from('event_participations').upsert({event_id:currentEvent.id,user_id:session.user.id,status},{onConflict:'event_id,user_id'}));}
    if(error)return alert(error.message);
    const id=currentEvent.id;await load();openEvent(id);
  }));
  document.getElementById('ricePicker')?.addEventListener('click',async e=>{const b=e.target.closest('[data-rating]');if(!b)return;const rating=Number(b.dataset.rating);const {error}=await client.from('ratings').upsert({event_id:currentEvent.id,user_id:session.user.id,rating},{onConflict:'event_id,user_id'});if(error)return alert(error.message);const id=currentEvent.id;await load();openEvent(id)});
  document.getElementById('commentForm')?.addEventListener('submit',async e=>{e.preventDefault();const value=document.getElementById('commentContent').value.trim();const {error}=await client.from('comments').insert({event_id:currentEvent.id,user_id:session.user.id,content:value});if(error)return alert(error.message);openEvent(currentEvent.id)});
  dialogContent.querySelectorAll('[data-comment-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('댓글을 삭제하시겠습니까?'))return;const {error}=await client.from('comments').delete().eq('id',b.dataset.commentDelete);if(error)return alert(error.message);openEvent(currentEvent.id)}));
}
function cardClick(e){const c=e.target.closest('[data-id]');if(c)openEvent(c.dataset.id)}
list.addEventListener('click',cardClick);hotList.addEventListener('click',cardClick);
search.addEventListener('input',render);category.addEventListener('change',render);sort.addEventListener('change',render);
document.getElementById('dialogClose').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
load();
