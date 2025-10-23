(function(){
  const onReady = fn => (document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',fn) : fn());
  
  // Загрузка всех файлов с сервера
  async function loadAllFiles(){
    try {
      const response = await fetch('/ui/button-file/api-list.php');
      const data = await response.json();
      return data.ok ? data.files : [];
    } catch(e) {
      console.error('Ошибка загрузки файлов:', e);
      return [];
    }
  }
  
  function addManagerButton(){
    const toolbar = document.querySelector('.topbar');
    if(!toolbar || document.getElementById('fileManagerBtn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'fileManagerBtn';
    btn.className = 'btn';
    btn.textContent = '📁 Управление файлами';
    btn.addEventListener('click', toggleManagerPanel);
    
    const separator = toolbar.querySelector('.sep');
    if(separator) toolbar.insertBefore(btn, separator);
    else toolbar.appendChild(btn);
  }
  
  function createManagerPanel(){
    const navPanel = document.querySelector('.panel');
    if(!navPanel || document.getElementById('fileManagerPanel')) return;
    
    const panel = document.createElement('div');
    panel.id = 'fileManagerPanel';
    panel.className = 'file-manager-panel panel';
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
      <button class="fm-close-btn" title="Закрыть">&times;</button>
      <div class="fm-header">
        <div class="label">Управление файлами</div>
      </div>
      
      <!-- Список всех файлов на сайте -->
      <div style="max-height:120px; overflow-y:auto; margin-bottom:10px; padding:8px; background:#111925; border-radius:8px; font-size:12px;">
        <div style="color:#9fb2c6; margin-bottom:4px;">Все файлы на сайте:</div>
        <div id="fmCurrentList" style="color:#e4eef9;">
          <div style="color:#6b7280;">Загрузка...</div>
        </div>
      </div>
      
      <div class="fm-form">
        <div class="fm-field">
          <label>Поиск файла (URL или название):</label>
          <input type="text" id="fmFindQuery" placeholder="document.pdf или /uploads/">
          <button id="fmSearchBtn" class="btn small">Найти</button>
        </div>
        
        <div id="fmResults" class="fm-results"></div>
        
        <div class="fm-field" id="fmReplaceField" style="display:none">
          <label>Загрузить новый файл:</label>
          <input type="file" id="fmNewFile" accept="*/*">
          <button id="fmReplaceBtn" class="btn small">Заменить файл</button>
        </div>
        
        <div id="fmStatus" class="fm-status"></div>
      </div>
    `;
    
    navPanel.style.position = 'relative';
    navPanel.appendChild(panel);
    
    panel.querySelector('#fmSearchBtn').addEventListener('click', searchFiles);
    panel.querySelector('#fmReplaceBtn').addEventListener('click', replaceFile);
    panel.querySelector('.fm-close-btn').addEventListener('click', closeManagerPanel);
  }
  
  async function updateCurrentFilesList(){
    const listEl = document.getElementById('fmCurrentList');
    if(!listEl) return;
    
    listEl.innerHTML = '<div style="color:#6b7280;">Загрузка...</div>';
    
    const files = await loadAllFiles();
    if(files.length === 0){
      listEl.innerHTML = '<div style="color:#6b7280;">Нет файлов на сайте</div>';
    } else {
      listEl.innerHTML = files.map(item => {
        const icon = getFileIcon(item.name);
        const pagesText = item.pages.length > 2 
          ? `${item.pages.slice(0,2).join(', ')}... (${item.pages.length})`
          : item.pages.join(', ');
        return `<div style="padding:2px 0; cursor:pointer;" class="file-list-item" data-url="${item.url}" data-name="${item.name}">
          <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.url}">${icon} ${item.name}</div>
          <div style="font-size:10px; color:#6b7280; margin-left:14px;">на: ${pagesText}</div>
        </div>`;
      }).join('');
      
      // Добавляем клик для быстрой вставки в поиск
      listEl.querySelectorAll('.file-list-item').forEach(item => {
        item.addEventListener('click', function() {
          document.getElementById('fmFindQuery').value = this.dataset.name || this.dataset.url;
        });
      });
    }
  }
  
  function toggleManagerPanel(){
    const panel = document.getElementById('fileManagerPanel');
    const btn = document.getElementById('fileManagerBtn');
    
    if(panel) {
      if(panel.style.display === 'none') {
        panel.style.display = 'block';
        updateCurrentFilesList();
        if(btn) btn.classList.add('active');
      } else {
        closeManagerPanel();
      }
    }
  }
  
  function closeManagerPanel(){
    const panel = document.getElementById('fileManagerPanel');
    const btn = document.getElementById('fileManagerBtn');
    
    if(panel) {
      panel.style.display = 'none';
      const findInput = document.getElementById('fmFindQuery');
      const newFileInput = document.getElementById('fmNewFile');
      const resultsDiv = document.getElementById('fmResults');
      const statusDiv = document.getElementById('fmStatus');
      const replaceField = document.getElementById('fmReplaceField');
      
      if(findInput) findInput.value = '';
      if(newFileInput) newFileInput.value = '';
      if(resultsDiv) resultsDiv.innerHTML = '';
      if(statusDiv) statusDiv.innerHTML = '';
      if(replaceField) replaceField.style.display = 'none';
      
      if(btn) btn.classList.remove('active');
    }
  }
  
  let selectedFileUrl = '';
  
  // Остальные функции остаются без изменений
  async function searchFiles(){
    const query = document.getElementById('fmFindQuery').value.trim();
    if(!query) return;
    
    const resultsDiv = document.getElementById('fmResults');
    resultsDiv.innerHTML = '<div style="color:#9fb2c6">Поиск...</div>';
    
    try{
      const response = await fetch('/ui/button-file/api.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `action=search&query=${encodeURIComponent(query)}`
      });
      
      const data = await response.json();
      
      if(data.ok && data.count > 0){
        let filesHtml = '';
        if(data.files && data.files.length > 0) {
          filesHtml = '<div style="margin-top:8px;padding:8px;background:#1a2332;border-radius:6px">';
          filesHtml += '<div style="font-size:12px;color:#9fb2c6;margin-bottom:6px">Найденные файлы:</div>';
          data.files.forEach(file => {
            const icon = getFileIcon(file.name || file.url);
            filesHtml += `<div style="padding:4px 0;font-size:13px;cursor:pointer" class="file-item" data-url="${file.url}">`;
            filesHtml += `${icon} <strong>${file.name || 'Без имени'}</strong>`;
            filesHtml += `<div style="font-size:11px;color:#6b7280">${file.url}</div>`;
            filesHtml += `</div>`;
          });
          filesHtml += '</div>';
        }
        
        resultsDiv.innerHTML = `
          <div class="fm-found">
            Найдено: <strong>${data.count}</strong> кнопок на <strong>${data.pages}</strong> страницах
            <div class="fm-files">${data.details.map(p => 
              `<div>• Страница "${p.page_name}": ${p.count} кнопок</div>`
            ).join('')}</div>
            ${filesHtml}
          </div>
        `;
        
        resultsDiv.querySelectorAll('.file-item').forEach(item => {
          item.addEventListener('click', function() {
            selectedFileUrl = this.dataset.url;
            resultsDiv.querySelectorAll('.file-item').forEach(el => el.style.background = '');
            this.style.background = '#1f2937';
            document.getElementById('fmReplaceField').style.display = 'block';
          });
        });
        
        if(data.files && data.files.length === 1) {
          selectedFileUrl = data.files[0].url;
          document.getElementById('fmReplaceField').style.display = 'block';
        }
      } else {
        resultsDiv.innerHTML = '<div class="fm-not-found">Файлы не найдены</div>';
        document.getElementById('fmReplaceField').style.display = 'none';
      }
    }catch(e){
      resultsDiv.innerHTML = '<div class="fm-error">Ошибка поиска: ' + e.message + '</div>';
    }
  }
  
  async function replaceFile(){
    const newFile = document.getElementById('fmNewFile').files[0];
    
    if(!selectedFileUrl || !newFile) {
      alert('Выберите файл для замены');
      return;
    }
    
    if(!confirm('Заменить файл во всех кнопках?')) return;
    
    const statusDiv = document.getElementById('fmStatus');
    statusDiv.innerHTML = '<div style="color:#9fb2c6">Загрузка файла...</div>';
    
    const fd = new FormData();
    fd.append('file', newFile);
    fd.append('type', 'file');
    
    try{
      const uploadResp = await fetch('/editor/api.php?action=uploadAsset&type=file', {
        method: 'POST',
        body: fd
      });
      const uploadData = await uploadResp.json();
      
      if(!uploadData.ok) {
        statusDiv.innerHTML = '<div class="fm-error">Ошибка загрузки: ' + (uploadData.error || 'неизвестная ошибка') + '</div>';
        return;
      }
      
      const replaceResp = await fetch('/ui/button-file/api.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `action=replace&oldUrl=${encodeURIComponent(selectedFileUrl)}&newUrl=${encodeURIComponent(uploadData.url)}&fileName=${encodeURIComponent(newFile.name)}&current_page=${window.currentPageId||0}`
      });
      
      const replaceData = await replaceResp.json();
      
      if(replaceData.ok){
        statusDiv.innerHTML = `<div class="fm-success">✅ Файл заменен в ${replaceData.replaced} кнопках</div>`;
        
        if(replaceData.current_page_affected) {
          document.querySelectorAll('.el.filebtn a, .el.Filebtn a').forEach(link => {
            if(link.href === selectedFileUrl || link.getAttribute('href') === selectedFileUrl) {
              link.href = uploadData.url;
              link.setAttribute('href', uploadData.url);
              link.setAttribute('download', newFile.name);
              const icon = getFileIcon(newFile.name);
              const text = link.textContent.replace(/[📄📦📕📘📗📙🎵🎬🖼️💻💿📝]/g,'').trim();
              link.innerHTML = `<span class="bf-icon">${icon}</span>${text}`;
            }
          });
          
          updateCurrentFilesList();
        }
        
        setTimeout(closeManagerPanel, 2000);
      } else {
        statusDiv.innerHTML = '<div class="fm-error">Ошибка: ' + (replaceData.error || 'неизвестная') + '</div>';
      }
    }catch(e){
      statusDiv.innerHTML = '<div class="fm-error">Ошибка: ' + e.message + '</div>';
    }
  }
  
  function getFileIcon(fileName) {
    if(!fileName) return '📄';
    const ext = fileName.split('.').pop().toLowerCase();
    
    if(['zip','rar','7z','tar','gz','bz2'].includes(ext)) return '📦';
    if(['pdf'].includes(ext)) return '📕';
    if(['doc','docx'].includes(ext)) return '📘';
    if(['xls','xlsx'].includes(ext)) return '📗';
    if(['ppt','pptx'].includes(ext)) return '📙';
    if(['mp3','wav','ogg','aac','flac'].includes(ext)) return '🎵';
    if(['mp4','avi','mkv','mov','webm'].includes(ext)) return '🎬';
    if(['jpg','jpeg','png','gif','svg','webp'].includes(ext)) return '🖼️';
    if(['js','json','xml','html','css','php','py'].includes(ext)) return '💻';
    if(['exe','apk','dmg','deb'].includes(ext)) return '💿';
    if(['txt','md','csv'].includes(ext)) return '📝';
    
    return '📄';
  }
  
  onReady(() => {
    addManagerButton();
    createManagerPanel();
  });
})();