// Data and State
const sysState = {
    user: 'web_os_user',
    zIdx: 100,
    wallpaper: "url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop')",
    // Real File System State
    rootHandle: null,
    pathHandles: [], // stack of handles [root, child1, child2]
    activeFileHandle: null // for notepad
};

function getCurrentDirHandle() {
    if (sysState.pathHandles.length > 0) {
        return sysState.pathHandles[sysState.pathHandles.length - 1];
    }
    return null;
}

function getCurrentPathStr() {
    if (sysState.pathHandles.length === 0) return '/home/user (mock)';
    return '/' + sysState.pathHandles.map(h => h.name).join('/');
}

// Global File System Mock (Fallback)
const mockFileSystem = {
    '/home/user (mock)': [
        { name: 'Documents', type: 'folder', icon: 'bxs-folder', color: '#6C8EBF' },
        { name: 'Pictures', type: 'folder', icon: 'bxs-folder', color: '#6C8EBF' },
        { name: 'Downloads', type: 'folder', icon: 'bxs-folder', color: '#6C8EBF' },
        { name: 'welcome.txt', type: 'file', icon: 'bxs-file-txt', color: '#ccc' }
    ]
};

// Apps Registry
const apps = {
    terminal: { title: 'Terminal', icon: 'bx-terminal', init: initTerminal, tpl: 'tpl-terminal', width: 600, height: 400 },
    files: { title: 'File Explorer', icon: 'bx-folder', init: initFiles, tpl: 'tpl-files', width: 750, height: 500 },
    browser: { title: 'Internet Browser', icon: 'bx-globe', init: initBrowser, tpl: 'tpl-browser', width: 800, height: 550 },
    calculator: { title: 'Calculator', icon: 'bx-calculator', init: initCalculator, tpl: 'tpl-calculator', width: 320, height: 450 },
    editor: { title: 'Notepad', icon: 'bx-notepad', init: initEditor, tpl: 'tpl-editor', width: 500, height: 400 },
    settings: { title: 'Settings', icon: 'bx-cog', init: initSettings, tpl: 'tpl-settings', width: 650, height: 450 }
};

// DOM Elements
const screens = {
    boot: document.getElementById('boot-screen'),
    login: document.getElementById('login-screen'),
    desktop: document.getElementById('desktop')
};

// Initialization Sequence
setTimeout(() => {
    screens.boot.classList.add('hidden');
    screens.login.classList.remove('hidden');
    document.getElementById('login-password').focus();
}, 1500);

// Load settings from localStorage
if (localStorage.getItem('webos_wallpaper')) {
    sysState.wallpaper = `url('${localStorage.getItem('webos_wallpaper')}')`;
    document.documentElement.style.setProperty('--desktop-bg', sysState.wallpaper);
}

// Login Logic
const loginPasswordInput = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');

function doLogin() {
    screens.login.classList.add('hidden');
    screens.desktop.classList.remove('hidden');
    updateClock();
    setInterval(updateClock, 60000);
}

loginPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
});
loginBtn.addEventListener('click', doLogin);

// Desktop Logic
const startBtn = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');
const windowsContainer = document.getElementById('windows-container');
const taskbarApps = document.getElementById('taskbar-apps');
const powerBtn = document.getElementById('power-btn');

startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!startMenu.contains(e.target) && !startBtn.contains(e.target)) {
        startMenu.classList.add('hidden');
    }
});

// Launch Apps setup
document.querySelectorAll('.desktop-icon, .menu-item').forEach(el => {
    el.addEventListener('click', () => {
        const appId = el.dataset.app;
        if(appId) openWindow(appId);
        startMenu.classList.add('hidden');
    });
});

powerBtn.addEventListener('click', () => {
    location.reload();
});

