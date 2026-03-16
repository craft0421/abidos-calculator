let marketPrices = {};
let currentCategory = '벌목';
let isFarmingMode = false;
let isTaxApplied = true;
let currentOptType = 'normal';

const materialMap = {
    '벌목': ['목재', '부드러운 목재', '아비도스 목재'],
    '채광': ['철광석', '묵직한 철광석', '아비도스 철광석'],
    '낚시': ['생선', '붉은 살 생선', '아비도스 태양 잉어'],
    '고고학': ['고대 유물', '희귀한 유물', '아비도스 유물'],
    '수렵': ['두툼한 생고기', '다듬은 생고기', '아비도스 두툼한 생고기'],
    '채집': ['들꽃', '수줍은 들꽃', '아비도스 들꽃']
};

async function fetchPrices() {
    try {
        const res = await fetch('/api/market-prices');
        const data = await res.json();
        marketPrices = data.prices;
        const time = new Date(data.updatedAt);
        document.getElementById('timestamp').textContent = `(최근 갱신: ${time.toLocaleTimeString()})`;
        renderTables();
        updateBestCategory();
    } catch (e) { console.error("데이터 로드 실패:", e); }
}

// [수정] 새로운 수수료 계산 공식을 적용하는 함수
function calculateCraftingFee(baseFee, discountPercent) {
    return Math.floor(baseFee * (1 - 0.01 * discountPercent));
}

function getExchangePlan(initialInv, type) {
    const recipes = {
        'normal': { n: 86, s: 45, a: 33, baseFee: 400, res: '아비도스 융화 재료' },
        'high': { n: 112, s: 59, a: 43, baseFee: 520, res: '상급 아비도스 융화 재료' }
    };
    const r = recipes[type];
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const taxRate = isTaxApplied ? 0.95 : 1.0;
    
    // 새 공식 적용
    const craftingFeePer10 = calculateCraftingFee(r.baseFee, discount);
    
    let low = 0, high = 20000, best = null;
    while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        if (mid === 0) { low = 1; continue; }
        let mats = { ...initialInv };
        mats.normal -= mid * r.n; mats.soft -= mid * r.s; mats.abidos -= mid * r.a;
        if (mats.normal < 0 || mats.soft < 0) { high = mid - 1; continue; }
        let diffA = mats.abidos < 0 ? -mats.abidos : 0;
        let exP2A = Math.ceil(diffA / 10);
        let needP = exP2A * 100;
        let finalNeedP = Math.max(0, needP - mats.powder);
        let exN2P = Math.min(Math.floor(mats.normal / 100), Math.ceil(finalNeedP / 80));
        let curP = exN2P * 80;
        let exS2P = 0;
        if (curP < finalNeedP) {
            exS2P = Math.min(Math.floor(mats.soft / 50), Math.ceil((finalNeedP - curP) / 80));
            curP += exS2P * 80;
        }
        if (curP + Math.min(mats.powder, needP) >= needP) {
            const totalCraftingFee = craftingFeePer10 * mid;
            const revenue = (marketPrices[r.res] || 0) * (mid * 10) * taxRate;
            best = { mid, exN2P, exS2P, exP2A, profit: revenue - totalCraftingFee };
            low = mid + 1;
        } else { high = mid - 1; }
    }
    return best;
}

function runOptimization() {
    if (!isFarmingMode) return;
    const inv = {
        normal: parseInt(document.getElementById('inv-normal').value) || 0,
        soft: parseInt(document.getElementById('inv-soft').value) || 0,
        abidos: parseInt(document.getElementById('inv-abidos').value) || 0,
        powder: parseInt(document.getElementById('inv-powder').value) || 0
    };

    const nPlan = getExchangePlan(inv, 'normal');
    const hPlan = getExchangePlan(inv, 'high');

    const isHB = (hPlan?.profit || 0) > (nPlan?.profit || 0);
    document.getElementById('opt-tab-normal').innerHTML = `아비도스${!isHB ? ' <span class="recommend-text">(추천)</span>' : ''}`;
    document.getElementById('opt-tab-high').innerHTML = `상급 아비도스${isHB ? ' <span class="recommend-text">(추천)</span>' : ''}`;

    const best = currentOptType === 'high' ? hPlan : nPlan;
    const area = document.getElementById('optimization-result-area');
    if (!best) { area.innerHTML = "<p style='text-align:center;'>제작 가능한 재료가 부족합니다.</p>"; return; }

    area.innerHTML = `
        <div class="exchange-step"><span>일반 → 가루</span><span class="step-arrow">▶</span><span>${best.exN2P}회</span></div>
        <div class="exchange-step"><span>고급 → 가루</span><span class="step-arrow">▶</span><span>${best.exS2P}회</span></div>
        <div class="exchange-step"><span>가루 → 희귀(아비도스)</span><span class="step-arrow">▶</span><span>${best.exP2A}회</span></div>
        <div style="margin-top:20px; padding:15px; border-radius:8px; background:rgba(126, 87, 194, 0.1);">
            <h3 style="color:var(--primary-color); margin:0;">최대 제작: ${best.mid * 10}개</h3>
            <p style="margin:5px 0 0 0; font-weight:bold;">예상 순이익${isTaxApplied ? '(수수료 5% 제외)' : '(수수료 미차감)'}: ${Math.floor(best.profit).toLocaleString()} G</p>
        </div>
    `;
}

