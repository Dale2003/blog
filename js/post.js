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
        
        // 为所有图片添加点击预览功能
        setupImagePreview(container);
        
        // 渲染数学公式
        if (window.MathJax) {
            MathJax.typeset();
        }
    } catch (error) {
        console.error('渲染Markdown时出错:', error);
        container.innerHTML = `<div class="error">加载文章内容时出错: ${error.message}</div>`;
    }
}

// 设置图片点击预览功能
function setupImagePreview(container) {
    // 获取容器内所有图片
    const images = container.querySelectorAll('img');
    
    // 为每张图片添加点击事件
    images.forEach(img => {
        img.style.cursor = 'pointer'; // 更改鼠标指针为手型，表示可点击
        img.addEventListener('click', function() {
            // 创建全屏预览元素
            showLightbox(this.src, this.alt);
        });
    });
}

// 显示图片预览 lightbox
function showLightbox(imgSrc, imgAlt) {
    // 创建 lightbox 容器
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.style.position = 'fixed';
    lightbox.style.top = '0';
    lightbox.style.left = '0';
    lightbox.style.width = '100%';
    lightbox.style.height = '100%';
    lightbox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    lightbox.style.display = 'flex';
    lightbox.style.justifyContent = 'center';
    lightbox.style.alignItems = 'center';
    lightbox.style.zIndex = '1000';
    lightbox.style.cursor = 'zoom-out';
    
    // 创建图片元素
    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = imgAlt;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.objectFit = 'contain';
    img.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
    
    // 创建关闭按钮
    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '30px';
    closeBtn.style.fontSize = '40px';
    closeBtn.style.color = 'white';
    closeBtn.style.cursor = 'pointer';
    
    // 添加图片标题（如果有）
    if (imgAlt) {
        const caption = document.createElement('div');
        caption.textContent = imgAlt;
        caption.style.position = 'absolute';
        caption.style.bottom = '20px';
        caption.style.width = '100%';
        caption.style.textAlign = 'center';
        caption.style.color = 'white';
        caption.style.padding = '10px';
        caption.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        lightbox.appendChild(caption);
    }
    
    // 将元素添加到 lightbox 容器
    lightbox.appendChild(img);
    lightbox.appendChild(closeBtn);
    
    // 点击 lightbox 或关闭按钮时关闭预览
    lightbox.addEventListener('click', function() {
        document.body.removeChild(lightbox);
    });
    
    // 防止点击图片时关闭 lightbox（只有点击外部区域才关闭）
    img.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // 将 lightbox 添加到页面
    document.body.appendChild(lightbox);
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