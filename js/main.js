// Main Application Logic communicating with Backend API
let currentUser = null;
let currentData = { medicines: [], appointments: [], symptomsHistory: [], healthScore: 90 };

document.addEventListener('DOMContentLoaded', async () => {
    const stored = localStorage.getItem('sha_currentUser');
    if (!stored && !window.location.pathname.includes('index.html') && !window.location.pathname.includes('register.html')) {
        window.location.href = 'index.html';
        return;
    }
    
    if (stored) {
        currentUser = JSON.parse(stored);
        const nameEl = document.getElementById('user-name');
        if(nameEl) nameEl.textContent = `Welcome, ${currentUser.name}`;
        
        // Fetch fresh data from backend
        try {
            const res = await fetch(`/api/data?email=${encodeURIComponent(currentUser.email)}`);
            if(res.ok) {
                currentData = await res.json();
            }
        } catch(e) {
            console.error('Failed to fetch data');
        }
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('sha_currentUser');
            window.location.href = 'index.html';
        });
    }

    const path = window.location.pathname;
    if (path.includes('dashboard.html')) initDashboard();
    if (path.includes('symptoms.html')) initSymptoms();
    if (path.includes('medicines.html')) initMedicines();
    if (path.includes('appointments.html')) initAppointments();
    if (path.includes('analytics.html')) initAnalytics();
});

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if(!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.transform = 'translateY(-20px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

// --- Dashboard Logic ---
function initDashboard() {
    document.getElementById('health-score-display').textContent = `${currentData.healthScore}/100`;
    document.getElementById('med-count').textContent = currentData.medicines.length;
    document.getElementById('appt-count').textContent = currentData.appointments.length;

    const medList = document.getElementById('dash-medicines');
    if (currentData.medicines.length === 0) {
        medList.innerHTML = '<li class="empty-state">No medicines configured.</li>';
    } else {
        medList.innerHTML = currentData.medicines.slice(0, 3).map(m => `
            <li>
                <div class="item-info"><strong>${m.name}</strong><span>Dosage: ${m.dosage}</span></div>
                <div class="item-badge"><i class="far fa-clock"></i> ${m.time}</div>
            </li>
        `).join('');
    }

    const apptList = document.getElementById('dash-appointments');
    if (currentData.appointments.length === 0) {
        apptList.innerHTML = '<li class="empty-state">No upcoming appointments.</li>';
    } else {
        apptList.innerHTML = currentData.appointments.slice(0, 3).map(a => `
            <li>
                <div class="item-info"><strong>${a.doctor}</strong><span>${a.date} | ${a.time}</span></div>
            </li>
        `).join('');
    }
}

// --- Symptoms Logic ---
function initSymptoms() {
    renderHistory();
    const form = document.getElementById('symptoms-form');
    if(!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const checkboxes = document.querySelectorAll('input[name="symptom"]:checked');
        const duration = document.getElementById('symptom-duration').value;
        const symptomsArr = Array.from(checkboxes).map(cb => cb.value);

        if (symptomsArr.length === 0) {
            showToast('Please select at least one symptom', 'error');
            return;
        }

        let prediction = "Mild Viral Infection. Rest and hydrate.";
        let severity = "safe";
        
        if (symptomsArr.includes('Shortness of Breath') || symptomsArr.length >= 4) {
            prediction = "Warning: Possible severe respiratory issue. Consult a doctor immediately.";
            severity = "danger";
        } else if (symptomsArr.includes('Fever') && duration > 3) {
            prediction = "Moderate Condition. Consider seeing a physician if it persists.";
            severity = "warning";
        }

        const dateStr = new Date().toLocaleDateString();
        const sympStr = symptomsArr.join(', ');

        try {
            await fetch('/api/symptoms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userEmail: currentUser.email, date: dateStr, symptoms: sympStr, prediction, severity })
            });
            // Update local memory
            currentData.symptomsHistory.unshift({ date: dateStr, symptoms: sympStr, prediction, severity });
            
            const resultBox = document.getElementById('prediction-result');
            resultBox.className = `result-card p-4 text-center mt-3 ${severity}`;
            resultBox.innerHTML = `
                <i class="fas ${severity === 'safe' ? 'fa-check-circle' : 'fa-exclamation-triangle'}" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                <h4>Predicted: ${prediction}</h4>
                <p>Based on symptoms: ${sympStr}</p>
            `;
            
            renderHistory();
            form.reset();
            showToast('Symptoms recorded in database', 'success');
        } catch(err) {
            showToast('Error saving symptoms', 'error');
        }
    });
}

function renderHistory() {
    const list = document.getElementById('symptoms-history');
    if(!list) return;

    if (currentData.symptomsHistory.length === 0) {
        list.innerHTML = '<li class="empty-state p-4 text-center">No history found.</li>';
        return;
    }
    list.innerHTML = currentData.symptomsHistory.map(h => `
        <li>
            <div class="item-info"><strong>${h.date}</strong><span>${h.symptoms}</span></div>
            <div class="item-badge bg-${h.severity === 'safe' ? 'success' : (h.severity === 'warning'? 'warning': 'danger')}-light text-${h.severity === 'safe' ? 'success' : h.severity}">
                 ${h.severity.toUpperCase()}
            </div>
        </li>
    `).join('');
}

