import requests
import os
from datetime import datetime
import time
import urllib.parse

def fetch_and_save_mastodon_posts():
    # 基础API URL
    base_url = "https://[mastodon.instance]/api/v1/accounts/[account::id]/statuses"
    
    # 初始参数（首次请求不带max_id）
    params = {
        'limit': 40,
        'exclude_replies': 'true',      # 排除回复
        'exclude_reblogs': 'true'       # 排除转发
    }
    
    # 计数器
    page = 1
    total_statuses = 0
    has_more = True  # 添加标志变量控制循环
    
    while has_more:
        # 构建请求URL
        query_string = urllib.parse.urlencode(params)
        url = f"{base_url}?{query_string}"
        print(f"正在请求第 {page} 页: {url}")
        
        # 发送GET请求
        try:
            response = requests.get(url, timeout=10)
        except Exception as e:
            print(f"请求失败: {e}")
            time.sleep(5)  # 等待后重试
            continue
            
        if response.status_code != 200:
            print(f"请求失败，状态码: {response.status_code}")
            print(f"响应内容: {response.text[:200]}")
            has_more = False
            break
            
        try:
            statuses = response.json()
        except Exception as e:
            print(f"解析JSON失败: {e}")
            has_more = False
            break
            
        # 如果没有数据，停止循环
        if not statuses:
            print("没有更多数据，停止请求")
            has_more = False
            break
            
        # 处理当前页的状态
        count = 0
        for status in statuses:
            count += 1
            # 解析日期
            try:
                created_at = datetime.strptime(status['created_at'], "%Y-%m-%dT%H:%M:%S.%fZ")
                date_path = created_at.strftime("%Y/%m/%d")
            except Exception as e:
                print(f"解析日期失败: {e}")
                continue
                
            # 创建目录
            os.makedirs(date_path, exist_ok=True)
            
            # 文件路径
            file_path = os.path.join(date_path, f"{status['id']}.md")
            
            # 构建内容
            content = status['content']
            
            # 处理媒体附件
            media_attachments = status.get('media_attachments', [])
            for media in media_attachments:
                if media['type'] == 'image':
                    image_url = media['url']
                    content += f"\n![]({image_url})"
            
            # 写入文件
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"已保存: {file_path}")
            except Exception as e:
                print(f"写入文件失败: {e}")
        
        total_statuses += count
        print(f"第 {page} 页处理完成: {count} 条状态, 总计: {total_statuses} 条")
        
        # 更新max_id为当前页最后一条的id（用于下一页请求）
        if statuses:  # 确保有数据
            last_id = statuses[-1]['id']
            params['max_id'] = last_id  # 设置max_id用于下次请求
        
        page += 1
        
        # 添加延迟以避免请求过快
        time.sleep(1)

if __name__ == "__main__":
    fetch_and_save_mastodon_posts()
    print("所有状态已处理完成")