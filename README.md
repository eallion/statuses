# Mastodon Statuses 搜索项目

基于 FlexSearch 的轻量级 Web 应用，用于搜索 Markdown 文件内容。

## 功能特点

- 全文搜索：支持中文和英文内容的全文搜索
- 密码认证：访问前需要输入密码保护
- Markdown 支持：自动处理 Markdown 文件并转换为 JSON 数据
- 响应式设计：支持桌面和移动设备
- 标签系统：支持文档标签和分类
- 美观界面：现代化的用户界面设计

## 技术架构

- 前端：HTML, CSS, JavaScript
- 搜索引擎：FlexSearch
- 构建工具：Node.js 脚本
- 部署：静态网站托管 (Vercel, Netlify, Cloudflare Pages)

## 使用方法

### 构建项目

```bash
npm run build
```

该命令会处理 content 目录中的 Markdown 文件，并生成搜索数据到 public 目录。

### 本地开发

```bash
# 设置环境变量（可选）
export SEARCH_PASSWORD=your_password

# 构建并启动
npm run dev
```

构建项目并在本地启动开发服务器（默认密码：eallion）。

### 本地预览

```bash
npm run serve
```

在本地启动一个静态文件服务器来预览构建后的网站。

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `SEARCH_PASSWORD` | 访问密码 | `eallion` |

## 部署

### Vercel

1. 连接 GitHub 仓库到 Vercel
2. 设置环境变量：
   - `SEARCH_PASSWORD`：设置你的访问密码
3. 构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`public`

### Cloudflare Pages

1. 连接 Git 仓库到 Cloudflare Pages
2. 设置环境变量：
   - `SEARCH_PASSWORD`：设置你的访问密码
3. 构建设置：
   - 构建命令：`npm run build`
   - 构建输出目录：`public`

### Netlify

1. 连接 Git 仓库到 Netlify
2. 设置环境变量：
   - `SEARCH_PASSWORD`：设置你的访问密码
3. 构建设置：
   - 构建命令：`npm run build`
   - 发布目录：`public`

> 注意：如果是 Fork 的仓库，需要修改 `src/index.html` 中的：
> - Cloudflare Turnstile 的 SiteKey
> - Cloudflare Analytics 的 Tracking ID

## 安全说明

- 密码在前端验证，适合防止随意访问，但无法防止有技术背景的用户绕过
- 如需更安全的保护，建议结合 Cloudflare Access 或类似服务
- 默认密码为 `eallion`，请务必在生产环境更改

## 目录结构

```
project/
├── content/           # Markdown 文件目录
├── public/            # 构建输出目录
├── scripts/           # 构建脚本目录
│   └── build.js      # 主构建脚本
├── src/              # 源文件目录
│   ├── index.html    # 主页模板
│   ├── favicon.ico   # 网站图标
│   └── robots.txt    # 爬虫配置
├── package.json       # 项目配置文件
└── README.md         # 项目说明文件
```

## 许可证

MIT

---

🎉 **轻量、高效、智能的 Markdown 搜索解决方案！**
