export const UI = {
    subjects: [
        'Mathematics', 'English', 'Afrikaans', 'Physics', 
        'AP Math', 'EGD', 'Geography', 'Life Orientation', 
        'Information Technologies'
    ],

    elements: {
        dataContainer: document.getElementById('data-container'),
        viewTitle: document.getElementById('view-title'),
        connectionBanner: document.getElementById('connection-banner'),
        modalOverlay: document.getElementById('modal-overlay'),
        deleteModal: document.getElementById('delete-modal'),
        deleteItemType: document.getElementById('delete-item-type'),
        syncBtn: document.getElementById('sync-btn'),
        entryType: document.getElementById('entry-type'),
        modalDynamicFields: document.getElementById('modal-dynamic-fields')
    },

    setLoading(isLoading) {
        if (isLoading) {
            this.elements.dataContainer.innerHTML = '<div class="loading-msg">Updating explorer...</div>';
        }
    },

    updateConnection(isOffline) {
        const banner = this.elements.connectionBanner;
        if (isOffline) {
            banner.textContent = "Offline Mode - Changes will sync later";
            banner.className = "connection-banner offline";
            banner.classList.remove('hidden');
        } else {
            banner.textContent = "Connected to Server";
            banner.className = "connection-banner online";
            setTimeout(() => {
                if (banner.classList.contains('online')) banner.classList.add('hidden');
            }, 3000);
        }
    },

    renderList(items, searchQuery = "") {
        this.elements.dataContainer.innerHTML = "";
        
        let filtered = items;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = items.filter(i => 
                i.title.toLowerCase().includes(q) || 
                i.content.toLowerCase().includes(q) ||
                i.type.toLowerCase().includes(q)
            );
        }

        if (filtered.length === 0) {
            this.elements.dataContainer.innerHTML = '<div class="loading-msg">No entries found.</div>';
            return;
        }

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'data-card' + (item.isCompleted ? ' completed' : '');
            
            const metaHtml = item.meta.map(m => `
                <div class="meta-item">
                    <i data-lucide="${m.icon}"></i>
                    <span>${m.text}</span>
                </div>
            `).join('');

            card.innerHTML = `
                <div class="card-actions">
                    <div class="action-btn delete" data-id="${item.id}" data-type="${item.type}">
                        <i data-lucide="trash-2"></i>
                    </div>
                </div>
                <div class="card-type">${item.type}</div>
                <div class="card-title">${item.title}</div>
                <div class="card-content">${item.content}</div>
                <div class="card-meta">${metaHtml}</div>
            `;
            
            // Add listener to the specific delete button in this card
            card.querySelector('.delete').addEventListener('click', (e) => {
                e.stopPropagation();
                window.app.handleDelete(item.type, item.id);
            });

            this.elements.dataContainer.appendChild(card);
        });

        lucide.createIcons();
    },

    showModal() {
        this.elements.modalOverlay.classList.remove('hidden');
        this.updateModalFields();
    },

    hideModal() {
        this.elements.modalOverlay.classList.add('hidden');
    },

    updateModalFields() {
        const type = this.elements.entryType.value;
        let html = "";

        const subjectOptions = this.subjects.map(s => `<option value="${s}">${s}</option>`).join('');

        if (type === 'school_notes') {
            html = `
                <select id="entry-subject" class="modal-input">
                    ${subjectOptions}
                </select>
                <textarea id="entry-content" class="modal-input" placeholder="Note content..."></textarea>
            `;
        } else if (type === 'school_grades') {
            html = `
                <select id="entry-subject" class="modal-input">
                    ${subjectOptions}
                </select>
                <input type="date" id="entry-date" class="modal-input" value="${new Date().toISOString().split('T')[0]}">
                <div class="modal-row" style="display: flex; gap: 10px;">
                    <input type="number" id="entry-score" class="modal-input" placeholder="Score" style="flex: 1">
                    <input type="number" id="entry-total" class="modal-input" placeholder="Total" style="flex: 1">
                </div>
                <select id="entry-cycle" class="modal-input">
                    <option value="cycle1">Cycle 1</option>
                    <option value="cycle2">Cycle 2</option>
                    <option value="cycle3">Cycle 3</option>
                </select>
                <select id="entry-category" class="modal-input">
                    <option value="cass">CASS</option>
                    <option value="summative">Summative</option>
                </select>
                <input type="number" id="entry-year" class="modal-input" placeholder="School Year" value="2026">
            `;
        } else if (type === 'tasks') {
            html = `
                <select id="entry-subject" class="modal-input">
                    ${subjectOptions}
                </select>
                <input type="date" id="entry-due-date" class="modal-input">
                <select id="entry-priority" class="modal-input">
                    <option value="assignment">Assignment</option>
                    <option value="exam">Exam</option>
                    <option value="classTest">Class Test</option>
                </select>
            `;
        } else if (type === 'habits') {
            html = `
                <select id="entry-frequency" class="modal-input">
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekends">Weekends</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
                <div class="modal-row" style="display: flex; align-items: center; gap: 10px; padding: 10px 0;">
                    <label style="font-size: 0.9rem">Enable Reminder:</label>
                    <input type="checkbox" id="entry-reminder-enabled">
                </div>
                <input type="time" id="entry-reminder-time" class="modal-input hidden">
            `;
        } else if (type === 'swim_sessions') {
            html = `
                <input type="date" id="entry-date" class="modal-input" value="${new Date().toISOString().split('T')[0]}">
                <input type="number" id="entry-distance" class="modal-input" placeholder="Distance (m)">
                <input type="number" id="entry-duration" class="modal-input" placeholder="Duration (seconds)">
                <select id="entry-stroke" class="modal-input">
                    <option value="mixed">Mixed</option>
                    <option value="freestyle">Freestyle</option>
                    <option value="breaststroke">Breaststroke</option>
                    <option value="backstroke">Backstroke</option>
                    <option value="butterfly">Butterfly</option>
                    <option value="im">IM</option>
                </select>
                <input type="text" id="entry-workout-effect" class="modal-input" placeholder="Workout Effect (e.g. Aerobic)">
                <div class="modal-row" style="display: flex; gap: 10px;">
                    <input type="number" id="entry-hr-avg" class="modal-input" placeholder="Avg HR" style="flex: 1">
                    <input type="number" id="entry-hr-max" class="modal-input" placeholder="Max HR" style="flex: 1">
                </div>
                <textarea id="entry-notes" class="modal-input" placeholder="Notes..."></textarea>
            `;
        }
 else if (type === 'swim_galas') {
            html = `
                <input type="date" id="entry-date" class="modal-input" value="${new Date().toISOString().split('T')[0]}">
                <input type="text" id="entry-location" class="modal-input" placeholder="Location">
                <select id="entry-course" class="modal-input">
                    <option value="lcm">LCM (50m)</option>
                    <option value="scm">SCM (25m)</option>
                    <option value="scy">SCY (25y)</option>
                </select>
            `;
        } else if (type === 'qualifying_times') {
            html = `
                <input type="text" id="entry-event-name" class="modal-input" placeholder="Event (e.g. 50m Free)">
                <input type="number" id="entry-target-time" class="modal-input" placeholder="Target Time (seconds)">
                <select id="entry-course" class="modal-input">
                    <option value="lcm">LCM (50m)</option>
                    <option value="scm">SCM (25m)</option>
                </select>
            `;
        }

        this.elements.modalDynamicFields.innerHTML = html;
        
        // Handle nested visibility for reminder time
        if (type === 'habits') {
            const toggle = document.getElementById('entry-reminder-enabled');
            const timeInput = document.getElementById('entry-reminder-time');
            toggle.onchange = () => {
                if (toggle.checked) timeInput.classList.remove('hidden');
                else timeInput.classList.add('hidden');
            };
        }

        lucide.createIcons();
    }
};