function updateProfit() {
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const sellCount = parseInt(document.getElementById('sell-count').value) || 0;
    const mats = materialMap[currentCategory];
    const getP = (n) => isFarmingMode ? 0 : (marketPrices[n] || 0) / 100;
    const taxRate = isTaxApplied ? 0.95 : 1.0;

    const recipes = [
        { id: 'normal', m: [86, 45, 33], baseFee: 400, res: '아비도스 융화 재료' },
        { id: 'high', m: [112, 59, 43], baseFee: 520, res: '상급 아비도스 융화 재료' }
    ];
    let profits = {};
    recipes.forEach(r => {
        const matCost = (r.m[0] * getP(mats[0])) + (r.m[1] * getP(mats[1])) + (r.m[2] * getP(mats[2]));
        // 새 공식 적용
        const craftingFeePer10 = calculateCraftingFee(r.baseFee, discount);
        const costPer10 = matCost + craftingFeePer10;
        
        const revenuePer10 = (marketPrices[r.res] || 0) * 10 * taxRate;
        const profit = (revenuePer10 - costPer10) * (sellCount / 10);
        
        profits[r.id] = profit;
        document.getElementById(`cost-${r.id}`).textContent = Math.floor(costPer10).toLocaleString();
        const pEl = document.getElementById(`profit-${r.id}`);
        pEl.textContent = Math.floor(profit).toLocaleString();
        pEl.className = profit >= 0 ? 'profit-plus' : 'profit-minus';
    });

    const nc = document.getElementById('card-normal');
    const hc = document.getElementById('card-high');
    nc.classList.remove('best-card');
    hc.classList.remove('best-card');

    if (profits.normal > 0 || profits.high > 0) {
        if (profits.normal >= profits.high) nc.classList.add('best-card');
        else hc.classList.add('best-card');
    }
}

// 이벤트 리스너 및 나머지 헬퍼 함수들은 이전과 동일
document.getElementById('tax-toggle')?.addEventListener('change', e => {
    isTaxApplied = e.target.checked;
    updateProfit();
    if(isFarmingMode) runOptimization();
});

document.getElementById('production-mode-toggle')?.addEventListener('change', e => {
    isFarmingMode = e.target.checked;
    document.getElementById('main-grid').style.display = isFarmingMode ? 'none' : 'grid';
    document.getElementById('optimization-container').style.display = isFarmingMode ? 'block' : 'none';
    if(isFarmingMode) runOptimization();
    updateProfit();
});

document.getElementById('opt-type-tabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (btn) {
        document.querySelectorAll('#opt-type-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentOptType = btn.dataset.type;
        runOptimization();
    }
});

document.getElementById('category-tabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (btn) {
        document.querySelectorAll('#category-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        renderTables();
        if(isFarmingMode) runOptimization();
    }
});

['discount', 'sell-count', 'inv-normal', 'inv-soft', 'inv-abidos', 'inv-powder'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
        updateProfit();
        if(isFarmingMode) runOptimization();
    });
});

function renderTables() {
    const mats = materialMap[currentCategory];
    const createRow = (n) => `<tr><td>${n}</td><td><input type="number" class="price-input" data-name="${n}" value="${marketPrices[n] || 0}"></td></tr>`;
    document.getElementById('price-table-normal').innerHTML = mats.map(createRow).join('') + createRow('아비도스 융화 재료');
    document.getElementById('price-table-high').innerHTML = mats.map(createRow).join('') + createRow('상급 아비도스 융화 재료');
    document.querySelectorAll('.price-input').forEach(i => i.addEventListener('input', e => {
        marketPrices[e.target.dataset.name] = parseFloat(e.target.value) || 0;
        updateProfit();
    }));
    updateProfit();
}

function updateBestCategory() {
    let max = -Infinity, best = '';
    document.querySelectorAll('#category-tabs .tab-btn').forEach(b => b.classList.remove('best-profit'));

    Object.keys(materialMap).forEach(c => {
        const p = calculateSpecificProfit(c, 'normal');
        if (p > max) { max = p; best = c; }
    });
    document.querySelectorAll('#category-tabs .tab-btn').forEach(b => {
        const cat = b.dataset.cat;
        b.innerHTML = cat;
        if (cat === best && max > 0) {
            b.classList.add('best-profit');
            b.innerHTML = `${cat} <span class="profit-label">(최대 이익)</span>`;
        }
    });
}

function calculateSpecificProfit(cat, type) {
    const d = parseFloat(document.getElementById('discount').value) || 0;
    const s = parseInt(document.getElementById('sell-count').value) || 0;
    const m = materialMap[cat];
    const taxRate = isTaxApplied ? 0.95 : 1.0;
    const r = type === 'normal' ? { m: [86, 45, 33], baseFee: 400, res: '아비도스 융화 재료' } : { m: [112, 59, 43], baseFee: 520, res: '상급 아비도스 융화 재료' };
    const p = (n) => isFarmingMode ? 0 : (marketPrices[n] || 0) / 100;
    
    const craftingFeePer10 = calculateCraftingFee(r.baseFee, d);
    const cost = (r.m[0] * p(m[0])) + (r.m[1] * p(m[1])) + (r.m[2] * p(m[2])) + craftingFeePer10;
    
    return ((marketPrices[r.res] || 0) * 10 * taxRate - cost) * (s / 10);
}

document.getElementById('theme-toggle')?.addEventListener('change', e => document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light'));

fetchPrices();
setInterval(fetchPrices, 60000);