// Window Manager
function openWindow(appId) {
    const app = apps[appId];
    if (!app) return;
    sysState.zIdx++;
    
    const win = document.createElement('div');
    win.className = 'os-window glass-panel';
    win.style.width = app.width + 'px';
    win.style.height = app.height + 'px';
    
    const offset = Math.random() * 40;
    win.style.top = (50 + offset) + 'px';
    win.style.left = (150 + offset) + 'px';
    win.style.zIndex = sysState.zIdx;
    
    // Check if it's the editor and we have a specific file handle request
    if (appId === 'editor') {
        win.dataset.editorInstance = Date.now();
    }

    const header = document.createElement('div');
    header.className = 'window-header';
    header.innerHTML = `
        <div class="window-title"><i class='bx ${app.icon}'></i> <span class="win-title-text">${app.title}</span></div>
        <div class="window-controls">
            <button class="win-btn minimize"><i class='bx bx-minus'></i></button>
            <button class="win-btn maximize"><i class='bx bx-stop'></i></button>
            <button class="win-btn close"><i class='bx bx-x'></i></button>
        </div>
    `;
    
    const content = document.createElement('div');
    content.className = 'window-content';
    const tpl = document.getElementById(app.tpl);
    content.appendChild(tpl.content.cloneNode(true));
    
    win.appendChild(header);
    win.appendChild(content);
    windowsContainer.appendChild(win);
    
    const tbIcon = document.createElement('div');
    tbIcon.className = 'taskbar-app active';
    tbIcon.innerHTML = `<i class='bx ${app.icon}'></i>`;
    tbIcon.addEventListener('click', () => {
        sysState.zIdx++;
        win.style.zIndex = sysState.zIdx;
    });
    taskbarApps.appendChild(tbIcon);
    
    setupWindowDrag(win, header);
    win.addEventListener('mousedown', () => {
        sysState.zIdx++;
        win.style.zIndex = sysState.zIdx;
    });
    
    let isMaximized = false;
    let preMaxRect = {};
    const maximizeBtn = header.querySelector('.maximize');
    
    function toggleMaximize() {
        if (!isMaximized) {
            preMaxRect = { w: win.style.width, h: win.style.height, t: win.style.top, l: win.style.left };
            win.style.width = '100%';
            win.style.height = 'calc(100% - 50px)';
            win.style.top = '0';
            win.style.left = '0';
            win.classList.add('maximized');
        } else {
            win.style.width = preMaxRect.w;
            win.style.height = preMaxRect.h;
            win.style.top = preMaxRect.t;
            win.style.left = preMaxRect.l;
            win.classList.remove('maximized');
        }
        isMaximized = !isMaximized;
    }
    
    maximizeBtn.addEventListener('click', toggleMaximize);
    header.addEventListener('dblclick', toggleMaximize);
    
    header.querySelector('.close').addEventListener('click', () => {
        win.style.opacity = '0';
        win.style.transform = 'scale(0.9)';
        setTimeout(() => {
            win.remove();
            tbIcon.remove();
            // Free active handle if this was the editor
            if (appId === 'editor') sysState.activeFileHandle = null; 
        }, 200);
    });
    
    if (app.init) {
        app.init(win);
    }
}

