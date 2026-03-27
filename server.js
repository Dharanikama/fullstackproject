const http = require('http');
const fs = require('fs');
const path = require('path');

const DB_FILE = './database.json';
const PORT = 3000;

// Initialize JSON Database structure if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
        users: [],
        medicines: [],
        appointments: [],
        symptoms: []
    }, null, 2));
}

function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    // Basic CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // --- API Routes Handler ---
    if (req.url.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');
        
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            const data = body ? JSON.parse(body) : {};
            const db = readDB();

            try {
                // Auth Routes
                if (req.url === '/api/auth/register' && req.method === 'POST') {
                    if (db.users.find(u => u.email === data.email)) {
                        res.writeHead(400);
                        return res.end(JSON.stringify({ error: 'Email already registered.' }));
                    }
                    data.id = Date.now();
                    data.healthScore = 90;
                    db.users.push(data);
                    writeDB(db);
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true, user: data }));
                }

                if (req.url === '/api/auth/login' && req.method === 'POST') {
                    const user = db.users.find(u => u.email === data.email && u.password === data.password);
                    if (!user) {
                        res.writeHead(401);
                        return res.end(JSON.stringify({ error: 'Invalid credentials.' }));
                    }
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true, user }));
                }

                // Get Data Route
                if (req.url.startsWith('/api/data') && req.method === 'GET') {
                    const urlObj = new URL(req.url, `http://${req.headers.host}`);
                    const email = urlObj.searchParams.get('email');
                    
                    const user = db.users.find(u => u.email === email);
                    const meds = db.medicines.filter(m => m.userEmail === email).reverse();
                    const appts = db.appointments.filter(a => a.userEmail === email).reverse();
                    const symps = db.symptoms.filter(s => s.userEmail === email).reverse();

                    res.writeHead(200);
                    return res.end(JSON.stringify({
                        healthScore: user ? user.healthScore : 90,
                        medicines: meds,
                        appointments: appts,
                        symptomsHistory: symps
                    }));
                }

                // POST Routes
                if (req.url === '/api/medicine' && req.method === 'POST') {
                    data.id = Date.now();
                    db.medicines.push(data);
                    writeDB(db);
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true, id: data.id }));
                }
                
                if (req.url.match(/^\/api\/medicine\/\d+$/) && req.method === 'DELETE') {
                    const id = parseInt(req.url.split('/').pop());
                    db.medicines = db.medicines.filter(m => m.id !== id);
                    writeDB(db);
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true }));
                }

                if (req.url === '/api/appointments' && req.method === 'POST') {
                    data.id = Date.now();
                    db.appointments.push(data);
                    writeDB(db);
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true, id: data.id }));
                }
                
                if (req.url.match(/^\/api\/appointments\/\d+$/) && req.method === 'DELETE') {
                    const id = parseInt(req.url.split('/').pop());
                    db.appointments = db.appointments.filter(a => a.id !== id);
                    writeDB(db);
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true }));
                }

                if (req.url === '/api/symptoms' && req.method === 'POST') {
                    data.id = Date.now();
                    let scoreMod = data.severity === 'danger' ? -10 : (data.severity === 'warning' ? -5 : 0);
                    
                    const user = db.users.find(u => u.email === data.userEmail);
                    if (user) {
                        user.healthScore = Math.max(0, user.healthScore + scoreMod);
                    }
                    
                    db.symptoms.push(data);
                    writeDB(db);
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true, id: data.id, scoreMod }));
                }

                // Not an API path match
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Endpoint not found' }));

            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // --- Static File Serving ---
    let filePath = '.' + req.url;
    if (filePath === './' || !path.extname(filePath)) {
        filePath = './index.html'; // Default directly to index
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                fs.readFile('./index.html', (_err, html) => {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(html, 'utf-8');
                });
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}\n`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });

});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`ZERO-DEPENDENCY Server is running at http://localhost:${PORT}`);
});