// --- Medicines Logic ---
function initMedicines() {
    renderMedicines();
    const form = document.getElementById('medicine-form');
    if(!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const medData = {
            userEmail: currentUser.email,
            name: document.getElementById('med-name').value,
            dosage: document.getElementById('med-dosage').value,
            time: document.getElementById('med-time').value
        };

        try {
            const res = await fetch('/api/medicine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(medData)
            });
            const data = await res.json();
            if(data.success) {
                medData.id = data.id; // get ID from DB
                currentData.medicines.unshift(medData);
                renderMedicines();
                form.reset();
                showToast('Medicine added to database', 'success');
            }
        } catch(err) { showToast('Error adding medicine', 'error'); }
    });
}

function renderMedicines() {
    const list = document.getElementById('medicines-list');
    if(!list) return;
    if (currentData.medicines.length === 0) {
        list.innerHTML = '<li class="empty-state p-4 text-center">No medicines added yet.</li>';
        return;
    }
    list.innerHTML = currentData.medicines.map(m => `
        <li>
            <div class="item-info"><strong>${m.name}</strong><span>Dosage: ${m.dosage} | Time: ${m.time}</span></div>
            <button class="btn-icon danger" onclick="deleteMedicine(${m.id})"><i class="fas fa-trash"></i></button>
        </li>
    `).join('');
}

window.deleteMedicine = async function(id) {
    try {
        await fetch(`/api/medicine/${id}`, { method: 'DELETE' });
        currentData.medicines = currentData.medicines.filter(m => m.id !== id);
        renderMedicines();
        showToast('Medicine deleted', 'success');
    } catch(err) { showToast('Delete failed', 'error'); }
};

// --- Appointments Logic ---
function initAppointments() {
    renderAppointments();
    const form = document.getElementById('appointment-form');
    if(!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const apptData = {
            userEmail: currentUser.email,
            doctor: document.getElementById('appt-doctor').value,
            date: document.getElementById('appt-date').value,
            time: document.getElementById('appt-time').value,
            reason: document.getElementById('appt-reason').value
        };

        try {
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apptData)
            });
            const data = await res.json();
            if(data.success) {
                apptData.id = data.id;
                currentData.appointments.unshift(apptData);
                renderAppointments();
                form.reset();
                showToast('Appointment booked in database', 'success');
            }
        } catch(err) { showToast('Error booking appointment', 'error'); }
    });
}

function renderAppointments() {
    const list = document.getElementById('appointments-list');
    if(!list) return;

    if (currentData.appointments.length === 0) {
        list.innerHTML = '<li class="empty-state p-4 text-center">No appointments booked.</li>';
        return;
    }
    list.innerHTML = currentData.appointments.map(a => `
        <li>
            <div class="item-info"><strong>${a.doctor}</strong><span>${a.date} at ${a.time} - ${a.reason}</span></div>
            <button class="btn-icon danger" onclick="cancelAppointment(${a.id})"><i class="fas fa-times-circle"></i></button>
        </li>
    `).join('');
}

window.cancelAppointment = async function(id) {
    try {
        await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
        currentData.appointments = currentData.appointments.filter(a => a.id !== id);
        renderAppointments();
        showToast('Appointment cancelled', 'success');
    } catch(err) { showToast('Delete failed', 'error'); }
};

// --- Analytics Logic ---
function initAnalytics() {
    if(typeof Chart === 'undefined') return;

    const ctxHealth = document.getElementById('healthScoreChart');
    if(ctxHealth) {
        new Chart(ctxHealth, {
            type: 'line',
            data: {
                labels: ['Start', 'Previous', 'Current'],
                datasets: [{
                    label: 'Health Score',
                    data: [80, 85, currentData.healthScore],
                    borderColor: '#0284C7',
                    backgroundColor: 'rgba(2, 132, 199, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const ctxSymptoms = document.getElementById('symptomsChart');
    if(ctxSymptoms) {
        let symFreq = {};
        currentData.symptomsHistory.forEach(h => {
            h.symptoms.split(', ').forEach(s => symFreq[s] = (symFreq[s]||0)+1);
        });
        const labels = Object.keys(symFreq).length ? Object.keys(symFreq) : ['None recorded'];
        const dat = Object.keys(symFreq).length ? Object.values(symFreq) : [1];

        new Chart(ctxSymptoms, {
            type: 'doughnut',
            data: { labels: labels, datasets: [{ data: dat, backgroundColor: ['#0284C7', '#059669', '#D97706', '#DC2626', '#3B82F6'] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const ctxActivity = document.getElementById('activityChart');
    if(ctxActivity) {
        new Chart(ctxActivity, {
            type: 'bar',
            data: {
                labels: ['Medicines', 'Appointments', 'Symptom Checks'],
                datasets: [{
                    label: 'Count',
                    data: [currentData.medicines.length, currentData.appointments.length, currentData.symptomsHistory.length],
                    backgroundColor: ['#059669', '#D97706', '#0284C7']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}
