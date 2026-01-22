const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3001;
const DB_FILE = path.join(__dirname, 'database.json');

// Função para pegar IPs da rede local
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const k in interfaces) {
    for (const k2 in interfaces[k]) {
      const address = interfaces[k][k2];
      if (address.family === 'IPv4' && !address.internal) {
        addresses.push(address.address);
      }
    }
  }
  return addresses;
}

if (!fs.existsSync(DB_FILE)) {
  const initialState = {
    credits: [],
    commitments: [],
    refunds: [],
    cancellations: [],
    users: [{
      id: 'admin-1',
      username: 'admin',
      password: '123',
      role: 'ADMIN',
      name: 'Administrador Mestre'
    }],
    auditLogs: []
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2));
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/api/state') {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(data);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/update') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { key, data } = JSON.parse(body);
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        db[key] = data;
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/logs') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const newLog = JSON.parse(body);
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        db.auditLogs.unshift(newLog);
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log(`\x1b[32m%s\x1b[0m`, `========================================`);
  console.log(`\x1b[1m%s\x1b[0m`, ` SERVIDOR ORÇAMENTÁRIO BIB 20 ONLINE`);
  console.log(`\x1b[32m%s\x1b[0m`, `========================================`);
  console.log(` Porta: ${PORT}`);
  console.log(`\n Endereços para configurar no App:`);
  console.log(` - Local: http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(` - Rede:  http://${ip}:${PORT}`);
  });
  console.log(`\x1b[32m%s\x1b[0m`, `\n========================================`);
  console.log(` O banco de dados está no arquivo: database.json`);
});
