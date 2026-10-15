# 云端账号与社区部署

当前状态（2026-10-15）：已连接 jhx 项目（nplaxznzyynxvjkamlza），schema.sql 已执行，不要重复运行。数据库账号隔离测试、发布频率限制、匿名读取拒绝测试通过，安全 Advisor 无告警。网站尚未上线，邮箱回调地址与 SMTP 需在控制台配置；完整注册/双设备测试仍待完成。

## 1. 创建项目

在 https://supabase.com/dashboard 创建你自己的项目，选择合适地区并妥善保存数据库密码。数据库密码、secret key、service_role key 均不能写进仓库或发到聊天。共享 GPT 账号下，建议自行管理后台授权。

## 2. 初始化数据库

打开该项目 SQL Editor，复制 `supabase/schema.sql` 全文执行一次。脚本以事务执行，适用于空项目。失败时保存完整错误，不要关闭 RLS。已有数据的项目需另写迁移，不要直接重复运行此脚本。

表：profiles（公开昵称、头像、简介）、posts（帖子和留言）、comments（评论）、reports（举报）。邮箱与密码由 Supabase Auth 管理，不放入公开资料表。帖子和资料仅登录用户可读；其他用户不能替你发帖或删除内容。举报仅后台管理员可读。图片桶为私有桶，页面使用有效期一小时的临时链接，过期后刷新即可。

## 3. 认证配置

Authentication 中启用 Email / Password 与邮箱确认，将密码最短长度设为至少 8 位。URL Configuration 的 Site URL 设置为 `https://jhxjhx.github.io/jhx/`，Redirect URLs 加入精确地址 `https://jhxjhx.github.io/jhx/login.html`。若使用测试站，另加它的精确回调地址。

配置自己的 SMTP 并检查邮件投递。默认测试邮件服务的收件人限制和额度不适合公开注册。参考官方文档确认当前限制。公开发布前启用服务支持的注册防滥用配置；若启用 CAPTCHA，需要进一步在前端集成对应组件与 captchaToken，当前版未包含 CAPTCHA。

## 4. 填公开配置

在项目 Connect 或 API Keys 页面找到项目 URL 与 **publishable key**（`sb_publishable_` 开头），填写 `cloud-config.js`。本实现不接受 secret/service_role key，旧 anon JWT 格式也未启用。公开 key 可出现在前端；安全边界是 SQL 的 RLS 和列级授权。

## 5. 发布与旧接口退役

将改动部署到 GitHub Pages。新版不再读写 community-data.json，历史帖子原文件保留，不自动认领旧作者。旧六位 ID 本地账号需用邮箱重新注册；旧密码摘要不导入。新版清理旧的登录 ID，但不主动删除本地用户备份。

同时将 `api/community.js` 的停用版本部署到 **实际承载 jhx.vercel.app 的 Vercel 项目**；该项目可能使用 D:/projects/jhx-api，不能仅凭更新 Pages 仓库认为旧端点已停用。核实返回 HTTP 410 后，在 Vercel 移除 GH_TOKEN，并按需吊销原 Token。

## 6. 管理与存储

首版管理员通过 Supabase Dashboard 查看 reports、删除违规评论/帖子和封禁账号，不在前端存管理员秘密。删除帖子会级联删除评论和举报；Dashboard 删除记录不会自动清理 Storage 图片，需要另外清理。前端删除自己的帖子会尝试清理图片；中断或网络失败可能留下孤立图片，需要定期检查。每文件最大 2MB、帖子正文 2000 字、评论 500 字；每账号每分钟各类社区写入最多 5 次。当前尚无每账号图片总量配额或图片内容审核，公开大规模运营前应补齐，并在后台监控存储及流量用量。

资料中的昵称、简介、头像对其他已登录用户可见，请勿填写联系方式或其他私密信息。同一设备浏览器会保持一个当前账号；退出仅退出此设备，不影响其他设备。

## 7. 必须完成的真实验收

- 浏览器 A 注册邮箱 A，确认邮件、登录、修改昵称/简介/头像；另一设备登录 A 后资料一致。
- 浏览器 B 注册邮箱 B；A 与 B 各发帖子和评论，刷新能互相看到。退出 B 后不能继续写入。
- B 无法通过 API 伪造 author_id=A、更新 A 资料或删除 A 帖子/评论；匿名请求不得读资料、帖子、图片。
- 正文输入 `<img src=x onerror=alert(1)>` 应按文字显示；验证空白内容、超长内容、超限图片与频繁发布被拒绝。
- 测试忘记密码邮件、新密码保存、退出/重新登录、过期会话、跨标签页退出、图片临时链接过期。
- 同时发布不会覆盖其他用户帖子；更多内容和评论可分页加载。新增内容时分页可能有重复或偏移，刷新可恢复。
- 管理员在后台能看到举报并处置；旧 Vercel 端点返回 410；旧 PWA 更新后不再读取旧认证代码。

没有完成以上实测前，不应宣称已上线或权限已验证。国内各网络访问 Supabase/CDN 与邮件的可用性也需在目标设备实测。

官方参考：
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
