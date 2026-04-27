# 部署到 Vercel

整个站点是纯静态的，三个文件：

```
site/
├── index.html         单页主体
├── los-design.skill   可下载安装包
└── vercel.json        Vercel 配置（headers / cleanUrls）
```

## 方式 A：拖拽（最快，0 命令）

1. 打开 https://vercel.com/new
2. 把整个 `site/` 文件夹直接拖到页面上
3. 点 **Deploy**，几秒钟后拿到一个 `xxx.vercel.app` 域名

## 方式 B：CLI（推荐，方便后续改）

```bash
# 一次性安装
npm i -g vercel

cd /Users/bytedance/.../outputs/site

# 第一次部署：会让你登录 + 选 scope，按默认走就行
vercel

# 上线生产环境（会给你正式 URL）
vercel --prod
```

## 自定义域名

部署成功后在 Vercel 控制台：
**Project → Settings → Domains → Add**
填上你的域名（比如 `losdesign.dev`），跟着提示在域名注册商那里加 CNAME 记录就行。
