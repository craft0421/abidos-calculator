const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 모든 생활 카테고리 재료 및 융화 재료 리스트
const items = [
  // 1. 벌목
  { name: "목재", requestBody: { CategoryCode: 90300, ItemGrade: "일반", ItemName: "목재", PageNo: 1 } },
  { name: "부드러운 목재", requestBody: { CategoryCode: 90300, ItemGrade: "고급", ItemName: "부드러운 목재", PageNo: 1 } },
  { name: "아비도스 목재", requestBody: { CategoryCode: 90300, ItemGrade: "희귀", ItemName: "아비도스 목재", PageNo: 1 } },
  
  // 2. 채광
  { name: "철광석", requestBody: { CategoryCode: 90400, ItemGrade: "일반", ItemName: "철광석", PageNo: 1 } },
  { name: "묵직한 철광석", requestBody: { CategoryCode: 90400, ItemGrade: "고급", ItemName: "묵직한 철광석", PageNo: 1 } },
  { name: "아비도스 철광석", requestBody: { CategoryCode: 90400, ItemGrade: "희귀", ItemName: "아비도스 철광석", PageNo: 1 } },
  
  // 3. 낚시
  { name: "생선", requestBody: { CategoryCode: 90600, ItemGrade: "일반", ItemName: "생선", PageNo: 1 } },
  { name: "붉은 살 생선", requestBody: { CategoryCode: 90600, ItemGrade: "고급", ItemName: "붉은 살 생선", PageNo: 1 } },
  { name: "아비도스 태양 잉어", requestBody: { CategoryCode: 90600, ItemGrade: "희귀", ItemName: "아비도스 태양 잉어", PageNo: 1 } },
  
  // 4. 고고학
  { name: "고대 유물", requestBody: { CategoryCode: 90700, ItemGrade: "일반", ItemName: "고대 유물", PageNo: 1 } },
  { name: "희귀한 유물", requestBody: { CategoryCode: 90700, ItemGrade: "고급", ItemName: "희귀한 유물", PageNo: 1 } },
  { name: "아비도스 유물", requestBody: { CategoryCode: 90700, ItemGrade: "희귀", ItemName: "아비도스 유물", PageNo: 1 } },
  
  // 5. 수렵
  { name: "두툼한 생고기", requestBody: { CategoryCode: 90500, ItemGrade: "일반", ItemName: "두툼한 생고기", PageNo: 1 } },
  { name: "다듬은 생고기", requestBody: { CategoryCode: 90500, ItemGrade: "고급", ItemName: "다듬은 생고기", PageNo: 1 } },
  { name: "아비도스 두툼한 생고기", requestBody: { CategoryCode: 90500, ItemGrade: "희귀", ItemName: "아비도스 두툼한 생고기", PageNo: 1 } },
  
  // 6. 채집
  { name: "들꽃", requestBody: { CategoryCode: 90200, ItemGrade: "일반", ItemName: "들꽃", PageNo: 1 } },
  { name: "수줍은 들꽃", requestBody: { CategoryCode: 90200, ItemGrade: "고급", ItemName: "수줍은 들꽃", PageNo: 1 } },
  { name: "아비도스 들꽃", requestBody: { CategoryCode: 90200, ItemGrade: "희귀", ItemName: "아비도스 들꽃", PageNo: 1 } },
  
  // 7. 융화 재료
  { name: "아비도스 융화 재료", requestBody: { CategoryCode: 50000, ItemTier: 4, ItemGrade: "희귀", ItemName: "아비도스 융화 재료", PageNo: 1 } },
  { name: "상급 아비도스 융화 재료", requestBody: { CategoryCode: 50000, ItemTier: 4, ItemGrade: "영웅", ItemName: "상급 아비도스 융화 재료", PageNo: 1 } }
];

let cachedPrices = {};
let lastUpdated = null;

// 개별 아이템 가격 호출 함수
async function fetchMarketPrice(itemName, requestBody) {
  try {
    const res = await axios.post(
      'https://developer-lostark.game.onstove.com/markets/items',
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${process.env.LOA_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );

    // API 응답 데이터에서 정확한 아이템 이름 매칭
    const match = res.data.Items?.find(item => item.Name === itemName);
    return match?.CurrentMinPrice || 0;

  } catch (err) {
    console.error(`❌ [${itemName}] 호출 실패:`, err.message);
    return 0;
  }
}

// 전체 시세 업데이트 함수
async function updateCachedPrices() {
  const results = {};
  console.log("🔄 시세 업데이트 시작...");

  // 순차적으로 호출 (API 과부하 방지를 위해)
  for (const item of items) {
    const price = await fetchMarketPrice(item.name, item.requestBody);
    results[item.name] = price;
    // API 레이트 리밋 방지를 위한 미세한 지연 (0.1초)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  cachedPrices = results;
  lastUpdated = new Date();
  console.log("✅ 모든 시세 업데이트 완료:", lastUpdated.toLocaleTimeString());
}

// 1분마다 자동 갱신
updateCachedPrices();
setInterval(updateCachedPrices, 60 * 1000);

// 클라이언트용 API 엔드포인트
app.get('/api/market-prices', (req, res) => {
  res.json({
    prices: cachedPrices,
    updatedAt: lastUpdated
  });
});

app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`🚀 서버 가동 중: http://localhost:${PORT}`);
});