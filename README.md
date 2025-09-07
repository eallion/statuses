# Mastodon Statuses Search by Pagefind

一个基于 [Pagefind](https://pagefind.app/) 的轻量级 Web 应用，用于搜索 Markdown 文件内容。特别针对中文内容进行了优化，支持实时搜索和快速响应。

## 备份

Docs：《n8n 之备份 Mastodon 嘟文》

> https://www.eallion.com/n8n-backup-mastodon-statuses/

### Backup History Statuses

```bash
# wget https://raw.githubusercontent.com/eallion/mastodon_statuses/refs/heads/main/backup_all_statuses.py

python scripts/backup_all_statuses.py
```

## 功能特性

- 🔍 **全文搜索**: 支持中文和英文内容的全文搜索
- 📝 **Markdown 支持**: 自动处理 Markdown 文件并转换为 HTML
- ⚡ **智能构建**: 根据文件数量自动选择最优构建模式
- 📱 **响应式设计**: 支持桌面和移动设备
- 🏷️ **标签系统**: 支持文档标签和分类
- 🎨 **美观界面**: 现代化的用户界面设计

## 🧠 智能构建模式

### 📄 独立页面模式（≤ 10 个文件）

- 每个 Markdown 文件生成独立的 HTML 页面
- 更好的 SEO 和直接访问支持
- 适合小型文档集合

### 📦 JSON 合并模式（> 10 个文件）

- 所有 Markdown 内容自动合并为单个 JSON 文件
- 最小化部署文件数量
- 最快的加载速度
- 适合大型文档库

## 项目结构

```
pagefind-markdown-search/
├── content/                 # Markdown 源文件目录
├── docs/                   # 生成的静态网站（部署目录）
├── build.js                # 智能构建脚本
├── index.html              # 主页面模板
├── package.json            # 项目配置
└── README.md               # 项目说明
```

## 快速开始

### 1. 安装依赖

```bash
npm install

#npm install pagefind
```

### 2. 添加 Markdown 文件

在 `content/` 目录下添加你的 Markdown 文件，**支持多级目录结构**：

```
content/
├── template.md              # 模板文件（参考格式）
├── 2024/
│   ├── 01/
│   │   └── 15/
│   │       └── learning-notes.md
│   └── 02/
│       └── 20/
│           └── frontend-tips.md
└── projects/
    └── web-dev/
        └── tutorials/
            └── react-hooks.md
```

Markdown 文件格式（参考 `content/template.md`）：

```markdown
---
title: "文档标题"
date: "2025-01-01"
tags: ["标签 1", "标签 2"]
description: "文档的简短描述"
tags: ["标签 1", "标签 2"]
---

# 这里是文档内容

你的 Markdown 内容...
```

#### Frontmatter 字段说明

**必需字段：**

- `title`: 文档标题
- `date`: 发布日期（格式：YYYY-MM-DD）

**可选字段：**

- `tags`: 标签数组
- `description`: 文档描述

**自定义字段：**
可以添加任何自定义字段，它们会被包含在生成的 HTML 中。

### 3. 构建和运行

```bash
# 构建项目（智能选择构建模式）
npm run build

# 启动本地服务器
npm run serve

# 开发模式（构建 + 启动）
npm run dev
```

然后在浏览器中打开 `http://localhost:3000`

## 🚀 一键部署

### Vercel（推荐）

```bash
# 推送到 GitHub
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main

# 在 vercel.com 连接 GitHub 仓库，自动部署
```

### Cloudflare Pages

- 连接 GitHub 仓库
- 构建命令：`npm install && npm install -g pagefind && npm run build`
- 输出目录：`docs`

### Netlify

- 直接拖拽 `docs` 目录到 netlify.com
- 或连接 GitHub 自动部署

## 🔧 核心优势

1. **📦 最少部署文件** - 智能选择最优构建模式
2. **🚀 极快加载速度** - 单页面应用，无需跳转
3. **🔍 强大搜索功能** - 基于 Pagefind 的高性能搜索
4. **🎯 零配置部署** - 推送即部署
5. **🌐 全平台支持** - 支持所有主流部署平台

## 后续使用

每次添加新的 Markdown 文件到 `content/` 目录后：

```bash
# 本地测试
npm run build
npm run serve

# 推送更新（自动部署）
git add .
git commit -m "添加新文档"
git push
```

## 许可证

MIT License

## 相关链接

- [Pagefind 官方文档](https://pagefind.app/)
- [Markdown 语法指南](https://www.markdownguide.org/)

---

🎉 **轻量、高效、智能的 Markdown 搜索解决方案！**
