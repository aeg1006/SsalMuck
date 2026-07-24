const {client,showMessage}=window.SSALMUCK;
let user=null,editAuthorId=null;
const form=document.getElementById('eventForm');
const editor=document.getElementById('editorSection');
const loginRequired=document.getElementById('loginRequired');
const status=document.getElementById('userStatus');
const message=document.getElementById('message');
const eventId=document.getElementById('eventId');
const imageInput=document.getElementById('image');
const preview=document.getElementById('imagePreview');
const existing=document.getElementById('existingImageUrl');
const cancel=document.getElementById('cancelEdit');
const fields={
  title:document.getElementById('title'),category:document.getElementById('category'),categoryCustom:document.getElementById('categoryCustom'),
  rewardType:document.getElementById('rewardType'),rewardCustom:document.getElementById('rewardCustom'),rewardAmount:document.getElementById('rewardAmount'),reward:document.getElementById('reward'),
  paymentMethod:document.getElementById('paymentMethod'),paymentMethodCustom:document.getElementById('paymentMethodCustom'),eligibility:document.getElementById('eligibility'),
  durationMinutes:document.getElementById('durationMinutes'),duration:document.getElementById('duration'),deadline:document.getElementById('deadline'),winnerAnnouncementDate:document.getElementById('winnerAnnouncementDate'),winnerCount:document.getElementById('winnerCount'),url:document.getElementById('url'),content:document.getElementById('content')
};
function toggleCustom(select,wrapId,input){
  const show=select.value==='직접입력';
  document.getElementById(wrapId).hidden=!show;
  input.required=show;
  if(!show)input.value='';
}
fields.category.addEventListener('change',()=>toggleCustom(fields.category,'categoryCustomWrap',fields.categoryCustom));
fields.rewardType.addEventListener('change',()=>toggleCustom(fields.rewardType,'rewardCustomWrap',fields.rewardCustom));
fields.paymentMethod.addEventListener('change',()=>toggleCustom(fields.paymentMethod,'paymentCustomWrap',fields.paymentMethodCustom));
function reset(){
  form.reset();eventId.value='';editAuthorId=null;existing.value='';preview.style.display='none';preview.src='';
  document.getElementById('formTitle').textContent='새 이벤트 등록';cancel.hidden=true;
  ['categoryCustomWrap','rewardCustomWrap','paymentCustomWrap'].forEach(id=>document.getElementById(id).hidden=true);
}
imageInput.addEventListener('change',()=>{const f=imageInput.files[0];if(f){preview.src=URL.createObjectURL(f);preview.style.display='block'}});
async function uploadImage(){
  const f=imageInput.files[0];if(!f)return existing.value||null;
  if(f.size>5*1024*1024)throw new Error('이미지는 5MB 이하만 가능합니다.');
  const ext=f.name.split('.').pop().toLowerCase();const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
  const {error}=await client.storage.from('event-images').upload(path,f,{upsert:false,contentType:f.type});if(error)throw error;
  return client.storage.from('event-images').getPublicUrl(path).data.publicUrl;
}
function setSelectOrCustom(select,input,wrapId,value,known){
  if(value&&known.includes(value)){select.value=value;document.getElementById(wrapId).hidden=true;input.required=false;}
  else if(value){select.value='직접입력';input.value=value;document.getElementById(wrapId).hidden=false;input.required=true;}
}
async function init(){
  if(!client){status.textContent='Supabase 설정이 필요합니다.';loginRequired.hidden=false;return}
  const session=await window.SSALMUCK.getSession();user=session?.user||null;
  if(!user){status.textContent='로그인 후 글을 작성할 수 있습니다.';loginRequired.hidden=false;return}
  status.textContent=`${user.email} 계정으로 작성합니다.`;editor.hidden=false;
  const editId=new URLSearchParams(location.search).get('edit');
  if(!editId)return;
  const {data,error}=await client.from('events').select('*').eq('id',editId).maybeSingle();
  if(error||!data)return showMessage(message,'수정할 글을 찾지 못했습니다.','error');
  if(data.author_id!==user.id){const profile=await window.SSALMUCK.getProfile(user.id);if(profile?.role!=='admin')return showMessage(message,'수정 권한이 없습니다.','error')}
  fields.title.value=data.title||'';
  setSelectOrCustom(fields.category,fields.categoryCustom,'categoryCustomWrap',data.category,['금융','앱테크','경품','게임','기타']);
  if(data.reward_type==='직접입력'){fields.rewardType.value='직접입력';fields.rewardCustom.value=data.reward_custom||'';document.getElementById('rewardCustomWrap').hidden=false;fields.rewardCustom.required=true;}
  else setSelectOrCustom(fields.rewardType,fields.rewardCustom,'rewardCustomWrap',data.reward_type,['현금','기프티콘','포인트','상품']);
  fields.rewardAmount.value=data.reward_amount??'';fields.reward.value=data.reward||'';
  setSelectOrCustom(fields.paymentMethod,fields.paymentMethodCustom,'paymentCustomWrap',data.payment_method,['즉시 지급','조건 달성 후 지급','추첨 후 제공','선착순 지급']);
  if(data.payment_method==='직접입력'&&data.payment_method_custom){fields.paymentMethod.value='직접입력';fields.paymentMethodCustom.value=data.payment_method_custom;document.getElementById('paymentCustomWrap').hidden=false;fields.paymentMethodCustom.required=true;}
  fields.eligibility.value=data.eligibility||'';fields.durationMinutes.value=data.duration_minutes??'';fields.duration.value=data.duration||'';
  fields.deadline.value=data.deadline||'';fields.winnerAnnouncementDate.value=data.winner_announcement_date||'';fields.winnerCount.value=data.winner_count??'';fields.url.value=data.url||'';fields.content.value=data.content||'';
  eventId.value=data.id;editAuthorId=data.author_id;existing.value=data.image_url||'';
  if(data.image_url){preview.src=data.image_url;preview.style.display='block'}
  document.getElementById('formTitle').textContent='이벤트 수정';cancel.hidden=false;
}
form.addEventListener('submit',async e=>{
  e.preventDefault();
  try{
    const image_url=await uploadImage();
    const categoryValue=fields.category.value==='직접입력'?fields.categoryCustom.value.trim():fields.category.value;
    const rewardTypeValue=fields.rewardType.value;
    const paymentValue=fields.paymentMethod.value;
    if(!categoryValue)throw new Error('카테고리를 입력해주세요.');
    const payload={
      title:fields.title.value.trim(),category:categoryValue,
      reward_type:rewardTypeValue,reward_custom:rewardTypeValue==='직접입력'?fields.rewardCustom.value.trim():null,
      reward_amount:fields.rewardAmount.value===''?null:Number(fields.rewardAmount.value),reward:fields.reward.value.trim(),
      payment_method:paymentValue,payment_method_custom:paymentValue==='직접입력'?fields.paymentMethodCustom.value.trim():null,
      eligibility:fields.eligibility.value.trim(),duration_minutes:fields.durationMinutes.value===''?null:Number(fields.durationMinutes.value),
      duration:fields.duration.value.trim()||null,deadline:fields.deadline.value,winner_announcement_date:fields.winnerAnnouncementDate.value||null,winner_count:fields.winnerCount.value===''?null:Number(fields.winnerCount.value),url:fields.url.value.trim()||null,
      content:fields.content.value.trim(),image_url,author_id:eventId.value?(editAuthorId||user.id):user.id
    };
    const query=eventId.value?client.from('events').update(payload).eq('id',eventId.value):client.from('events').insert(payload);
    const {error}=await query;if(error)throw error;
    showMessage(message,eventId.value?'글을 수정했습니다.':'글을 등록했습니다.');reset();setTimeout(()=>location.href='mypage.html',600);
  }catch(err){showMessage(message,err.message,'error')}
});
cancel.addEventListener('click',()=>location.href='write.html');init();
