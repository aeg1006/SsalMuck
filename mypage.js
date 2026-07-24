const {client,escapeHtml,showMessage}=window.SSALMUCK;
let user=null;
const content=document.getElementById('mypageContent'),required=document.getElementById('loginRequired'),message=document.getElementById('message');
function rewardLabel(e){return e.reward||([e.reward_type,e.reward_amount!=null?Number(e.reward_amount).toLocaleString('ko-KR')+'원':''].filter(Boolean).join(' ')||'보상 미정')}
function savedMarkup(e,status){
  return `<article class="saved-event-item"><div><span class="badge">${escapeHtml(e.category||'기타')}</span><h3>${escapeHtml(e.title)}</h3><p><b>${escapeHtml(rewardLabel(e))}</b> · ${escapeHtml(e.duration||((e.duration_minutes!=null)?`약 ${e.duration_minutes}분`:'시간 미정'))}</p><small>마감 ${e.deadline||'-'}</small></div><div class="saved-actions"><a class="btn secondary" href="index.html?event=${e.id}">이벤트 보기</a>${status==='cooking'?`<button class="btn completed" data-participation="completed" data-event="${e.id}">쌀먹 완료</button>`:`<button class="btn cooking" data-participation="cooking" data-event="${e.id}">쌀먹 예정</button>`}<button class="btn danger" data-participation="remove" data-event="${e.id}">목록에서 제거</button></div></article>`;
}
async function load(){
  if(!client)return;
  const session=await window.SSALMUCK.getSession();user=session?.user;
  if(!user){required.hidden=false;return}
  content.hidden=false;document.getElementById('displayEmail').textContent=user.email;
  const profile=await window.SSALMUCK.getProfile(user.id);document.getElementById('nickname').value=profile?.nickname||'';document.getElementById('displayNickname').textContent=profile?.nickname||'닉네임을 설정해주세요';
  const [{data:posts},{count:commentCount},{count:ratingCount},{data:participations}]=await Promise.all([
    client.from('events').select('*').eq('author_id',user.id).order('created_at',{ascending:false}),
    client.from('comments').select('*',{count:'exact',head:true}).eq('user_id',user.id),
    client.from('ratings').select('*',{count:'exact',head:true}).eq('user_id',user.id),
    client.from('event_participations').select('event_id,status,updated_at').eq('user_id',user.id).order('updated_at',{ascending:false})
  ]);
  const eventIds=(participations||[]).map(p=>p.event_id);
  let savedEvents=[];
  if(eventIds.length){const {data}=await client.from('events_with_stats').select('*').in('id',eventIds);savedEvents=data||[]}
  const map=new Map(savedEvents.map(e=>[e.id,e]));
  const cooking=(participations||[]).filter(p=>p.status==='cooking').map(p=>map.get(p.event_id)).filter(Boolean);
  const completed=(participations||[]).filter(p=>p.status==='completed').map(p=>map.get(p.event_id)).filter(Boolean);
  document.getElementById('postStat').textContent=posts?.length||0;document.getElementById('commentStat').textContent=commentCount||0;document.getElementById('ratingStat').textContent=ratingCount||0;
  document.getElementById('cookingCount').textContent=`${cooking.length}개`;document.getElementById('completedCount').textContent=`${completed.length}개`;
  document.getElementById('cookingEvents').innerHTML=cooking.length?cooking.map(e=>savedMarkup(e,'cooking')).join(''):'<p class="muted">예정된 이벤트가 없습니다.</p>';
  document.getElementById('completedEvents').innerHTML=completed.length?completed.map(e=>savedMarkup(e,'completed')).join(''):'<p class="muted">완료한 이벤트가 없습니다.</p>';
  document.getElementById('myPosts').innerHTML=posts?.length?posts.map(e=>`<article class="admin-item"><div><h3>${escapeHtml(e.title)}</h3><p class="muted">${escapeHtml(e.category)} · ${escapeHtml(e.reward)}</p></div><div class="admin-actions"><a class="btn secondary" href="write.html?edit=${e.id}">수정</a><button class="btn danger" data-delete="${e.id}">삭제</button></div></article>`).join(''):'<p class="muted">작성한 글이 없습니다.</p>';
}
document.getElementById('nicknameForm').addEventListener('submit',async e=>{e.preventDefault();const nickname=document.getElementById('nickname').value.trim();if(nickname.length<2)return showMessage(message,'닉네임은 2자 이상 입력해주세요.','error');const {error}=await client.from('profiles').update({nickname}).eq('id',user.id);if(error)return showMessage(message,error.message,'error');document.getElementById('displayNickname').textContent=nickname;showMessage(message,'닉네임을 저장했습니다.')});
document.getElementById('myPosts').addEventListener('click',async e=>{const b=e.target.closest('[data-delete]');if(!b||!confirm('이 글을 삭제하시겠습니까?'))return;const {error}=await client.from('events').delete().eq('id',b.dataset.delete);if(error)return showMessage(message,error.message,'error');load()});
document.getElementById('mypageContent').addEventListener('click',async e=>{const b=e.target.closest('[data-participation]');if(!b)return;const action=b.dataset.participation,event_id=b.dataset.event;let error;if(action==='remove'){({error}=await client.from('event_participations').delete().eq('event_id',event_id).eq('user_id',user.id));}else{({error}=await client.from('event_participations').upsert({event_id,user_id:user.id,status:action},{onConflict:'event_id,user_id'}));}if(error)return showMessage(message,error.message,'error');load()});
document.getElementById('logoutButton').addEventListener('click',async()=>{await client.auth.signOut();location.href='index.html'});
load();
