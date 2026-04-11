document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT With Local Storage ---
    let state = {
        currentView: 'day',
        date: new Date(),
        tasks: []
    };

    let taskToDeleteId = null; // Used for the action modal

    // --- LOCAL STORAGE HANDLING ---
    function loadStorage() {
        const stored = localStorage.getItem('my_schedule_planner');
        if (stored) {
            try {
                state.tasks = JSON.parse(stored);
            } catch (e) {
                console.error("Could not parse schedule data", e);
                initDefaultTasks();
            }
        } else {
            initDefaultTasks();
        }
        updateStatBox();
    }

    function initDefaultTasks() {
        // Only load default tasks if the user has absolutely nothing
        state.tasks = [
            { id: 1001, title: 'Explore the Planner', date: getFormattedDate(0), time: '10:00', duration: 30, category: 'blue' },
            { id: 1002, title: 'Add your own events', date: getFormattedDate(0), time: '11:00', duration: 45, category: 'green' }
        ];
        saveStorage();
    }

    function saveStorage() {
        localStorage.setItem('my_schedule_planner', JSON.stringify(state.tasks));
        updateStatBox();
    }

    function getFormattedDate(offsetDays) {
        let d = new Date();
        d.setDate(d.getDate() + offsetDays);
        return d.toISOString().split('T')[0];
    }

    // --- DOM ELEMENTS ---
    const elements = {
        navItems: document.querySelectorAll('.nav-item'),
        viewWrapper: document.getElementById('viewWrapper'),
        headerTitle: document.getElementById('headerTitle'),
        currentFullDate: document.getElementById('currentFullDate'),
        liveTime: document.getElementById('liveTime'),
        taskModal: document.getElementById('taskModal'),
        actionModal: document.getElementById('actionModal'),
        openModalBtn: document.getElementById('openModalBtn'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        form: document.getElementById('scheduleForm'),
        taskDateInput: document.getElementById('taskDate'),
        taskTimeInput: document.getElementById('taskTime'),
        viewContainer: document.querySelector('.view-container'),
        totalEventsStat: document.getElementById('totalEventsStat'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        deleteEventBtn: document.getElementById('deleteEventBtn'),
        closeActionModalBtn: document.getElementById('closeActionModalBtn')
    };

    // --- INITIALIZATION ---
    initClock();
    updateHeaderDate();
    loadStorage();
    renderView(state.currentView, true);

    // --- EVENT LISTENERS ---
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            if (view === state.currentView) return;
            
            elements.navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            state.currentView = view;
            renderView(view);
            updateHeaderTitle(view);
        });
    });

    // Add Modal logic
    elements.openModalBtn.addEventListener('click', () => {
        elements.taskModal.classList.add('active');
        const now = new Date();
        elements.taskDateInput.value = state.date.toISOString().split('T')[0];
        
        let hh = String(now.getHours()).padStart(2, '0');
        let mm = String(now.getMinutes()).padStart(2, '0');
        elements.taskTimeInput.value = `${hh}:${mm}`;
    });

    elements.closeModalBtn.addEventListener('click', () => {
        elements.taskModal.classList.remove('active');
    });

    elements.taskModal.addEventListener('click', (e) => {
        if (e.target === elements.taskModal) elements.taskModal.classList.remove('active');
    });

    // Handle Form Submission (Add own schedule)
    elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newTask = {
            id: Date.now(),
            title: document.getElementById('taskTitle').value || 'New Event',
            date: elements.taskDateInput.value,
            time: elements.taskTimeInput.value,
            duration: parseInt(document.getElementById('taskDuration').value),
            category: document.querySelector('input[name="category"]:checked').value
        };

        state.tasks.push(newTask);
        saveStorage();
        
        elements.taskModal.classList.remove('active');
        elements.form.reset();
        
        renderView(state.currentView);
    });

    // Clear All Schedule logic
    elements.clearAllBtn.addEventListener('click', () => {
        if(confirm('Are you sure you want to clear ALL events from your schedule? This cannot be undone.')) {
            state.tasks = [];
            saveStorage();
            renderView(state.currentView);
        }
    });

    // Action Modal Logic (Delete Event)
    elements.closeActionModalBtn.addEventListener('click', () => {
        elements.actionModal.classList.remove('active');
        taskToDeleteId = null;
    });

    elements.deleteEventBtn.addEventListener('click', () => {
        if(taskToDeleteId !== null) {
            state.tasks = state.tasks.filter(t => t.id !== taskToDeleteId);
            saveStorage();
            elements.actionModal.classList.remove('active');
            taskToDeleteId = null;
            renderView(state.currentView);
        }
    });

    // --- CORE FUNCTIONS ---
    function initClock() {
        const tick = () => {
            const now = new Date();
            elements.liveTime.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        };
        tick();
        setInterval(tick, 1000);
    }

    function updateHeaderDate() {
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        elements.currentFullDate.textContent = state.date.toLocaleDateString('en-US', options);
    }

    function updateHeaderTitle(view) {
        const titles = { 'day': "Today", 'week': "7-Day Week", 'month': "Month Calendar" };
        elements.headerTitle.textContent = titles[view];
    }
    
    function updateStatBox() {
        if(elements.totalEventsStat) {
            elements.totalEventsStat.textContent = state.tasks.length;
        }
    }

    function renderView(view, isInitial = false) {
        const oldSection = elements.viewWrapper.querySelector('.view-section');
        if (oldSection) oldSection.remove(); 

        const newSection = document.createElement('div');
        newSection.className = 'view-section';
        
        let htmlHandler = {
            'day': generateDayView,
            'week': generateWeekView,
            'month': generateMonthView,
        };

        if(htmlHandler[view]) {
            newSection.innerHTML = htmlHandler[view]();
            elements.viewWrapper.appendChild(newSection);
            
            requestAnimationFrame(() => {
                newSection.classList.add('active');
                if (view === 'day') {
                    populateDayTasks(newSection);
                    updateCurrentTimeLine();
                    if (isInitial) scrollToCurrentTime();
                }
            });
        }
    }

    function openActionModal(taskId, taskTitle) {
        taskToDeleteId = taskId;
        document.getElementById('actionModalDesc').textContent = `Manage: "${taskTitle}"`;
        elements.actionModal.classList.add('active');
    }

    // --- VIEW GENERATORS & LOGIC ---

    // Day View
    function generateDayView() {
        let html = '<div class="timeline-container" id="timelineContainer">';
        html += '<div class="current-time-line" id="currentTimeLine"></div>';

        for (let i = 0; i < 24; i++) {
            const ampm = i >= 12 ? 'PM' : 'AM';
            const hour12 = i % 12 || 12;
            const timeStr = `${hour12} ${ampm}`;
            html += `
                <div class="time-slot" data-hour="${i}">
                    <div class="time-label">${timeStr}</div>
                    <div class="time-content"></div>
                </div>
            `;
        }
        html += '</div>';
        return html;
    }

    function populateDayTasks(context) {
        const container = context.querySelector('#timelineContainer');
        if (!container) return;

        const todayStr = state.date.toISOString().split('T')[0];
        const todaysTasks = state.tasks.filter(t => t.date === todayStr);

        todaysTasks.forEach((task) => {
            const [hours, minutes] = task.time.split(':').map(Number);
            const slot = container.querySelector(`.time-slot[data-hour="${hours}"]`);
            
            if (slot) {
                const contentArea = slot.querySelector('.time-content');
                const card = document.createElement('div');
                card.className = `task-card ${task.category}`; // blue, green, red, purple
                
                // 1 hour = 60px height in CSS
                const topOffset = minutes; 
                const height = task.duration;
                
                card.style.top = `${topOffset}px`;
                card.style.height = `${Math.max(25, height - 2)}px`;
                
                // Content
                let htmlStr = `<h3>${task.title}</h3>`;
                if(height >= 40) {
                    htmlStr += `<p>${task.time} (${task.duration}m)</p>`;
                }
                card.innerHTML = htmlStr;
                
                // Add click event to trigger action modal for deleting
                card.addEventListener('click', () => {
                    openActionModal(task.id, task.title);
                });
                
                contentArea.appendChild(card);
            }
        });
    }

    function updateCurrentTimeLine() {
        const line = document.getElementById('currentTimeLine');
        if (!line) return;

        const update = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            // 60px logic parity
            const topPos = (hours * 60) + minutes;
            line.style.top = `${topPos}px`;
        };

        update();
        setInterval(update, 60000);
    }

    function scrollToCurrentTime() {
        const now = new Date();
        const scrollTarget = (now.getHours() * 60) - 100; 
        elements.viewContainer.scrollTop = Math.max(0, scrollTarget);
    }

    // Week View
    function generateWeekView() {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        let html = '<div class="view-grid week-grid">';
        
        let startOfWeek = new Date(state.date);
        let dayOfWeek = startOfWeek.getDay() || 7; // Make Sunday 7
        startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + 1);

        for(let i=0; i<7; i++) {
            let loopDate = new Date(startOfWeek);
            loopDate.setDate(loopDate.getDate() + i);
            let loopDateStr = loopDate.toISOString().split('T')[0];
            
            let dayTasks = state.tasks.filter(t => t.date === loopDateStr);
            
            html += `<div class="grid-card">
                <h3>${days[i]} <span style="font-size:12px; font-weight:normal; color:#6b7280; float:right;">${loopDate.getMonth()+1}/${loopDate.getDate()}</span></h3>`;
                
            if(dayTasks.length > 0) {
                // Sort tasks by time
                dayTasks.sort((a, b) => a.time.localeCompare(b.time));
                dayTasks.forEach(task => {
                    html += `
                        <div style="font-size: 13px; margin-bottom: 8px; display:flex; align-items:center; gap:8px;">
                            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--cat-${task.category});"></span>
                            <span style="font-weight:600;">${task.time}</span>
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color:var(--text-secondary); cursor:pointer;" onclick="document.dispatchEvent(new CustomEvent('reqDelete', {detail: {id:${task.id}, title:'${task.title}'}}))">${task.title}</span>
                        </div>
                    `;
                });
            } else {
                html += `<p style="color:var(--text-secondary); font-size:13px; margin-top:8px;">No events scheduled</p>`;
            }
            html += `</div>`;
        }
        return html + '</div>';
    }

    // Global listener for inline clicks from grid views
    document.addEventListener('reqDelete', (e) => {
        openActionModal(e.detail.id, e.detail.title);
    });

    // Month View
    function generateMonthView() {
        let html = '<div class="view-grid month-grid">';
        let currentYear = state.date.getFullYear();
        let currentMonth = state.date.getMonth();
        
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const startDay = new Date(currentYear, currentMonth, 1).getDay();
        const currentDay = state.date.getDate();

        const dow = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        dow.forEach(d => html += `<div style="text-align:center; color:var(--text-secondary); font-size:13px; font-weight:700; padding-bottom:8px; border-bottom:1px solid var(--border-color);">${d}</div>`);

        for(let i=0; i<startDay; i++) html += `<div></div>`;

        for (let i = 1; i <= daysInMonth; i++) {
            let isToday = i === currentDay;
            // Pad dates to match string format YYYY-MM-DD
            let dStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            let dayTasks = state.tasks.filter(t => t.date === dStr);
            
            html += `
                <div class="grid-card month-card ${isToday ? 'today' : ''}">
                    <span class="month-day">${i}</span>`;
            
            dayTasks.slice(0, 3).forEach(task => {
                html += `<div class="task-indicator ${task.category}" style="background:var(--cat-${task.category}); color:white;" onclick="document.dispatchEvent(new CustomEvent('reqDelete', {detail: {id:${task.id}, title:'${task.title}'}}))">${task.title}</div>`;
            });
            if(dayTasks.length > 3) html += `<div style="font-size:10px; color:var(--text-secondary);">+${dayTasks.length - 3} more</div>`;
            
            html += `</div>`;
        }
        return html + '</div>';
    }
});