function setupWindowDrag(win, header) {
    let isDragging = false;
    let startX, startY, initLeft, initTop;
    
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.window-controls')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = win.getBoundingClientRect();
        initLeft = rect.left;
        initTop = rect.top;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        if (win.classList.contains('maximized')) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        win.style.left = (initLeft + dx) + 'px';
        win.style.top = (initTop + topBound(initTop + dy)) + 'px';
        
        function topBound(y) { return y < 0 ? 0 : dy; }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// App Logic: Terminal
function initTerminal(win) {
    const output = win.querySelector('.terminal-output');
    const input = win.querySelector('.terminal-input');
    const promptEl = win.querySelector('.prompt');
    
    function log(text) {
        const div = document.createElement('div');
        div.textContent = text;
        output.appendChild(div);
        output.parentElement.scrollTop = output.parentElement.scrollHeight;
    }

    function logHTML(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        output.appendChild(div);
        output.parentElement.scrollTop = output.parentElement.scrollHeight;
    }
    
    async function executeCommand(val) {
        const args = val.split(' ').filter(v => v);
        const cmd = args[0].toLowerCase();
        let handle = getCurrentDirHandle();
        promptEl.textContent = `user@webos:${getCurrentPathStr()}$`;

        switch (cmd) {
            case 'help':
                log('Available commands: help, ls, pwd, cd, echo, whoami, clear, date, mkdir, touch, rm, cat');
                break;
            case 'clear':
                output.innerHTML = '';
                break;
            case 'whoami':
                log(sysState.user);
                break;
            case 'date':
                log(new Date().toString());
                break;
            case 'pwd':
                log(getCurrentPathStr());
                break;
            case 'echo':
                log(args.slice(1).join(' '));
                break;
            case 'ls':
                if (handle) {
                    let items = [];
                    for await (const [name, childHandle] of handle.entries()) {
                        if (childHandle.kind === 'directory') items.push(`<span style="color:#58a6ff;">${name}/</span>`);
                        else items.push(name);
                    }
                    logHTML(items.join('  '));
                } else {
                    log('Documents/  Pictures/  Downloads/  welcome.txt');
                }
                break;
            case 'cd':
                if (!args[1]) {
                    log('cd: missing argument');
                    break;
                }
                if (!window.showDirectoryPicker) {
                    log('cd: Local filesystem access not supported or drive not mounted. Mount a drive in Files app first.');
                    break;
                }
                if (!handle) {
                    log('cd: Mount a drive in Files app first.');
                    break;
                }
                
                if (args[1] === '..') {
                    if (sysState.pathHandles.length > 1) sysState.pathHandles.pop();
                } else {
                    try {
                        const newHandle = await handle.getDirectoryHandle(args[1]);
                        sysState.pathHandles.push(newHandle);
                    } catch (e) {
                        log(`cd: ${args[1]}: No such file or directory`);
                    }
                }
                promptEl.textContent = `user@webos:${getCurrentPathStr()}$`;
                break;
            case 'mkdir':
                if (!handle) { log('mkdir: Mount a drive first'); break; }
                if (!args[1]) { log('mkdir: missing operand'); break; }
                try {
                    await handle.getDirectoryHandle(args[1], { create: true });
                } catch(e) { log(`mkdir: cannot create directory '${args[1]}': Permission denied`); }
                break;
            case 'touch':
                if (!handle) { log('touch: Mount a drive first'); break; }
                if (!args[1]) { log('touch: missing file operand'); break; }
                try {
                    await handle.getFileHandle(args[1], { create: true });
                } catch(e) { log(`touch: cannot touch '${args[1]}': Permission denied`); }
                break;
            case 'rm':
                if (!handle) { log('rm: Mount a drive first'); break; }
                if (!args[1]) { log('rm: missing operand'); break; }
                try {
                    await handle.removeEntry(args[1], { recursive: args.includes('-r') });
                } catch(e) { log(`rm: cannot remove '${args[1]}': No such file or directory`); }
                break;
            case 'cat':
                if (!handle) { log('cat: Mount a drive first'); break; }
                if (!args[1]) { log('cat: missing file operand'); break; }
                try {
                    const fh = await handle.getFileHandle(args[1]);
                    const file = await fh.getFile();
                    const text = await file.text();
                    log(text);
                } catch(e) { log(`cat: ${args[1]}: No such file or directory`); }
                break;
            case 'apt':
                log('apt: permission denied (are you root?) - Note: Sandbox prevents native package manager execution.');
                break;
            case 'sudo':
                log(`[sudo] password for ${sysState.user}: `);
                setTimeout(() => log('Sorry, try again.'), 1000);
                break;
            default:
                log(`${cmd}: command not found`);
                break;
        }
        
        // Notify File Manager if open to re-render in case of file changes
        document.dispatchEvent(new CustomEvent('fs-changed'));
    }

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const val = input.value.trim();
            input.value = '';
            
            const cmdDiv = document.createElement('div');
            cmdDiv.innerHTML = `<span class="prompt">${promptEl.textContent}</span> ${val}`;
            output.appendChild(cmdDiv);
            
            if (val) {
                input.disabled = true;
                await executeCommand(val);
                input.disabled = false;
                input.focus();
            }
            output.parentElement.scrollTop = output.parentElement.scrollHeight;
        }
    });

    promptEl.textContent = `user@webos:${getCurrentPathStr()}$`;
    input.focus();
    win.addEventListener('click', () => input.focus());
}

