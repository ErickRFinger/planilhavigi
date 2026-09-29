/**
 * VIGI Excel Online - Frontend Engine
 * Suporte a Tema Escuro, Menus em Português, 5 Usuários com Níveis e Auditoria
 */

const SUPABASE_CONFIG = {
  url: "https://hnfhrjgzeivzrcpumkyk.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZmhyamd6ZWl2enJjcHVta3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3Mjg5MTQsImV4cCI6MjA4ODMwNDkxNH0.qWKErHq6vCPRWdDfrnngY8fPiJ05VR586U0GzZ3vmrI",
  serviceRole: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZmhyamd6ZWl2enJjcHVta3lrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcyODkxNCwiZXhwIjoyMDg4MzA0OTE0fQ.lG8gV39uSSStfgbSUnBJkGogYdn-zYh3ffUdsjj_xWE",
  bucket: "vigi_spreadsheets"
};

// Usuários locais para contingência
const LOCAL_USERS = {
  "erick": { username: "Erick", password: "324354", role: "supervisor", name: "Erick (Supervisor)" },
  "daniel": { username: "Daniel", password: "Margot", role: "supervisor", name: "Daniel (Supervisor)" },
  "michel": { username: "Michel", password: "Clic@3369", role: "agente", name: "Michel (Agente)" },
  "gabriely": { username: "Gabriely", password: "Clic@3369", role: "agente", name: "Gabriely (Agente)" },
  "klaus": { username: "Klaus", password: "Clic@3369", role: "agente", name: "Klaus (Agente)" },
  "admin": { username: "admin", password: "Clic@3369", role: "supervisor", name: "Administrador Geral" }
};

const AppState = {
  token: null,
  user: null,
  isSaving: false,
  hasUnsavedChanges: false,
  autoSaveTimer: null,
  currentSheets: [],
  activeSheetIndex: 0,
  currentSheetName: "CLIENTES VIGI HIK",
  pendingLogs: [],
  allAuditLogs: [],
  searchResults: [],
  searchCurrentIndex: -1,
  theme: localStorage.getItem('vigi_theme') || 'light'
};

const supabaseClient = (window.supabase && window.supabase.createClient) 
  ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey) 
  : null;

// --- CONFIGURAÇÃO VISUAL DO MENU DO BOTÃO DIREITO ESTILO GOOGLE PLANILHAS ---
const GOOGLE_SHEETS_MENU = {
  'luckysheet-copy-btn': { text: 'Copiar', icon: 'fa-regular fa-copy', shortcut: 'Ctrl+C' },
  'luckysheetcopyfor': { text: 'Copiar como...', icon: 'fa-solid fa-clone', shortcut: '' },
  'luckysheet-copy-paste': { text: 'Colar', icon: 'fa-regular fa-paste', shortcut: 'Ctrl+V' }
};

const PT_CONTEXT_ITEMS = [
  { match: 'InsertRow', text: 'Inserir 1 linha acima', icon: 'fa-solid fa-arrow-down' },
  { match: 'Towards Top Add Row', text: 'Inserir 1 linha acima', icon: 'fa-solid fa-arrow-up' },
  { match: 'Towards Bottom Add Row', text: 'Inserir 1 linha abaixo', icon: 'fa-solid fa-arrow-down' },
  { match: 'InsertColumn', text: 'Inserir 1 coluna à direita', icon: 'fa-solid fa-arrow-right' },
  { match: 'Towards Left Add Column', text: 'Inserir 1 coluna à esquerda', icon: 'fa-solid fa-arrow-left' },
  { match: 'Towards Right Add Column', text: 'Inserir 1 coluna à direita', icon: 'fa-solid fa-arrow-right' },
  { match: 'Delete selected Row', text: 'Excluir linha selecionada', icon: 'fa-regular fa-trash-can' },
  { match: 'Delete selected Column', text: 'Excluir coluna selecionada', icon: 'fa-regular fa-trash-can' },
  { match: 'Delete cell', text: 'Excluir células...', icon: 'fa-solid fa-xmark' },
  { match: 'Clear content', text: 'Limpar conteúdo', icon: 'fa-solid fa-eraser', shortcut: 'Del' },
  { match: 'Hide selected Column', text: 'Ocultar coluna', icon: 'fa-regular fa-eye-slash' },
  { match: 'Show hidden Column', text: 'Mostrar colunas ocultas', icon: 'fa-regular fa-eye' },
  { match: 'Hide selected Row', text: 'Ocultar linha', icon: 'fa-regular fa-eye-slash' },
  { match: 'Show hidden Row', text: 'Mostrar linhas ocultas', icon: 'fa-regular fa-eye' },
  { match: 'Column Width', text: 'Redimensionar coluna...', icon: 'fa-solid fa-arrows-left-right' },
  { match: 'Row Height', text: 'Redimensionar linha...', icon: 'fa-solid fa-arrows-up-down' },
  { match: 'Copy', text: 'Copiar', icon: 'fa-regular fa-copy', shortcut: 'Ctrl+C' },
  { match: 'Paste', text: 'Colar', icon: 'fa-regular fa-paste', shortcut: 'Ctrl+V' },
  { match: 'A-Z order', text: 'Classificar de A a Z', icon: 'fa-solid fa-arrow-down-a-z' },
  { match: 'Z-A order', text: 'Classificar de Z a A', icon: 'fa-solid fa-arrow-up-z-a' },
  { match: 'Sort', text: 'Classificar intervalo', icon: 'fa-solid fa-arrow-down-short-wide' },
  { match: 'Filter', text: 'Criar um filtro', icon: 'fa-solid fa-filter' },
  { match: 'Data verification', text: 'Validação de dados...', icon: 'fa-solid fa-check-double' },
  { match: 'Cell format', text: 'Formatar células...', icon: 'fa-solid fa-palette' }
];

