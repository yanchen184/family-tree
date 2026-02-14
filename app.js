// 許氏家族族譜 v2.0
console.log('許氏家族族譜 v2.0');

let familyData = null;
let allPersons = []; // 儲存所有人物以便搜尋

// 載入資料
async function loadData() {
    try {
        const response = await fetch('family_data.json');
        familyData = await response.json();
        indexAllPersons(familyData.children, 2);
        renderStats();
        renderAncestor();
        renderFamilyGrid();
        setupEventListeners();
    } catch (error) {
        console.error('載入資料失敗:', error);
        document.getElementById('familyGrid').innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #666; grid-column: 1 / -1;">
                <p style="font-size: 1.25rem;">載入資料時發生錯誤</p>
                <p style="margin-top: 0.5rem;">請確認 family_data.json 檔案存在</p>
            </div>
        `;
    }
}

// 建立人物索引以便搜尋
function indexAllPersons(children, generation, parentName = '') {
    if (!children) return;
    children.forEach(person => {
        allPersons.push({
            name: person.name,
            type: person.type,
            spouse: person.spouse,
            generation,
            parentName,
            hasChildren: !!(person.children && person.children.length > 0)
        });
        if (person.children) {
            indexAllPersons(person.children, generation + 1, person.name);
        }
    });
}

// 遞迴計算人數
function countMembers(children, stats, generation) {
    if (!children) return;
    children.forEach(person => {
        stats.total++;
        stats[`gen${generation}`] = (stats[`gen${generation}`] || 0) + 1;
        if (person.spouse) {
            stats.total++;
            stats[`gen${generation}`]++;
        }
        if (person.children) {
            countMembers(person.children, stats, generation + 1);
        }
    });
}

// 計算統計資料
function calculateStats() {
    const stats = { total: 2, gen2: 0, gen3: 0, gen4: 0, gen5: 0 }; // 始祖夫妻
    countMembers(familyData.children, stats, 2);
    return stats;
}

// 渲染統計
function renderStats() {
    const stats = calculateStats();
    document.getElementById('stats').innerHTML = `
        <div class="stat-card">
            <div class="stat-icon members">👨‍👩‍👧‍👦</div>
            <div class="stat-info">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">總人數</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon gen2">👴</div>
            <div class="stat-info">
                <div class="stat-value">${stats.gen2 || 0}</div>
                <div class="stat-label">第二代</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon gen3">👨</div>
            <div class="stat-info">
                <div class="stat-value">${stats.gen3 || 0}</div>
                <div class="stat-label">第三代</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon gen4">🧑</div>
            <div class="stat-info">
                <div class="stat-value">${stats.gen4 || 0}</div>
                <div class="stat-label">第四代</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon gen5">👶</div>
            <div class="stat-info">
                <div class="stat-value">${stats.gen5 || 0}</div>
                <div class="stat-label">第五代</div>
            </div>
        </div>
    `;
}

// 渲染始祖
function renderAncestor() {
    document.getElementById('ancestorSection').innerHTML = `
        <div class="ancestor-card">
            <div class="ancestor-names">
                <div class="ancestor-person">
                    <div class="name">${familyData.name}</div>
                    <div class="role">始祖</div>
                </div>
                <div class="ancestor-connector">♥</div>
                <div class="ancestor-person">
                    <div class="name">${familyData.spouse}</div>
                    <div class="role">始祖母</div>
                </div>
            </div>
        </div>
        <div class="tree-connector"></div>
    `;
}

// 判斷性別
function getGender(type) {
    if (!type) return 'male';
    if (type.includes('女')) return 'female';
    return 'male';
}

// 渲染家族網格
function renderFamilyGrid() {
    const container = document.getElementById('familyGrid');
    let html = '';

    familyData.children.forEach((child, index) => {
        const hasChildren = child.children && child.children.length > 0;
        html += `
            <div class="family-card" data-index="${index}" data-name="${child.name}">
                <div class="family-header" onclick="toggleFamily(${index})">
                    <div class="family-main-info">
                        <span class="type-badge">${child.type}</span>
                        <div class="family-names">
                            <span class="main-name">${child.name}</span>
                            ${child.spouse ? `<span class="spouse-name">配偶：${child.spouse}</span>` : ''}
                        </div>
                    </div>
                    ${hasChildren ? `
                        <div class="toggle-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                                <path d="m6 9 6 6 6-6"/>
                            </svg>
                        </div>
                    ` : ''}
                </div>
                ${hasChildren ? renderChildrenSection(child.children, 3) : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

// 渲染子女區塊（支援多層級）
function renderChildrenSection(children, generation) {
    if (!children || children.length === 0) return '';

    let html = '<div class="family-children"><div class="children-list">';

    children.forEach((child, index) => {
        const gender = getGender(child.type);
        const isDeceased = child.note === '歿';
        const hasChildren = child.children && child.children.length > 0;

        html += `
            <div class="person-row ${gender} ${isDeceased ? 'deceased' : ''}"
                 onclick="showPersonDetail(event, '${escapeHtml(child.name)}', '${escapeHtml(child.type || '')}', '${escapeHtml(child.spouse || '')}', '${escapeHtml(child.note || '')}', ${JSON.stringify(child.children || []).replace(/"/g, '&quot;')})">
                <span class="person-order">${index + 1}</span>
                <div class="person-info">
                    <span class="person-name">${child.name}</span>
                    <span class="person-type">${child.type || ''}</span>
                    ${child.spouse ? `<div class="person-spouse">配偶：${child.spouse}</div>` : ''}
                </div>
                ${isDeceased ? '<span class="person-note">已歿</span>' : ''}
                ${hasChildren ? `<span class="has-children-indicator">▼ ${child.children.length}人</span>` : ''}
            </div>
            ${hasChildren ? renderNestedChildren(child.children, generation + 1) : ''}
        `;
    });

    html += '</div></div>';
    return html;
}

// 渲染巢狀子女
function renderNestedChildren(children, generation) {
    if (!children || children.length === 0) return '';

    const genLabels = { 3: '第三代', 4: '第四代', 5: '第五代', 6: '第六代' };
    let html = `<div class="nested-children">
        <span class="generation-tag">${genLabels[generation] || `第${generation}代`}</span>`;

    children.forEach((child, index) => {
        const gender = getGender(child.type);
        const isDeceased = child.note === '歿';
        const hasChildren = child.children && child.children.length > 0;

        html += `
            <div class="person-row ${gender} ${isDeceased ? 'deceased' : ''}"
                 onclick="showPersonDetail(event, '${escapeHtml(child.name)}', '${escapeHtml(child.type || '')}', '${escapeHtml(child.spouse || '')}', '${escapeHtml(child.note || '')}', ${JSON.stringify(child.children || []).replace(/"/g, '&quot;')})">
                <span class="person-order">${index + 1}</span>
                <div class="person-info">
                    <span class="person-name">${child.name}</span>
                    <span class="person-type">${child.type || ''}</span>
                    ${child.spouse ? `<div class="person-spouse">配偶：${child.spouse}</div>` : ''}
                </div>
                ${isDeceased ? '<span class="person-note">已歿</span>' : ''}
                ${hasChildren ? `<span class="has-children-indicator">▼ ${child.children.length}人</span>` : ''}
            </div>
            ${hasChildren ? renderNestedChildren(child.children, generation + 1) : ''}
        `;
    });

    html += '</div>';
    return html;
}

// HTML 轉義
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

// 切換家庭展開狀態
function toggleFamily(index) {
    const card = document.querySelector(`.family-card[data-index="${index}"]`);
    if (card) {
        card.classList.toggle('expanded');
    }
}

// 顯示人物詳情
function showPersonDetail(event, name, type, spouse, note, children) {
    event.stopPropagation();

    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const gender = getGender(type);
    const icon = gender === 'female' ? '👩' : '👨';

    // 解析 children
    let childrenData = [];
    if (typeof children === 'string') {
        try {
            childrenData = JSON.parse(children.replace(/&quot;/g, '"'));
        } catch (e) {
            childrenData = [];
        }
    } else if (Array.isArray(children)) {
        childrenData = children;
    }

    let html = `
        <div class="modal-person">
            <div class="modal-avatar ${gender}">${icon}</div>
            <h2>${name}</h2>
            <div class="modal-details">
                ${type ? `
                    <div class="modal-detail-row">
                        <span class="label">排行</span>
                        <span class="value">${type}</span>
                    </div>
                ` : ''}
                ${spouse ? `
                    <div class="modal-detail-row">
                        <span class="label">配偶</span>
                        <span class="value">${spouse}</span>
                    </div>
                ` : ''}
                ${note ? `
                    <div class="modal-detail-row">
                        <span class="label">備註</span>
                        <span class="value">${note}</span>
                    </div>
                ` : ''}
            </div>
            ${childrenData.length > 0 ? `
                <div class="modal-children-section">
                    <h3>子女 (${childrenData.length}人)</h3>
                    <div class="modal-children-list">
                        ${childrenData.map(child => `
                            <span class="modal-child-tag">
                                ${getGender(child.type) === 'female' ? '👧' : '👦'} ${child.name}
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    modalBody.innerHTML = html;
    modal.classList.add('active');
}

// 搜尋功能
function searchPerson(keyword) {
    const cards = document.querySelectorAll('.family-card');
    const personRows = document.querySelectorAll('.person-row');

    // 移除所有高亮
    cards.forEach(card => card.classList.remove('highlight'));
    personRows.forEach(row => row.classList.remove('search-match'));

    if (!keyword.trim()) return;

    const searchTerm = keyword.toLowerCase();
    let found = false;

    // 搜尋第二代
    familyData.children.forEach((child, index) => {
        const card = document.querySelector(`.family-card[data-index="${index}"]`);
        let matchInFamily = false;

        // 檢查第二代本人及配偶
        if (child.name.toLowerCase().includes(searchTerm) ||
            (child.spouse && child.spouse.toLowerCase().includes(searchTerm))) {
            matchInFamily = true;
            card.classList.add('highlight');
        }

        // 遞迴搜尋所有後代
        if (searchInChildren(child.children, searchTerm, card)) {
            matchInFamily = true;
        }

        if (matchInFamily && !found) {
            card.classList.add('expanded');
            setTimeout(() => {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            found = true;
        }
    });
}

// 遞迴搜尋子女
function searchInChildren(children, searchTerm, card) {
    if (!children) return false;
    let found = false;

    children.forEach(child => {
        if (child.name.toLowerCase().includes(searchTerm) ||
            (child.spouse && child.spouse.toLowerCase().includes(searchTerm))) {
            found = true;
            card.classList.add('highlight', 'expanded');
        }
        if (child.children && searchInChildren(child.children, searchTerm, card)) {
            found = true;
        }
    });

    return found;
}

// 全部展開
function expandAll() {
    document.querySelectorAll('.family-card').forEach(card => {
        card.classList.add('expanded');
    });
}

// 全部收合
function collapseAll() {
    document.querySelectorAll('.family-card').forEach(card => {
        card.classList.remove('expanded');
    });
}

// 關閉 Modal
function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// 設置事件監聽器
function setupEventListeners() {
    // 搜尋
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchPerson(e.target.value);
        }, 300);
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchPerson('');
        searchInput.focus();
    });

    // 全部展開/收合
    document.getElementById('expandAll').addEventListener('click', expandAll);
    document.getElementById('collapseAll').addEventListener('click', collapseAll);

    // Modal 關閉
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);

    // ESC 關閉 Modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', loadData);
