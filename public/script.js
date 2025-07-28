let priceInputs = {};

async function fetchPrices() {
const res = await fetch('/api/market-prices');
const { prices: data, updatedAt } = await res.json();

const table = document.getElementById('price-table');
table.innerHTML = '';
priceInputs = {};

const materials = [
{ name: '목재', perSetQty: 86 },
{ name: '부드러운 목재', perSetQty: 45 },
{ name: '아비도스 목재', perSetQty: 33 },
{ name: '아비도스 융화 재료', perSetQty: 0 }
];

for (const { name } of materials) {
const price = data[name];
const row = `<tr><td>${name}</td><td><input type="number" id="price-${name}" value="${price}" min="0"></td></tr>`;
table.insertAdjacentHTML('beforeend', row);
}

materials.forEach(({ name }) => {
priceInputs[name] = document.getElementById(`price-${name}`);
priceInputs[name].addEventListener('input', updateProfit);
});

document.getElementById('discount').addEventListener('input', updateProfit);
document.getElementById('sell-count').addEventListener('input', updateProfit);
updateProfit();

const time = new Date(updatedAt);
const timeStr = time.toLocaleTimeString('ko-KR', { hour12: false });
document.getElementById('timestamp').textContent = `(마지막 갱신: ${timeStr})`;
}

function updateProfit() {
const setCount = 40;
const discountRate = parseFloat(document.getElementById('discount').value) || 0;
const reducedCostPerSet = 400 * (1 - discountRate / 100);
const productionCost = reducedCostPerSet * setCount;

let totalMaterialCost = 0;
totalMaterialCost += Math.ceil(86 * setCount / 100) * (parseFloat(priceInputs['목재'].value) || 0);
totalMaterialCost += Math.ceil(45 * setCount / 100) * (parseFloat(priceInputs['부드러운 목재'].value) || 0);
totalMaterialCost += Math.ceil(33 * setCount / 100) * (parseFloat(priceInputs['아비도스 목재'].value) || 0);

const totalCost = totalMaterialCost + productionCost;
const breakeven = totalCost / 400;
document.getElementById('breakeven').textContent = breakeven.toFixed(1);

const fusionPrice = parseFloat(priceInputs['아비도스 융화 재료'].value) || 0;
const sellCount = parseInt(document.getElementById('sell-count').value) || 0;
const profit = fusionPrice * sellCount - (totalCost * (sellCount / 400));
document.getElementById('profit').textContent = profit.toLocaleString();
}

fetchPrices();
setInterval(fetchPrices, 60000);