let isTranslatingMenu = false;

function translateRightClickMenu() {
  if (isTranslatingMenu) return;
  const menu = document.getElementById('luckysheet-rightclick-menu');
  if (!menu) return;

  isTranslatingMenu = true;
  try {
    // 1. Oculta permanentemente itens inúteis e feios do Luckysheet
    const junkIds = ['luckysheetmatrix', 'luckysheetdatavisual', 'luckysheetInsertImage', 'luckysheetInsertLink'];
    junkIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('height', '0px', 'important');
      }
    });

    // 2. Formata itens de copiar/colar com atalhos estilo Google Sheets
    for (const [id, cfg] of Object.entries(GOOGLE_SHEETS_MENU)) {
      const el = document.getElementById(id) || document.querySelector('.' + id);
      if (el && !el.dataset.translated) {
        el.dataset.translated = "true";
        const shortcutHtml = cfg.shortcut ? `<span class="menu-shortcut">${cfg.shortcut}</span>` : '';
        el.innerHTML = `
          <span style="display:flex; align-items:center; gap:10px;">
            <i class="${cfg.icon}" style="width:16px; text-align:center; font-size:13px; color:var(--text-secondary);"></i>
            <span>${cfg.text}</span>
          </span>
          ${shortcutHtml}
        `;
      }
    }

    // 3. Formata os outros itens do menu
    const items = menu.querySelectorAll('.luckysheet-cols-menuitem');
    items.forEach(item => {
      if (junkIds.includes(item.id)) {
        item.style.setProperty('display', 'none', 'important');
        item.style.setProperty('visibility', 'hidden', 'important');
        item.style.setProperty('height', '0px', 'important');
        return;
      }
      if (item.dataset.translated) return;

      const fullText = item.innerText.trim();
      for (const entry of PT_CONTEXT_ITEMS) {
        if (fullText.toLowerCase().includes(entry.match.toLowerCase())) {
          item.dataset.translated = "true";
          const shortcutHtml = entry.shortcut ? `<span class="menu-shortcut">${entry.shortcut}</span>` : '';
          item.innerHTML = `
            <span style="display:flex; align-items:center; gap:10px;">
              <i class="${entry.icon}" style="width:16px; text-align:center; font-size:13px; color:var(--text-secondary);"></i>
              <span>${entry.text}</span>
            </span>
            ${shortcutHtml}
          `;
          break;
        }
      }
    });
  } finally {
    setTimeout(() => { isTranslatingMenu = false; }, 60);
  }
}

