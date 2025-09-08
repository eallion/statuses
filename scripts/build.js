const fs = require('fs');
const path = require('path');

// 配置
const CONTENT_DIR = './content';
const DOCS_DIR = './docs';

// 确保 docs 目录存在
if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// 解析 Markdown frontmatter
function parseFrontmatter(content) {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    let frontmatter = {};
    let markdown = content;
    
    if (match) {
        const frontmatterText = match[1];
        markdown = match[2];
        
        frontmatterText.split(/\r?\n/).forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > -1) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                
                // 特殊处理 date 字段，保持原始值不变
                if (key === 'date') {
                    frontmatter[key] = value;
                    return;
                }
                
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

// 扫描并解析 Markdown 文件
function scanMarkdownFiles(dir) {
    const markdownFilePaths = getAllMarkdownFiles(dir);
    const markdownFiles = [];
    
    markdownFilePaths.forEach(filePath => {
        try {
            const fullPath = path.join(dir, filePath);
            const content = fs.readFileSync(fullPath, 'utf-8');
            const { frontmatter, content: markdownContent } = parseFrontmatter(content);
            
            // 获取文件夹路径和文件名
            const folderPath = path.dirname(filePath);
            const filename = path.basename(filePath);
            
            // 从文件名中提取标题（如果 frontmatter 中没有标题）
            let title = frontmatter.title || filename.replace('.md', '');
            // 如果标题看起来像数字 ID，使用文件路径中的信息
            if (/^\d+$/.test(title)) {
                // 从文件路径中提取更多信息作为标题
                const pathParts = filePath.split(path.sep);
                if (pathParts.length >= 3) {
                    // 使用年/月/日 + ID 作为标题
                    title = pathParts.slice(0, 3).join('/') + '/' + title;
                }
            }
            
            markdownFiles.push({
                folderPath: folderPath,
                filename: filename,
                fullPath: fullPath,
                title: title,
                frontmatter: frontmatter,
                date: frontmatter.date || '',
                tags: frontmatter.tags || [],
                content: markdownContent.trim()
            });
        } catch (error) {
            console.error(`❌ 解析文件 ${filePath} 时出错:`, error.message);
        }
    });
    
    return markdownFiles;
}

// 为 MiniSearch 生成搜索数据
function buildSearchData(markdownFiles) {
    const outputDir = path.join(__dirname, '../docs');
    
    // 按日期排序（先过滤掉没有日期的文件）
    const filesWithDate = markdownFiles.filter(file => file.frontmatter && file.frontmatter.date);
    const filesWithoutDate = markdownFiles.filter(file => !file.frontmatter || !file.frontmatter.date);
    
    // 为有日期的文件按日期排序
    filesWithDate.sort((a, b) => new Date(a.frontmatter.date) - new Date(b.frontmatter.date));
    
    // 合并所有文件（有日期的排在前面）
    const sortedFiles = [...filesWithDate, ...filesWithoutDate];
    
    // 生成 search-data.json
    const searchData = sortedFiles.map((file, index) => {
        // 从内容中移除 frontmatter 部分
        let contentWithoutFrontmatter = file.content;
        
        // 确保正确移除 frontmatter
        if (contentWithoutFrontmatter.startsWith('---')) {
            const frontmatterEndIndex = contentWithoutFrontmatter.indexOf('---', 3);
            if (frontmatterEndIndex !== -1) {
                contentWithoutFrontmatter = contentWithoutFrontmatter.substring(frontmatterEndIndex + 3).trim();
            }
        }
        
        // 移除 Markdown 格式的图片 ![]() 和 ![alt](url)
        contentWithoutFrontmatter = contentWithoutFrontmatter.replace(/!\[.*?\]\(.*?\)/g, '');
        
        // 确保正确提取 title 和 date 字段
        const title = file.frontmatter && file.frontmatter.id ? file.frontmatter.id.toString() : 
            (file.frontmatter && file.frontmatter.title ? file.frontmatter.title : file.title);

        // 优先使用 frontmatter 中的 date 字段，保持原始值
        let date = file.frontmatter && file.frontmatter.date ? file.frontmatter.date : '';
        
        // 如果日期是 ISO 格式，则转换为 "Sep 06, 2025 14:39:07" 格式
        if (date && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(date)) {
            const dateObj = new Date(date);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[dateObj.getUTCMonth()];
            const day = String(dateObj.getUTCDate()).padStart(2, '0');
            const year = dateObj.getUTCFullYear();
            const hours = String(dateObj.getUTCHours()).padStart(2, '0');
            const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
            const seconds = String(dateObj.getUTCSeconds()).padStart(2, '0');
            date = `${month} ${day}, ${year} ${hours}:${minutes}:${seconds}`;
        }

        return {
            id: index,
            title: title,
            date: date,
            tags: Array.isArray(file.frontmatter && file.frontmatter.tags) ? file.frontmatter.tags : [],
            content: contentWithoutFrontmatter
        };
    });
    
    fs.writeFileSync(path.join(outputDir, 'search-data.json'), JSON.stringify(searchData, null, 2));
}

// 复制主页
function copyMainFiles() {
    console.log('\n复制主要文件...');
    
    if (fs.existsSync('index.html')) {
        const targetPath = path.join(DOCS_DIR, 'index.html');
        fs.copyFileSync('index.html', targetPath);
        console.log(`✓ 复制：index.html -> ${targetPath}`);
    }
    
    if (fs.existsSync('favicon.ico')) {
        const targetPath = path.join(DOCS_DIR, 'favicon.ico');
        fs.copyFileSync('favicon.ico', targetPath);
        console.log(`✓ 复制：favicon.ico -> ${targetPath}`);
    }
}

// 主函数
async function main() {
    try {
        console.log('🔍 开始扫描 Markdown 文件...');
        const markdownFiles = scanMarkdownFiles(CONTENT_DIR);
        console.log(`📄 找到 ${markdownFiles.length} 个 Markdown 文件`);

        if (markdownFiles.length === 0) {
            console.log('⚠️ 未找到任何 Markdown 文件');
            return;
        }

        // 构建搜索数据
        buildSearchData(markdownFiles);
        
        // 复制主页
        copyMainFiles();
        
        console.log('✅ 构建完成！');
        console.log(`📂 输出目录：${path.resolve(DOCS_DIR)}`);
    } catch (error) {
        console.error('❌ 构建过程中出错：', error);
        process.exit(1);
    }
}

// 调用主函数
main();
