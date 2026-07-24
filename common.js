window.SSALMUCK = (() => {
  const client = window.ssalmuckSupabase;
  const escapeHtml = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const formatDate = date => !date ? '미정' : new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'short',day:'numeric'}).format(new Date(`${date}T00:00:00`));
  const safeHttpUrl = (value='') => { try { const u=new URL(value); return ['http:','https:'].includes(u.protocol)?u.href:''; } catch { return ''; } };
  const showMessage = (element,text,kind='success') => { element.textContent=text; element.className=`notice ${kind}`; element.hidden=false; };
  async function getSession(){ if(!client) return null; const {data}=await client.auth.getSession(); return data.session||null; }
  async function getProfile(userId){ if(!client||!userId)return null; const {data}=await client.from('profiles').select('*').eq('id',userId).maybeSingle(); return data||null; }
  async function updateNav(){
    if(!client)return;
    const session=await getSession();
    document.querySelectorAll('[data-auth-link]').forEach(a=>{ a.textContent=session?'마이페이지':'로그인'; a.href=session?'mypage.html':'auth.html'; });
    document.querySelectorAll('[data-write-link]').forEach(a=>{a.href=session?'write.html':'auth.html';});
    document.querySelectorAll('[data-admin-link]').forEach(async a=>{
      if(!session){a.hidden=true;return;} const profile=await getProfile(session.user.id); a.hidden=profile?.role!=='admin';
    });
  }
  return {client,escapeHtml,formatDate,safeHttpUrl,showMessage,getSession,getProfile,updateNav};
})();
document.addEventListener('DOMContentLoaded',()=>window.SSALMUCK.updateNav());
