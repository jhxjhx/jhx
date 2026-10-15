'use strict';
const $ = id => document.getElementById(id);
let mode = 'login';
function message(text) { $('msg').textContent = text; }
function setMode(next) {
  mode = next;
  $('pageTitle').textContent = ({login:'登录',register:'注册',reset:'找回密码',recovery:'设置新密码'})[mode];
  $('submitBtn').textContent = ({login:'登录',register:'注册',reset:'发送重置邮件',recovery:'保存新密码'})[mode];
  $('nicknameGroup').hidden = mode !== 'register';
  $('emailGroup').hidden = mode === 'recovery';
  $('passwordGroup').hidden = mode === 'reset';
  $('email').required = mode !== 'recovery';
  $('password').required = mode !== 'reset';
  $('password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  $('nickname').required = mode === 'register';
  message('');
}
async function refreshAccount() {
  const u = await JHX.user();
  $('account').hidden = !u;
  $('authForm').hidden = !!u && mode !== 'recovery';
  if (u) {
    const p = await JHX.profile();
    $('nicknameEdit').value = p.nickname;
    $('bio').value = p.bio;
    $('userInfo').textContent = '已登录：' + p.nickname;
    $('account').hidden = mode === 'recovery';
    if (p.avatar_path) $('avatarPreview').src = await JHX.image(p.avatar_path);
    else $('avatarPreview').removeAttribute('src');
  }
}
async function action(button, fn) {
  button.disabled = true;
  try { await fn(); } catch(e) { message(e.message || '操作失败，请稍后再试。'); }
  finally { button.disabled = false; }
}
$('authForm').addEventListener('submit', e => {
  e.preventDefault();
  action($('submitBtn'), async () => {
    const email = $('email').value.trim(), password = $('password').value;
    const redirectTo = new URL('login.html', location.href).href;
    if (mode === 'register') {
      JHX.checked(await JHX.db().auth.signUp({email,password,options:{data:{nickname:$('nickname').value.trim()},emailRedirectTo:redirectTo}}));
      message('注册申请已提交。请查看邮箱中的验证邮件；如果已注册，请直接登录。');
    } else if (mode === 'reset') {
      JHX.checked(await JHX.db().auth.resetPasswordForEmail(email,{redirectTo}));
      message('如果该邮箱可用，将收到密码重置邮件。请检查收件箱和垃圾邮件。');
    } else if (mode === 'recovery') {
      JHX.checked(await JHX.db().auth.updateUser({password}));
      mode = 'login'; await refreshAccount(); message('密码已更新。');
    } else {
      JHX.checked(await JHX.db().auth.signInWithPassword({email,password}));
      await refreshAccount(); message('登录成功。');
    }
    $('password').value = '';
  });
});
$('saveProfile').onclick = () => action($('saveProfile'), async () => {
  const u = await JHX.requireUser();
  const nickname = $('nicknameEdit').value.trim();
  if (!nickname || nickname.length > 30) throw new Error('昵称需为 1–30 字。');
  JHX.checked(await JHX.db().from('profiles').update({nickname,bio:$('bio').value.trim()}).eq('id',u.id));
  await refreshAccount(); message('资料已同步至云端。');
});
$('avatarFile').onchange = () => action($('saveProfile'), async () => {
  const file = $('avatarFile').files[0]; if (!file) return;
  const u = await JHX.requireUser(), old = await JHX.profile(), path = await JHX.upload(file);
  try { JHX.checked(await JHX.db().from('profiles').update({avatar_path:path}).eq('id',u.id)); }
  catch(e) { await JHX.db().storage.from('community-images').remove([path]); throw e; }
  if (old.avatar_path) await JHX.db().storage.from('community-images').remove([old.avatar_path]);
  await refreshAccount(); message('头像已同步。');
});
$('logout').onclick = () => action($('logout'), async () => {
  JHX.checked(await JHX.db().auth.signOut({scope:'local'}));
  setMode('login'); await refreshAccount(); message('已退出此设备。');
});
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
(async () => {
  // Read the recovery marker before the auth library consumes the callback hash.
  const callbackType = new URLSearchParams(location.hash.slice(1)).get('type');
  if (callbackType === 'recovery' || callbackType === 'invite') setMode('recovery');
  try {
    JHX.db().auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') setMode('recovery');
      setTimeout(() => refreshAccount().catch(e => message(e.message)),0);
    });
    await refreshAccount();
  } catch(e) { message(e.message); }
})();
