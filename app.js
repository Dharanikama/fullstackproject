// --- State & Initialization ---
const appState = {
    currentUser: null,
    users: [], // Array of users: { name, email, password, healthScore, history, medicines, appointments }
    theme: 'dark'
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    if (appState.currentUser) {
        showMainApp();
        updateDashboard();
    } else {
        showAuth();
    }
});

function loadState() {
    const savedUsers = localStorage.getItem('sha_users');
    if (savedUsers) {
        appState.users = JSON.parse(savedUsers);
    }
    const loggedIn = localStorage.getItem('sha_current_user');
    if (loggedIn) {
        appState.currentUser = JSON.parse(loggedIn);
    }
    const theme = localStorage.getItem('sha_theme') || 'dark';
    if (theme === 'light') toggleTheme(true);
}

function saveState() {
    localStorage.setItem('sha_users', JSON.stringify(appState.users));
    if (appState.currentUser) {
        localStorage.setItem('sha_current_user', JSON.stringify(appState.currentUser));
        // Update current user in users array
        const idx = appState.users.findIndex(u => u.email === appState.currentUser.email);
        if (idx !== -1) appState.users[idx] = appState.currentUser;
        localStorage.setItem('sha_users', JSON.stringify(appState.users));
    } else {
        localStorage.removeItem('sha_current_user');
    }
}

// --- Utilities ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-message');
    const icon = document.getElementById('toast-icon');
    
    toast.className = `toast ${type}`;
    msg.textContent = message;
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    
    // Animate
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
    }, 3000);
}

function toggleTheme(forceLight = false) {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    
    if (forceLight || body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        icon.className = 'fas fa-moon';
        appState.theme = 'light';
        localStorage.setItem('sha_theme', 'light');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        icon.className = 'fas fa-sun';
        appState.theme = 'dark';
        localStorage.setItem('sha_theme', 'dark');
    }
    if (appState.currentUser) renderCharts(); // Re-render charts for theme colors
}

