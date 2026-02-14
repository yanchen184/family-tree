// 許氏家族族譜 v3.0 - 樹狀結構版
console.log('許氏家族族譜 v3.0');

let familyData = null;

// 載入資料
async function loadData() {
    try {
        const response = await fetch('family_data.json');
        familyData = await response.json();
        renderStats();
        renderAncestor();
        renderQuickNav();
        renderFamilyTree();
        setupEventListeners();
    } catch (error) {
        console.error('載入資料失敗:', error);
        document.getElementById('familyTree').innerHTML = `
            <div class="error-message">
                <p>載入資料時發生錯誤</p>
                <p>請確認 family_data.json 檔案存在</p>
            </div>
        `;
    }
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

// 計算統計資料（動態支援任意代數）
function calculateStats() {
    const stats = { total: 2 }; // 始祖夫妻
    countMembers(familyData.children, stats, 2);
    return stats;
}

// 渲染統計（只顯示總人數）
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
    `;
}

// 渲染始祖
function renderAncestor() {
    document.getElementById('ancestorSection').innerHTML = `
        <div class="ancestor-card">
            <div class="ancestor-badge">始祖</div>
            <div class="ancestor-names">
                <div class="ancestor-person">
                    <span class="ancestor-icon">👴</span>
                    <span class="ancestor-name">${familyData.name}</span>
                </div>
                <div class="ancestor-connector">
                    <span class="heart">♥</span>
                </div>
                <div class="ancestor-person">
                    <span class="ancestor-icon">👵</span>
                    <span class="ancestor-name">${familyData.spouse}</span>
                </div>
            </div>
        </div>
    `;
}

// 渲染快速導航
function renderQuickNav() {
    const nav = document.getElementById('quickNav');
    let html = '';
    familyData.children.forEach((child, index) => {
        const label = child.type.replace('第二代', '');
        html += `<button class="quick-nav-btn" onclick="scrollToFamily(${index})">${label} ${child.name}</button>`;
    });
    nav.innerHTML = html;
}

// 滾動到指定家族
function scrollToFamily(index) {
    const familyNode = document.querySelector(`.tree-branch[data-index="${index}"]`);
    if (familyNode) {
        familyNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 確保展開
        const content = familyNode.querySelector('.branch-content');
        if (content && !familyNode.classList.contains('expanded')) {
            familyNode.classList.add('expanded');
        }
        // 高亮效果
        familyNode.classList.add('highlight');
        setTimeout(() => familyNode.classList.remove('highlight'), 2000);
    }
}

// 判斷性別
function getGender(type) {
    if (!type) return 'male';
    if (type.includes('女')) return 'female';
    return 'male';
}

// 計算後代人數
function countDescendants(person) {
    if (!person.children) return 0;
    let count = person.children.length;
    person.children.forEach(child => {
        if (child.spouse) count++;
        count += countDescendants(child);
    });
    return count;
}

// 渲染族譜樹
function renderFamilyTree() {
    const container = document.getElementById('familyTree');
    let html = '<div class="tree-container">';

    familyData.children.forEach((child, index) => {
        const hasChildren = child.children && child.children.length > 0;
        const descendantCount = countDescendants(child);
        const gender = getGender(child.type);

        html += `
            <div class="tree-branch" data-index="${index}" data-name="${child.name}">
                <div class="branch-header" onclick="toggleBranch(this)">
                    <div class="branch-line-vertical"></div>
                    <div class="branch-toggle">${hasChildren ? '▼' : '●'}</div>
                    <div class="branch-person ${gender}">
                        <span class="person-icon">${gender === 'female' ? '👩' : '👨'}</span>
                        <div class="person-details">
                            <span class="person-name">${child.name}</span>
                            <span class="person-type">${child.type}</span>
                            ${child.spouse ? `<span class="person-spouse">配偶：${child.spouse}</span>` : ''}
                        </div>
                        ${hasChildren ? `<span class="descendant-count">${descendantCount} 人</span>` : ''}
                    </div>
                </div>
                ${hasChildren ? renderTreeChildren(child.children, 3) : ''}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// 渲染樹狀子節點
function renderTreeChildren(children, generation) {
    if (!children || children.length === 0) return '';

    let html = `<div class="branch-content">`;
    html += '<div class="branch-children">';

    children.forEach((child, index) => {
        const gender = getGender(child.type);
        const isDeceased = child.note === '歿';
        const hasChildren = child.children && child.children.length > 0;
        const descendantCount = countDescendants(child);
        const isLast = index === children.length - 1;

        html += `
            <div class="tree-node ${isLast ? 'last-node' : ''}" data-name="${child.name}">
                <div class="node-connector">
                    <div class="connector-horizontal"></div>
                    <div class="connector-vertical ${isLast ? 'half' : ''}"></div>
                </div>
                <div class="node-content ${hasChildren ? 'has-children' : ''}" onclick="${hasChildren ? 'toggleNode(this)' : `showPersonModal(event, '${escapeHtml(child.name)}', '${escapeHtml(child.type || '')}', '${escapeHtml(child.spouse || '')}', '${escapeHtml(child.note || '')}')`}">
                    <div class="node-toggle">${hasChildren ? '▼' : ''}</div>
                    <div class="node-person ${gender} ${isDeceased ? 'deceased' : ''}">
                        <span class="person-icon">${gender === 'female' ? '👩' : '👨'}</span>
                        <div class="person-details">
                            <span class="person-name">${child.name}</span>
                            ${child.type ? `<span class="person-type">${child.type}</span>` : ''}
                            ${child.spouse ? `<span class="person-spouse">配偶：${child.spouse}</span>` : ''}
                            ${isDeceased ? '<span class="person-deceased">已歿</span>' : ''}
                        </div>
                        ${hasChildren ? `<span class="descendant-count">${descendantCount} 人</span>` : ''}
                    </div>
                </div>
                ${hasChildren ? renderTreeChildren(child.children, generation + 1) : ''}
            </div>
        `;
    });

    html += '</div></div>';
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

// 切換分支展開
function toggleBranch(header) {
    const branch = header.closest('.tree-branch');
    branch.classList.toggle('expanded');
}

// 切換節點展開
function toggleNode(content) {
    const node = content.closest('.tree-node');
    node.classList.toggle('expanded');
    event.stopPropagation();
}

// 顯示人物 Modal
function showPersonModal(event, name, type, spouse, note) {
    event.stopPropagation();

    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const gender = getGender(type);
    const icon = gender === 'female' ? '👩' : '👨';

    modalBody.innerHTML = `
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
        </div>
    `;

    modal.classList.add('active');
}

// 搜尋功能
function searchPerson(keyword) {
    // 移除所有高亮和搜尋標記
    document.querySelectorAll('.search-match').forEach(el => el.classList.remove('search-match'));
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));

    if (!keyword.trim()) return;

    const searchTerm = keyword.toLowerCase();
    let firstMatch = null;

    // 搜尋所有人名
    document.querySelectorAll('.person-name').forEach(nameEl => {
        if (nameEl.textContent.toLowerCase().includes(searchTerm)) {
            const node = nameEl.closest('.tree-node') || nameEl.closest('.tree-branch');
            if (node) {
                // 展開所有父層
                let parent = node.parentElement;
                while (parent) {
                    if (parent.classList.contains('branch-content')) {
                        const branch = parent.closest('.tree-branch');
                        if (branch) branch.classList.add('expanded');
                    }
                    if (parent.classList.contains('tree-node')) {
                        parent.classList.add('expanded');
                    }
                    parent = parent.parentElement;
                }

                // 標記搜尋結果
                node.classList.add('search-match');

                if (!firstMatch) {
                    firstMatch = node;
                }
            }
        }
    });

    // 搜尋配偶
    document.querySelectorAll('.person-spouse').forEach(spouseEl => {
        if (spouseEl.textContent.toLowerCase().includes(searchTerm)) {
            const node = spouseEl.closest('.tree-node') || spouseEl.closest('.tree-branch');
            if (node) {
                let parent = node.parentElement;
                while (parent) {
                    if (parent.classList.contains('branch-content')) {
                        const branch = parent.closest('.tree-branch');
                        if (branch) branch.classList.add('expanded');
                    }
                    if (parent.classList.contains('tree-node')) {
                        parent.classList.add('expanded');
                    }
                    parent = parent.parentElement;
                }
                node.classList.add('search-match');
                if (!firstMatch) firstMatch = node;
            }
        }
    });

    // 滾動到第一個匹配項
    if (firstMatch) {
        setTimeout(() => {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

// 全部展開
function expandAll() {
    document.querySelectorAll('.tree-branch').forEach(branch => {
        branch.classList.add('expanded');
    });
    document.querySelectorAll('.tree-node').forEach(node => {
        node.classList.add('expanded');
    });
}

// 全部收合
function collapseAll() {
    document.querySelectorAll('.tree-branch').forEach(branch => {
        branch.classList.remove('expanded');
    });
    document.querySelectorAll('.tree-node').forEach(node => {
        node.classList.remove('expanded');
    });
}

// 關閉 Modal
function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// 設置事件監聽器
function setupEventListeners() {
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

    document.getElementById('expandAll').addEventListener('click', expandAll);
    document.getElementById('collapseAll').addEventListener('click', collapseAll);

    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', loadData);