function setupContextMenuObserver() {
  const menu = document.getElementById('luckysheet-rightclick-menu');
  if (menu) {
    const observer = new MutationObserver(() => translateRightClickMenu());
    observer.observe(menu, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  }
}

// --- CONVERSÃO DE COORDENADAS (EX: 0, 1 -> B1) ---
function getCellCoordinate(r, c) {
  let colLetter = '';
  let tempC = c;
  while (tempC >= 0) {
    colLetter = String.fromCharCode((tempC % 26) + 65) + colLetter;
    tempC = Math.floor(tempC / 26) - 1;
  }
  return `${colLetter}${r + 1}`;
}

// --- CONTROLE DE TEMA (DARK / LIGHT) ---
function initTheme() {
  if (AppState.theme === 'dark') {
    document.body.classList.add('dark-mode');
    updateThemeIcon(true);
  } else {
    document.body.classList.remove('dark-mode');
    updateThemeIcon(false);
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  AppState.theme = isDark ? 'dark' : 'light';
  localStorage.setItem('vigi_theme', AppState.theme);
  updateThemeIcon(isDark);
  showToast(isDark ? 'Tema Escuro ativado' : 'Tema Claro ativado', 'info', 2000);
}

function updateThemeIcon(isDark) {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

// --- NOTIFICAÇÕES TOAST ---
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'warning') icon = 'fa-triangle-exclamation';
  if (type === 'error') icon = 'fa-circle-xmark';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --- ATUALIZA STATUS DE SINCRONIZAÇÃO ---
function updateSyncStatus(status, text) {
  const badge = document.getElementById('sync-status');
  const label = document.getElementById('sync-status-text');
  if (!badge || !label) return;

  badge.className = 'sync-badge';
  if (status === 'saving') {
    badge.classList.add('saving');
    label.textContent = text || 'Sincronizando no Supabase...';
  } else if (status === 'error') {
    badge.classList.add('error');
    label.textContent = text || 'Erro ao sincronizar';
  } else if (status === 'pending') {
    badge.classList.add('saving');
    label.textContent = text || 'Alterações pendentes (Ctrl+S)';
  } else {
    label.textContent = text || '☁️ Supabase Conectado';
  }
}

// --- AUTENTICAÇÃO E CONTROLE DE PERMISSÕES ---
function checkAuth() {
  const storedToken = localStorage.getItem('vigi_token') || sessionStorage.getItem('vigi_token');
  const storedUser = localStorage.getItem('vigi_user') || sessionStorage.getItem('vigi_user');

  if (storedToken && storedUser) {
    try {
      AppState.token = storedToken;
      AppState.user = JSON.parse(storedUser);
      applyUserPermissions(AppState.user);
      document.getElementById('login-modal').style.display = 'none';
      loadSpreadsheetData();
      return;
    } catch(e) {}
  }
  
  document.getElementById('login-modal').style.display = 'flex';
}

function applyUserPermissions(user) {
  const userDisplay = document.getElementById('current-user-display');
  const roleBadge = document.getElementById('current-role-badge');
  const btnLogs = document.getElementById('btn-open-logs');

  if (userDisplay) userDisplay.textContent = user.username;
  if (roleBadge) {
    roleBadge.textContent = user.role === 'supervisor' ? 'Supervisor' : 'Agente';
    roleBadge.className = `role-badge ${user.role}`;
  }

  // APENAS Supervisores (Erick e Daniel) têm acesso aos Logs de Auditoria
  if (btnLogs) {
    if (user.role === 'supervisor') {
      btnLogs.style.display = 'inline-flex';
    } else {
      btnLogs.style.display = 'none';
    }
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username').value.trim();
  const passwordInput = document.getElementById('login-password').value.trim();
  const remember = document.getElementById('remember-me').checked;
  const errorBanner = document.getElementById('login-error');
  const errorText = document.getElementById('login-error-text');
  const submitBtn = document.getElementById('btn-login-submit');

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';
  errorBanner.style.display = 'none';

  let loginOk = false;
  let token = null;
  let user = null;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        loginOk = true;
        token = data.token;
        user = data.user;
      }
    }
  } catch (err) {
    console.warn('API local offline, verificando localmente...', err);
  }

  // Validação local de contingência caso servidor esteja offline
  if (!loginOk) {
    const localMatch = LOCAL_USERS[usernameInput.toLowerCase()];
    if (localMatch && localMatch.password === passwordInput) {
      loginOk = true;
      token = `token-${localMatch.username.toLowerCase()}-session`;
      user = { username: localMatch.username, role: localMatch.role, name: localMatch.name };
    }
  }

  if (loginOk) {
    AppState.token = token;
    AppState.user = user;

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('vigi_token', token);
    storage.setItem('vigi_user', JSON.stringify(user));

    applyUserPermissions(user);
    document.getElementById('login-modal').style.display = 'none';
    showToast(`Bem-vindo, ${user.username}! (${user.role.toUpperCase()})`, 'success');
    loadSpreadsheetData();
  } else {
    errorBanner.style.display = 'block';
    errorText.textContent = 'Usuário ou senha incorretos!';
    showToast('Credenciais inválidas!', 'error');
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket" style="margin-right: 6px;"></i> Entrar no Sistema';
}

function handleLogout() {
  if (AppState.hasUnsavedChanges) {
    if (!confirm('Existem alterações não salvas. Deseja realmente sair?')) return;
  }
  localStorage.removeItem('vigi_token');
  localStorage.removeItem('vigi_user');
  sessionStorage.removeItem('vigi_token');
  sessionStorage.removeItem('vigi_user');
  AppState.token = null;
  AppState.user = null;
  document.getElementById('login-modal').style.display = 'flex';
  showToast('Você saiu do sistema', 'info');
}

// --- CARREGAMENTO DE DADOS ---
async function loadSpreadsheetData() {
  updateSyncStatus('saving', 'Buscando dados no Supabase...');
  try {
    let sheets = null;

    try {
      const resLocal = await fetch('/api/sheets', {
        headers: { 'Authorization': `Bearer ${AppState.token}` }
      });
      if (resLocal.ok) {
        const json = await resLocal.json();
        sheets = json.sheets;
      }
    } catch(e) {}

    if (!sheets || !Array.isArray(sheets) || sheets.length === 0) {
      const supabaseUrl = `${SUPABASE_CONFIG.url}/storage/v1/object/public/${SUPABASE_CONFIG.bucket}/sheet_data.json?t=${Date.now()}`;
      const resSupabase = await fetch(supabaseUrl);
      if (resSupabase.ok) {
        sheets = await resSupabase.json();
      }
    }

    if (!sheets || !Array.isArray(sheets) || sheets.length === 0) {
      throw new Error('Não foi possível carregar as planilhas.');
    }

    // Aplica larguras padrão confortáveis para leitura se o usuário ainda não tiver customizado
    sheets = applySensibleColumnWidths(sheets);

    // Garante calcChain ativo para cálculo automático e dinâmico de todas as fórmulas
    sheets.forEach((sheet, sIdx) => {
      if (!sheet.calcChain || sheet.calcChain.length === 0) {
        const chain = [];
        const celldata = sheet.celldata || [];
        celldata.forEach(item => {
          if (item && item.v && item.v.f) {
            chain.push({ r: item.r, c: item.c, index: sheet.index !== undefined ? sheet.index : sIdx });
          }
        });
        if (chain.length > 0) {
          sheet.calcChain = chain;
        }
      }
    });

    AppState.currentSheets = sheets;
    initLuckysheet(sheets);
    updateSyncStatus('ok', '☁️ Supabase Conectado');
    showToast(`Conectado ao Supabase! ${sheets.length} abas carregadas.`, 'success', 3500);
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    updateSyncStatus('error', 'Erro ao carregar');
    showToast(`Erro ao carregar dados: ${err.message}`, 'error', 6000);
  }
}

// Garante larguras amplas para leitura imediata de nomes, logins e endereços
function applySensibleColumnWidths(sheets) {
  return sheets.map(sheet => {
    if (!sheet.config) sheet.config = {};
    if (!sheet.config.columnlen) sheet.config.columnlen = {};
    
    const defaults = { 0: 320, 1: 260, 2: 130, 3: 150, 4: 300, 5: 220, 6: 200, 7: 200 };
    for (const [col, width] of Object.entries(defaults)) {
      if (!sheet.config.columnlen[col]) {
        sheet.config.columnlen[col] = width;
      }
    }
    return sheet;
  });
}

// --- MONITORAMENTO INTELIGENTE DE REDIMENSIONAMENTO DE COLUNA E LINHA ---
const sheetConfigsCache = {};

function setupResizeObserver() {
  document.addEventListener('mouseup', (e) => {
    // Se o clique foi na barra de abas inferior, cabeçalho ou modais, ignora imediatamente
    if (e.target && (
      e.target.closest?.('.luckysheet-sheet-area') ||
      e.target.closest?.('.excel-header') ||
      e.target.closest?.('.modal-overlay') ||
      e.target.closest?.('#luckysheet-rightclick-menu')
    )) {
      return;
    }

    setTimeout(() => {
      if (window.luckysheet && window.luckysheet.getconfig && window.luckysheet.getSheet) {
        const active = window.luckysheet.getSheet();
        if (!active) return;
        const sIndex = active.index;
        const cfg = window.luckysheet.getconfig();
        const currentColStr = JSON.stringify(cfg?.columnlen || {});
        const currentRowStr = JSON.stringify(cfg?.rowlen || {});
        const combined = `${currentColStr}_${currentRowStr}`;

        // Só dispara se a configuração DA MESMA ABA realmente tiver sido alterada pelo usuário
        if (sheetConfigsCache[sIndex] && combined !== sheetConfigsCache[sIndex]) {
          sheetConfigsCache[sIndex] = combined;

          const all = window.luckysheet.getLuckysheetfile();
          if (all) {
            const target = all.find(s => s.index === sIndex);
            if (target) {
              target.config = { ...target.config, ...cfg };
            }
          }

          recordAuditLog({
            action: 'REDIMENSIONAMENTO',
            sheet: AppState.currentSheetName,
            cell: 'Largura da Coluna',
            old_value: 'Dimensão anterior',
            new_value: 'Coluna ajustada pelo usuário'
          });
          onDataModified();
          showToast('Largura da coluna atualizada e salva!', 'info', 2000);
        } else if (!sheetConfigsCache[sIndex]) {
          sheetConfigsCache[sIndex] = combined;
        }
      }
    }, 150);
  });
}

// --- INICIALIZAÇÃO DO LUCKYSHEET ---
function initLuckysheet(sheetsData) {
  if (window.luckysheet && window.luckysheet.destroy) {
    try { window.luckysheet.destroy(); } catch (e) {}
  }

  // Inicializa o cache de configurações de cada aba para evitar falsos salvamentos
  sheetsData.forEach((s, idx) => {
    const sIdx = s.index !== undefined ? s.index : idx;
    const c = s.config || {};
    sheetConfigsCache[sIdx] = `${JSON.stringify(c.columnlen || {})}_${JSON.stringify(c.rowlen || {})}`;
  });

  const options = {
    container: 'luckysheet',
    title: 'VIGI 2026 - Gestão de Clientes',
    lang: 'en',
    allowEdit: true,
    showinfobar: false,
    showsheetbar: true,
    showsheetbarConfig: {
      add: true,
      menu: true,
      sheet: true
    },
    showstatisticBar: true,
    showstatisticBarConfig: {
      count: true,
      view: true,
      zoom: true
    },
    enableAddRow: true,
    enableAddBackTop: false,
    data: sheetsData,
    hook: {
      cellUpdated: function(r, c, oldVal, newVal, isRefresh) {
        if (!isRefresh && oldVal !== newVal) {
          recordAuditLog({
            action: 'ALTERAÇÃO DE CÉLULA',
            sheet: AppState.currentSheetName,
            cell: getCellCoordinate(r, c),
            old_value: String(oldVal !== null && oldVal !== undefined ? oldVal : ''),
            new_value: String(newVal !== null && newVal !== undefined ? newVal : '')
          });

          // Atualiza calcChain se uma fórmula foi inserida e força recálculo dinâmico
          try {
            const curActive = window.luckysheet.getSheet();
            if (curActive) {
              if (!curActive.calcChain) curActive.calcChain = [];
              const sheetData = window.luckysheet.getSheetData();
              const curCell = sheetData && sheetData[r] ? sheetData[r][c] : null;
              if (curCell && curCell.f) {
                const alreadyInChain = curActive.calcChain.some(item => item.r === r && item.c === c);
                if (!alreadyInChain) {
                  curActive.calcChain.push({ r: r, c: c, index: curActive.index });
                }
              }
            }
            if (window.luckysheet && window.luckysheet.refreshFormula) {
              window.luckysheet.refreshFormula();
            }
          } catch (e) {
            console.warn('Recálculo de fórmula:', e);
          }
        }
        onDataModified();
      },
      rangePasteAfter: function(range) {
        recordAuditLog({
          action: 'COLAGEM DE DADOS',
          sheet: AppState.currentSheetName,
          cell: 'Área selecionada',
          old_value: '-',
          new_value: 'Dados colados'
        });
        onDataModified();
      },
      sheetActivate: function(index) {
        AppState.activeSheetIndex = index;
        const file = window.luckysheet.getLuckysheetfile();
        if (file && file[index]) {
          AppState.currentSheetName = file[index].name;
          const cfg = file[index].config || {};
          sheetConfigsCache[index] = `${JSON.stringify(cfg.columnlen || {})}_${JSON.stringify(cfg.rowlen || {})}`;
        }
      },
      sheetCreateAfter: function(sheet) {
        recordAuditLog({
          action: 'CRIAÇÃO DE ABA',
          sheet: sheet ? sheet.name : 'Nova Aba',
          cell: '-',
          old_value: '-',
          new_value: 'Nova aba criada'
        });
        onDataModified();
      },
      sheetDeleteAfter: function(sheet) {
        recordAuditLog({
          action: 'EXCLUSÃO DE ABA',
          sheet: sheet ? sheet.name : 'Aba',
          cell: '-',
          old_value: 'Aba existente',
          new_value: 'Aba excluída'
        });
        onDataModified();
      },
      sheetEditNameAfter: function(index, oldName, newName) {
        recordAuditLog({
          action: 'RENOMEAÇÃO DE ABA',
          sheet: newName,
          cell: '-',
          old_value: oldName,
          new_value: newName
        });
        onDataModified();
      }
    }
  };

  try {
    window.luckysheet.create(options);
    setTimeout(setupContextMenuObserver, 1000);
    setTimeout(setupResizeObserver, 1000);
  } catch(e) {
    console.error('Falha ao criar Luckysheet:', e);
  }
}

// --- REGISTRO DE AUDITORIA / LOGS ---
function recordAuditLog(entry) {
  const log = {
    ...entry,
    user: AppState.user ? AppState.user.username : 'Desconhecido',
    role: AppState.user ? AppState.user.role : 'agente',
    timestamp: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR')
  };
  AppState.pendingLogs.push(log);
}

// --- MONITORAMENTO DE MODIFICAÇÕES & AUTO-SAVE ---
function onDataModified() {
  AppState.hasUnsavedChanges = true;
  updateSyncStatus('pending', 'Alterações pendentes...');

  if (AppState.autoSaveTimer) {
    clearTimeout(AppState.autoSaveTimer);
  }
  AppState.autoSaveTimer = setTimeout(() => {
    saveSpreadsheet(true);
  }, 10000);
}

// --- SALVAMENTO (SUPABASE + LOCAL + LOGS) ---
async function saveSpreadsheet(isAutoSave = false) {
  if (AppState.isSaving) return;
  AppState.isSaving = true;

  if (AppState.autoSaveTimer) {
    clearTimeout(AppState.autoSaveTimer);
    AppState.autoSaveTimer = null;
  }

  updateSyncStatus('saving', isAutoSave ? 'Salvamento automático...' : 'Sincronizando com Supabase...');
  const saveBtn = document.getElementById('btn-save');
  if (saveBtn) {
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Salvando...</span>';
    saveBtn.disabled = true;
  }

  try {
    // Garante que o config atualizado (larguras de colunas e alturas) seja mesclado
    const sheetsData = window.luckysheet.getLuckysheetfile ? window.luckysheet.getLuckysheetfile() : window.luckysheet.getAllSheets();
    const activeSheet = window.luckysheet.getSheet ? window.luckysheet.getSheet() : null;
    const currentConfig = window.luckysheet.getconfig ? window.luckysheet.getconfig() : null;

    if (activeSheet && currentConfig && Array.isArray(sheetsData)) {
      const target = sheetsData.find(s => s.index === activeSheet.index);
      if (target) {
        target.config = { ...target.config, ...currentConfig };
      }
    }

    const logsToSend = [...AppState.pendingLogs];
    AppState.pendingLogs = [];

    let savedInSupabase = false;
    let savedLocally = false;

    // 1. Salva no Supabase Storage Bucket
    try {
      const jsonStr = JSON.stringify(sheetsData);
      const resSupa = await fetch(`${SUPABASE_CONFIG.url}/storage/v1/object/${SUPABASE_CONFIG.bucket}/sheet_data.json`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.serviceRole,
          'Authorization': `Bearer ${SUPABASE_CONFIG.serviceRole}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true'
        },
        body: jsonStr
      });
      if (resSupa.ok) savedInSupabase = true;
    } catch(err) {}

    // 2. Salva no servidor local para atualizar o Excel e gravar os logs
    try {
      const resLocal = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AppState.token}`
        },
        body: JSON.stringify({
          sheets: sheetsData,
          logs: logsToSend
        })
      });
      if (resLocal.ok) savedLocally = true;
    } catch(err) {}

    if (savedInSupabase || savedLocally) {
      AppState.hasUnsavedChanges = false;
      updateSyncStatus('ok', '☁️ Supabase Conectado');
      if (!isAutoSave) {
        showToast('Planilha salva no Supabase Cloud e no Excel!', 'success');
      }
    } else {
      throw new Error('Falha ao gravar os dados.');
    }
  } catch (err) {
    console.error('Erro ao salvar:', err);
    updateSyncStatus('error', 'Falha ao salvar');
    showToast(`Erro ao salvar: ${err.message}`, 'error');
  } finally {
    AppState.isSaving = false;
    if (saveBtn) {
      saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>Salvar</span>';
      saveBtn.disabled = false;
    }
  }
}

