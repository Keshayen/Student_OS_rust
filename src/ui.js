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
                    <div class="action-btn delete" onclick="window.app.handleDelete('${item.type}', '${item.id}')">
                        <i data-lucide="trash-2"></i>
                    </div>
                </div>
                <div class="card-type">${item.type}</div>
                <div class="card-title">${item.title}</div>
                <div class="card-content">${item.content}</div>
                <div class="card-meta">${metaHtml}</div>
            `;
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
