const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONTENT_DIR = './content';
const DOCS_DIR = './docs';
const MAX_FILES_BEFORE_MERGE = 10; // 超过 10 个文件时合并为 JSON

// 确保 docs 目录存在
if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// 解析 Markdown frontmatter
function parseFrontmatter(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    let frontmatter = {};
    let markdown = content;
    
    if (match) {
        const frontmatterText = match[1];
        markdown = match[2];
        
        frontmatterText.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > -1) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                
                if (value.startsWith('[') && value.endsWith(']')) {
                    value = value.slice(1, -1).split(',').map(tag => 
                        tag.trim().replace(/"/g, '')
                    );
                } else {
                    value = value.replace(/"/g, '');
                }
                
                frontmatter[key] = value;
            }
        });
    }
    
    return { frontmatter, content: markdown };
}

// 简单的 Markdown 转 HTML 函数
function markdownToHtml(markdown) {
    // 处理标题
    let html = markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        
        // 处理粗体和斜体
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        
        // 处理行内代码
        .replace(/`(.*?)`/gim, '<code>$1</code>')
        
        // 处理图片 - 需要放在链接处理之前，因为语法相似，但更具体
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1">')
        
        // 处理链接
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
        
        // 处理段落
        .replace(/(?:\r\n|\r|\n){2,}/g, '</p><p>')
        .replace(/(?:\r\n|\r|\n)/g, '<br>');

    // 包裹段落
    html = '<p>' + html + '</p>';
    
    return html;
}

// 递归扫描目录，获取所有 Markdown 文件
function getAllMarkdownFiles(dir) {
    let markdownFiles = [];
    
    function scanDirectory(currentDir, relativePath = '') {
        const items = fs.readdirSync(currentDir);
        
        items.forEach(item => {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // 递归扫描子目录
                const newRelativePath = relativePath ? path.join(relativePath, item) : item;
                scanDirectory(fullPath, newRelativePath);
            } else if (item.endsWith('.md')) {
                // 添加 Markdown 文件（保持相对路径）
                const relativeFilePath = relativePath ? path.join(relativePath, item) : item;
                markdownFiles.push(relativeFilePath);
            }
        });
    }
    
    if (fs.existsSync(dir)) {
        scanDirectory(dir);
    }
    
    return markdownFiles;
}

// 确保目录存在
function ensureDirectoryExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// 轻量级构建：智能选择构建模式
function buildLightweight() {
    console.log('🚀 开始轻量级构建...\n');
    
    if (!fs.existsSync(CONTENT_DIR)) {
        console.log('content 目录不存在，跳过处理...');
        return;
    }
    
    // 使用递归扫描获取所有 Markdown 文件
    const markdownFiles = getAllMarkdownFiles(CONTENT_DIR);
    
    console.log(`找到 ${markdownFiles.length} 个 Markdown 文件`);
    
    // 打印文件列表和目录结构
    if (markdownFiles.length > 0) {
        console.log('📁 文件结构：');
        markdownFiles.forEach(file => {
            console.log(`  - ${file}`);
        });
        console.log('');
    }
    
    if (markdownFiles.length > MAX_FILES_BEFORE_MERGE) {
        console.log(`📦 文件数量超过 ${MAX_FILES_BEFORE_MERGE}，使用 JSON 合并模式`);
        buildWithJSON(markdownFiles);
    } else {
        console.log('📄 文件数量较少，使用独立页面模式');
        buildWithPages(markdownFiles);
    }
    
    // 无论哪种模式，都生成用于 Pagefind 索引的 HTML 文件
    buildSearchablePages(markdownFiles);
}