// App Logic: File Explorer
function initFiles(win) {
    const grid = win.querySelector('#file-grid-container');
    const pathBar = win.querySelector('#fm-path');
    const mountBtn = win.querySelector('#btn-mount');
    const sidebarItems = win.querySelectorAll('.nav-item');
    let selectedItem = null;

    async function renderFiles() {
        grid.innerHTML = '';
        pathBar.textContent = getCurrentPathStr();
        const handle = getCurrentDirHandle();
        
        if (!handle) {
            // Render Mock
            const contents = mockFileSystem['/home/user (mock)'];
            contents.forEach(item => {
                const div = document.createElement('div');
                div.className = 'file-item';
                div.innerHTML = `<i class='bx ${item.icon}' style="color: ${item.color};"></i><span>${item.name}</span>`;
                grid.appendChild(div);
            });
            return;
        }

        // Render Real Files via File System Access API
        let count = 0;
        try {
            for await (const [name, entry] of handle.entries()) {
                count++;
                const isDir = entry.kind === 'directory';
                const div = document.createElement('div');
                div.className = 'file-item';
                const icon = isDir ? 'bxs-folder' : 'bxs-file-blank';
                const color = isDir ? '#6C8EBF' : '#ccc';
                
                div.innerHTML = `<i class='bx ${icon}' style="color: ${color};"></i><span>${name}</span>`;
                
                div.addEventListener('click', () => {
                    if (selectedItem) selectedItem.style.background = '';
                    selectedItem = div;
                    selectedItem.dataset.name = name;
                    selectedItem.dataset.kind = entry.kind;
                    selectedItem.style.background = 'rgba(255,255,255,0.2)';
                });

                div.addEventListener('dblclick', async () => {
                    if (isDir) {
                        try {
                            const newHandle = await handle.getDirectoryHandle(name);
                            sysState.pathHandles.push(newHandle);
                            renderFiles();
                        } catch(e) { alert('Access error'); }
                    } else {
                        // Open Editor
                        sysState.activeFileHandle = await handle.getFileHandle(name);
                        openWindow('editor');
                    }
                });
                grid.appendChild(div);
            }
        } catch(e) {
            grid.innerHTML = `<div style="width:100%; text-align:center; color:#f85149; margin-top:20px;">Permission denied to read folder</div>`;
        }

        if (count === 0) {
            grid.innerHTML = '<div style="width:100%; text-align:center; color:#888; margin-top:20px;">Folder is empty</div>';
        }
    }

    renderFiles();
    
    // Listen for terminal changes
    document.addEventListener('fs-changed', renderFiles);

    mountBtn.addEventListener('click', async () => {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            sysState.rootHandle = dirHandle;
            sysState.pathHandles = [dirHandle];
            mountBtn.innerHTML = "<i class='bx bx-check'></i> Mounted";
            sidebarItems.forEach(i => i.classList.remove('active'));
            renderFiles();
        } catch (e) {
            console.warn("Mount cancelled or failed");
        }
    });

    win.querySelector('#btn-up').addEventListener('click', () => {
        if (sysState.pathHandles.length > 1) {
            sysState.pathHandles.pop();
            renderFiles();
        }
    });

    win.querySelector('#btn-new-folder').addEventListener('click', async () => {
        let handle = getCurrentDirHandle();
        if (!handle) return alert("Mount a drive to create real folders.");
        const name = prompt('Folder Name:');
        if (name) {
            try { 
                await handle.getDirectoryHandle(name, { create: true }); 
                renderFiles(); 
            } catch(e) { alert("Failed to create folder"); }
        }
    });

    win.querySelector('#btn-new-file').addEventListener('click', async () => {
        let handle = getCurrentDirHandle();
        if (!handle) return alert("Mount a drive to create real files.");
        const name = prompt('File Name:');
        if (name) {
            try { 
                await handle.getFileHandle(name, { create: true }); 
                renderFiles(); 
            } catch(e) { alert("Failed to create file"); }
        }
    });

    win.querySelector('#btn-delete').addEventListener('click', async () => {
        let handle = getCurrentDirHandle();
        if (!handle) return alert("Mount a drive first.");
        if (selectedItem) {
            const name = selectedItem.dataset.name;
            const isDir = selectedItem.dataset.kind === 'directory';
            if (confirm(`Permanent real delete of ${name}?`)) {
                try {
                    await handle.removeEntry(name, { recursive: isDir });
                    selectedItem = null;
                    renderFiles();
                } catch(e) { alert("Failed to delete"); }
            }
        } else {
            alert('Select a file to delete first.');
        }
    });
}

