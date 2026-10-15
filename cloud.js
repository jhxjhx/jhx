(() => {
  'use strict';
  const config = window.JHX_CONFIG || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url || '') && /^sb_publishable_/.test(config.publishableKey || '');
  let client;
  function db() {
    if (!configured) throw new Error('云端服务尚未连接，请稍后再试。');
    if (!window.supabase) throw new Error('连接组件加载失败，请检查网络后刷新。');
    return client ||= window.supabase.createClient(config.url, config.publishableKey);
  }
  function checked(result) { if (result.error) throw result.error; return result.data; }
  async function user() {
    const result = await db().auth.getUser();
    if (result.error?.name === 'AuthSessionMissingError') return null;
    return checked(result).user;
  }
  async function requireUser() { const u = await user(); if (!u) throw new Error('请先登录。'); return u; }
  async function profile() {
    const u = await requireUser();
    return checked(await db().from('profiles').select('*').eq('id', u.id).single());
  }
  async function upload(file) {
    const u = await requireUser();
    const types = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    if (!types[file.type] || file.size > 2 * 1024 * 1024) throw new Error('请选择不超过 2MB 的 JPG、PNG 或 WebP 图片。');
    const path = `${u.id}/${crypto.randomUUID()}.${types[file.type]}`;
    checked(await db().storage.from('community-images').upload(path, file));
    return path;
  }
  async function image(path) { return checked(await db().storage.from('community-images').createSignedUrl(path, 3600)).signedUrl; }
  window.JHX = { db, checked, user, requireUser, profile, upload, image, configured };
})();
