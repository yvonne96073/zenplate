/**
 * 台灣常見包裝食品營養資料庫
 * 來源：各品牌官網、包裝營養標示
 * 單位：per 100g（液體 per 100ml），calories = kcal
 *
 * 格式：
 *   id       唯一識別
 *   brand    品牌名（中文）
 *   name     產品名稱（中文）
 *   aliases  別名 / OCR 常見片段 / 搜尋關鍵字
 *   visual   包裝視覺特徵（顏色、圖案）— 輔助模糊比對
 *   per      每份克數（標準份量）
 *   cal100   每 100g 熱量 kcal
 *   pro100   每 100g 蛋白質 g
 *   carb100  每 100g 碳水化合物 g
 *   fat100   每 100g 脂肪 g
 *   sod100   每 100g 鈉 mg
 */

export const PACKAGED_FOODS = [
  // ─── 義美 I-Mei ───────────────────────────────────────
  {
    id: 'imei-xianru-baobing',
    brand: '義美', name: '鮮乳薄餅',
    aliases: ['義美薄餅', '鮮奶薄餅', '牛奶薄餅', 'I-Mei鮮乳薄餅'],
    visual: ['紅色包裝', '薄餅'],
    per: 50, cal100: 504, pro100: 7.2, carb100: 67.4, fat100: 22.4, sod100: 295,
  },
  {
    id: 'imei-egg-roll',
    brand: '義美', name: '小泡芙',
    aliases: ['義美小泡芙', '義美泡芙', '奶油泡芙'],
    visual: ['白色包裝'],
    per: 45, cal100: 505, pro100: 6.0, carb100: 62.3, fat100: 25.7, sod100: 210,
  },
  {
    id: 'imei-peanut-cookie',
    brand: '義美', name: '花生夾心餅',
    aliases: ['義美花生餅', '花生夾心', '義美花生夾心'],
    visual: [],
    per: 50, cal100: 532, pro100: 10.2, carb100: 62.1, fat100: 27.3, sod100: 380,
  },
  {
    id: 'imei-big-waffle',
    brand: '義美', name: '大鬆餅',
    aliases: ['義美鬆餅', '義美大鬆餅', '格子鬆餅'],
    visual: ['黃色包裝'],
    per: 55, cal100: 430, pro100: 7.5, carb100: 66.0, fat100: 15.8, sod100: 400,
  },
  {
    id: 'imei-choco-pie',
    brand: '義美', name: '巧克力派',
    aliases: ['義美巧克力派', '義美派', '巧克力蛋糕派'],
    visual: ['棕色包裝'],
    per: 32, cal100: 452, pro100: 4.6, carb100: 62.5, fat100: 20.0, sod100: 260,
  },
  {
    id: 'imei-soda-cracker',
    brand: '義美', name: '小蘇打餅',
    aliases: ['義美蘇打餅', '義美小蘇打', '鹹餅乾'],
    visual: ['綠色包裝'],
    per: 38, cal100: 463, pro100: 8.3, carb100: 70.5, fat100: 15.9, sod100: 710,
  },

  // ─── 統一 Uni-President ───────────────────────────────
  {
    id: 'uni-kexue-mian',
    brand: '統一', name: '科學麵',
    aliases: ['科學麵', '統一科學麵', '乾吃麵'],
    visual: ['黃色包裝', '袋裝泡麵'],
    per: 45, cal100: 479, pro100: 9.4, carb100: 57.3, fat100: 23.4, sod100: 1280,
  },
  {
    id: 'uni-man-han-mala',
    brand: '統一', name: '滿漢大餐麻辣鍋牛肉麵',
    aliases: ['滿漢大餐', '統一滿漢', '麻辣牛肉麵', '滿漢麻辣', '滿漢大餐麻辣'],
    visual: ['紅色包裝', '大碗泡麵', '牛肉麵'],
    per: 200, cal100: 410, pro100: 8.8, carb100: 55.2, fat100: 17.6, sod100: 1050,
  },
  {
    id: 'uni-man-han-beef',
    brand: '統一', name: '滿漢大餐香燒牛肉麵',
    aliases: ['滿漢香燒', '香燒牛肉麵', '滿漢大餐牛肉', '統一牛肉麵'],
    visual: ['橘色包裝', '大碗泡麵'],
    per: 200, cal100: 400, pro100: 8.5, carb100: 54.0, fat100: 16.8, sod100: 980,
  },
  {
    id: 'uni-man-han-sha',
    brand: '統一', name: '滿漢大餐沙茶牛肉麵',
    aliases: ['滿漢沙茶', '沙茶牛肉麵', '滿漢大餐沙茶'],
    visual: ['黃色包裝', '大碗泡麵'],
    per: 200, cal100: 405, pro100: 8.6, carb100: 54.5, fat100: 17.0, sod100: 1000,
  },
  {
    id: 'uni-77-choc',
    brand: '77', name: '乳加巧克力',
    aliases: ['77乳加', '77巧克力', '乳加', '77糖'],
    visual: ['紅色包裝', '巧克力'],
    per: 40, cal100: 512, pro100: 7.0, carb100: 62.4, fat100: 25.5, sod100: 130,
  },

  // ─── 維力 Vedan ───────────────────────────────────────
  {
    id: 'vedan-instant',
    brand: '維力', name: '炸醬麵',
    aliases: ['維力炸醬麵', '炸醬麵', '維力泡麵'],
    visual: ['紅黑色包裝', '袋裝泡麵'],
    per: 90, cal100: 430, pro100: 9.0, carb100: 62.0, fat100: 16.0, sod100: 1100,
  },
  {
    id: 'vedan-scallion',
    brand: '維力', name: '蔥燒雞麵',
    aliases: ['維力蔥燒', '蔥燒雞麵', '維力雞麵'],
    visual: ['綠色包裝'],
    per: 85, cal100: 440, pro100: 8.8, carb100: 63.0, fat100: 16.5, sod100: 1050,
  },

  // ─── 日清 Nissin ──────────────────────────────────────
  {
    id: 'nissin-cup-mian',
    brand: '日清', name: '合味道杯麵（海鮮）',
    aliases: ['合味道', '日清杯麵', '日清海鮮', '杯麵', 'Cup Noodles'],
    visual: ['紅色杯裝', '圓形杯麵'],
    per: 78, cal100: 454, pro100: 9.5, carb100: 58.0, fat100: 19.8, sod100: 1450,
  },
  {
    id: 'nissin-demae-ramen',
    brand: '日清', name: '出前一丁',
    aliases: ['出前一丁', '日清拉麵', '日清袋麵'],
    visual: ['黃色包裝'],
    per: 100, cal100: 426, pro100: 9.5, carb100: 62.0, fat100: 15.7, sod100: 1050,
  },

  // ─── 味味A Veve / 味丹 Vedan ──────────────────────────
  {
    id: 'weiweia-paigu-bowl',
    brand: '味味A', name: '排骨雞湯麵',
    aliases: ['味味A排骨', '排骨雞湯', '排骨湯麵', '味味A碗麵', '味丹排骨', '排骨麵'],
    visual: ['紅黃色碗裝', '大碗泡麵', '排骨'],
    per: 85, cal100: 445, pro100: 10.6, carb100: 68, fat100: 13, sod100: 1765,
  },
  {
    id: 'weiweia-beef-bowl',
    brand: '味味A', name: '牛肉湯麵',
    aliases: ['味味A牛肉', '牛肉湯麵', '味味牛肉'],
    visual: ['紅色碗裝'],
    per: 85, cal100: 440, pro100: 10.5, carb100: 67, fat100: 12.5, sod100: 1750,
  },
  {
    id: 'weiweia-spicy-bowl',
    brand: '味味A', name: '麻辣排骨麵',
    aliases: ['味味A麻辣', '麻辣排骨', '味味麻辣'],
    visual: ['紅黃色碗裝'],
    per: 85, cal100: 455, pro100: 10.8, carb100: 68, fat100: 14, sod100: 1800,
  },

  // ─── 味王 Wang ────────────────────────────────────────
  {
    id: 'wang-beef-noodle',
    brand: '味王', name: '原汁牛肉麵',
    aliases: ['味王牛肉麵', '原汁牛肉麵', '味王泡麵'],
    visual: ['紅色包裝', '牛肉麵'],
    per: 100, cal100: 395, pro100: 9.2, carb100: 60.5, fat100: 13.0, sod100: 1100,
  },

  // ─── 農心 Nongshim ────────────────────────────────────
  {
    id: 'nongshim-shin-ramyun',
    brand: '農心', name: '辛拉麵',
    aliases: ['農心辛拉麵', '辛拉麵', '韓國泡麵', 'Shin Ramyun'],
    visual: ['紅色包裝', '辣麵'],
    per: 120, cal100: 382, pro100: 9.0, carb100: 58.0, fat100: 12.8, sod100: 1430,
  },

  // ─── 光泉 Kuang Chuan ──────────────────────────────────
  {
    id: 'kc-fresh-milk-full',
    brand: '光泉', name: '鮮乳（全脂）',
    aliases: ['光泉牛奶', '光泉全脂鮮乳', '光泉鮮奶', '光泉牛乳'],
    visual: ['藍白色包裝', '牛奶'],
    per: 240, cal100: 62, pro100: 3.0, carb100: 4.8, fat100: 3.6, sod100: 45,
  },
  {
    id: 'kc-fresh-milk-low',
    brand: '光泉', name: '低脂鮮乳',
    aliases: ['光泉低脂牛奶', '光泉低脂鮮奶', '光泉低脂'],
    visual: ['綠白色包裝'],
    per: 240, cal100: 45, pro100: 3.2, carb100: 4.8, fat100: 1.5, sod100: 48,
  },
  {
    id: 'kc-oat-milk',
    brand: '光泉', name: '燕麥植物奶',
    aliases: ['光泉燕麥奶', '燕麥奶', '植物奶'],
    visual: ['棕色包裝'],
    per: 240, cal100: 48, pro100: 1.0, carb100: 8.0, fat100: 1.0, sod100: 70,
  },

  // ─── 林鳳營 / 味全 ────────────────────────────────────
  {
    id: 'weichuan-fresh-milk',
    brand: '味全', name: '鮮乳（全脂）',
    aliases: ['味全牛奶', '味全全脂鮮乳', '林鳳營鮮乳', '林鳳營牛奶', '林鳳營'],
    visual: ['紅白色包裝'],
    per: 240, cal100: 62, pro100: 3.0, carb100: 4.8, fat100: 3.6, sod100: 44,
  },

  // ─── 黑松 Hi-Chew ──────────────────────────────────────
  {
    id: 'blackmatsu-sarsi',
    brand: '黑松', name: '黑松沙士',
    aliases: ['沙士', '黑松沙士', '黑松汽水'],
    visual: ['黑色罐裝', '汽水'],
    per: 330, cal100: 41, pro100: 0, carb100: 10.2, fat100: 0, sod100: 12,
  },
  {
    id: 'blackmatsu-cola',
    brand: '黑松', name: '黑松可樂',
    aliases: ['黑松可樂', '本土可樂'],
    visual: ['黑色罐裝'],
    per: 330, cal100: 41, pro100: 0, carb100: 10.2, fat100: 0, sod100: 12,
  },

  // ─── 可口可樂系列 ─────────────────────────────────────
  {
    id: 'coca-cola',
    brand: '可口可樂', name: '可口可樂',
    aliases: ['可樂', 'Coca-Cola', 'coke', '可口可樂', '紅色可樂'],
    visual: ['紅色罐裝', '可樂'],
    per: 330, cal100: 42, pro100: 0, carb100: 10.6, fat100: 0, sod100: 10,
  },
  {
    id: 'coca-cola-zero',
    brand: '可口可樂', name: '零卡可樂',
    aliases: ['零卡', 'Coke Zero', '可口可樂零卡', '零卡可樂'],
    visual: ['黑色罐裝', '零卡'],
    per: 330, cal100: 1, pro100: 0, carb100: 0.1, fat100: 0, sod100: 14,
  },
  {
    id: 'sprite',
    brand: '雪碧', name: '雪碧',
    aliases: ['Sprite', '雪碧汽水', '雪碧柳橙'],
    visual: ['綠色罐裝'],
    per: 330, cal100: 38, pro100: 0, carb100: 9.5, fat100: 0, sod100: 18,
  },

  // ─── 統一飲料系列 ─────────────────────────────────────
  {
    id: 'uni-green-tea-ocha',
    brand: '御茶園', name: '每朝健康綠茶',
    aliases: ['御茶園', '每朝健康', '御茶園綠茶', '每朝綠茶'],
    visual: ['綠色瓶裝', '茶飲料'],
    per: 650, cal100: 0, pro100: 0, carb100: 0.1, fat100: 0, sod100: 5,
  },
  {
    id: 'uni-black-tea',
    brand: '麥香', name: '麥香紅茶',
    aliases: ['麥香紅茶', '麥香奶茶', '統一麥香'],
    visual: ['黃色包裝', '紅茶'],
    per: 375, cal100: 30, pro100: 0, carb100: 7.5, fat100: 0, sod100: 10,
  },
  {
    id: 'uni-milk-tea',
    brand: '麥香', name: '麥香奶茶',
    aliases: ['麥香奶茶', '統一奶茶'],
    visual: ['棕色包裝'],
    per: 375, cal100: 44, pro100: 0.5, carb100: 9.0, fat100: 0.8, sod100: 18,
  },
  {
    id: 'uni-nongchun',
    brand: '純萃喝', name: '純萃喝焙茶拿鐵',
    aliases: ['純萃喝', '焙茶拿鐵', '純萃喝拿鐵', '統一焙茶'],
    visual: ['黑白包裝', '拿鐵'],
    per: 350, cal100: 38, pro100: 1.2, carb100: 6.5, fat100: 0.8, sod100: 50,
  },

  // ─── 波蜜 / 金車 ──────────────────────────────────────
  {
    id: 'bomi-juice',
    brand: '波蜜', name: '波蜜果菜汁',
    aliases: ['波蜜', '波蜜果汁', '蔬果汁'],
    visual: ['橘色包裝'],
    per: 250, cal100: 24, pro100: 0.5, carb100: 5.3, fat100: 0, sod100: 65,
  },

  // ─── 舒跑 ─────────────────────────────────────────────
  {
    id: 'supau',
    brand: '舒跑', name: '舒跑運動飲料',
    aliases: ['舒跑', '舒跑運動飲', '電解質飲料'],
    visual: ['藍色瓶裝', '運動飲料'],
    per: 350, cal100: 22, pro100: 0, carb100: 5.5, fat100: 0, sod100: 45,
  },
  {
    id: 'pocari-sweat',
    brand: '寶礦力', name: '寶礦力水得',
    aliases: ['寶礦力', 'Pocari Sweat', '電解質飲'],
    visual: ['藍白色瓶裝'],
    per: 350, cal100: 24, pro100: 0, carb100: 6.0, fat100: 0, sod100: 47,
  },

  // ─── 伯朗咖啡 ─────────────────────────────────────────
  {
    id: 'mr-brown-coffee',
    brand: '伯朗', name: '曼特寧咖啡',
    aliases: ['伯朗咖啡', '曼特寧', '伯朗罐裝咖啡', '罐裝咖啡'],
    visual: ['棕色罐裝', '咖啡'],
    per: 240, cal100: 18, pro100: 0.5, carb100: 3.5, fat100: 0, sod100: 50,
  },
  {
    id: 'mr-brown-milk-coffee',
    brand: '伯朗', name: '二合一拿鐵咖啡',
    aliases: ['伯朗拿鐵', '伯朗二合一', '罐裝拿鐵'],
    visual: ['白色罐裝', '拿鐵咖啡'],
    per: 240, cal100: 44, pro100: 1.0, carb100: 8.5, fat100: 0.7, sod100: 55,
  },

  // ─── 乖乖 ─────────────────────────────────────────────
  {
    id: 'guai-guai-corn',
    brand: '乖乖', name: '奶油玉米口味',
    aliases: ['乖乖', '奶油乖乖', '玉米乖乖', '乖乖玉米'],
    visual: ['黃色包裝', '玉米'],
    per: 100, cal100: 516, pro100: 5.9, carb100: 70.5, fat100: 23.0, sod100: 560,
  },
  {
    id: 'guai-guai-green-onion',
    brand: '乖乖', name: '蔥花口味',
    aliases: ['乖乖蔥花', '蔥花乖乖', '乖乖蔥味'],
    visual: ['綠色包裝'],
    per: 100, cal100: 513, pro100: 6.1, carb100: 70.0, fat100: 22.5, sod100: 600,
  },

  // ─── 洋芋片系列 ───────────────────────────────────────
  {
    id: 'cadina-chips',
    brand: '卡迪那', name: '洋芋片',
    aliases: ['卡迪那洋芋片', '卡迪那', '卡迪那原味'],
    visual: ['紅色包裝', '洋芋片'],
    per: 50, cal100: 536, pro100: 5.8, carb100: 56.2, fat100: 32.0, sod100: 470,
  },
  {
    id: 'lays-original',
    brand: "Lay's", name: '原味洋芋片',
    aliases: ["Lays", "lay's", "洋芋片", "樂事洋芋片", "樂事", "Lays原味"],
    visual: ['黃色包裝', '洋芋片'],
    per: 50, cal100: 536, pro100: 6.4, carb100: 55.0, fat100: 31.6, sod100: 504,
  },
  {
    id: 'lays-seaweed',
    brand: "Lay's", name: '海苔口味洋芋片',
    aliases: ['樂事海苔', 'Lays海苔', '海苔洋芋片'],
    visual: ['綠色包裝'],
    per: 50, cal100: 530, pro100: 6.2, carb100: 56.0, fat100: 31.0, sod100: 480,
  },
  {
    id: 'pringles-original',
    brand: '品客', name: '原味洋芋片',
    aliases: ['品客', 'Pringles', '品客洋芋片', '品客原味', '筒裝洋芋片'],
    visual: ['紅色筒裝', '洋芋片'],
    per: 57, cal100: 521, pro100: 5.6, carb100: 54.8, fat100: 30.0, sod100: 330,
  },

  // ─── 蝦味先 ───────────────────────────────────────────
  {
    id: 'shrimp-crackers',
    brand: '中祥', name: '蝦味先',
    aliases: ['蝦味先', '蝦味仙', '中祥蝦味先', '蝦餅'],
    visual: ['橘色包裝', '蝦味'],
    per: 60, cal100: 492, pro100: 7.5, carb100: 70.2, fat100: 19.3, sod100: 640,
  },

  // ─── 7-11 / 超商鮮食 ──────────────────────────────────
  {
    id: 'cv-onigiri-tuna',
    brand: '超商', name: '鮪魚飯糰',
    aliases: ['鮪魚飯糰', '便利商店飯糰', '7-11飯糰', '7-Eleven飯糰', '御飯糰鮪魚'],
    visual: ['三角形包裝'],
    per: 110, cal100: 185, pro100: 5.5, carb100: 32.0, fat100: 4.2, sod100: 380,
  },
  {
    id: 'cv-onigiri-salmon',
    brand: '超商', name: '鮭魚飯糰',
    aliases: ['鮭魚飯糰', '超商飯糰鮭魚', '御飯糰鮭魚'],
    visual: ['三角形包裝'],
    per: 110, cal100: 182, pro100: 6.0, carb100: 30.5, fat100: 4.5, sod100: 350,
  },
  {
    id: 'cv-onigiri-seaweed-chicken',
    brand: '超商', name: '手卷壽司（照燒雞）',
    aliases: ['手卷', '照燒雞手卷', '超商手卷'],
    visual: ['錐形包裝'],
    per: 130, cal100: 175, pro100: 7.0, carb100: 28.0, fat100: 3.5, sod100: 430,
  },
  {
    id: 'cv-egg',
    brand: '超商', name: '茶葉蛋',
    aliases: ['茶葉蛋', '滷蛋', '超商茶葉蛋', '7-11茶葉蛋'],
    visual: [],
    per: 50, cal100: 146, pro100: 12.5, carb100: 1.0, fat100: 9.5, sod100: 430,
  },
  {
    id: 'cv-bento-chicken',
    brand: '超商', name: '雞腿便當',
    aliases: ['雞腿便當', '超商便當', '7-11便當', '統一超商便當'],
    visual: ['便當盒'],
    per: 450, cal100: 183, pro100: 8.5, carb100: 25.0, fat100: 5.5, sod100: 480,
  },

  // ─── 馬偕 / 泰山 ──────────────────────────────────────
  {
    id: 'taisun-pudding',
    brand: '泰山', name: '仙草凍',
    aliases: ['泰山仙草', '仙草凍', '仙草', '泰山仙草凍'],
    visual: ['黑色包裝', '仙草'],
    per: 265, cal100: 27, pro100: 0.2, carb100: 6.5, fat100: 0, sod100: 40,
  },

  // ─── 乖乖旺旺 ────────────────────────────────────────
  {
    id: 'want-want-rice-cracker',
    brand: '旺旺', name: '雪餅',
    aliases: ['旺旺', '旺旺雪餅', '仙貝', '旺旺仙貝'],
    visual: ['白色包裝', '米餅'],
    per: 60, cal100: 468, pro100: 6.5, carb100: 73.0, fat100: 15.5, sod100: 360,
  },
  {
    id: 'want-want-senbei',
    brand: '旺旺', name: '旺旺仙貝',
    aliases: ['仙貝', '旺仙貝', '米香餅'],
    visual: ['紅色包裝', '米餅'],
    per: 40, cal100: 490, pro100: 7.0, carb100: 73.5, fat100: 17.5, sod100: 380,
  },

  // ─── 優格 / 布丁 ──────────────────────────────────────
  {
    id: 'meiji-yogurt',
    brand: '明治', name: '保加利亞優格',
    aliases: ['明治優格', '保加利亞', '明治保加利亞', '原味優格'],
    visual: ['白色包裝', '優格'],
    per: 100, cal100: 62, pro100: 3.6, carb100: 8.5, fat100: 1.5, sod100: 50,
  },
  {
    id: 'uni-fruit-yogurt',
    brand: '統一', name: '果汁多多',
    aliases: ['多多', '果汁多多', '養樂多', '統一多多'],
    visual: ['白色瓶裝'],
    per: 95, cal100: 68, pro100: 1.2, carb100: 15.0, fat100: 0.1, sod100: 25,
  },

  // ─── 巧克力 ───────────────────────────────────────────
  {
    id: 'kit-kat',
    brand: 'KitKat', name: 'KitKat巧克力威化',
    aliases: ['KitKat', 'Kit Kat', '奇巧', '威化巧克力'],
    visual: ['紅色包裝', '巧克力'],
    per: 35, cal100: 510, pro100: 6.6, carb100: 61.5, fat100: 25.5, sod100: 105,
  },
  {
    id: 'meiji-chocolate',
    brand: '明治', name: '明治巧克力',
    aliases: ['明治', '明治巧克力', '牛奶巧克力'],
    visual: ['紫色包裝', '巧克力'],
    per: 50, cal100: 558, pro100: 6.5, carb100: 59.0, fat100: 32.0, sod100: 75,
  },

  // ─── 餅乾 / 穀物棒 ───────────────────────────────────
  {
    id: 'oreo',
    brand: 'Oreo', name: 'Oreo奧利奧夾心餅乾',
    aliases: ['Oreo', '奧利奧', 'OREO', '夾心餅乾'],
    visual: ['黑藍色包裝'],
    per: 36, cal100: 471, pro100: 5.5, carb100: 70.0, fat100: 18.5, sod100: 395,
  },
  {
    id: 'ritz',
    brand: 'Ritz', name: 'Ritz奶油蘇打餅',
    aliases: ['Ritz', '麗滋', '奶油餅', '蘇打餅'],
    visual: ['黃色包裝', '圓形餅乾'],
    per: 30, cal100: 490, pro100: 7.0, carb100: 63.0, fat100: 23.0, sod100: 540,
  },
  {
    id: 'pocky',
    brand: '固力果', name: 'Pocky巧克力棒',
    aliases: ['Pocky', '百奇', '固力果', '巧克力棒', '朱古力棒'],
    visual: ['紅色包裝', '棒狀餅乾'],
    per: 47, cal100: 476, pro100: 8.5, carb100: 65.0, fat100: 19.5, sod100: 240,
  },

  // ─── 零食 ─────────────────────────────────────────────
  {
    id: 'calbee-shrimp-chips',
    brand: 'Calbee', name: '日清薯條三兄弟',
    aliases: ['薯條三兄弟', 'Calbee', '日清薯條'],
    visual: ['黃色包裝', '薯條'],
    per: 70, cal100: 489, pro100: 5.5, carb100: 66.0, fat100: 21.5, sod100: 460,
  },

  // ─── 米飯 / 即食 ─────────────────────────────────────
  {
    id: 'instant-rice-congee',
    brand: '統一', name: '來一客泡麵杯',
    aliases: ['來一客', '統一泡麵杯', '杯麵'],
    visual: ['杯裝泡麵'],
    per: 88, cal100: 382, pro100: 7.5, carb100: 58.5, fat100: 12.5, sod100: 900,
  },
]

