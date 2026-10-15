'use strict';
const $ = id => document.getElementById(id);
let me, kind = 'square', page = 0, loading = false;
const size = 20;
function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function button(text, fn) {
  const b = node('button',text); b.type='button';
  b.onclick = () => task(b,fn); return b;
}
async function task(b,fn) {
  b.disabled=true;
  try { await fn(); } catch(e) { $('status').textContent=e.message || '操作失败'; }
  finally { b.disabled=false; }
}
function author(p) { return p?.nickname || '已注销用户'; }
async function renderPost(p) {
  const card=node('article',undefined,'post-box');
  card.append(node('strong',author(p.profiles)),node('p',p.body,'content'),node('small',new Date(p.created_at).toLocaleString()));
  if (p.image_path) {
    const img=node('img'); img.alt='帖子图片'; img.loading='lazy'; img.className='post-img';
    try { img.src=await JHX.image(p.image_path); card.append(img); } catch { card.append(node('p','图片暂时无法加载')); }
  }
  const actions=node('div',undefined,'actions');
  if (p.author_id===me.id) actions.append(button('删除',async () => {
    if (!confirm('删除这条内容及其评论？')) return;
    const removed=JHX.checked(await JHX.db().from('posts').delete().eq('id',p.id).select('id'));
    if (!removed.length) throw new Error('内容不存在或无权删除。');
    card.remove();
    if (p.image_path) {
      const result=await JHX.db().storage.from('community-images').remove([p.image_path]);
      if(result.error) $('status').textContent='帖子已删除，但图片清理失败，请联系管理员。';
    }
  }));
  else actions.append(button('举报',async () => {
    const reason=prompt('举报原因（最多300字）'); if (!reason?.trim()) return;
    JHX.checked(await JHX.db().from('reports').insert({post_id:p.id,reason:reason.trim()}));
    $('status').textContent='举报已提交，等待管理员处理。';
  }));
  const comments=node('div'); let offset=0;
  const loadComments=button('查看评论', async () => {
    const rows=JHX.checked(await JHX.db().from('comments').select('id,body,author_id,created_at,profiles(nickname)').eq('post_id',p.id).order('created_at').order('id').range(offset,offset+19));
    rows.forEach(c => {
      const row=node('p'); row.append(node('strong',author(c.profiles)+ '：'),node('span',c.body));
      if(c.author_id===me.id) row.append(button('删除',async () => {
        JHX.checked(await JHX.db().from('comments').delete().eq('id',c.id)); row.remove();
      }));
      comments.append(row);
    });
    offset+=rows.length; loadComments.hidden=rows.length<20; loadComments.textContent='更多评论';
    if(!rows.length && offset===0) comments.append(node('p','暂无评论'));
  });
  actions.append(loadComments); card.append(actions,comments);
  const form=node('form'); const input=node('input'); input.placeholder='写评论…';input.maxLength=500;input.required=true;
  const send=node('button','发送');send.type='submit';form.append(input,send);
  form.onsubmit=e=>{e.preventDefault();task(send,async()=>{
    const body=input.value.trim(); if(!body) return;
    JHX.checked(await JHX.db().from('comments').insert({post_id:p.id,body}));
    input.value='';comments.replaceChildren();offset=0;loadComments.hidden=false;loadComments.textContent='查看评论';
    $('status').textContent='评论已发送，点击查看评论。';
  });};
  card.append(form);return card;
}
async function load(reset=true) {
  if(loading) return; loading=true;
  try {
    if(reset) page=0;
    const rows=JHX.checked(await JHX.db().from('posts').select('id,body,image_path,author_id,created_at,profiles(nickname)').eq('kind',kind).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*size,(page+1)*size-1));
    const cards=await Promise.all(rows.map(renderPost));
    if(reset) $('feed').replaceChildren(); $('feed').append(...cards);
    if(reset&&!rows.length) $('feed').append(node('p','还没有内容，分享你的第一条动态吧。'));
    $('more').hidden=rows.length<size;page++;$('status').textContent='';
  } finally {loading=false;}
}
$('publish').onsubmit=e=>{e.preventDefault();task($('send'),async()=>{
  const body=$('body').value.trim(),file=$('image').files[0];
  if(!body&&!file) throw new Error('请填写内容或选择图片。');
  let path=null;
  if(file) path=await JHX.upload(file);
  try {JHX.checked(await JHX.db().from('posts').insert({kind,body,image_path:path}));}
  catch(e){if(path) await JHX.db().storage.from('community-images').remove([path]);throw e;}
  $('body').value='';$('image').value=''; await load();
});};
$('refresh').onclick=()=>task($('refresh'),()=>load());
$('more').onclick=()=>task($('more'),()=>load(false));
document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>task(b,async()=>{
  if(loading)return;kind=b.dataset.kind;
  document.querySelectorAll('[data-kind]').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));
  await load();
}));
(async()=>{
  try {
    me=await JHX.user();
    if(!me){$('status').textContent='请先登录后参与社区。';return;}
    $('loggedIn').hidden=false;await load();
    JHX.db().auth.onAuthStateChange((event,session)=>{
      if(!session || session.user.id!==me.id){$('loggedIn').hidden=true;$('feed').replaceChildren();location.href='login.html';}
    });
  }catch(e){$('status').textContent=e.message;}
})();
