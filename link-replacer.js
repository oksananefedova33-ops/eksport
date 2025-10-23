(function(){
  const onReady = fn => (document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',fn) : fn());
  
  function addToolbarButton(){
    const toolbar = document.querySelector('.topbar');
    if(!toolbar) return;
    
    if(document.getElementById('linkReplacerBtn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'linkReplacerBtn';
    btn.className = 'btn';
    btn.textContent = '🔄 Замена ссылок';
    btn.addEventListener('click', toggleReplacerPanel);
    
    const separator = toolbar.querySelector('.sep');
    if(separator) toolbar.insertBefore(btn, separator);
    else toolbar.appendChild(btn);
  }
  
  // Загрузка всех ссылок с сервера
  async function loadAllLinks(){
    try {
      const response = await fetch('/ui/link-replacer/api-list.php');
      const data = await response.json();
      return data.ok ? data.links : [];
    } catch(e) {
      console.error('Ошибка загрузки ссылок:', e);
      return [];
    }
  }
  
  function createReplacerPanel(){
    const navPanel = document.querySelector('.panel');
    if(!navPanel) return;
    
    if(document.getElementById('linkReplacerPanel')) return;
    
    const panel = document.createElement('div');
    panel.id = 'linkReplacerPanel';
    panel.className = 'link-replacer-panel panel';
    panel.style.display = 'none';
    panel.style.setProperty('position','fixed','important');
    panel.style.setProperty('right','16px','important');
    panel.style.setProperty('top','16px','important');
    panel.style.setProperty('left','auto','important');
    panel.style.setProperty('margin-left','0','important');
    panel.style.setProperty('z-index','2147483647','important');
    panel.style.setProperty('max-height','calc(100vh - 32px)','important');
    panel.style.setProperty('overflow','auto','important');
    
    panel.innerHTML = `
      <button class="lr-close-btn" title="Закрыть">&times;</button>
      <div class="lr-header">
        <div class="label">Замена ссылок в кнопках</div>
      </div>
      
      <!-- Список всех ссылок на сайте -->
      <div style="max-height:120px; overflow-y:auto; margin-bottom:10px; padding:8px; background:#111925; border-radius:8px; font-size:12px;">
        <div style="color:#9fb2c6; margin-bottom:4px;">Все ссылки на сайте:</div>
        <div id="lrCurrentList" style="color:#e4eef9;">
          <div style="color:#6b7280;">Загрузка...</div>
        </div>
      </div>
      
      <div class="lr-form">
        <div class="lr-field">
          <label>Найти ссылку:</label>
          <input type="text" id="lrFindUrl" placeholder="https://old-site.com">
          <button id="lrSearchBtn" class="btn small">Найти</button>
        </div>
        
        <div id="lrResults" class="lr-results"></div>
        
        <div class="lr-field" id="lrReplaceField" style="display:none">
          <label>Заменить на:</label>
          <input type="text" id="lrReplaceUrl" placeholder="https://new-site.com">
          <button id="lrReplaceBtn" class="btn small danger">Заменить все</button>
        </div>
        
        <div id="lrStatus" class="lr-status"></div>
      </div>
    `;
    
      navPanel.style.position = 'relative';
    navPanel.appendChild(panel);
    
    panel.querySelector('#lrSearchBtn').addEventListener('click', searchLinks);
    panel.querySelector('#lrReplaceBtn').addEventListener('click', replaceLinks);
    panel.querySelector('.lr-close-btn').addEventListener('click', closeReplacerPanel);
  }
  
  async function updateCurrentLinksList(){
    const listEl = document.getElementById('lrCurrentList');
    if(!listEl) return;
    
    listEl.innerHTML = '<div style="color:#6b7280;">Загрузка...</div>';
    
    const links = await loadAllLinks();
    if(links.length === 0){
      listEl.innerHTML = '<div style="color:#6b7280;">Нет ссылок на сайте</div>';
    } else {
      listEl.innerHTML = links.map(item => {
        const pagesText = item.pages.length > 2 
          ? `${item.pages.slice(0,2).join(', ')}... (${item.pages.length})`
          : item.pages.join(', ');
        return `<div style="padding:2px 0; cursor:pointer;" class="link-list-item" data-url="${item.url}">
          <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.url}">• ${item.url}</div>
          <div style="font-size:10px; color:#6b7280; margin-left:10px;">на: ${pagesText}</div>
        </div>`;
      }).join('');
      
      // Добавляем клик для быстрой вставки в поиск
      listEl.querySelectorAll('.link-list-item').forEach(item => {
        item.addEventListener('click', function() {
          document.getElementById('lrFindUrl').value = this.dataset.url;
        });
      });
    }
  }
  
  function toggleReplacerPanel(){
    const panel = document.getElementById('linkReplacerPanel');
    const btn = document.getElementById('linkReplacerBtn');
    
    if(panel) {
      if(panel.style.display === 'none') {
        panel.style.display = 'block';
        updateCurrentLinksList();
        if(btn) btn.classList.add('active');
      } else {
        closeReplacerPanel();
      }
    }
  }
  
  function closeReplacerPanel(){
    const panel = document.getElementById('linkReplacerPanel');
    const btn = document.getElementById('linkReplacerBtn');
    
    if(panel) {
      panel.style.display = 'none';
      const findInput = document.getElementById('lrFindUrl');
      const replaceInput = document.getElementById('lrReplaceUrl');
      const resultsDiv = document.getElementById('lrResults');
      const statusDiv = document.getElementById('lrStatus');
      const replaceField = document.getElementById('lrReplaceField');
      
      if(findInput) findInput.value = '';
      if(replaceInput) replaceInput.value = '';
      if(resultsDiv) resultsDiv.innerHTML = '';
      if(statusDiv) statusDiv.innerHTML = '';
      if(replaceField) replaceField.style.display = 'none';
      
      if(btn) btn.classList.remove('active');
    }
  }
  
  // Остальные функции остаются без изменений
  async function searchLinks(){
    const url = document.getElementById('lrFindUrl').value.trim();
    if(!url) return;
    
    const resultsDiv = document.getElementById('lrResults');
    resultsDiv.innerHTML = '<div style="color:#9fb2c6">Поиск...</div>';
    
    try{
      const response = await fetch('/ui/link-replacer/api.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `action=search&url=${encodeURIComponent(url)}`
      });
      
      const data = await response.json();
      
      if(data.ok){
        if(data.count > 0){
          resultsDiv.innerHTML = `
            <div class="lr-found">
              Найдено: <strong>${data.count}</strong> кнопок на <strong>${data.pages}</strong> страницах
              <div class="lr-pages">${data.details.map(p => 
                `<div>• Страница "${p.page_name}": ${p.count} кнопок</div>`
              ).join('')}</div>
            </div>
          `;
          document.getElementById('lrReplaceField').style.display = 'block';
        } else {
          resultsDiv.innerHTML = '<div class="lr-not-found">Ссылки не найдены</div>';
          document.getElementById('lrReplaceField').style.display = 'none';
        }
      }
    }catch(e){
      resultsDiv.innerHTML = '<div class="lr-error">Ошибка поиска: ' + e.message + '</div>';
    }
  }
  
  async function replaceLinks(){
    const findUrl = document.getElementById('lrFindUrl').value.trim();
    const replaceUrl = document.getElementById('lrReplaceUrl').value.trim();
    
    if(!findUrl || !replaceUrl) return;
    if(!confirm('Заменить все ссылки? Это действие нельзя отменить!')) return;
    
    const statusDiv = document.getElementById('lrStatus');
    statusDiv.innerHTML = '<div style="color:#9fb2c6">Замена...</div>';
    
    try{
      const response = await fetch('/ui/link-replacer/api.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `action=replace&find=${encodeURIComponent(findUrl)}&replace=${encodeURIComponent(replaceUrl)}&current_page=${window.currentPageId||0}`
      });
      
      const data = await response.json();
      
      if(data.ok){
        statusDiv.innerHTML = `<div class="lr-success">✅ Успешно заменено: ${data.replaced} ссылок.</div>`;
        
        if(data.current_page_affected && data.replaced > 0) {
          document.querySelectorAll('.el.linkbtn a, .el.Linkbtn a').forEach(link => {
            if(link.href === findUrl || link.getAttribute('href') === findUrl) {
              link.href = replaceUrl;
              link.setAttribute('href', replaceUrl);
            }
          });
          
          updateCurrentLinksList();
          statusDiv.innerHTML += `<div class="lr-success" style="margin-top:8px">Ссылки на текущей странице обновлены.</div>`;
          
          setTimeout(() => {
            closeReplacerPanel();
            if(typeof window.loadPage === 'function') {
              window.loadPage(window.currentPageId);
            }
          }, 2000);
        } else {
          setTimeout(closeReplacerPanel, 2000);
        }
      } else {
        statusDiv.innerHTML = `<div class="lr-error">Ошибка: ${data.error}</div>`;
      }
    }catch(e){
      statusDiv.innerHTML = '<div class="lr-error">Ошибка замены: ' + e.message + '</div>';
    }
  }
  
  onReady(() => {
    addToolbarButton();
    createReplacerPanel();
  });
})();