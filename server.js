const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());

const items = [
  {
    name: "목재",
    requestBody: {
      Sort: "GRADE",
      CategoryCode: 90300,
      CharacterClass: "도화가",
      ItemTier: null,
      ItemGrade: "일반",
      ItemName: "목재",
      PageNo: 1,
      SortCondition: "ASC"
    }
  },
  {
    name: "부드러운 목재",
    requestBody: {
      Sort: "GRADE",
      CategoryCode: 90300,
      CharacterClass: "도화가",
      ItemTier: null,
      ItemGrade: "고급",
      ItemName: "부드러운 목재",
      PageNo: 1,
      SortCondition: "ASC"
    }
  },
  {
    name: "아비도스 목재",
    requestBody: {
      Sort: "GRADE",
      CategoryCode: 90300,
      CharacterClass: "도화가",
      ItemTier: null,
      ItemGrade: "희귀",
      ItemName: "아비도스 목재",
      PageNo: 1,
      SortCondition: "ASC"
    }
  },
  {
    name: "아비도스 융화 재료",
    requestBody: {
      Sort: "GRADE",
      CategoryCode: 50000,
      CharacterClass: "도화가",
      ItemTier: 4,
      ItemGrade: "희귀",
      ItemName: "아비도스 융화 재료",
      PageNo: 1,
      SortCondition: "ASC"
    }
  }
];

let cachedPrices = {};
let lastUpdated = null;

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

    const match = res.data.Items.find(item => item.Name === itemName);
    return match?.CurrentMinPrice || null;

  } catch (err) {
    console.error(`❌ Error fetching [${itemName}]`, err.response?.data || err.message);
    return null;
  }
}

async function updateCachedPrices() {
  const results = {};

  for (const item of items) {
    const price = await fetchMarketPrice(item.name, item.requestBody);
    results[item.name] = price;
  }

  cachedPrices = results;
  lastUpdated = new Date();
  console.log("✅ Prices updated at", lastUpdated.toLocaleTimeString());
}

// 최초 실행 + 1분마다 갱신
updateCachedPrices();
setInterval(updateCachedPrices, 60 * 1000);

app.get('/api/market-prices', (req, res) => {
  res.json({
    prices: cachedPrices,
    updatedAt: lastUpdated
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server is now running!`);
});

app.use(express.static('public'));
