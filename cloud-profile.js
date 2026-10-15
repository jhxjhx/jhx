'use strict';
(async()=>{
  const status=document.getElementById('loginStatus');
  if(status){status.textContent='登录 / 注册';status.onclick=()=>location.href='login.html';}
  // Retire local IDs; they must never authorize a cloud operation.
  localStorage.removeItem('jhx_id');
  try {
    const u=await JHX.user(); if(!u)return;
    const p=await JHX.profile();
    for(const id of ['heroName','profileName']){const el=document.getElementById(id);if(el)el.textContent=p.nickname;}
    if(status){status.textContent='管理账号';status.onclick=()=>location.href='login.html';}
    const bio=document.getElementById('profileIdDisplay');if(bio)bio.textContent=p.bio || '已登录云端账号';
    const avatar=document.getElementById('profileAvatar');
    if(avatar&&p.avatar_path) avatar.style.backgroundImage=`url("${await JHX.image(p.avatar_path)}")`;
  }catch(e){if(status)status.title=e.message;}
})();
