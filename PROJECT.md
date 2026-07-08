# JHX Music - GitHub Pages 个人音乐网站

> 蒸馏版本，可交接给任何 Agent 直接继续创作

## 项目概览

- **网址**: https://jhxjhx.github.io/jhx/
- **仓库**: github.com/jhxjhx/jhx (main 分支)
- **技术栈**: 纯 HTML+CSS+JS，GitHub Pages 静态托管，PWA 可安装
- **视觉风格**: Apple Music 深色主题 `--bg: #121214, --accent: #fc3c44`
- **用户**: 大一学生 蒋昊熹，智能制造专业，喜欢 Hip-Hop/R&B

## 文件结构

```
jhx/
├── index.html              # 主页: hero+音乐卡片+社区板块
├── music-daily.html         # 每日推荐: 视频背景+液态玻璃播放按钮
├── music-home.html          # 个人主页: 头像/粉丝/常听专辑/最近播放
├── music-singles.html       # 单曲列表(18首): 悬停banner背景+鼠标视差
├── music-playlists.html     # 收藏专辑(8张): 画廊轮播→详情态歌曲列表
├── community.html           # 社区: 留言板+动态广场(图文+评论)
├── login.html               # 登录: 6位数字ID+密码
├── manifest.json            # PWA 配置(name="我", icon=icon-192.png)
├── sw.js                    # Service Worker 离线缓存
├── vercel.json              # Vercel serverless 代理配置
├── api/community.js         # Vercel 函数: 代持GH_TOKEN读写community-data.json
├── community-data.json      # 社区帖子云端存储
├── albums_data.json         # 8张专辑142首歌数据(网易云API抓取)
├── avatar.jpg               # Kirby卡比头像
├── daily-bg.mp4             # 每日推荐页背景视频
├── banner-{0-7}.mp4         # 收藏专辑banner视频(0=Blonde...7=SOS)
├── icon-192.png, icon-512.png  # PWA图标(青蛙)
├── fan1.jpg, fan2.jpg       # 粉丝头像
├── home-cover.jpg           # 主页卡片封面
├── playlists-cover.jpg      # blond专辑封面(Frank Ocean)
├── singles-cover.jpg        # 单曲页封面
├── hero-avatar.jpg          # 备用头像
└── _shared_*.txt, _update_*.py  # 临时辅助文件(可忽略)
```

## 页面功能详解

