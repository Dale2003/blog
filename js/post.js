document.addEventListener('DOMContentLoaded', () => {
    // 获取URL参数中的文章ID
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    
    if (!postId) {
        showError('未找到文章ID，请返回首页');
        return;
    }
    
    // 获取元素
    const postTitle = document.getElementById('postTitle');
    const postDate = document.getElementById('postDate');
    const postContent = document.getElementById('postContent');
    
    // 加载博客文章
    loadBlogPost(postId)
        .then(post => {
            if (!post) {
                showError('未找到该文章');
                return;
            }
            
            // 更新页面标题
            document.title = `${post.title} - 我的博客`;
            
            // 更新文章标题和日期
            postTitle.textContent = post.title;
            postDate.textContent = formatDate(post.date);
            
            // 渲染Markdown内容
            renderMarkdown(post.contentPath, postContent);
        })
        .catch(error => {
            showError(`加载文章时出错: ${error.message}`);
            console.error('加载文章时出错:', error);
        });
});

// 加载博客文章
async function loadBlogPost(postId) {
    try {
        // 先加载博客索引
        const response = await fetch('/posts/index.json');
        if (!response.ok) {
            throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        
        const posts = await response.json();
        // 查找对应ID的文章
        return posts.find(post => post.id === postId);
    } catch (error) {
        console.error('获取博客索引时出错:', error);
        throw error;
    }
}

// 渲染Markdown内容
async function renderMarkdown(contentPath, container) {
    try {
        // 加载Markdown文件
        const response = await fetch(contentPath);
        if (!response.ok) {
            throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        
        const markdown = await response.text();
        // 使用marked.js解析Markdown
        container.innerHTML = marked.parse(markdown);
        
        // 处理代码块，添加语法高亮
        document.querySelectorAll('pre code').forEach(block => {
            if (window.hljs) {
                hljs.highlightBlock(block);
            }
        });
    } catch (error) {
        console.error('渲染Markdown时出错:', error);
        container.innerHTML = `<div class="error">加载文章内容时出错: ${error.message}</div>`;
    }
}

// 显示错误信息
function showError(message) {
    const postContent = document.getElementById('postContent');
    postContent.innerHTML = `<div class="error">${message}</div>`;
    document.getElementById('postTitle').textContent = '出错了';
    document.getElementById('postDate').textContent = '';
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}