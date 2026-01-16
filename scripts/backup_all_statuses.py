import requests
import os
from datetime import datetime
import html2text

# 配置
MASTODON_INSTANCE = "" # 替换为你的 Mastodon 实例域名
ACCOUNT_ID = "" # 替换为你的账户 ID
BACKUP_DIR = "content"  # content 目录
EXCLUDE_REPLIES = False  # 是否排除回复
EXCLUDE_REBLOGS = False  # 是否排除转嘟
MAX_ID = ""  # 可选：往历史方向获取，获取 ID 小于此值的动态（用于向下翻页）
MIN_ID = ""  # 可选：从此处开始往最新方向获取，获取 ID 大于此值的动态（注意：max_id 和 min_id 互斥，不能同时填入）
PINNED = False  # 是否仅获取置顶动态
LIMIT = 40  # 每页限制数量，默认为 40

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
    # 检查 max_id 和 min_id 是否同时被设置
    if MAX_ID and MIN_ID:
        print("错误：max_id 和 min_id 不能同时填入，请只填一个。")
        print("- max_id: 往历史方向获取（向下翻页）")
        print("- min_id: 从此处往最新方向获取（向上翻页）")
        return
    
    # 根据配置构建 URL 参数
    exclude_reblogs_param = "true" if EXCLUDE_REBLOGS else "false"
    exclude_replies_param = "true" if EXCLUDE_REPLIES else "false"
    pinned_param = "true" if PINNED else "false"
    
    # 构建 URL 参数
    params = f"limit={LIMIT}&exclude_reblogs={exclude_reblogs_param}&exclude_replies={exclude_replies_param}&pinned={pinned_param}"
    if MAX_ID:
        params += f"&max_id={MAX_ID}"
    if MIN_ID:
        params += f"&min_id={MIN_ID}"
    
    next_url = f"{API_BASE_URL}?{params}"
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
                if EXCLUDE_REBLOGS and is_reblog:
                    continue

                # 根据配置决定是否过滤回复
                is_reply = status.get('in_reply_to_id') is not None
                if EXCLUDE_REPLIES and is_reply:
                    continue

                # 如果是回复，但不是回复给自己，根据配置决定是否过滤
                if is_reply and status.get('in_reply_to_account_id') != ACCOUNT_ID:
                    if EXCLUDE_REPLIES:
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
                        # 如果使用了 min_id，需要更新 min_id 而不是使用 API 返回的 max_id
                        # 从返回的最后一个 status 中提取最新的 ID 作为下一次的 min_id
                        if MIN_ID and statuses:
                            last_status_id = statuses[-1]['id']
                            # 重新构建包含更新的 min_id 的参数
                            base_params = f"limit={LIMIT}&exclude_reblogs={exclude_reblogs_param}&exclude_replies={exclude_replies_param}&pinned={pinned_param}"
                            next_url = f"{API_BASE_URL}?{base_params}&min_id={last_status_id}"
                        # 如果使用了 max_id，直接使用 API 返回的 Link header 中的 next_url（已包含正确的 max_id）
                        
        except requests.exceptions.RequestException as e:
            print(f"请求出错：{e}")
            break
    
    print(f"\n备份完成。共处理了 {processed_count} 条新动态。")

if __name__ == "__main__":
    backup_statuses()