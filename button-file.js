/*!
 * Модуль "кнопка-файл" (filebtn) - для загрузки и управления файлами
 */
(function(){
  const onReady = fn => (document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',fn) : fn());
  const PALETTE = ['#10b981','#3b82f6','#8b5cf6','#ef4444','#f59e0b','#6366f1','#ec4899','#14b8a6'];
  const toHex = c=>{
    if(!c) return '#000000'; 
    c=String(c).trim();
    if(/^#/.test(c)){ 
      return c.length===4 ? '#'+c.slice(1).split('').map(x=>x+x).join('') : c; 
    }
    const m=c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i); 
    if(!m) return '#000000';
    return '#'+[m[1],m[2],m[3]].map(n=>Number(n).toString(16).padStart(2,'0')).join('');
  };
  const esc = s=> String(s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  const uid = ()=> 'el_'+Math.random().toString(36).slice(2,9);

  // Функция определения иконки по типу файла
  function getFileIcon(fileName) {
    if(!fileName) return '📄';
    const ext = fileName.split('.').pop().toLowerCase();
    
    // Архивы
    if(['zip','rar','7z','tar','gz','bz2'].includes(ext)) return '📦';
    // Документы
    if(['pdf'].includes(ext)) return '📕';
    if(['doc','docx'].includes(ext)) return '📘';
    if(['xls','xlsx'].includes(ext)) return '📗';
    if(['ppt','pptx'].includes(ext)) return '📙';
    // Аудио
    if(['mp3','wav','ogg','aac','flac'].includes(ext)) return '🎵';
    // Видео
    if(['mp4','avi','mkv','mov','webm'].includes(ext)) return '🎬';
    // Изображения
    if(['jpg','jpeg','png','gif','svg','webp'].includes(ext)) return '🖼️';
    // Код
    if(['js','json','xml','html','css','php','py'].includes(ext)) return '💻';
    // Программы
    if(['exe','apk','dmg','deb'].includes(ext)) return '💿';
    // Текст
    if(['txt','md','csv'].includes(ext)) return '📝';
    
    return '📄'; // По умолчанию
  }

  /* Кнопка в тулбаре */
  function insertToolbarBtn(){
    const topbar = document.querySelector('.topbar');
    if(!topbar || document.getElementById('btnAddFileBtn')) return;
    
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'btnAddFileBtn';
    b.textContent = '📎 Кнопка-файл';
    b.className = 'btn';
    
    const videoBtn = topbar.querySelector('#btnAddVideo');
    if(videoBtn && videoBtn.parentNode) {
      videoBtn.parentNode.insertBefore(b, videoBtn.nextSibling);
    } else {
      topbar.appendChild(b);
    }
    
    b.addEventListener('click', addFileBtn);
  }

  /* Создание элемента */
  function addFileBtn(){
    if(typeof window.selectEl==='function' && typeof window.createElement==='function'){
      try{ 
        window.selectEl(window.createElement('filebtn')); 
        return; 
      }catch(e){}
    }
    createFileBtn();
  }

  function createFileBtn(opts={}){
    const el=document.createElement('div'); 
    el.className='el filebtn'; 
    el.dataset.type= opts.datasetType || 'filebtn'; 
    el.dataset.id=opts.id || uid();
    el.style.left = (opts.left ?? 10) + '%';
el.style.top  = (opts.top  ?? 10) + 'px';
// дефолты в PX; проценты — только если пришли из сохранения
if (opts.width == null)  el.style.width  = (opts.pxWidth  ?? 260) + 'px';
else                     el.style.width  = opts.width + '%';
if (opts.height == null) el.style.height = (opts.pxHeight ??  68) + 'px';
else                     el.style.height = opts.height + '%';
el.style.zIndex   = (opts.z ?? 1);
el.style.borderRadius = (opts.radius ?? 12) + 'px';
el.style.rotate   = (opts.rotate ?? 0) + 'deg';
    
    const icon = getFileIcon(opts.fileName || '');
    
    const a=document.createElement('a');
    a.className='bf-filebtn bf-anim-'+(opts.anim||'none');
    a.textContent = (opts.text || 'Скачать файл').replace(/[📄📦📕📘📗📙🎵🎬🖼️💻💿📝]/g,'');
    a.href = opts.fileUrl || '#';
    a.download = opts.fileName || '';
    a.target='_blank';
    a.dataset.anim = opts.anim || 'none';
    a.dataset.anim = opts.anim || 'none';
    a.style.setProperty('--bf-bg', opts.bg || '#10b981');
    a.style.setProperty('--bf-color', opts.color || '#ffffff');
    a.style.setProperty('--bf-radius', (opts.radius ?? 12)+'px');
    a.dataset.fileName = opts.fileName || '';
    a.addEventListener('click', e=>{ 
      if(!(e.ctrlKey||e.metaKey)) e.preventDefault(); 
    });
    
    el.appendChild(a);
    const stage = document.querySelector('#stage') || document.querySelector('.stage') || document.body;
    stage.appendChild(el);
    
    try{ if(typeof window.ensureTools==='function') ensureTools(el); }catch(e){}
    try{ if(typeof window.ensureHandle==='function') ensureHandle(el); }catch(e){}
    try{ if(typeof window.attachDragResize==='function') attachDragResize(el); }catch(e){}
    
    return el;
  }

  /* Селекторы */
  const Q_FILEBTN = '#stage .el[data-type="filebtn" i], .stage .el[data-type="filebtn" i], #stage .el.filebtn, .stage .el.filebtn, #stage .el.Filebtn, .stage .el.Filebtn';

  /* Сбор из DOM */
  function collectFilebtns(){
    const res=[];
    document.querySelectorAll(Q_FILEBTN).forEach(el=>{
      const a = el.querySelector('a');
      if(!a) return;
      
      const styleAttr = a.getAttribute('style') || '';
      const bgMatch = styleAttr.match(/--bf-bg:\s*([^;]+)/);
      const colorMatch = styleAttr.match(/--bf-color:\s*([^;]+)/);
      
      const cs = getComputedStyle(a);
      const bg = bgMatch ? bgMatch[1].trim() : (cs.getPropertyValue('--bf-bg')||'#10b981').trim();
      const color = colorMatch ? colorMatch[1].trim() : (cs.getPropertyValue('--bf-color')||'#ffffff').trim();
      
      res.push({
        id: el.dataset.id || uid(),
        type: 'filebtn',
        left: parseFloat(el.style.left)||0,
        top: parseInt(el.style.top)||0,
        width: parseFloat(el.style.width)||0,
        height: parseFloat(el.style.height)||0,
        z: parseInt(el.style.zIndex||'1',10) || 1,
        radius: parseInt(el.style.borderRadius||'12',10) || 12,
        rotate: parseFloat(el.style.rotate||'0')||0,
        text: (a.textContent||'').replace(/[📄📦📕📘📗📙🎵🎬🖼️💻💿📝]/g,'').trim() || 'Скачать файл',
        fileUrl: a.getAttribute('href') || '',
        fileName: a.getAttribute('download') || a.dataset.fileName || '',
        bg: bg || '#10b981',
        color: color || '#ffffff',
        anim: a.dataset.anim || 'none'
      });
    });
    return res;
  }

  /* Мерж с данными */
  function mergeFilebtns(base){
    const data = (base && typeof base==='object') ? base : {elements:[]};
    if(!Array.isArray(data.elements)) data.elements=[];
    const idx = new Map();
    data.elements.forEach((e,i)=> idx.set(e && e.id ? e.id : ('#'+i), i));
    collectFilebtns().forEach(e=>{
      const key = e.id || '';
      if(idx.has(key)){
        const i = idx.get(key);
        data.elements[i] = Object.assign({}, data.elements[i], e, {type:'filebtn'});
      }else{
        data.elements.push(e);
      }
    });
    return data;
  }

  /* Интеграция с редактором */
  function extendEditor(){
    const _create = window.createElement;
    const _render = window.renderProps;
    const _gather = window.gatherData;

    if(typeof window.createElement==='function'){
      window.createElement = function(type, opts={}){
        if(/filebtn/i.test(String(type))) return createFileBtn(Object.assign({}, opts, {datasetType:type}));
        return _create(type, opts);
      };
    }

    if(typeof window.renderProps==='function'){
      window.renderProps = function(el){
        const t = (el && (el.dataset?.type || [...el.classList].join(' '))) || '';
        if(!/filebtn/i.test(t)) return _render(el);
        _render(el);

        const props = document.getElementById('props') || document.querySelector('#right,#sidebar,.props,.right-panel'); 
        if(!props) return;
        
        const a = el.querySelector('a'); 
        if(!a) return;
        
        const bg = toHex(getComputedStyle(a).getPropertyValue('--bf-bg') || '#10b981');
        const fg = toHex(getComputedStyle(a).getPropertyValue('--bf-color') || '#ffffff');
        const radius = parseInt(el.style.borderRadius || '12', 10) || 12;
        const fileName = a.getAttribute('download') || a.dataset.fileName || '';
        const anim = a.dataset.anim || 'none';
        const pal = PALETTE.map(c=>`<div class="sw" data-c="${c}" title="${c}" style="background:${c}"></div>`).join('');
        
        const box = document.createElement('div');
        box.innerHTML = `
          <div class="row">
            <div><div class="label">Текст кнопки</div><input type="text" id="bfText" value="${esc((a.textContent||'').replace(/[📄📦📕📘📗📙🎵🎬🖼️💻💿📝]/g,'').trim()||'Скачать файл')}"></div>
            <div><div class="label">Имя файла</div><input type="text" id="bfFileName" placeholder="document.pdf" value="${esc(fileName)}"></div>
          </div>
          <div class="row">
            <div><div class="label">Загрузить файл</div><input type="file" id="bfFile" accept="*/*"></div>
            <div><div class="label">URL файла</div><input type="text" id="bfUrl" placeholder="/uploads/file.pdf" value="${esc(a.getAttribute('href')||'')}"></div>
          </div>
          <div class="row">
            <div><div class="label">Фон</div><div class="palette" id="bfBgPal">${pal}</div><input type="color" id="bfBg" value="${bg}"></div>
            <div><div class="label">Цвет текста</div><div class="palette" id="bfFgPal">${pal}</div><input type="color" id="bfFg" value="${fg}"></div>
          </div>
          <div class="row">
            <div><div class="label">Округление (px)</div><input type="range" id="bfRadius" min="0" max="40" step="1" value="${radius}"></div>
            <div><div class="label">Анимация</div>
              <select id="bfAnim">
                <option value="none" ${anim==='none'?'selected':''}>🚫 Нет</option>
                <option value="pulse" ${anim==='pulse'?'selected':''}>💓 Пульсация</option>
                <option value="shake" ${anim==='shake'?'selected':''}>🔔 Встряхивание</option>
                <option value="fade" ${anim==='fade'?'selected':''}>✨ Мерцание</option>
                <option value="slide" ${anim==='slide'?'selected':''}>⬆️ Покачивание</option>
                <option value="bounce" ${anim==='bounce'?'selected':''}>🏀 Подпрыгивание</option>
                <option value="glow" ${anim==='glow'?'selected':''}>💡 Свечение</option>
                <option value="rotate" ${anim==='rotate'?'selected':''}>🔄 Вращение</option>
              </select>
            </div>
          </div>`;
        props.appendChild(box);

        box.querySelector('#bfText').addEventListener('input', e=> {
          const icon = getFileIcon(a.getAttribute('download') || a.dataset.fileName || '');
          a.textContent = (e.target.value || '').replace(/[📄📦📕📘📗📙🎵🎬🖼️💻💿📝]/g,'');
        });
        box.querySelector('#bfFileName').addEventListener('input', e=> {
          const newFileName = e.target.value;
          a.setAttribute('download', newFileName);
          a.dataset.fileName = newFileName;
          const icon = getFileIcon(newFileName);
          const text = box.querySelector('#bfText').value || 'Скачать файл';
          a.textContent = (text || '').replace(/[📄📦📕📘📗📙🎵🎬🖼️💻💿📝]/g,'');
        });
        box.querySelector('#bfUrl').addEventListener('input', e=> a.setAttribute('href', (e.target.value||'').trim()));
        box.querySelector('#bfFile').addEventListener('change', async e=>{
          const f = e.target.files?.[0]; 
          if(!f) return;
          const url = await uploadFile(f);
          if(url) {
            a.setAttribute('href', url);
            a.setAttribute('download', f.name);
            a.dataset.fileName = f.name;
            box.querySelector('#bfUrl').value = url;
            box.querySelector('#bfFileName').value = f.name;
            const icon = getFileIcon(f.name);
            const text = box.querySelector('#bfText').value || 'Скачать файл';
            a.innerHTML = `<span class="bf-icon">${icon}</span>` + text;
          }
        });
        
        function bindPal(containerSel, inputSel, setter){
          box.querySelectorAll(containerSel+' .sw').forEach(sw=> sw.addEventListener('click', ()=>{ 
            const c=sw.dataset.c; 
            box.querySelector(inputSel).value=c; 
            setter(c); 
          }));
          box.querySelector(inputSel).addEventListener('input', e=> setter(e.target.value));
        }
        bindPal('#bfBgPal', '#bfBg', c=> a.style.setProperty('--bf-bg', c));
        bindPal('#bfFgPal', '#bfFg', c=> a.style.setProperty('--bf-color', c));
        
        box.querySelector('#bfRadius').addEventListener('input', e=>{
          const v = parseInt(e.target.value||'0',10)||0;
          el.style.borderRadius = v+'px';
          a.style.setProperty('--bf-radius', v+'px');
        });
        
        box.querySelector('#bfAnim').addEventListener('change', e=>{
          const v = e.target.value;
          a.classList.remove('bf-anim-none','bf-anim-pulse','bf-anim-shake','bf-anim-fade','bf-anim-slide','bf-anim-bounce','bf-anim-glow','bf-anim-rotate');
          a.classList.add('bf-anim-'+v);
          a.dataset.anim = v;
        });
      };
    }

    // Функция загрузки файла
    async function uploadFile(file){
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'file');
      try {
        const r = await fetch('/editor/api.php?action=uploadAsset&type=file', {
          method: 'POST',
          body: fd,
          cache: 'no-store'
        });
        const j = await r.json();
        if(j.ok) return j.url;
        alert('Ошибка загрузки: ' + (j.error || 'Неизвестная ошибка'));
      } catch(e) {
        alert('Ошибка загрузки файла: ' + e.message);
      }
      return null;
    }
    window.uploadFile = uploadFile;

    // Базовая сборка
    const baseGather = (typeof _gather==='function') ? _gather : ()=>({elements:[]});
    const ours = ()=> mergeFilebtns(baseGather());

    window.gatherData = ours;
    ['collectData','collectElements','buildData','getDataForSave'].forEach(n=>{
      try{
        const prev = (typeof window[n]==='function') ? window[n] : null;
        window[n] = function(){ return mergeFilebtns(prev ? prev() : baseGather()); };
      }catch(e){ window[n] = ours; }
    });

    // Перехват отправки
    function patchBody(body){
      try{
        if(body instanceof FormData){ body.set('data', JSON.stringify(ours())); return body; }
        if(typeof body==='string'){ 
          try{ 
            const obj=JSON.parse(body); 
            obj.data=ours(); 
            return JSON.stringify(obj);
          }catch(e){ return body; } 
        }
        if(body && typeof body==='object'){ body.data=ours(); return JSON.stringify(body); }
      }catch(e){}
      return body;
    }
    
    const _fetch = window.fetch;
    if(typeof _fetch==='function'){
      window.fetch = function(input, init){
        try{
          const url = (typeof input==='string' ? input : (input && input.url) ) || '';
          if(/editor\/api\.php/i.test(String(url)) && init && 'body' in init){ 
            init.body = patchBody(init.body); 
          }
        }catch(e){}
        return _fetch.apply(this, arguments);
      };
    }

    // Гидрация после загрузки
    function hydrate(){
      const cand=[window.pageData,window.PAGE,window.__PAGE__,window.data,window.state,window.__STATE__,window.zrPage];
      for(const d of cand){
        if(d && Array.isArray(d.elements)){
          d.elements.filter(e=>e && /filebtn/i.test(String(e.type||''))).forEach(e=>{
            if(!document.querySelector(`${Q_FILEBTN}[data-id="${e.id||''}"]`)) createFileBtn(e);
          });
          break;
        }
      }
    }
    let tries=0; 
    const t=setInterval(()=>{ hydrate(); if(++tries>12) clearInterval(t); }, 300);
  }

  onReady(()=>{ 
    insertToolbarBtn(); 
    extendEditor(); 
  });
})();