// App Logic: Browser
function initBrowser(win) {
    const iframe = win.querySelector('#browser-iframe');
    const urlBar = win.querySelector('#browser-url');
    const goBtn = win.querySelector('#browser-go');
    const reloadBtn = win.querySelector('#browser-reload');

    function navigate() {
        let url = urlBar.value.trim();
        if (!url.startsWith('http')) url = 'https://' + url;
        iframe.src = url;
    }

    goBtn.addEventListener('click', navigate);
    urlBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') navigate();
    });
    reloadBtn.addEventListener('click', () => {
        iframe.src = iframe.src;
    });
}

// App Logic: Calculator
function initCalculator(win) {
    const display = win.querySelector('#calc-display');
    const btns = win.querySelectorAll('.calc-btn');
    let expr = '';

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.dataset.val;

            if (val === 'C') {
                expr = '';
                display.textContent = '0';
            } else if (val === 'DEL') {
                expr = expr.slice(0, -1);
                display.textContent = expr || '0';
            } else if (val === '=') {
                try {
                    const res = new Function('return ' + expr)();
                    expr = String(res);
                    display.textContent = expr;
                } catch {
                    display.textContent = 'Error';
                    expr = '';
                }
            } else {
                expr += val;
                display.textContent = expr;
            }
        });
    });
}

// App Logic: Editor
async function initEditor(win) {
    const titleEl = win.querySelector('.win-title-text');
    const textarea = win.querySelector('.editor-textarea');
    const saveBtn = win.querySelector('#editor-save-btn');
    const clearBtn = win.querySelector('#editor-clear-btn');
    
    // Load Real File if handle exists
    if (sysState.activeFileHandle) {
        titleEl.textContent = `Notepad - ${sysState.activeFileHandle.name}`;
        try {
            const file = await sysState.activeFileHandle.getFile();
            textarea.value = await file.text();
        } catch(e) {
            textarea.value = "Error reading file data.";
        }
    } else {
        textarea.value = localStorage.getItem('webos_notepad') || '';
    }
    
    saveBtn.addEventListener('click', async () => {
        if (sysState.activeFileHandle) {
            try {
                const writable = await sysState.activeFileHandle.createWritable();
                await writable.write(textarea.value);
                await writable.close();
                saveBtn.innerHTML = "<i class='bx bx-check'></i> Saved";
            } catch (e) {
                alert("Failed to write to physical file!");
            }
        } else {
            localStorage.setItem('webos_notepad', textarea.value);
            saveBtn.innerHTML = "<i class='bx bx-check'></i> Saved";
        }
        setTimeout(() => saveBtn.innerHTML = "<i class='bx bx-save'></i> Save", 2000);
    });
    
    clearBtn.addEventListener('click', () => {
        textarea.value = '';
        if (!sysState.activeFileHandle) {
            localStorage.removeItem('webos_notepad');
        }
    });

    // Cleanup active file handle on close is handled in window manager
}

// App Logic: Settings
function initSettings(win) {
    const tabs = win.querySelectorAll('.settings-tab');
    const tabAppearance = win.querySelector('#tab-appearance');
    const tabSystem = win.querySelector('#tab-system');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (tab.dataset.tab === 'appearance') {
                tabAppearance.classList.remove('hidden');
                tabSystem.classList.add('hidden');
            } else {
                tabAppearance.classList.add('hidden');
                tabSystem.classList.remove('hidden');
            }
        });
    });

    const thumbs = win.querySelectorAll('.wp-thumb');
    const customUrl = win.querySelector('#custom-wp-url');
    const applyBtn = win.querySelector('#apply-custom-wp');

    function setWallpaper(url) {
        sysState.wallpaper = `url('${url}')`;
        document.documentElement.style.setProperty('--desktop-bg', sysState.wallpaper);
        localStorage.setItem('webos_wallpaper', url);
        thumbs.forEach(t => t.classList.remove('active'));
    }

    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            const url = thumb.src;
            setWallpaper(url);
            thumb.classList.add('active');
            customUrl.value = '';
        });
    });

    applyBtn.addEventListener('click', () => {
        if (customUrl.value) {
            setWallpaper(customUrl.value);
        }
    });
}

function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
