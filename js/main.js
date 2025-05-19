document.addEventListener('DOMContentLoaded', () => {
    // 获取博客列表容器
    const blogList = document.getElementById('blogList');
    // 获取搜索输入框和按钮
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    // 获取排序选择框
    const sortSelect = document.getElementById('sortSelect');
    // 获取加载更多按钮容器和按钮
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const loadMoreButton = document.getElementById('loadMoreButton');
    
    // 声明一个变量来存储所有文章
    let allPosts = [];
    // 当前显示的文章
    let currentPosts = [];
    // 每页显示的文章数量
    const postsPerPage = 9;
    // 当前页码
    let currentPage = 1;
    // 当前排序方式
    let currentSortMethod = 'date-desc';
    // 当前搜索关键词
    let currentSearchTerm = '';

    // 获取博客文章列表
    fetchBlogPosts()
        .then(posts => {
            // 保存所有文章
            allPosts = posts;
            
            // 初始加载时按日期（最新）排序并渲染第一页文章
            loadPostsPage(1, 'date-desc', '');
        })
        .catch(error => {
            blogList.innerHTML = `<div class="error">加载博客列表时出错: ${error.message}</div>`;
            console.error('加载博客列表时出错:', error);
        });
    
    // 搜索按钮点击事件
    searchButton.addEventListener('click', () => {
        searchPosts();
    });
    
    // 搜索输入框回车事件
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchPosts();
        }
    });
    
    // 排序选择框变化事件
    sortSelect.addEventListener('change', () => {
        currentSortMethod = sortSelect.value;
        // 重新加载第一页
        loadPostsPage(1, currentSortMethod, currentSearchTerm);
    });
    
    // 加载更多按钮点击事件
    loadMoreButton.addEventListener('click', () => {
        // 加载下一页
        loadNextPage();
    });
    
    // 搜索文章函数
    function searchPosts() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        currentSearchTerm = searchTerm;
        // 重新加载第一页
        loadPostsPage(1, currentSortMethod, searchTerm);
    }
    
    // 加载下一页文章
    function loadNextPage() {
        currentPage++;
        loadPostsPage(currentPage, currentSortMethod, currentSearchTerm, true);
    }
    
    // 加载指定页码的文章
    function loadPostsPage(page, sortMethod, searchTerm, append = false) {
        // 重置当前页码
        if (!append) {
            currentPage = page;
            // 清空文章列表
            blogList.innerHTML = '';
        }
        
        // 过滤文章
        let filteredPosts = searchTerm ? 
            filterPosts(allPosts, searchTerm) : 
            [...allPosts];
        
        // 排序文章
        filteredPosts = sortPosts(filteredPosts, sortMethod);
        
        // 计算分页
        const totalPosts = filteredPosts.length;
        const startIndex = (page - 1) * postsPerPage;
        const endIndex = startIndex + postsPerPage;
        const postsToShow = filteredPosts.slice(startIndex, endIndex);
        
        // 没有结果时显示提示
        if (totalPosts === 0) {
            blogList.innerHTML = '<div class="no-results">没有找到匹配的文章</div>';
            loadMoreContainer.style.display = 'none';
            return;
        }
        
        // 渲染文章
        postsToShow.forEach(post => {
            const postCard = createPostCard(post);
            blogList.appendChild(postCard);
        });
        
        // 更新当前显示的文章
        if (append) {
            currentPosts = [...currentPosts, ...postsToShow];
        } else {
            currentPosts = postsToShow;
        }
        
        // 显示或隐藏加载更多按钮
        if (endIndex < totalPosts) {
            loadMoreContainer.style.display = 'flex';
        } else {
            loadMoreContainer.style.display = 'none';
        }
    }
    
    // 过滤文章函数
    function filterPosts(posts, searchTerm) {
        return posts.filter(post => 
            post.title.toLowerCase().includes(searchTerm) || 
            post.excerpt.toLowerCase().includes(searchTerm)
        );
    }
    
    // 排序文章函数
    function sortPosts(posts, sortMethod) {
        const postsCopy = [...posts]; // 创建副本，不修改原数组
        
        switch (sortMethod) {
            case 'date-desc':
                return postsCopy.sort((a, b) => new Date(b.date) - new Date(a.date));
            case 'date-asc':
                return postsCopy.sort((a, b) => new Date(a.date) - new Date(b.date));
            case 'length-desc':
                return postsCopy.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
            case 'length-asc':
                return postsCopy.sort((a, b) => (a.wordCount || 0) - (b.wordCount || 0));
            default:
                return postsCopy;
        }
    }
});

// 获取博客文章列表
async function fetchBlogPosts() {
    try {
        const response = await fetch('/posts/index.json');
        if (!response.ok) {
            throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        const posts = await response.json();
        
        // 为每篇文章添加字数统计
        for (const post of posts) {
            try {
                const contentResponse = await fetch(`/posts/${post.id}.md`);
                if (contentResponse.ok) {
                    const content = await contentResponse.text();
                    // 简单的字数统计（去除Markdown标记后的大致字数）
                    post.wordCount = countWords(content);
                }
            } catch (error) {
                console.error(`获取文章 ${post.id} 内容时出错:`, error);
                post.wordCount = 0;
            }
        }
        
        return posts;
    } catch (error) {
        console.error('获取博客列表时出错:', error);
        return [];
    }
}

// 计算文本字数
function countWords(text) {
    // 去除Markdown标记和特殊字符
    const cleanText = text
        .replace(/```[\s\S]*?```/g, '') // 代码块
        .replace(/`.*?`/g, '')         // 行内代码
        .replace(/\[.*?\]\(.*?\)/g, '') // 链接
        .replace(/\!\[.*?\]\(.*?\)/g, '') // 图片
        .replace(/\*\*.*?\*\*/g, '')    // 粗体
        .replace(/\*.*?\*/g, '')        // 斜体
        .replace(/#/g, '')             // 标题
        .replace(/\n/g, ' ')           // 换行符替换为空格
        .replace(/\s+/g, ' ')          // 多个空格替换为一个
        .trim();
    
    // 中文和英文混合字数统计
    return cleanText.length;
}

// 创建博客卡片元素
function createPostCard(post) {
    // 创建一个a标签作为整个卡片的容器，使整个卡片可点击
    const card = document.createElement('a');
    card.className = 'blog-card';
    card.href = `post.html?id=${post.id}`;
    
    // 使用默认图片，如果文章没有提供缩略图
    const thumbnailUrl = post.thumbnail || 'images/default-thumbnail.jpg';
    
    card.innerHTML = `
        <img src="${thumbnailUrl}" alt="${post.title}">
        <div class="blog-card-content">
            <h2>${post.title}</h2>
            <div class="blog-card-date">
                <i class="far fa-calendar-alt"></i> ${formatDate(post.date)}
                <span class="word-count"><i class="fas fa-file-alt"></i> ${post.wordCount || 0} 字</span>
            </div>
            <p class="blog-card-excerpt">${post.excerpt || '暂无摘要'}</p>
            <span class="read-more">阅读全文 &rarr;</span>
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