// --- MODAL DE AUDITORIA & LOGS (EXCLUSIVO SUPERVISORES) ---
async function openAuditLogsModal() {
  if (!AppState.user || AppState.user.role !== 'supervisor') {
    showToast('Acesso negado: apenas Supervisores podem acessar os logs.', 'error');
    return;
  }

  const modal = document.getElementById('logs-modal');
  modal.style.display = 'flex';
  await fetchAuditLogs();
}

async function fetchAuditLogs() {
  const tbody = document.getElementById('logs-table-body');
  const counter = document.getElementById('logs-counter');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando registros de auditoria no Supabase...</td></tr>`;

  try {
    let logs = [];

    // 1. Tenta API do servidor
    try {
      const res = await fetch('/api/logs', {
        headers: { 'Authorization': `Bearer ${AppState.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        logs = data.logs || [];
      }
    } catch(e) {}

    // 2. Se falhar, busca direto no Supabase Storage
    if (logs.length === 0) {
      const supaUrl = `${SUPABASE_CONFIG.url}/storage/v1/object/public/${SUPABASE_CONFIG.bucket}/change_logs.json?t=${Date.now()}`;
      const resSupa = await fetch(supaUrl);
      if (resSupa.ok) {
        logs = await resSupa.json();
      }
    }

    AppState.allAuditLogs = logs;
    renderAuditLogsTable(logs);
    if (counter) counter.textContent = `Total: ${logs.length} alterações registradas`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 20px;">Erro ao carregar logs: ${err.message}</td></tr>`;
  }
}