// 为 Pagefind 生成可搜索的 HTML 页面
function buildSearchablePages(markdownFiles) {
    const htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>{{title}}</title>
    <meta name="description" content="{{description}}">
    <meta name="keywords" content="{{tags}}">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .back-link { color: #007bff; text-decoration: none; margin-bottom: 20px; display: inline-block; }
        .meta { color: #666; margin-bottom: 20px; }
        .tag { background: #e9ecef; padding: 2px 8px; border-radius: 3px; margin-right: 5px; }
        .file-path { font-size: 0.8rem; color: #888; margin-bottom: 10px; }
        .content img { width: auto; max-width: 100%; height: auto; }
    </style>
</head>
<body>
    <div class="file-path">📁 {{file_path}}</div>
    <h1>{{title}}</h1>
    <div class="meta">
        发布时间：{{date}}<br>
        原始链接：<a href="https://e5n.cc/@eallion/{{title}}" target="_blank">https://e5n.cc/@eallion/{{title}}</a>
        {{tags_html}}
    </div>
    <div class="content">{{content}}</div>
</body>
</html>`;
    
    markdownFiles.forEach(file => {
        const filePath = path.join(CONTENT_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const { frontmatter, content: markdown } = parseFrontmatter(content);
        
        const htmlContent = markdownToHtml(markdown);
        
        const tagsHtml = Array.isArray(frontmatter.tags) && frontmatter.tags.length > 0 
            ? `<br>标签：${frontmatter.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}`
            : '';
        
        const finalHtmlContent = htmlTemplate
            .replace(/{{title}}/g, frontmatter.title || path.basename(file, '.md'))
            .replace(/{{description}}/g, frontmatter.description || '')
            .replace(/{{date}}/g, frontmatter.date || new Date().toISOString().split('T')[0])
            .replace(/{{tags}}/g, Array.isArray(frontmatter.tags) ? frontmatter.tags.join(', ') : '')
            .replace(/{{tags_html}}/g, tagsHtml)
            .replace(/{{content}}/g, htmlContent)
            .replace(/{{file_path}}/g, file);
        
        // 生成输出文件路径，保持目录结构
        const outputFile = path.join(DOCS_DIR, file.replace('.md', '.html'));
        
        // 确保输出目录存在
        ensureDirectoryExists(outputFile);
        
        fs.writeFileSync(outputFile, finalHtmlContent, 'utf-8');
        
        console.log(`✓ 生成用于搜索的页面：${outputFile}`);
    });
}

// 模式 1：JSON 合并模式（文件多时使用）
function buildWithJSON(markdownFiles) {
    const documents = [];
    
    markdownFiles.forEach((file, index) => {
        const filePath = path.join(CONTENT_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const { frontmatter, content: markdown } = parseFrontmatter(content);
        
        documents.push({
            id: index + 1,
            filename: file,
            title: frontmatter.title || path.basename(file, '.md'),
            date: frontmatter.date || new Date().toISOString().split('T')[0],
            tags: frontmatter.tags || [],
            description: frontmatter.description || '',
            content: markdown,
            path: file  // 添加文件路径信息
        });
        
        console.log(`✓ 处理：${file}`);
    });
    
    // 生成合并的 JSON 数据页面
    const jsonPageContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>文档数据</title>
    <style>body{display:none;}</style>
</head>
<body>
    ${documents.map(doc => `
        <article data-id="${doc.id}" data-filename="${doc.filename}" data-path="${doc.path}">
            <h1>${doc.title}</h1>
            <div class="meta">
                <span class="date">${doc.date}</span>
                <span class="tags">${Array.isArray(doc.tags) ? doc.tags.join(' ') : ''}</span>
                <span class="path">${doc.path}</span>
            </div>
            <div class="content">${doc.content}</div>
        </article>
    `).join('\n')}
</body>
</html>`;
    
    // 保存 JSON 数据（用于前端动态加载）
    fs.writeFileSync(path.join(DOCS_DIR, 'documents.json'), JSON.stringify(documents, null, 2));
    
    // 保存合并页面（用于 Pagefind 索引）
    fs.writeFileSync(path.join(DOCS_DIR, 'all-content.html'), jsonPageContent);
    
    console.log('✓ 生成合并文档：all-content.html');
    console.log('✓ 生成 JSON 数据：documents.json');
}

// 模式 2：独立页面模式（文件少时使用）
function buildWithPages(markdownFiles) {
    // 这个模式下只需要生成用于 JSON 模式的页面，搜索页面已经由 buildSearchablePages 处理
    console.log("✓ 独立页面模式：页面将由通用函数生成");
}

// 生成 Pagefind 索引
function generatePagefindIndex() {
    console.log('\n开始生成 Pagefind 索引...');
    
    try {
        // 生成索引
        const command = `npx pagefind --site "docs" --output-subdir "pagefind"`;
        execSync(command, { stdio: 'inherit', cwd: process.cwd() });
        
        console.log('✓ Pagefind 索引生成完成');
        
    } catch (error) {
        console.error('生成 Pagefind 索引时出错：', error.message);
        console.log('\n手动安装 Pagefind:');
        console.log('npm install pagefind --save-dev');
        console.log('\n然后运行：');
        console.log('npx pagefind --site "docs" --output-subdir "pagefind"');
    }
}

// 复制主页
function copyMainFiles() {
    console.log('\n复制主要文件...');
    
    if (fs.existsSync('index.html')) {
        const targetPath = path.join(DOCS_DIR, 'index.html');
        fs.copyFileSync('index.html', targetPath);
        console.log(`✓ 复制：index.html -> ${targetPath}`);
    }
}

// 主函数
function main() {
    try {
        buildLightweight();
        copyMainFiles();
        generatePagefindIndex();
        
        console.log('\n✅ 轻量级构建完成！');
        console.log('\n📊 构建统计：');
        
        const docsFiles = fs.readdirSync(DOCS_DIR);
        const htmlFiles = docsFiles.filter(f => f.endsWith('.html'));
        const hasJson = docsFiles.includes('documents.json');
        
        console.log(`- HTML 文件：${htmlFiles.length} 个`);
        console.log(`- JSON 数据：${hasJson ? '已生成' : '未生成'}`);
        console.log(`- 搜索索引：${docsFiles.includes('pagefind') ? '已生成' : '未生成'}`);
        
        console.log('\n🚀 启动服务器：');
        console.log('npm run serve');
        
    } catch (error) {
        console.error('构建过程中出错：', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = {
    buildLightweight,
    buildWithJSON,
    buildWithPages,
    generatePagefindIndex,
    copyMainFiles,
    main
};