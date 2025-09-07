import requests
import os
from datetime import datetime
import html2text

# 配置
MASTODON_INSTANCE = "e5n.cc" # 替换为你的 Mastodon 实例域名
ACCOUNT_ID = "111136231674527355" # 替换为你的账户 ID
BACKUP_DIR = "content"  # content 目录
INCLUDE_REPLIES = True  # 是否包含回复
INCLUDE_REBLOGS = True  # 是否包含转嘟

API_BASE_URL = f"https://{MASTODON_INSTANCE}/api/v1/accounts/{ACCOUNT_ID}/statuses"

def format_to_markdown(status):
    """
    将单个状态对象格式化为包含 YAML front matter 的 Markdown 字符串。
    """
    # 检查是否为回复
    is_reply = status.get('in_reply_to_id') is not None
    
    # 检查是否有媒体附件
    media_attachments = status.get('media_attachments')
    media_count = len(media_attachments) if media_attachments else 0
    
    # 获取标签
    tags = []
    if 'tags' in status and status['tags']:
        tags = [tag['name'] for tag in status['tags']]
    
    # YAML front matter
    markdown_content = "---\n"
    markdown_content += f"id: {status['id']}\n"
    markdown_content += f"date: {status['created_at']}\n"
    markdown_content += f"reply: {str(is_reply).lower()}\n"
    if tags:  # 只有当有标签时才添加
        markdown_content += f"tags: {tags}\n"
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
    # 根据配置决定是否排除转嘟
    exclude_reblogs_param = "false" if INCLUDE_REBLOGS else "true"
    next_url = f"{API_BASE_URL}?limit=40&exclude_reblogs={exclude_reblogs_param}"
    processed_count = 0

    while next_url:
        print(f"正在请求：{next_url}")
        try:
            response = requests.get(next_url)
            response.raise_for_status()
            statuses = response.json()

            if not statuses:
                break

            for status in statuses:
                # 根据配置决定是否过滤转嘟
                is_reblog = status.get('reblog') is not None
                if not INCLUDE_REBLOGS and is_reblog:
                    continue

                # 根据配置决定是否过滤回复
                is_reply = status.get('in_reply_to_id') is not None
                if not INCLUDE_REPLIES and is_reply:
                    continue

                # 如果是回复，但不是回复给自己，根据配置决定是否过滤
                if is_reply and status.get('in_reply_to_account_id') != ACCOUNT_ID:
                    if not INCLUDE_REPLIES:
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
                    print(f"已保存动态：{filepath}")
                else:
                    print(f"文件已存在，跳过：{filepath}")

            # 获取下一页链接
            next_url = None
            if 'Link' in response.headers:
                links = response.headers['Link'].split(',')
                for link in links:
                    if 'rel="next"' in link:
                        next_url = link.split(';')[0].strip('<> ')
                        
        except requests.exceptions.RequestException as e:
            print(f"请求出错：{e}")
            break
    
    print(f"\n备份完成。共处理了 {processed_count} 条新动态。")

if __name__ == "__main__":
    backup_statuses()