function renderAuditLogsTable(logs) {
  const tbody = document.getElementById('logs-table-body');
  if (!tbody) return;

  const userFilter = document.getElementById('log-filter-user').value.toLowerCase();
  const sheetFilter = document.getElementById('log-filter-sheet').value.toLowerCase();
  const searchFilter = document.getElementById('log-search-text').value.toLowerCase();

  const filtered = logs.filter(item => {
    if (userFilter && item.user.toLowerCase() !== userFilter) return false;
    if (sheetFilter && item.sheet.toLowerCase() !== sheetFilter) return false;
    if (searchFilter) {
      const text = `${item.cell} ${item.old_value} ${item.new_value} ${item.action}`.toLowerCase();
      if (!text.includes(searchFilter)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-secondary);">Nenhum registro encontrado com os filtros atuais.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td style="color: var(--text-secondary);">${item.timestamp}</td>
      <td>
        <strong>${item.user}</strong>
        <span class="role-badge ${item.role}" style="margin-left: 4px;">${item.role}</span>
      </td>
      <td><span style="font-weight: 500;">${item.sheet}</span></td>
      <td><code>${item.cell}</code></td>
      <td><span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: var(--hover-bg);">${item.action}</span></td>
      <td style="color: #ef4444; text-decoration: line-through; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${escapeHtml(item.old_value || '-')}
      </td>
      <td style="color: #10b981; font-weight: 600; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${escapeHtml(item.new_value || '-')}
      </td>
    </tr>
  `).join('');
}

function exportLogsToCSV() {
  if (!AppState.allAuditLogs || AppState.allAuditLogs.length === 0) {
    showToast('Nenhum log para exportar', 'warning');
    return;
  }

  let csv = 'Data e Hora;Usuario;Cargo;Aba;Celula;Acao;Valor Anterior;Valor Novo\n';
  AppState.allAuditLogs.forEach(l => {
    csv += `"${l.timestamp}";"${l.user}";"${l.role}";"${l.sheet}";"${l.cell}";"${l.action}";"${(l.old_value||'').replace(/"/g, '""')}";"${(l.new_value||'').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `VIGI_Auditoria_Logs_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('Relatório de auditoria exportado com sucesso!', 'success');
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- EXPORTAR EXCEL (.XLSX) ---
async function downloadExcelFile() {
  showToast('Gerando arquivo Excel...', 'info');

  try {
    const res = await fetch('/api/download-excel', {
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VIGI_2026_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Download do Excel concluído!', 'success');
      return;
    }
  } catch (e) {}

  try {
    const sheets = window.luckysheet.getAllSheets();
    const wb = XLSX.utils.book_new();

    sheets.forEach(sheet => {
      const sheetName = (sheet.name || 'Sheet').substring(0, 31).replace(/[:\/\\*?\[\]]/g, '_');
      const rows = [];

      if (sheet.data && sheet.data.length > 0) {
        sheet.data.forEach(row => {
          const rowData = [];
          row.forEach(cell => {
            if (cell) {
              rowData.push(cell.m !== undefined ? cell.m : (cell.v !== undefined ? cell.v : ''));
            } else {
              rowData.push('');
            }
          });
          rows.push(rowData);
        });
      } else if (sheet.celldata) {
        let maxR = 0, maxC = 0;
        sheet.celldata.forEach(item => {
          if (item.r > maxR) maxR = item.r;
          if (item.c > maxC) maxC = item.c;
        });
        for (let r = 0; r <= maxR; r++) {
          const rowData = [];
          for (let c = 0; c <= maxC; c++) rowData.push('');
          rows.push(rowData);
        }
        sheet.celldata.forEach(item => {
          const val = item.v ? (item.v.m || item.v.v || '') : '';
          rows[item.r][item.c] = val;
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `VIGI_2026_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Download concluído via SheetJS!', 'success');
  } catch (err) {
    showToast('Erro ao exportar: ' + err.message, 'error');
  }
}

// --- IMPORTAR EXCEL (.XLSX) ---
function handleExcelUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.xlsx')) {
    showToast('Por favor, selecione um arquivo no formato .xlsx', 'warning');
    return;
  }

  showToast('Lendo e convertendo arquivo Excel...', 'info');

  if (window.LuckyExcel) {
    window.LuckyExcel.transformExcelToLucky(file, function(exportJson) {
      if (!exportJson.sheets || exportJson.sheets.length === 0) {
        showToast('Não foi possível ler as planilhas do arquivo enviado!', 'error');
        return;
      }
      initLuckysheet(exportJson.sheets);
      recordAuditLog({
        action: 'IMPORTAÇÃO DE PLANILHA',
        sheet: 'Todas as Abas',
        cell: '-',
        old_value: 'Versão anterior',
        new_value: `Arquivo importado: ${file.name}`
      });
      onDataModified();
      showToast('Planilha importada! Clique em Salvar para fixar na nuvem.', 'success', 5000);
    });
  }
}

