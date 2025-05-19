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
            document.title = `${post.title} - 宇航员Dale的博客`;
            
            // 更新文章标题和日期
            postTitle.textContent = post.title;
            postDate.textContent = formatDate(post.date);
            
            // 根据内容路径的扩展名决定如何显示内容
            const contentPath = post.contentPath;
            if (contentPath.toLowerCase().endsWith('.pdf')) {
                // 使用PDF.js直接渲染PDF内容
                renderPDFAsHTML(contentPath, postContent);
            } else {
                // 默认按Markdown处理
                renderMarkdown(contentPath, postContent);
            }
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
        
        // 配置marked.js的渲染器，添加PDF处理
        const renderer = new marked.Renderer();
        
        // 自定义链接渲染
        const originalLinkRenderer = renderer.link;
        renderer.link = function(href, title, text) {
            // 检查链接是否指向PDF文件
            if (href.toLowerCase().endsWith('.pdf')) {
                const pdfId = 'pdf-' + Math.random().toString(36).substr(2, 9); // 生成随机ID
                // 返回PDF嵌入容器
                return `
                <div class="pdf-container">
                    <div class="pdf-header">
                        <span class="pdf-title">${text || 'PDF文档'}</span>
                        <a href="${href}" target="_blank" class="pdf-external-link" title="在新窗口打开PDF">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                    </div>
                    <iframe id="${pdfId}" src="${href}" class="pdf-iframe" title="${text || 'PDF嵌入'}" allowfullscreen></iframe>
                </div>`;
            }
            // 对于非PDF链接，使用原始渲染器
            return originalLinkRenderer.call(this, href, title, text);
        };
        
        // 使用自定义渲染器解析Markdown
        marked.setOptions({
            renderer: renderer,
            gfm: true,
            breaks: true
        });
        
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