// ── Utility ───────────────────────────────────────────────────────────────────

function norm(s) {
  return (s || '').toLowerCase().replace(/[\s\-_\.\/（）()【】、。，,！!？?]/g, '')
}

/**
 * Bigram (character pair) set — used for Dice-coefficient similarity.
 */
function bigrams(s) {
  const set = new Set()
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
  return set
}

/**
 * Sørensen–Dice coefficient on character bigrams.
 * Better than character-set intersection because it respects order.
 */
function diceSim(a, b) {
  if (!a || !b) return 0
  if (a === b) return 1
  const ba = bigrams(a)
  const bb = bigrams(b)
  if (ba.size === 0 || bb.size === 0) return 0
  let common = 0
  for (const bg of ba) { if (bb.has(bg)) common++ }
  return (2 * common) / (ba.size + bb.size)
}

/**
 * Multi-signal score for one (query, candidate-string) pair.
 * Returns 0–1.
 */
function scoreString(query, candidate) {
  if (!query || !candidate) return 0
  const q = norm(query)
  const c = norm(candidate)
  if (!q || !c) return 0

  if (q === c) return 1.0

  // Containment bonus
  if (c.includes(q)) return 0.85 + 0.15 * (q.length / c.length)
  if (q.includes(c)) return 0.80 + 0.15 * (c.length / q.length)

  return diceSim(q, c)
}

