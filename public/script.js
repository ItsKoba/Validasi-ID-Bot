document.addEventListener('DOMContentLoaded', () => {
    fetchBots();
});

async function fetchBots() {
    try {
        const response = await fetch('/api/list');
        const data = await response.json();
        
        updateStats(data);
        renderTable(data);
    } catch (error) {
        console.error(error);
    }
}

function updateStats(bots) {
    const total = bots.length;
    const blacklisted = bots.filter(b => b.isBlacklisted).length;
    const active = total - blacklisted;

    animateValue("totalBots", parseInt(document.getElementById('totalBots').innerText), total, 1000);
    animateValue("totalBlacklisted", parseInt(document.getElementById('totalBlacklisted').innerText), blacklisted, 1000);
    animateValue("totalActive", parseInt(document.getElementById('totalActive').innerText), active, 1000);
}

function animateValue(id, start, end, duration) {
    if (start === end) return;
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const obj = document.getElementById(id);
    
    const timer = setInterval(function() {
        current += increment;
        obj.innerHTML = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime > 100 ? 100 : stepTime);
}

function renderTable(bots) {
    const tbody = document.querySelector('#botTable tbody');
    tbody.innerHTML = '';

    bots.forEach(bot => {
        const tr = document.createElement('tr');
        
        const statusBadge = bot.isBlacklisted 
            ? '<span class="status-badge status-blacklisted">BLACKLISTED</span>'
            : '<span class="status-badge status-active">ACTIVE</span>';

        const actionText = bot.isBlacklisted ? 'Unblock' : 'Block';
        const actionClass = bot.isBlacklisted ? 'success-text' : 'danger-text';

        tr.innerHTML = `
            <td style="font-family:monospace; color:var(--accent)">#${bot.botId}</td>
            <td>${bot.storeName}</td>
            <td>${bot.ownerId}</td>
            <td>${bot.ownerUsername}</td>
            <td>${statusBadge}</td>
            <td>
                <button onclick="toggleBlacklist('${bot.botId}', '${bot.isBlacklisted ? 'unblacklist' : 'blacklist'}')" class="neo-btn" style="padding: 0.5rem 1rem; font-size: 0.7rem;">
                    <span class="${actionClass}">${actionText}</span>
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

async function toggleBlacklist(botId, action) {
    if (!confirm(`Konfirmasi tindakan: ${action.toUpperCase()} pada Bot ID ${botId}?`)) return;

    try {
        const response = await fetch('/api/blacklist', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botId, action })
        });

        if (response.ok) {
            fetchBots();
        }
    } catch (error) {
        console.error(error);
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.endpoint-tabs button').forEach(el => el.classList.remove('tab-active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('tab-active');
}

async function testApi(type) {
    const outputBox = document.getElementById('jsonOutput');
    const latencyBox = document.getElementById('latency');
    outputBox.innerHTML = '<span style="color:var(--text-secondary)">Processing request...</span>';
    
    const startTime = Date.now();
    let url = '';
    let method = '';
    let body = null;

    if (type === 'register') {
        url = '/api/register';
        method = 'POST';
        body = {
            botId: document.getElementById('pg-botId').value,
            ownerId: document.getElementById('pg-ownerId').value,
            storeName: document.getElementById('pg-storeName').value,
            ownerUsername: document.getElementById('pg-username').value
        };
        
        if (!body.botId) return outputBox.innerHTML = "Error: Bot ID Required";
    } else if (type === 'check') {
        const id = document.getElementById('pg-check-botId').value;
        if (!id) return outputBox.innerHTML = "Error: Bot ID Required";
        url = `/api/check/${id}`;
        method = 'GET';
    }

    try {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url, options);
        const result = await response.json();
        
        const endTime = Date.now();
        latencyBox.innerText = `${endTime - startTime}ms`;
        latencyBox.style.color = (endTime - startTime) > 500 ? 'var(--danger)' : 'var(--success)';

        outputBox.innerHTML = syntaxHighlight(result);
        
        if (type === 'register' && response.ok) fetchBots();

    } catch (error) {
        outputBox.innerHTML = `Error: ${error.message}`;
    }
}

function syntaxHighlight(json) {
    if (typeof json != 'string') {
        json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
                match = match.replace(/"/g, '').replace(':', '');
                return `<span style="color:#d4af37">${match}</span>: `; 
            } else {
                cls = 'string';
                return `<span style="color:#00e676">${match}</span>`;
            }
        } else if (/true|false/.test(match)) {
            return `<span style="color:#ff4d4d">${match}</span>`;
        } else if (/null/.test(match)) {
            return `<span style="color:#a0a0a0">${match}</span>`;
        }
        return `<span style="color:#00e676">${match}</span>`;
    });
}