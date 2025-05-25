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
    // 标记是否正在加载
    let isLoading = false;

    // 获取博客文章列表
    fetchBlogPosts()
        .then(posts => {
            // 保存所有文章
            allPosts = posts;
            
            // 初始加载时按日期（最新）排序并渲染第一页文章
            loadPostsPage(1, 'date-desc', '');
            
            // 启用无限滚动
            enableInfiniteScroll();
        })
        .catch(error => {
            blogList.innerHTML = `<div class="error">加载博客列表时出错: ${error.message}</div>`;
            console.error('加载博客列表时出错:', error);
        });
    
    // 启用无限滚动功能
    function enableInfiniteScroll() {
        // 创建一个Intersection Observer来监测页面底部
        const observer = new IntersectionObserver((entries) => {
            // 如果底部元素可见并且不在加载中状态
            if (entries[0].isIntersecting && !isLoading) {
                // 检查是否还有更多文章可加载
                const filteredPosts = searchPosts(allPosts, currentSearchTerm);
                const totalPosts = filteredPosts.length;
                const loadedPosts = currentPage * postsPerPage;
                
                if (loadedPosts < totalPosts) {
                    loadNextPage();
                }
            }
        }, {
            root: null, // 使用视口作为根元素
            rootMargin: '0px 0px 200px 0px', // 提前200px触发
            threshold: 0.1 // 当目标元素10%可见时触发
        });
        
        // 监测加载更多按钮容器
        observer.observe(loadMoreContainer);
    }
    
    // 搜索按钮点击事件
    searchButton.addEventListener('click', () => {
        performSearch();
    });
    
    // 搜索输入框回车事件
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
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
    
    // 执行搜索
    function performSearch() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        currentSearchTerm = searchTerm;
        // 重新加载第一页
        loadPostsPage(1, currentSortMethod, searchTerm);
    }
    
    // 搜索文章函数（仅过滤，不渲染）
    function searchPosts(posts, searchTerm) {
        if (!searchTerm) return posts;
        return posts.filter(post => 
            post.title.toLowerCase().includes(searchTerm) || 
            post.excerpt.toLowerCase().includes(searchTerm)
        );
    }
    
    // 加载下一页文章
    function loadNextPage() {
        isLoading = true;
        // 显示加载指示器
        loadMoreButton.textContent = '加载中...';
        loadMoreButton.disabled = true;
        
        // 模拟网络延迟，避免过快加载导致的闪烁
        setTimeout(() => {
            currentPage++;
            loadPostsPage(currentPage, currentSortMethod, currentSearchTerm, true);
            
            // 恢复加载按钮状态
            loadMoreButton.textContent = '加载更多';
            loadMoreButton.disabled = false;
            isLoading = false;
        }, 300);
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
            searchPosts(allPosts, searchTerm) : 
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
        // 尝试从本地存储读取缓存的文章列表
        const cachedPosts = localStorage.getItem('blogPosts');
        const cacheTimestamp = localStorage.getItem('blogPostsTimestamp');
        
        // 如果有缓存且缓存时间在24小时内，直接使用缓存
        if (cachedPosts && cacheTimestamp) {
            const now = new Date().getTime();
            const cacheTime = parseInt(cacheTimestamp);
            // 缓存有效期为24小时
            if (now - cacheTime < 24 * 60 * 60 * 1000) {
                console.log('使用缓存的文章列表');
                return JSON.parse(cachedPosts);
            }
        }
        
        // 如果没有缓存或缓存已过期，则从服务器获取
        const response = await fetch('/posts/index.json');
        if (!response.ok) {
            throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        const posts = await response.json();
        
        // 更新缓存
        localStorage.setItem('blogPosts', JSON.stringify(posts));
        localStorage.setItem('blogPostsTimestamp', new Date().getTime().toString());
        
        return posts;
    } catch (error) {
        console.error('获取博客列表时出错:', error);
        // 如果出错但有缓存，则使用缓存的数据
        const cachedPosts = localStorage.getItem('blogPosts');
        if (cachedPosts) {
            console.log('获取文章列表出错，使用缓存数据');
            return JSON.parse(cachedPosts);
        }
        return [];
    }
}

// 创建博客卡片元素
function createPostCard(post) {
    // 创建一个a标签作为整个卡片的容器，使整个卡片可点击
    const card = document.createElement('a');
    card.className = 'blog-card';
    card.href = `post.html?id=${post.id}`;
    
    // 使用默认图片，如果文章没有提供缩略图
    const thumbnailUrl = post.thumbnail || 'images/default-thumbnail.jpg';
    
    // 使用懒加载方式处理图片
    card.innerHTML = `
        <div class="blog-card-image">
            <img loading="lazy" src="${thumbnailUrl}" alt="${post.title}">
        </div>
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