/**
 * Compute overall match score for a query against one PACKAGED_FOODS item.
 * Takes brand, productName, and optional OCR fragments separately so we
 * can apply a brand-match bonus.
 */
function scoreItem(brandQuery, nameQuery, ocrFragments, item) {
  const qBrand = norm(brandQuery)
  const qName  = norm(nameQuery)
  const itemBrand = norm(item.brand)
  const itemName  = norm(item.name)

  // 1. Check all string targets: brand+name combined, name alone, brand alone, aliases, visual
  const targets = [
    `${item.brand}${item.name}`,
    item.name,
    item.brand,
    ...item.aliases,
    ...(item.visual || []),
  ]

  const fullQuery = [brandQuery, nameQuery, ...(ocrFragments || [])].filter(Boolean).join(' ')

  let best = 0
  for (const t of targets) {
    // Score full query against target
    const s1 = scoreString(fullQuery, t)
    // Score just name query against target
    const s2 = qName ? scoreString(nameQuery, t) : 0
    best = Math.max(best, s1, s2)
  }

  // 2. Brand match bonus: explicit brand text found
  let brandBonus = 0
  if (qBrand && qBrand.length >= 2) {
    if (itemBrand.includes(qBrand) || qBrand.includes(itemBrand)) {
      brandBonus = 0.18
    }
  }

  // 3. OCR fragment boost: each OCR fragment that matches any target adds small bonus
  let ocrBoost = 0
  if (ocrFragments?.length) {
    for (const frag of ocrFragments) {
      const fn = norm(frag)
      if (!fn || fn.length < 2) continue
      for (const t of targets) {
        const tn = norm(t)
        if (tn.includes(fn) || fn.includes(tn)) {
          ocrBoost = Math.max(ocrBoost, 0.12)
          break
        }
        const s = diceSim(fn, tn)
        ocrBoost = Math.max(ocrBoost, s * 0.10)
      }
    }
  }

  return Math.min(1.0, best + brandBonus + ocrBoost)
}

