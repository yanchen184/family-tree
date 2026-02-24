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

// 渲染統計（顯示總人數及各代人數）
function renderStats() {
    const stats = calculateStats();
    const genLabels = ['', '', '子代', '孫代', '曾孫代', '玄孫代', '來孫代', '晜孫代', '仍孫代', '雲孫代'];

    let html = `
        <div class="stat-card">
            <div class="stat-info">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">總人數</div>
            </div>
        </div>
    `;

    // 動態顯示各代人數（從第2代開始）
    for (let i = 2; i <= 10; i++) {
        if (stats[`gen${i}`]) {
            const label = genLabels[i] || `第${i}代`;
            html += `
                <div class="stat-card">
                    <div class="stat-info">
                        <div class="stat-value">${stats[`gen${i}`]}</div>
                        <div class="stat-label">${label}</div>
                    </div>
                </div>
            `;
        }
    }

    document.getElementById('stats').innerHTML = html;
}

// 渲染始祖
function renderAncestor() {
    document.getElementById('ancestorSection').innerHTML = `
        <div class="ancestor-card">
            <div class="ancestor-badge">始祖</div>
            <div class="ancestor-names">
                <div class="ancestor-person">
                    <span class="ancestor-name">${familyData.name}</span>
                </div>
                <div class="ancestor-connector">
                    <span class="heart">♥</span>
                </div>
                <div class="ancestor-person">
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
        const hasChildr
...(truncated)