// --- BUSCA GLOBAL ---
function handleGlobalSearch(e) {
  if (e.key === 'Enter') {
    const query = e.target.value.trim().toLowerCase();
    if (!query) return;

    const sheets = window.luckysheet.getAllSheets();
    const matches = [];

    sheets.forEach((sheet, sheetIdx) => {
      if (sheet.data) {
        sheet.data.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (cell && (cell.v || cell.m)) {
              const text = String(cell.m || cell.v).toLowerCase();
              if (text.includes(query)) {
                matches.push({ sheetIdx, r, c, val: cell.v });
              }
            }
          });
        });
      } else if (sheet.celldata) {
        sheet.celldata.forEach(item => {
          if (item.v && (item.v.v || item.v.m)) {
            const text = String(item.v.m || item.v.v).toLowerCase();
            if (text.includes(query)) {
              matches.push({ sheetIdx, r: item.r, c: item.c, val: item.v.v });
            }
          }
        });
      }
    });

    const countBadge = document.getElementById('search-count');
    if (matches.length > 0) {
      AppState.searchResults = matches;
      AppState.searchCurrentIndex = 0;
      countBadge.style.display = 'inline';
      countBadge.textContent = `1/${matches.length}`;
      goToSearchResult(0);
      showToast(`Encontrado ${matches.length} resultados para "${query}"`, 'info');
    } else {
      countBadge.style.display = 'inline';
      countBadge.textContent = '0 encontrados';
      showToast(`Nenhum resultado encontrado para "${query}"`, 'warning');
    }
  }
}

