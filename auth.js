// Handle Authentication via API
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = localStorage.getItem('sha_currentUser');
    if (currentUser) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                
                if (data.success) {
                    localStorage.setItem('sha_currentUser', JSON.stringify(data.user));
                    showToast('Login successful! Redirecting...', 'success');
                    setTimeout(() => window.location.href = 'dashboard.html', 1000);
                } else {
                    showToast(data.error || 'Invalid credentials', 'error');
                }
            } catch (err) {
                showToast('Server connection error', 'error');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await res.json();
                
                if (data.success) {
                    showToast('Registration successful! Please login.', 'success');
                    setTimeout(() => window.location.href = 'index.html', 1500);
                } else {
                    showToast(data.error || 'Registration failed', 'error');
                }
            } catch (err) {
                showToast('Server connection error', 'error');
            }
        });
    }
});

function showToast(message, type) {
    const toast = document.getElementById('toast');
    if(!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.transform = 'translateY(-20px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}
