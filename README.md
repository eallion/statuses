# Mastodon Statuses 搜索项目

这个项目是一个基于 MiniSearch 的轻量级 Web 应用，用于搜索 Markdown 文件内容。

## 功能特点

- 全文搜索：支持中文和英文内容的全文搜索
- Markdown 支持：自动处理 Markdown 文件并转换为 JSON 数据
- 响应式设计：支持桌面和移动设备
- 标签系统：支持文档标签和分类
- 美观界面：现代化的用户界面设计

## 技术架构

- 前端：HTML, CSS, JavaScript
- 搜索引擎：MiniSearch
- 构建工具：Node.js 脚本
- 部署：静态网站托管 (Vercel, Netlify, Cloudflare Pages)

## 使用方法

### 构建项目

```bash
npm run build
```

该命令会处理 content 目录中的 Markdown 文件，并生成搜索数据到 docs 目录。

### 本地开发

```bash
npm run dev
```

构建项目并在本地启动开发服务器。

### 本地预览

```bash
npm run serve
```

在本地启动一个静态文件服务器来预览构建后的网站。

## 部署

### Vercel & Cloudflare Pages

在 Cloudflare Pages 控制台中设置：

- 构建命令：`npm install && npm run build`
- 输出目录：`docs`

## 目录结构

```
project/
├── content/           # Markdown 文件目录
├── docs/              # 构建输出目录
├── scripts/           # 构建脚本目录
├── index.html         # 主页模板
├── package.json       # 项目配置文件
└── README.md          # 项目说明文件
```

## 许可证

MIT

---

🎉 **轻量、高效、智能的 Markdown 搜索解决方案！**
