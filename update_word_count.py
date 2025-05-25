#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import re
import sys
import glob
import PyPDF2

# 博客目录的路径
BLOG_DIR = os.path.dirname(os.path.abspath(__file__))
POSTS_DIR = os.path.join(BLOG_DIR, 'posts')
INDEX_JSON_PATH = os.path.join(POSTS_DIR, 'index.json')

def count_words_in_markdown(file_path):
    """计算Markdown文件中的字数，类似JS中的countWords函数"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 移除前言部分（通常以"前言："开头的部分）
        content = re.sub(r'^前言：.*?\n\n', '', content, flags=re.DOTALL)
        
        # 移除Markdown标记和特殊字符
        # 移除代码块
        content = re.sub(r'```[\s\S]*?```', '', content)
        # 移除行内代码
        content = re.sub(r'`.*?`', '', content)
        # 移除链接
        content = re.sub(r'\[.*?\]\(.*?\)', '', content)
        # 移除图片
        content = re.sub(r'!\[.*?\]\(.*?\)', '', content)
        # 保留粗体内容
        content = re.sub(r'\*\*(.*?)\*\*', r'\1', content)
        # 保留斜体内容
        content = re.sub(r'\*(.*?)\*', r'\1', content)
        # 移除标题符号
        content = re.sub(r'#', '', content)
        # 移除HTML标签
        content = re.sub(r'<.*?>', '', content)
        # 移除特殊字符和空白
        content = re.sub(r'[=\-\|]', '', content)
        
        # 计算字数（中文和英文单词）
        # 对于中文，直接计算字符数
        # 对于英文，按照空格分隔计算单词数
        chinese_chars = re.findall(r'[\u4e00-\u9fff]', content)
        english_words = re.findall(r'\b[a-zA-Z]+\b', content)
        
        # 总字数 = 中文字符数 + 英文单词数
        word_count = len(chinese_chars) + len(english_words)
        
        print(f"Counted {word_count} words in {os.path.basename(file_path)}")
        return word_count
    except Exception as e:
        print(f"Error counting words in {file_path}: {e}")
        return 0

def count_words_in_pdf(file_path):
    """使用PyPDF2库计算PDF文件中的字数"""
    try:
        # 打开PDF文件
        with open(file_path, 'rb') as file:
            # 创建PDF读取器对象
            pdf_reader = PyPDF2.PdfReader(file)
            
            # 获取PDF页数
            num_pages = len(pdf_reader.pages)
            
            # 提取所有页面的文本
            full_text = ""
            for page_num in range(num_pages):
                page = pdf_reader.pages[page_num]
                try:
                    page_text = page.extract_text()
                    if page_text:
                        full_text += page_text
                except Exception as e:
                    print(f"Warning: Failed to extract text from page {page_num+1} of {file_path}: {e}")
            
            # 如果没有提取到文本，使用估算方法
            if not full_text.strip():
                print(f"Warning: Failed to extract any text from {file_path}. Using page-based estimation.")
                # 基于页数估算字数（假设每页平均500字）
                estimated_word_count = num_pages * 500
                # 确保在合理范围内
                word_count = min(max(estimated_word_count, 500), 3000)
                print(f"Estimated {word_count} words for {os.path.basename(file_path)} based on {num_pages} pages")
                return word_count
            
            # 计算中文字符数
            chinese_chars = re.findall(r'[\u4e00-\u9fff]', full_text)
            # 计算英文单词数
            english_words = re.findall(r'\b[a-zA-Z]+\b', full_text)
            
            # 总字数 = 中文字符数 + 英文单词数
            word_count = len(chinese_chars) + len(english_words)
            
            # 如果提取的字数异常少，可能是提取不完整，使用估算
            if word_count < 100 and num_pages > 0:
                print(f"Warning: Extracted too few words ({word_count}) from {file_path}. Using page-based estimation.")
                estimated_word_count = num_pages * 500
                word_count = min(max(estimated_word_count, 500), 3000)
            
            print(f"Counted {word_count} words in {os.path.basename(file_path)} ({num_pages} pages)")
            return word_count
            
    except Exception as e:
        print(f"Error processing PDF {file_path}: {e}")
        # 出错时使用默认值
        return 1000

def update_word_counts():
    """更新index.json文件中的字数统计"""
    try:
        # 读取index.json文件
        with open(INDEX_JSON_PATH, 'r', encoding='utf-8') as f:
            posts = json.load(f)
        
        # 记录更新的文章数量
        updated_count = 0
        
        # 遍历所有文章
        for post in posts:
            content_path = post.get('contentPath', '')
            
            # 跳过没有contentPath的文章
            if not content_path:
                continue
            
            # 转换为绝对路径
            if content_path.startswith('/'):
                content_path = content_path[1:]  # 移除开头的斜杠
            
            absolute_path = os.path.join(BLOG_DIR, content_path)
            
            # 检查文件是否存在
            if not os.path.exists(absolute_path):
                # 尝试查找文件，支持大小写不敏感
                file_name = os.path.basename(content_path)
                dir_path = os.path.dirname(os.path.join(BLOG_DIR, content_path))
                
                # 获取目录中的所有文件
                if os.path.exists(dir_path):
                    files = os.listdir(dir_path)
                    # 尝试查找大小写不敏感的匹配
                    matching_files = [f for f in files if f.lower() == file_name.lower()]
                    if matching_files:
                        absolute_path = os.path.join(dir_path, matching_files[0])
                        print(f"Found alternative case for file: {absolute_path}")
                    else:
                        print(f"Warning: File not found: {absolute_path}")
                        continue
                else:
                    print(f"Warning: Directory not found: {dir_path}")
                    continue
            
            # 根据文件类型计算字数
            if absolute_path.lower().endswith('.md'):
                word_count = count_words_in_markdown(absolute_path)
            elif absolute_path.lower().endswith('.pdf'):
                word_count = count_words_in_pdf(absolute_path)
            else:
                # 不支持的文件类型
                print(f"Unsupported file type: {content_path}")
                continue
            
            # 更新字数统计
            old_count = post.get('wordCount', 0)
            post['wordCount'] = word_count
            
            # 如果字数发生变化，打印信息
            if old_count != word_count:
                print(f"Updated: {post['title']} - {old_count} -> {word_count} words")
                updated_count += 1
        
        # 保存更新后的index.json文件
        with open(INDEX_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(posts, f, ensure_ascii=False, indent=4)
        
        print(f"\n字数统计更新完成！")
        print(f"总文章数: {len(posts)}")
        print(f"更新文章数: {updated_count}")
        
    except Exception as e:
        print(f"Error updating word counts: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("开始更新文章字数统计...")
    update_word_counts()