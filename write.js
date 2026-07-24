const {client,showMessage}=window.SSALMUCK;
let user=null,editing=null;
const message=document.getElementById('message');
const val=id=>document.getElementById(id).value.trim();

async function load(){
  if(!client)return;
  const session=await window.SSALMUCK.getSession();
  user=session?.user;
  if(!user){document.getElementById('loginRequired').hidden=false;return}
  document.getElementById('editorSection').hidden=false;
  document.getElementById('userStatus').textContent=user.email;
  const id=new URLSearchParams(location.search).get('edit');
  if(id)await loadEdit(id);
}

async function loadEdit(id){
  const {data:e,error}=await client.from('events').select('*').eq('id',id).single();
  if(error)return showMessage(message,error.message,'error');
  if(e.author_id!==user.id)return showMessage(message,'본인이 작성한 글만 수정할 수 있습니다.','error');
  editing=e;
  document.getElementById('eventId').value=e.id;
  document.getElementById('title').value=e.title||'';
  document.getElementById('reward').value=e.reward||'';
  document.getElementById('participationMethod').value=e.participation_method||'';
  document.getElementById('duration').value=e.duration||'';
  document.getElementById('content').value=e.content||'';
  document.getElementById('deadline').value=e.deadline||'';
  document.getElementById('url').value=e.url||'';
  document.getElementById('existingImageUrl').value=e.image_url||'';
  if(e.image_url){const preview=document.getElementById('imagePreview');preview.src=e.image_url;preview.style.display='block'}
  document.getElementById('cancelEdit').hidden=false;
}

async function uploadImage(file){
  if(!file)return document.getElementById('existingImageUrl').value||null;
  if(file.size>5*1024*1024)throw new Error('이미지는 5MB 이하만 가능합니다.');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
  const {error}=await client.storage.from('event-images').upload(path,file);
  if(error)throw error;
  return client.storage.from('event-images').getPublicUrl(path).data.publicUrl;
}

document.getElementById('image').addEventListener('change',e=>{
  const file=e.target.files[0],preview=document.getElementById('imagePreview');
  if(!file){preview.style.display='none';return}
  preview.src=URL.createObjectURL(file);preview.style.display='block';
});

document.getElementById('eventForm').addEventListener('submit',async e=>{
  e.preventDefault();
  try{
    const image_url=await uploadImage(document.getElementById('image').files[0]);
    const payload={
      author_id:user.id,
      title:val('title'),
      category:'기타',
      reward:val('reward'),
      participation_method:val('participationMethod'),
      duration:val('duration'),
      deadline:val('deadline')||null,
      url:val('url')||null,
      image_url,
      content:val('content')
    };
    let id=editing?.id;
    if(editing){
      const {error}=await client.from('events').update(payload).eq('id',id);
      if(error)throw error;
    }else{
      const {data,error}=await client.from('events').insert(payload).select('id').single();
      if(error)throw error;
      id=data.id;
    }
    location.href=`index.html?event=${id}`;
  }catch(err){showMessage(message,err.message,'error')}
});

document.getElementById('cancelEdit').addEventListener('click',()=>location.href='mypage.html');
load();
