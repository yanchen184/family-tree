// 許氏家族族譜 v1.0.0
console.log('許氏家族族譜 v1.0.0');

let familyData = null;

// 載入資料
async function loadData() {
    try {
        const response = await fetch('family_data.json');
        familyData = await response.json();
        renderFamilyTree();
        renderStats();
        setupEventListeners();
    } catch (error) {
        console.error('載入資料失敗:', error);
        document.getElementById('familyTree').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p>載入資料時發生錯誤，請確認 family_data.json 檔案存在。</p>
            </div>
        `;
    }
}

// 計算統計資料
function calculateStats() {
    let totalMembers = 2; // 始祖夫妻
    let generation2 = familyData.children.length;
    let generation3 = 0;
    let marriages = 1; // 始祖

    familyData.children.forEach(child => {
        totalMembers++;
        if (child.spouse) {
            totalMembers++;
            marriages++;
        }
        if (child.children) {
            child.children.forEach(grandchild => {
                totalMembers++;
                generation3++;
                if (grandchild.spouse) {
                    totalMembers++;
                    marriages++;
                }
            });
        }
    });

    return {
        totalMembers,
        generation2,
        generation3,
        marriages
    };
}

// 渲染統計
function renderStats() {
    const stats = calculateStats();
    document.getElementById('stats').innerHTML = `
        <div class="stat-item">
            <span class="icon">👨‍👩‍👧‍👦</span>
            <span class="number">${stats.totalMembers}</span>
            <span class="label">總人數</span>
        </div>
        <div class="stat-item">
            <span class="icon">👶</span>
            <span class="number">${stats.generation2}</span>
            <span class="label">第二代</span>
        </div>
        <div class="stat-item">
            <span class="icon">🧒</span>
            <span class="number">${stats.generation3}</span>
            <span class="label">第三代</span>
        </div>
        <div class="stat-item">
            <span class="icon">💑</span>
            <span class="number">${stats.marriages}</span>
            <span class="label">婚姻</span>
        </div>
    `;
}

// 判斷性別
function getGender(type) {
    if (!type) return 'male';
    if (type.includes('女')) return 'female';
    return 'male';
}

// 渲染族譜樹
function renderFamilyTree() {
    const container = document.getElementById('familyTree');

    let html = `
        <div class="ancestor">
            <div class="ancestor-card">
                <h2>${familyData.name}</h2>
                <div class="spouse-info">配偶：${familyData.spouse}</div>
            </div>
        </div>
        <div class="connector"></div>
        <div class="children-container">
    `;

    familyData.children.forEach((child, index) => {
        const hasChildren = child.children && child.children.length > 0;
        const gender = getGender(child.type);

        html += `
            <div class="family-card" data-name="${child.name}" data-index="${index}">
                <div class="family-header" onclick="toggleFamily(${index})">
                    <div class="family-info">
                        <span class="type-badge">${child.type}</span>
                        <h3>${child.name}</h3>
                        ${child.spouse ? `<span class="spouse">配 ${child.spouse}</span>` : ''}
                    </div>
                    ${hasChildren ? '<span class="toggle-icon">▼</span>' : ''}
                </div>
                ${hasChildren ? renderChildren(child.children) : ''}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// 渲染子女列表
function renderChildren(children) {
    let html = '<div class="family-children"><div class="grandchildren-list">';

    children.forEach((child, index) => {
        const gender = getGender(child.type);
        const isDeceased = child.note === '歿';

        html += `
            <div class="grandchild ${gender} ${isDeceased ? 'deceased' : ''}"
                 onclick="showPersonDetail('${child.name}', '${child.type}', '${child.spouse || ''}', '${child.note || ''}')">
                <span class="order">${index + 1}</span>
                <span class="name">${child.name}</span>
                <span class="type">${child.type}</span>
                ${child.spouse ? `<span class="spouse-name">配 ${child.spouse}</span>` : ''}
                ${isDeceased ? '<span class="deceased-mark">已歿</span>' : ''}
            </div>
        `;
    });

    html += '</div></div>';
    return html;
}

// 切換家庭展開狀態
function toggleFamily(index) {
    const card = document.querySelector(`.family-card[data-index="${index}"]`);
    if (card) {
        card.classList.toggle('expanded');
    }
}

// 顯示人物詳情
function showPersonDetail(name, type, spouse, note) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const gender = getGender(type);
    const icon = gender === 'female' ? '👩' : '👨';

    let parentInfo = '';
    // 尋找父母資訊
    familyData.children.forEach(parent => {
        if (parent.children) {
            parent.children.forEach(child => {
                if (child.name === name) {
                    parentInfo = `
                        <div class="detail">
                            <span class="label">父母：</span>
                            ${parent.name} & ${parent.spouse || '(未記錄)'}
                        </div>
                    `;
                }
            });
        }
    });

    modalBody.innerHTML = `
        <div class="modal-person">
            <div class="icon">${icon}</div>
            <h2>${name}</h2>
            <div class="detail">
                <span class="label">排行：</span>${type}
            </div>
            ${spouse ? `
                <div class="detail">
                    <span class="label">配偶：</span>${spouse}
                </div>
            ` : ''}
            ${parentInfo}
            ${note ? `
                <div class="detail" style="color: #757575;">
                    <span class="label">備註：</span>${note}
                </div>
            ` : ''}
        </div>
    `;

    modal.classList.add('active');
}

// 搜尋功能
function searchPerson(keyword) {
    const cards = document.querySelectorAll('.family-card');
    const grandchildren = document.querySelectorAll('.grandchild');

    // 移除所有高亮
    cards.forEach(card => card.classList.remove('highlight'));
    grandchildren.forEach(gc => gc.classList.remove('highlight'));

    if (!keyword.trim()) return;

    const searchTerm = keyword.toLowerCase();
    let found = false;

    // 搜尋第二代
    familyData.children.forEach((child, index) => {
        const card = document.querySelector(`.family-card[data-index="${index}"]`);

        if (child.name.toLowerCase().includes(searchTerm) ||
            (child.spouse && child.spouse.toLowerCase().includes(searchTerm))) {
            card.classList.add('highlight');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            found = true;
        }

        // 搜尋第三代
        if (child.children) {
            child.children.forEach(grandchild => {
                if (grandchild.name.toLowerCase().includes(searchTerm) ||
                    (grandchild.spouse && grandchild.spouse.toLowerCase().includes(searchTerm))) {
                    card.classList.add('highlight', 'expanded');

                    setTimeout(() => {
                        const gcElements = card.querySelectorAll('.grandchild');
                        gcElements.forEach(gc => {
                            if (gc.querySelector('.name').textContent.includes(keyword) ||
                                (gc.querySelector('.spouse-name') &&
                                 gc.querySelector('.spouse-name').textContent.includes(keyword))) {
                                gc.style.background = '#FFEB3B';
                                if (!found) {
                                    gc.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    found = true;
                                }
                            }
                        });
                    }, 100);
                }
            });
        }
    });
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

// 設置事件監聽器
function setupEventListeners() {
    // 搜尋
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            // 重置高亮
            document.querySelectorAll('.grandchild').forEach(gc => {
                gc.style.background = '';
            });
            searchPerson(e.target.value);
        }, 300);
    });

    // 全部展開/收合
    document.getElementById('expandAll').addEventListener('click', expandAll);
    document.getElementById('collapseAll').addEventListener('click', collapseAll);

    // Modal 關閉
    const modal = document.getElementById('modal');
    document.querySelector('.close').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // ESC 關閉 Modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.classList.remove('active');
        }
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', loadData);