/**
 * Return the single best match if score ≥ 0.62, otherwise null.
 * (Kept for backward compatibility with existing ScanModal code)
 */
export function lookupPackagedFood(brandName = '', productName = '') {
  const results = lookupPackagedFoodCandidates(brandName, productName, [], 1)
  if (results.length > 0 && results[0].score >= 0.62) {
    return { item: results[0].item, score: results[0].score }
  }
  return null
}

/**
 * Return top-N ranked candidates for the packaged food picker UI.
 *
 * @param {string}   brandName     Brand name from AI detection
 * @param {string}   productName   Product name from AI detection
 * @param {string[]} ocrFragments  Raw OCR text fragments (from candidate.clues)
 * @param {number}   topN          Maximum number of results (default 3)
 * @returns {{ item, score, matchedOn }[]}  Sorted by score DESC, score ≥ 0.35
 */
export function lookupPackagedFoodCandidates(brandName = '', productName = '', ocrFragments = [], topN = 3) {
  const results = []

  for (const item of PACKAGED_FOODS) {
    const score = scoreItem(brandName, productName, ocrFragments, item)
    if (score >= 0.35) {
      results.push({ item, score })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, topN)
}

/**
 * Debug: return ALL items with their scores, sorted DESC.
 * Use in browser console or debug traces to diagnose why a product isn't matching.
 * Does NOT filter by threshold.
 */
export function debugScoreAll(brandName = '', productName = '', ocrFragments = []) {
  return PACKAGED_FOODS
    .map(item => ({
      id: item.id,
      label: `${item.brand} ${item.name}`,
      score: +scoreItem(brandName, productName, ocrFragments, item).toFixed(4),
    }))
    .sort((a, b) => b.score - a.score)
}

/**
 * Quick console helper — call from browser devtools:
 *   import('/src/data/packagedFoods.js').then(m => m.traceMatch('統一', '滿漢大餐麻辣', ['麻辣', '牛肉麵']))
 */
export function traceMatch(brand, name, clues = []) {
  console.group(`[PKG traceMatch] brand="${brand}" name="${name}" clues=${JSON.stringify(clues)}`)
  const all = debugScoreAll(brand, name, clues)
  console.table(all.slice(0, 15))
  const top = all[0]
  if (top.score >= 0.82) console.log('✅ Would AUTO-CONFIRM:', top.label)
  else if (top.score >= 0.42) console.log('🟡 Would show PICKER, top:', top.label)
  else console.log('❌ Would FALL THROUGH (best score', top.score, '< 0.42)')
  console.groupEnd()
  return all
}