// 使用PDF.js将PDF渲染为canvas图像
async function renderPDFAsHTML(pdfPath, container) {
    try {
        // 显示加载中提示
        container.innerHTML = '<div class="loading">正在加载PDF内容...</div>';
        
        // 配置PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdfjs/pdf.worker.min.js';
        
        // 高级配置选项，增强中文字体支持
        const loadingTask = pdfjsLib.getDocument({
            url: pdfPath,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
            disableFontFace: false, // 允许使用字体
            useWorkerFetch: true,
            useSystemFonts: true // 使用系统字体
        });
        
        const pdf = await loadingTask.promise;
        
        // 创建用于显示PDF内容的容器
        container.innerHTML = '';
        const pdfContentContainer = document.createElement('div');
        pdfContentContainer.className = 'pdf-content-wrapper';
        container.appendChild(pdfContentContainer);
        
        // 获取PDF页数
        const numPages = pdf.numPages;
        
        // 为PDF添加一个"在新窗口打开"按钮
        const pdfToolbar = document.createElement('div');
        pdfToolbar.className = 'pdf-toolbar';
        
        const openPdfBtn = document.createElement('a');
        openPdfBtn.href = pdfPath;
        openPdfBtn.target = '_blank';
        openPdfBtn.className = 'pdf-external-link';
        openPdfBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> 在新窗口打开完整PDF';
        pdfToolbar.appendChild(openPdfBtn);
        
        pdfContentContainer.appendChild(pdfToolbar);
        
        // 渲染所有页面
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            // 获取页面
            const page = await pdf.getPage(pageNum);
            
            // 创建页面容器
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page';
            
            // 创建canvas元素用于渲染PDF页面
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-canvas';
            pageContainer.appendChild(canvas);
            
            // 设置canvas上下文
            const context = canvas.getContext('2d', { alpha: false });
            context.imageSmoothingEnabled = true;
            
            // 获取页面的视口，以适应容器宽度
            const viewport = page.getViewport({ scale: 1.0 });
            
            // 确定缩放比例以适应容器宽度
            // 获取容器的宽度，默认为800px
            const containerWidth = container.clientWidth || 800;
            const scale = containerWidth / viewport.width;
            
            // 使用新的缩放比例获取更新的视口
            const scaledViewport = page.getViewport({ scale: scale });
            
            // 设置canvas尺寸以匹配视口，使用整数避免模糊
            canvas.height = Math.floor(scaledViewport.height);
            canvas.width = Math.floor(scaledViewport.width);
            
            // 使用设备像素比提高清晰度
            const pixelRatio = window.devicePixelRatio || 1;
            const canvasWidth = Math.floor(scaledViewport.width);
            const canvasHeight = Math.floor(scaledViewport.height);
            
            canvas.width = canvasWidth * pixelRatio;
            canvas.height = canvasHeight * pixelRatio;
            
            // 设置CSS尺寸，保持物理像素尺寸不变
            canvas.style.width = `${canvasWidth}px`;
            canvas.style.height = `${canvasHeight}px`;
            
            // 根据设备像素比调整上下文
            context.scale(pixelRatio, pixelRatio);
            
            // 渲染PDF页面到canvas，增加额外选项
            const renderContext = {
                canvasContext: context,
                viewport: scaledViewport,
                enableWebGL: true,
                renderInteractiveForms: true,
                textLayer: false // 禁用文本层，直接渲染为图像
            };
            
            try {
                await page.render(renderContext).promise;
            } catch (renderError) {
                console.error('渲染页面时出错:', renderError);
                // 出错时添加错误信息到页面
                const errorMsg = document.createElement('div');
                errorMsg.className = 'pdf-page-error';
                errorMsg.textContent = `无法渲染第 ${pageNum} 页: ${renderError.message}`;
                pageContainer.appendChild(errorMsg);
            }
            
            // 添加页码指示器（对于多页PDF）
            if (numPages > 1) {
                const pageIndicator = document.createElement('div');
                pageIndicator.className = 'pdf-page-indicator';
                pageIndicator.textContent = `第 ${pageNum} 页 / 共 ${numPages} 页`;
                pageContainer.appendChild(pageIndicator);
            }
            
            // 添加页面到文档
            pdfContentContainer.appendChild(pageContainer);
        }
    } catch (error) {
        console.error('渲染PDF时出错:', error);
        container.innerHTML = `<div class="error">加载PDF内容时出错: ${error.message}</div>`;
    }
}

// 渲染PDF内容
function renderPDF(pdfPath, container) {
    try {
        // 清除加载提示
        container.innerHTML = '';
        
        // 创建PDF容器
        const pdfContainer = document.createElement('div');
        pdfContainer.className = 'pdf-container';
        
        // 创建PDF标题栏
        const pdfHeader = document.createElement('div');
        pdfHeader.className = 'pdf-header';
        
        // 添加PDF标题
        const pdfTitle = document.createElement('span');
        pdfTitle.className = 'pdf-title';
        pdfTitle.textContent = '文档查看器';
        pdfHeader.appendChild(pdfTitle);
        
        // 添加在新窗口打开PDF的链接
        const externalLink = document.createElement('a');
        externalLink.href = pdfPath;
        externalLink.className = 'pdf-external-link';
        externalLink.title = '在新窗口打开PDF';
        externalLink.target = '_blank';
        externalLink.innerHTML = '<i class="fas fa-external-link-alt"></i> 在新窗口打开';
        pdfHeader.appendChild(externalLink);
        
        // 创建PDF查看器 iframe
        const pdfViewer = document.createElement('iframe');
        pdfViewer.className = 'pdf-iframe';
        pdfViewer.src = pdfPath;
        pdfViewer.title = '文档查看器';
        pdfViewer.setAttribute('allowfullscreen', '');
        
        // 将所有元素添加到容器中
        pdfContainer.appendChild(pdfHeader);
        pdfContainer.appendChild(pdfViewer);
        container.appendChild(pdfContainer);
        
    } catch (error) {
        console.error('渲染PDF时出错:', error);
        container.innerHTML = `<div class="error">加载PDF文件时出错: ${error.message}</div>`;
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