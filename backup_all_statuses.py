import requests
import os
from datetime import datetime
import html2text

# 配置
API_BASE_URL = "https://mastodn.local/api/v1/accounts/[ACCOUNT_ID]/statuses"
ACCOUNT_ID = ""
BACKUP_DIR = "mastodon_backup"

def format_to_markdown(status):
    """
    将单个状态对象格式化为包含 YAML front matter 的 Markdown 字符串。
    """
    # 检查是否为回复
    is_reply = status.get('in_reply_to_id') is not None
    
    # 检查是否有媒体附件
    media_attachments = status.get('media_attachments')
    media_count = len(media_attachments) if media_attachments else 0
    
    # YAML front matter
    markdown_content = "---\n"
    markdown_content += f"id: {status['id']}\n"
    markdown_content += f"date: {status['created_at']}\n"
    markdown_content += f"reply: {str(is_reply).lower()}\n"
    markdown_content += f"media_attachments: {media_count}\n"
    markdown_content += "---\n\n"
    
    # HTML 内容转换为 Markdown
    h = html2text.HTML2Text()
    h.body_width = 0  # 避免换行，保持原始格式
    content = h.handle(status.get('content', ''))
    markdown_content += content + "\n"

    # 媒体附件
    if media_attachments:
        for media in media_attachments:
            # 确保 description 不是 None
            description = media.get('description', '')
            markdown_content += f"![{description}]({media['url']})\n"
            
    return markdown_content

def backup_statuses():
    """
    备份符合条件的 Mastodon 动态为 Markdown 文件。
    """
    next_url = f"{API_BASE_URL}?limit=40&exclude_reblogs=true"
    processed_count = 0

    while next_url:
        print(f"正在请求: {next_url}")
        try:
            response = requests.get(next_url)
            response.raise_for_status()
            statuses = response.json()

            if not statuses:
                break

            for status in statuses:
                # 过滤条件：不是转嘟
                is_reblog = status.get('reblog') is not None
                if is_reblog:
                    continue

                # 过滤条件：如果in_reply_to_id不为空，in_reply_to_account_id必须是自己
                if status.get('in_reply_to_id') is not None and status.get('in_reply_to_account_id') != ACCOUNT_ID:
                    continue

                # 获取日期信息，用于创建目录
                created_at = datetime.strptime(status['created_at'], '%Y-%m-%dT%H:%M:%S.%fZ')
                year = created_at.strftime('%Y')
                month = created_at.strftime('%m')
                day = created_at.strftime('%d')
                
                # 创建文件路径
                dir_path = os.path.join(BACKUP_DIR, year, month, day)
                os.makedirs(dir_path, exist_ok=True)
                
                filename = f"{status['id']}.md"
                filepath = os.path.join(dir_path, filename)

                # 检查文件是否已存在，防止重复下载
                if not os.path.exists(filepath):
                    markdown_content = format_to_markdown(status)
                    
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(markdown_content)
                    
                    processed_count += 1
                    print(f"已保存动态: {filepath}")
                else:
                    print(f"文件已存在，跳过: {filepath}")

            # 获取下一页链接
            next_url = None
            if 'Link' in response.headers:
                links = response.headers['Link'].split(',')
                for link in links:
                    if 'rel="next"' in link:
                        next_url = link.split(';')[0].strip('<> ')
                        
        except requests.exceptions.RequestException as e:
            print(f"请求出错: {e}")
            break
    
    print(f"\n备份完成。共处理了 {processed_count} 条新动态。")

if __name__ == "__main__":
    backup_statuses()