### 1. index.html (主页)
- **Hero**: 头像(avatar.jpg)+名字(contenteditable可编辑)+登录状态(p#loginStatus)
- **推荐音乐**: 链接 music-singles.html 的卡片
- **收藏专辑**: 链接 music-playlists.html 的卡片(封面=playlists-cover.jpg)
- **每日推荐**: 链接 music-daily.html 的卡片(封面=daily-cover.jpg)
- **社区板块**: 留言板+动态广场(两卡片，点击进community.html)
- **我板块**: 个人主页+我的动态(占位，点进music-home.html)
- **安装按钮**: 右下角红色浮动按钮，监听beforeinstallprompt事件
- **底部导航**: 我/音乐/社区/计划 四个tab

### 2. music-playlists.html (收藏专辑 - 最复杂的页面)
- **画廊态**: 全屏banner背景(封面模糊 or 视频banner-N.mp4)，封面居中~1/6屏幕，左右箭头切换(键盘←→)，专辑名+歌手在下方
- **详情态**: 封面滑至左上角(缩小)，歌曲列表右侧淡入，简介左下方
- **Banner机制**: JS setBanner(idx)依次尝试banner-N.mp4→banner-N.jpg→封面模糊fallback。手机(width<768)跳过视频
- **黑名单构建问题**: 旧API `/api/album` 返回404，须用 `/api/v1/album/{id}`
- **歌曲**: 每首点击跳转 `https://music.163.com/#/song?id={id}`
- **数据源**: albums_data.json (fetch加载)，含8张专辑description字段

### 3. music-singles.html (单曲列表)
- 18首单曲，悬停时全页背景渐变为该曲封面banner+鼠标跟随视差(30px/20px)
- bg-banner div覆盖半透明遮罩，data-cover属性存封面URL
- 返回按钮: `location.href='index.html'` (PWA下不能用history.back())

### 4. music-daily.html (每日推荐)
- 全屏视频背景 autoplay muted loop playsinline
- 歌名居中大号，歌手/专辑小字
- Play按钮: 液态玻璃效果(lg-wrapper+lg-effect+lg-tint+lg-shine层+SVG滤镜)
- SVG滤镜: feTurbulence+feDisplacementMap+feSpecularLighting(#glass-distortion)

### 5. music-home.html (个人主页)
- 头像+名字(可编辑，localStorage)
- 粉丝弹窗modal(2用户: 躺在衣柜VIP.6+稻谷二甲苯)
- 关注: 点击浮现toast"无法查看"后淡出
- 常听专辑: 4张随机选(带封面)
- 最近播放: 5首随机选(带时间)

### 6. community.html (社区)
- 双tab: 留言板/动态广场
- 留言板: 简单文字，所有人可见
- 动态广场: 文字+图片(≤500KB，base64)+评论
- **云端存储**: 读raw.githubusercontent.com，写POST Vercel API
- Vercel地址: `https://jhx.vercel.app/api/community`
- 数据结构: `{msgboard:[{authorId,authorName,text,time}], posts:[{authorId,authorName,text,image,time,comments:[{authorId,authorName,text}]}]}`

### 7. login.html (登录)
- 6位数字ID + 密码(至少4位)注册/登录
- 密码简单哈希: `h(p+uid)` = 字符循环移位累加取绝对值hex
- 存储在localStorage: `jhx_id`(当前登录ID), `jhx_users`(所有用户), `jhx_name`

## 关键技术约定

### PWA 注意事项
- **返回按钮**: 必须用 `location.href='xxx'` 不能 `history.back()` (standalone模式无history)
- **安装**: beforeinstallprompt事件仅Chrome/Edge触发，按钮2秒后强制显示，无deferredPrompt时弹引导说明
- **manifest.json**: name="我", start_url="/jhx/", display=standalone

### Git 推送
- **优先**: ghproxy.net 代理 (频繁宕机)
- **备用**: 直连 `https://jhxjhx:{token}@github.com/jhxjhx/jhx.git`
- **Token**: `<请向用户索要 GitHub Token>`
- **注意**: token不能在HTML/JS中硬编码(GitHub push protection拦截)
- **GitHub Pages**: 构建偶尔errored，`git commit --allow-empty`+push触发重建

### 网易云API
- 专辑/歌曲详情: `https://music.163.com/api/v1/album/{id}` (不是旧 `/api/album`)
- 响应: album字段含description/name/artist/picUrl，songs顶层数组，歌手在ar字段

### 编码处理
- Edit工具对中文HTML大文件常匹配失败，用Python regex+Bash脚本
- 出错时先 `git checkout` 恢复再重做

## 遗留问题
1. **跨设备**: CloudBase全方式失败(邮箱登录SDK/API报INVALID_USERNAME，匿名登录报network error)，最终用localStorage本地存储
2. **Vercel**: 已部署但API端点可能未正常工作，需在Vercel控制台确认部署状态并设置环境变量GH_TOKEN
3. **社区真正跨设备**: 需Vercel代理正常工作后，多人读取同一community-data.json实现

## 给接手 Agent 的建议
- 修改HTML前先 `Read` 文件(哪怕3行)，否则Edit会报错
- 中文内容用Python Script(bash heredoc)而非Edit工具处理，避免编码匹配失败
- 每次改动后立即commit+push，push失败切备用链接
- 询问用户前读MEMORY.md了解偏好(用户对长思考零容忍，回复必须秒回)
