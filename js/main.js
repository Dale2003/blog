document.addEventListener('DOMContentLoaded', () => {
    // 获取博客列表容器
    const blogList = document.getElementById('blogList');

    // 获取博客文章列表
    fetchBlogPosts()
        .then(posts => {
            // 清空加载中的提示
            blogList.innerHTML = '';
            
            // 按日期排序（最新的文章排在前面）
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // 渲染每篇博客的卡片
            posts.forEach(post => {
                const postCard = createPostCard(post);
                blogList.appendChild(postCard);
            });
        })
        .catch(error => {
            blogList.innerHTML = `<div class="error">加载博客列表时出错: ${error.message}</div>`;
            console.error('加载博客列表时出错:', error);
        });
});

// 获取博客文章列表
async function fetchBlogPosts() {
    try {
        const response = await fetch('/posts/index.json');
        if (!response.ok) {
            throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('获取博客列表时出错:', error);
        return [];
    }
}

// 创建博客卡片元素
function createPostCard(post) {
    const card = document.createElement('article');
    card.className = 'blog-card';
    
    // 使用默认图片，如果文章没有提供缩略图
    const thumbnailUrl = post.thumbnail || 'images/default-thumbnail.jpg';
    
    card.innerHTML = `
        <img src="${thumbnailUrl}" alt="${post.title}">
        <div class="blog-card-content">
            <h2>${post.title}</h2>
            <div class="blog-card-date">${formatDate(post.date)}</div>
            <p class="blog-card-excerpt">${post.excerpt || '暂无摘要'}</p>
            <a href="post.html?id=${post.id}" class="read-more">阅读全文 &rarr;</a>
        </div>
    `;
    
    return card;
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