function goToSearchResult(index) {
  if (!AppState.searchResults || AppState.searchResults.length === 0) return;
  const match = AppState.searchResults[index];
  window.luckysheet.setSheetActive(match.sheetIdx);
  window.luckysheet.setRangeShow([{ row: [match.r, match.r], column: [match.c, match.c] }]);
  window.luckysheet.scroll({ targetRow: match.r, targetColumn: match.c });
}

// --- INFORMAÇÕES DE REDE ---
async function showNetworkModal() {
  const modal = document.getElementById('network-modal');
  const linksContainer = document.getElementById('network-links-container');
  modal.style.display = 'flex';

  try {
    const res = await fetch('/api/network-info');
    if (res.ok) {
      const data = await res.json();
      linksContainer.innerHTML = '';

      linksContainer.innerHTML += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
          <div>
            <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary); display: block;">NO COMPUTADOR ATUAL:</span>
            <code style="font-size: 13px; color: var(--text-main);">${data.local_url}</code>
          </div>
          <button onclick="navigator.clipboard.writeText('${data.local_url}'); showToast('Link copiado!', 'info')" style="padding: 4px 10px; font-size: 12px; cursor: pointer; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-main);">Copiar</button>
        </div>
      `;

      data.network_urls.forEach(url => {
        linksContainer.innerHTML += `
          <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
            <div>
              <span style="font-size: 11px; font-weight: 600; color: #15803d; display: block;">EM OUTROS PCs / CELULARES:</span>
              <code style="font-size: 13px; color: var(--text-main); font-weight: 600;">${url}</code>
            </div>
            <button onclick="navigator.clipboard.writeText('${url}'); showToast('Link copiado!', 'info')" style="padding: 4px 10px; font-size: 12px; cursor: pointer; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-main);">Copiar</button>
          </div>
        `;
      });
    }
  } catch (e) {}
}

// --- ATALHOS DE TECLADO ---
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveSpreadsheet(false);
  }
});

// --- INICIALIZAÇÃO DE EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Alternar Tema
  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) btnTheme.addEventListener('click', toggleTheme);

  // Login
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  // Toggle Senha
  const togglePwd = document.getElementById('toggle-password');
  const pwdInput = document.getElementById('login-password');
  if (togglePwd && pwdInput) {
    togglePwd.addEventListener('click', () => {
      const isPassword = pwdInput.type === 'password';
      pwdInput.type = isPassword ? 'text' : 'password';
      togglePwd.className = isPassword ? 'fa-regular fa-eye-slash toggle-pwd' : 'fa-regular fa-eye toggle-pwd';
    });
  }

  // Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', handleLogout);

  // Salvar
  const btnSave = document.getElementById('btn-save');
  if (btnSave) btnSave.addEventListener('click', () => saveSpreadsheet(false));

  // Logs de Alterações (Supervisor)
  const btnLogs = document.getElementById('btn-open-logs');
  if (btnLogs) btnLogs.addEventListener('click', openAuditLogsModal);
  const closeLogsModal = document.getElementById('close-logs-modal');
  if (closeLogsModal) closeLogsModal.addEventListener('click', () => {
    document.getElementById('logs-modal').style.display = 'none';
  });

  // Filtros de Logs
  const logFilterUser = document.getElementById('log-filter-user');
  if (logFilterUser) logFilterUser.addEventListener('change', () => renderAuditLogsTable(AppState.allAuditLogs));
  const logFilterSheet = document.getElementById('log-filter-sheet');
  if (logFilterSheet) logFilterSheet.addEventListener('change', () => renderAuditLogsTable(AppState.allAuditLogs));
  const logSearchText = document.getElementById('log-search-text');
  if (logSearchText) logSearchText.addEventListener('input', () => renderAuditLogsTable(AppState.allAuditLogs));
  const btnRefreshLogs = document.getElementById('btn-refresh-logs');
  if (btnRefreshLogs) btnRefreshLogs.addEventListener('click', fetchAuditLogs);
  const btnExportLogs = document.getElementById('btn-export-logs');
  if (btnExportLogs) btnExportLogs.addEventListener('click', exportLogsToCSV);

  // Baixar Excel
  const btnDownload = document.getElementById('btn-download');
  if (btnDownload) btnDownload.addEventListener('click', downloadExcelFile);

  // Importar Excel
  const btnUploadTrigger = document.getElementById('btn-upload-trigger');
  const fileInput = document.getElementById('excel-file-input');
  if (btnUploadTrigger && fileInput) {
    btnUploadTrigger.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleExcelUpload);
  }

  // Modal Rede
  const btnNetwork = document.getElementById('btn-network-info');
  if (btnNetwork) btnNetwork.addEventListener('click', showNetworkModal);
  const closeNetModal = document.getElementById('close-network-modal');
  if (closeNetModal) closeNetModal.addEventListener('click', () => {
    document.getElementById('network-modal').style.display = 'none';
  });

  // Tela Cheia
  const btnFullscreen = document.getElementById('btn-fullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });
  }

  // Busca Global
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) searchInput.addEventListener('keydown', handleGlobalSearch);

  // Monitora clique com botão direito na área da planilha para traduzir o menu
  document.addEventListener('contextmenu', (e) => {
    setTimeout(translateRightClickMenu, 10);
    setTimeout(translateRightClickMenu, 50);
    setTimeout(translateRightClickMenu, 150);
  });

  window.addEventListener('beforeunload', function(e) {
    if (AppState.hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'Existem alterações não salvas. Deseja realmente sair?';
      return e.returnValue;
    }
  });

  checkAuth();
});