// --- Authentication ---
const app = {
    switchAuthTab: (tab) => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        document.getElementById(`tab-${tab}`).classList.add('active');
        const form = document.getElementById(`${tab}-form`);
        form.classList.remove('hidden');
        setTimeout(() => form.classList.add('active'), 10); // Trigger transition
    },
    
    handleRegister: (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        
        if (appState.users.find(u => u.email === email)) {
            showToast('Email already registered!', 'error');
            return;
        }
        
        const newUser = {
            name, email, password,
            healthScore: 85,
            history: [],
            medicines: [],
            appointments: [],
            scoreHistory: [70, 75, 80, 85, 82, 88, 85]
        };
        appState.users.push(newUser);
        saveState();
        showToast('Registration successful! Please login.');
        app.switchAuthTab('login');
        document.getElementById('register-form').reset();
    },
    
    handleLogin: (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const user = appState.users.find(u => u.email === email && u.password === password);
        if (user) {
            appState.currentUser = user;
            saveState();
            showToast('Login successful!');
            showMainApp();
            updateDashboard();
            document.getElementById('login-form').reset();
        } else {
            showToast('Invalid credentials!', 'error');
        }
    },
    
    logout: () => {
        appState.currentUser = null;
        saveState();
        document.getElementById('main-section').classList.add('hidden');
        document.getElementById('auth-section').classList.remove('hidden');
        showToast('Logged out successfully.');
    },

    // --- Navigation ---
    navigate: (viewId, event) => {
        if(event) event.preventDefault();
        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        if(event) {
            event.currentTarget.classList.add('active');
        } else {
            document.querySelector(`[data-target="${viewId}"]`).classList.add('active');
        }
        
        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
            view.classList.remove('active');
        });
        
        const view = document.getElementById(`view-${viewId}`);
        view.classList.remove('hidden');
        setTimeout(() => view.classList.add('active'), 10);
        
        // Update Title
        document.getElementById('page-title').textContent = viewId.charAt(0).toUpperCase() + viewId.slice(1);
        
        // Refresh active view data
        if(viewId === 'dashboard') updateDashboard();
        if(viewId === 'medicine') renderMedicines();
        if(viewId === 'appointments') renderAppointments();
        if(viewId === 'symptoms') renderHistory();
        if(viewId === 'analytics') renderCharts();
    },
    
    // --- Symptoms Checker ---
    checkSymptoms: (e) => {
        e.preventDefault();
        const select = document.getElementById('symptom-select');
        const options = Array.from(select.selectedOptions).map(opt => opt.text);
        const duration = document.getElementById('symptom-duration').value;
        
        if (options.length === 0) return;

        // Mock Prediction Logic
        let prediction = "Mild Viral Infection";
        let severity = "safe";
        
        if (options.includes("Shortness of Breath") || options.includes("Fatigue")) {
            prediction = "Possible Respiratory Issue / Exhaustion";
            severity = "warning";
            appState.currentUser.healthScore = Math.max(0, appState.currentUser.healthScore - 5);
        }
        if (options.length >= 4 || duration > 5) {
            prediction = "Severe Condition - Consult a Doctor";
            severity = "danger";
            appState.currentUser.healthScore = Math.max(0, appState.currentUser.healthScore - 10);
        }

        const resultBox = document.getElementById('symptom-result');
        resultBox.className = `result-box ${severity}`;
        resultBox.innerHTML = `<h4>Predicted: ${prediction}</h4><p>Based on ${options.length} symptom(s) lasting ${duration} day(s).</p>`;
        
        // Save History
        const record = {
            date: new Date().toLocaleDateString(),
            symptoms: options.join(', '),
            prediction,
            severity
        };
        appState.currentUser.history.unshift(record);
        appState.currentUser.scoreHistory.push(appState.currentUser.healthScore);
        if(appState.currentUser.scoreHistory.length > 7) appState.currentUser.scoreHistory.shift();
        
        saveState();
        renderHistory();
        showToast('Symptoms analyzed successfully');
        select.selectedIndex = -1;
    },

    // --- Medicine Reminder ---
    addMedicine: (e) => {
        e.preventDefault();
        const name = document.getElementById('med-name').value;
        const dosage = document.getElementById('med-dosage').value;
        const time = document.getElementById('med-time').value;
        
        const med = { id: Date.now(), name, dosage, time };
        appState.currentUser.medicines.push(med);
        saveState();
        renderMedicines();
        showToast('Medicine added');
        document.getElementById('medicine-form').reset();
    },
    
    deleteMedicine: (id) => {
        appState.currentUser.medicines = appState.currentUser.medicines.filter(m => m.id !== id);
        saveState();
        renderMedicines();
        showToast('Medicine removed');
    },

    // --- Appointments ---
    bookAppointment: (e) => {
        e.preventDefault();
        const doctor = document.getElementById('appt-doctor').value;
        const date = document.getElementById('appt-date').value;
        const time = document.getElementById('appt-time').value;
        const reason = document.getElementById('appt-reason').value;
        
        const appt = { id: Date.now(), doctor, date, time, reason };
        appState.currentUser.appointments.push(appt);
        saveState();
        renderAppointments();
        showToast('Appointment booked successfully');
        document.getElementById('appointment-form').reset();
    },
    
    cancelAppointment: (id) => {
        appState.currentUser.appointments = appState.currentUser.appointments.filter(a => a.id !== id);
        saveState();
        renderAppointments();
        showToast('Appointment cancelled');
    },

    // Utils
    toggleTheme: toggleTheme
};

// --- Render Functions ---
function showAuth() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('main-section').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('main-section').classList.remove('hidden');
    document.getElementById('user-display-name').textContent = appState.currentUser.name;
    app.navigate('dashboard');
}

