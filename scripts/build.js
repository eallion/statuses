const fs = require('fs');
const path = require('path');

// 配置
const CONTENT_DIR = './content';
const DOCS_DIR = './public';

// 读取环境变量，默认密码
const SEARCH_PASSWORD = process.env.SEARCH_PASSWORD || 'eallion';

// 确保 public 目录存在
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
                
                // 特殊处理 reply 字段，转换为布尔值
                if (key === 'reply') {
                    frontmatter[key] = value === 'true';
                    return;
                }
                
                // 处理 tags 字段
                if (key === 'tags') {
                    frontmatter[key] = parseTags(value);
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

// 解析 tags 的专用函数，支持多种格式
function parseTags(tagsValue) {
    // 去除首尾空格
    tagsValue = tagsValue.trim();
    
    // 如果是数组格式 [tag1, tag2, ...]
    if (tagsValue.startsWith('[') && tagsValue.endsWith(']')) {
        // 移除方括号
        tagsValue = tagsValue.slice(1, -1);
        // 分割并清理每个 tag
        return tagsValue.split(',')
            .map(tag => tag.trim().replace(/^["']|["']$/g, '')) // 移除首尾的引号
            .filter(tag => tag.length > 0); // 过滤空 tag
    }
    
    // 检查是否包含逗号分隔
    if (tagsValue.includes(',')) {
        // 逗号分隔格式：tag1, tag2, ...
        return tagsValue.split(',')
            .map(tag => tag.trim().replace(/^["']|["']$/g, '')) // 移除首尾的引号
            .filter(tag => tag.length > 0); // 过滤空 tag
    }
    
    // 检查是否被引号包围的整体字符串
    if ((tagsValue.startsWith('"') && tagsValue.endsWith('"')) || 
        (tagsValue.startsWith("'") && tagsValue.endsWith("'"))) {
        // 整体是一个被引号包围的字符串，尝试按空格分割
        tagsValue = tagsValue.slice(1, -1);
        if (tagsValue.includes(' ')) {
            return tagsValue.split(' ')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
        } else {
            // 单个 tag
            return [tagsValue];
        }
    }
    
    // 默认按空格分隔处理
    return tagsValue.split(' ')
        .map(tag => tag.trim().replace(/^["']|["']$/g, '')) // 移除首尾的引号
        .filter(tag => tag.length > 0); // 过滤空 tag
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

// 简单的中文分词函数
function tokenizeChinese(text) {
    if (!text) return [];
    
    // 移除 HTML 标签和 Markdown 格式
    text = text.replace(/<[^>]*>/g, '');
    text = text.replace(/[#*_[\]()`~\-+={}\\|:;'",.<>?/]/g, ' ');
    
    // 按空格和常见标点符号分割
    const tokens = text.split(/[\s\u3000\p{P}\p{S}]+/u).filter(token => token.length > 0);
    
    // 对于中文，进一步拆分为字符级别
    const result = [];
    tokens.forEach(token => {
        // 如果包含中文字符
        if (/[\u4e00-\u9fff]/.test(token)) {
            // 添加整个词
            result.push(token);
            
            // 添加词的各个字符
            for (let i = 0; i < token.length; i++) {
                result.push(token[i]);
            }
            
            // 添加双字符组合
            for (let i = 0; i < token.length - 1; i++) {
                result.push(token.substr(i, 2));
            }
            
            // 添加三字符组合
            for (let i = 0; i < token.length - 2; i++) {
                result.push(token.substr(i, 3));
            }
            
            // 添加四字符组合
            for (let i = 0; i < token.length - 3; i++) {
                result.push(token.substr(i, 4));
            }
        } else {
            // 非中文词直接添加
            result.push(token);
        }
    });
    
    return [...new Set(result)]; // 去重
}

// 为 FlexSearch 生成搜索数据
function buildSearchData(markdownFiles) {
    const outputDir = path.join(__dirname, '../public');
    
    // 按日期排序（先过滤掉没有日期的文件）
    const filesWithDate = markdownFiles.filter(file => file.frontmatter && file.frontmatter.date);
    const filesWithoutDate = markdownFiles.filter(file => !file.frontmatter || !file.frontmatter.date);
    
    // 为有日期的文件按日期排序
    filesWithDate.sort((a, b) => new Date(a.frontmatter.date) - new Date(b.frontmatter.date));
    
    // 合并所有文件（有日期的排在前面）
    const sortedFiles = [...filesWithDate, ...filesWithoutDate];
    
    // 分离回复和非回复内容
    const nonReplyFiles = sortedFiles.filter(file => 
        !file.frontmatter || file.frontmatter.reply !== true);
    const replyFiles = sortedFiles.filter(file => 
        file.frontmatter && file.frontmatter.reply === true);
    
    // 生成普通搜索数据（不包含回复）
    const searchData = nonReplyFiles.map((file, index) => {
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

        // 获取标签
        const tags = Array.isArray(file.frontmatter && file.frontmatter.tags) ? file.frontmatter.tags : [];
        
        // 生成分词字段
        const searchContent = tokenizeChinese(contentWithoutFrontmatter).join(' ');
        
        // 构建返回对象
        const result = {
            id: index,
            title: title,
            content: contentWithoutFrontmatter,
            date: date,
            searchContent: searchContent
        };
        
        // 只有当 tags 不为空时才添加 tags 和 searchTags 字段
        if (tags.length > 0) {
            result.tags = tags;
            const searchTags = tags.map(tag => tokenizeChinese(tag)).flat().join(' ');
            result.searchTags = searchTags;
        }
        
        return result;
    });
    
    // 生成回复搜索数据
    const replySearchData = replyFiles.map((file, index) => {
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

        // 获取标签
        const tags = Array.isArray(file.frontmatter && file.frontmatter.tags) ? file.frontmatter.tags : [];
        
        // 生成分词字段
        const searchContent = tokenizeChinese(contentWithoutFrontmatter).join(' ');
        
        // 构建返回对象
        const result = {
            id: index,
            title: title,
            content: contentWithoutFrontmatter,
            date: date,
            searchContent: searchContent
        };
        
        // 只有当 tags 不为空时才添加 tags 和 searchTags 字段
        if (tags.length > 0) {
            result.tags = tags;
            const searchTags = tags.map(tag => tokenizeChinese(tag)).flat().join(' ');
            result.searchTags = searchTags;
        }
        
        return result;
    });
    
    // 写入文件
    fs.writeFileSync(path.join(outputDir, 'search-data.json'), JSON.stringify(searchData, null, 0));
    fs.writeFileSync(path.join(outputDir, 'search-data-reply.json'), JSON.stringify(replySearchData, null, 0));
}

// 复制主页
function copyMainFiles() {
    console.log('\n复制主要文件...');
    
    // 确保 public 目录存在
    const PUBLIC_DIR = './public';
    if (!fs.existsSync(PUBLIC_DIR)) {
        fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }
    
    if (fs.existsSync('src/index.html')) {
        const targetPath = path.join(PUBLIC_DIR, 'index.html');
        let content = fs.readFileSync('src/index.html', 'utf-8');
        content = content.replace(/%%SEARCH_PASSWORD%%/g, SEARCH_PASSWORD);
        fs.writeFileSync(targetPath, content);
        console.log(`✓ 复制：src/index.html -> ${targetPath}`);
        console.log(`✓ 注入密码：${SEARCH_PASSWORD}`);
    }
    
    if (fs.existsSync('src/favicon.ico')) {
        const targetPath = path.join(PUBLIC_DIR, 'favicon.ico');
        fs.copyFileSync('src/favicon.ico', targetPath);
        console.log(`✓ 复制：src/favicon.ico -> ${targetPath}`);
    }
    
    if (fs.existsSync('src/robots.txt')) {
        const targetPath = path.join(PUBLIC_DIR, 'robots.txt');
        fs.copyFileSync('src/robots.txt', targetPath);
        console.log(`✓ 复制：src/robots.txt -> ${targetPath}`);
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