function updateDashboard() {
    if(!appState.currentUser) return;
    
    const user = appState.currentUser;
    document.querySelector('.stat-card .text-gradient').textContent = `${user.healthScore}/100`;
    document.getElementById('dash-appt-count').textContent = user.appointments.length;
    document.getElementById('dash-med-count').textContent = user.medicines.length;

    // Med List
    const medList = document.getElementById('dash-med-list');
    if (user.medicines.length === 0) {
        medList.innerHTML = '<li class="empty-state">No medicines configured.</li>';
    } else {
        medList.innerHTML = user.medicines.slice(0,3).map(m => `
            <li>
                <div><i class="fas fa-pills mb-icon"></i> <strong>${m.name}</strong> (${m.dosage})</div>
                <div class="time-badge"><i class="far fa-clock"></i> ${m.time}</div>
            </li>
        `).join('');
    }

    // Appt List
    const apptList = document.getElementById('dash-appt-list');
    if (user.appointments.length === 0) {
        apptList.innerHTML = '<li class="empty-state">No upcoming appointments.</li>';
    } else {
        apptList.innerHTML = user.appointments.slice(0,3).map(a => `
            <li>
                <div><i class="fas fa-user-md mb-icon"></i> <strong>${a.doctor}</strong></div>
                <div><span class="time-badge">${a.date} | ${a.time}</span></div>
            </li>
        `).join('');
    }
}

function renderHistory() {
    const list = document.getElementById('symptom-history');
    if (appState.currentUser.history.length === 0) {
        list.innerHTML = '<li class="empty-state">No history available.</li>';
        return;
    }
    list.innerHTML = appState.currentUser.history.map(h => `
        <li>
            <div>
                <strong>${h.date}</strong><br>
                <span class="text-muted"><i class="fas fa-notes-medical"></i> ${h.symptoms}</span>
            </div>
            <div style="text-align: right">
                <span style="color: var(--${h.severity === 'safe' ? 'success' : h.severity})">${h.prediction}</span>
            </div>
        </li>
    `).join('');
}

function renderMedicines() {
    const container = document.getElementById('medicine-cards');
    if (appState.currentUser.medicines.length === 0) {
        container.innerHTML = '<div class="empty-state">No medicines added yet.</div>';
        return;
    }
    container.innerHTML = appState.currentUser.medicines.map(m => `
        <div class="med-card">
            <div class="item-info">
                <h4>${m.name}</h4>
                <p>Dosage: ${m.dosage}</p>
                <span class="time-badge"><i class="far fa-clock"></i> ${m.time}</span>
            </div>
            <button class="icon-btn btn-danger" title="Delete" onclick="app.deleteMedicine(${m.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function renderAppointments() {
    const container = document.getElementById('appointment-cards');
    if (appState.currentUser.appointments.length === 0) {
        container.innerHTML = '<div class="empty-state">No appointments booked yet.</div>';
        return;
    }
    container.innerHTML = appState.currentUser.appointments.map(a => `
        <div class="appt-card">
            <div class="item-info">
                <h4>${a.doctor}</h4>
                <p>${a.reason || 'Routine Checkup'}</p>
                <span class="time-badge"><i class="far fa-calendar"></i> ${a.date} | ${a.time}</span>
            </div>
            <button class="icon-btn btn-danger" title="Cancel" onclick="app.cancelAppointment(${a.id})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// --- Analytics (Chart.js) ---
let healthChartInstance = null;
let symptomChartInstance = null;

function renderCharts() {
    if(!appState.currentUser) return;
    
    const textColor = appState.theme === 'dark' ? '#F8FAFC' : '#0F172A';
    const gridColor = appState.theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = 'Outfit';

    // Health Score Chart
    const ctxHealth = document.getElementById('healthScoreChart');
    if(healthChartInstance) healthChartInstance.destroy();
    
    healthChartInstance = new Chart(ctxHealth, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Health Score',
                data: appState.currentUser.scoreHistory,
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderWidth: 3,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 100, grid: { color: gridColor } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Symptoms Chart
    const ctxSymptom = document.getElementById('symptomsChart');
    if(symptomChartInstance) symptomChartInstance.destroy();

    // Calculate frequencies
    const freq = {};
    appState.currentUser.history.forEach(h => {
        h.symptoms.split(', ').forEach(sym => {
            freq[sym] = (freq[sym] || 0) + 1;
        });
    });
    
    // Default mock data if empty
    const labels = Object.keys(freq).length ? Object.keys(freq) : ['Fever', 'Cough', 'Headache'];
    const data = Object.keys(freq).length ? Object.values(freq) : [3, 2, 5];

    symptomChartInstance = new Chart(ctxSymptom, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}
