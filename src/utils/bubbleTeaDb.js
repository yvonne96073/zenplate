/**
 * Taiwan Hand-Shaken Drink Database
 * Covers all common 手搖飲 categories, 16+ brands, toppings, sugar/ice options.
 *
 * Nutrition baseline: medium cup (500 ml), 全糖 (100% sugar), no toppings.
 * All macros are per full cup (not per 100 ml).
 * Real data sourced from brand official nutrition tables (50嵐、CoCo都可 etc.)
 */

// ── Drink categories ───────────────────────────────────────────────────────────
// Used as fallback when exact brand/drink is unknown.
// Values: 500 ml medium, 全糖 baseline
export const DRINK_CATEGORIES = {
  black_tea: {
    label_zh: '紅茶', label_en: 'Black Tea', emoji: '🍵',
    keywords: ['紅茶', 'black tea', '錫蘭', '阿薩姆', '大吉嶺', '青心大冇'],
    m: { cal: 119, pro: 0, carb: 30, fat: 0  },
    l: { cal: 170, pro: 0, carb: 42, fat: 0  },
  },
  green_tea: {
    label_zh: '綠茶', label_en: 'Green Tea', emoji: '🍃',
    keywords: ['綠茶', 'green tea', '茉莉', '玉露', '翠玉', '文山包種'],
    m: { cal: 105, pro: 0, carb: 26, fat: 0  },
    l: { cal: 140, pro: 0, carb: 35, fat: 0  },
  },
  oolong_tea: {
    label_zh: '烏龍茶', label_en: 'Oolong Tea', emoji: '🫖',
    keywords: ['烏龍', 'oolong', '四季春', '金萱', '高山', '凍頂', '阿里山', '鐵觀音', '重燒', '重焙', '烘焙烏龍'],
    m: { cal: 119, pro: 0, carb: 30, fat: 0  },
    l: { cal: 170, pro: 0, carb: 42, fat: 0  },
  },
  milk_tea: {
    label_zh: '奶茶', label_en: 'Milk Tea', emoji: '🧋',
    keywords: ['奶茶', 'milk tea', '紅茶拿鐵', '奶蓋茶', '港式奶茶', '鴛鴦'],
    m: { cal: 380, pro: 3, carb: 65, fat: 12 },
    l: { cal: 540, pro: 4, carb: 93, fat: 17 },
  },
  fresh_milk_tea: {
    label_zh: '鮮奶茶', label_en: 'Fresh Milk Tea', emoji: '🥛',
    keywords: ['鮮奶茶', 'fresh milk', '牛奶茶', '鮮奶', '全脂鮮奶', '拿鐵', '烏龍拿鐵', '阿薩姆'],
    m: { cal: 250, pro: 7, carb: 26, fat: 15 },
    l: { cal: 340, pro: 9, carb: 36, fat: 21 },
  },
  fruit_tea: {
    label_zh: '水果茶', label_en: 'Fruit Tea', emoji: '🍊',
    keywords: ['水果茶', 'fruit tea', '百香果', '芒果', '草莓', '葡萄', '蜜桃', '荔枝', '柳橙'],
    m: { cal: 180, pro: 0, carb: 45, fat: 0  },
    l: { cal: 250, pro: 0, carb: 62, fat: 0  },
  },
  lemon_tea: {
    label_zh: '檸檬茶', label_en: 'Lemon Tea', emoji: '🍋',
    keywords: ['檸檬', 'lemon', '檸檬綠', '翡翠檸檬', '檸檬冰茶', '鮮榨檸'],
    m: { cal: 130, pro: 0, carb: 32, fat: 0  },
    l: { cal: 175, pro: 0, carb: 44, fat: 0  },
  },
  winter_melon: {
    label_zh: '冬瓜茶', label_en: 'Winter Melon Tea', emoji: '🫙',
    keywords: ['冬瓜', 'winter melon', '冬瓜露', '冬瓜檸'],
    m: { cal: 150, pro: 0, carb: 37, fat: 0  },
    l: { cal: 210, pro: 0, carb: 52, fat: 0  },
  },
  brown_sugar_milk: {
    label_zh: '黑糖鮮奶', label_en: 'Brown Sugar Milk', emoji: '🤎',
    keywords: ['黑糖', 'brown sugar', '虎紋', '老虎', '黑糖珍珠', '黑糖鮮奶'],
    m: { cal: 460, pro: 9, carb: 72, fat: 14 },
    l: { cal: 600, pro: 12, carb: 94, fat: 18 },
  },
  cheese_foam: {
    label_zh: '芝士奶蓋', label_en: 'Cheese Foam Tea', emoji: '🧀',
    keywords: ['奶蓋', 'cheese foam', '芝士', '起司', '海鹽奶蓋', '嗝嗝'],
    m: { cal: 280, pro: 5, carb: 44, fat: 9  },
    l: { cal: 365, pro: 7, carb: 57, fat: 12 },
  },
  yakult_tea: {
    label_zh: '多多綠/優格茶', label_en: 'Yakult Green Tea', emoji: '🥤',
    keywords: ['多多', 'yakult', '優格', '養樂多', '乳酸', '多多綠'],
    m: { cal: 240, pro: 2, carb: 56, fat: 1  },
    l: { cal: 320, pro: 3, carb: 74, fat: 1  },
  },
  grass_jelly: {
    label_zh: '仙草飲', label_en: 'Grass Jelly Drink', emoji: '🌿',
    keywords: ['仙草', 'grass jelly', '燒仙草', '仙草冰', '仙草奶'],
    m: { cal: 190, pro: 1, carb: 47, fat: 0  },
    l: { cal: 250, pro: 2, carb: 62, fat: 0  },
  },
  taro_milk: {
    label_zh: '芋頭系列', label_en: 'Taro Milk', emoji: '🟣',
    keywords: ['芋頭', 'taro', '芋泥', '芋圓', '芋奶', '鮮芋'],
    m: { cal: 380, pro: 5, carb: 68, fat: 10 },
    l: { cal: 490, pro: 7, carb: 88, fat: 13 },
  },
  coffee_drink: {
    label_zh: '茶咖啡', label_en: 'Coffee Tea Drink', emoji: '☕',
    keywords: ['咖啡', 'coffee', '鴛鴦', '拿鐵', '卡布', '摩卡', '美式'],
    m: { cal: 210, pro: 4, carb: 35, fat: 5  },
    l: { cal: 275, pro: 5, carb: 46, fat: 7  },
  },
  // pearl_milk_tea category: base without topping (pearls added separately via toppings[])
  pearl_milk_tea: {
    label_zh: '珍珠奶茶', label_en: 'Pearl Milk Tea', emoji: '🧋',
    keywords: ['珍珠奶茶', '珍奶', '波霸奶茶', '波霸', 'boba', 'bubble tea', 'pearl milk'],
    m: { cal: 380, pro: 3, carb: 65, fat: 12 },
    l: { cal: 540, pro: 4, carb: 93, fat: 17 },
  },
}

// ── Brand database ─────────────────────────────────────────────────────────────
// Per drink: 500 ml medium cup, 全糖 baseline.
// Topping-named drinks (珍珠奶茶, 波霸奶茶) store the BASE drink calories;
// toppings are added separately by calcDrinkTotal via default_topping.
export const BOBA_BRANDS = {
  '50嵐': {
    display: '50嵐',
    ocr_keys: ['50嵐', '五十嵐', '50 嵐', '50lan', 'wuShiLan'],
    color: '#FF5722',
    drinks: {
      // Pure teas — 500 ml 全糖 ≈ 28 g sugar = 119 kcal
      '四季春':         { cat: 'oolong_tea',    m: { cal:119, pro:0, carb:30, fat:0  }, l: { cal:170, pro:0, carb:42, fat:0  } },
      '茉莉綠茶':       { cat: 'green_tea',     m: { cal:119, pro:0, carb:30, fat:0  }, l: { cal:170, pro:0, carb:42, fat:0  } },
      '阿薩姆紅茶':     { cat: 'black_tea',     m: { cal:119, pro:0, carb:30, fat:0  }, l: { cal:170, pro:0, carb:42, fat:0  } },
      '黃金烏龍':       { cat: 'oolong_tea',    m: { cal:119, pro:0, carb:30, fat:0  }, l: { cal:170, pro:0, carb:42, fat:0  } },
      '冬瓜茶':         { cat: 'winter_melon',  m: { cal:150, pro:0, carb:37, fat:0  }, l: { cal:210, pro:0, carb:52, fat:0  } },
      // Creamer-based milk tea — real data from 50嵐 official
      '奶茶':           { cat: 'milk_tea',      m: { cal:372, pro:3, carb:63, fat:12 }, l: { cal:532, pro:4, carb:90, fat:17 } },
      '烏龍奶茶':       { cat: 'milk_tea',      m: { cal:330, pro:3, carb:55, fat:11 }, l: { cal:472, pro:4, carb:78, fat:16 } },
      '黃金烏龍奶茶':   { cat: 'milk_tea',      m: { cal:330, pro:3, carb:55, fat:11 }, l: { cal:472, pro:4, carb:78, fat:16 } },
      // Fresh milk lattes — lighter, real milk
      '鮮奶茶':         { cat: 'fresh_milk_tea',m: { cal:235, pro:7, carb:24, fat:15 }, l: { cal:334, pro:9, carb:34, fat:21 } },
      '重燒烏龍拿鐵':   { cat: 'fresh_milk_tea',m: { cal:235, pro:7, carb:24, fat:15 }, l: { cal:334, pro:9, carb:34, fat:21 } },
      '重焙烏龍拿鐵':   { cat: 'fresh_milk_tea',m: { cal:235, pro:7, carb:24, fat:15 }, l: { cal:334, pro:9, carb:34, fat:21 } },
      '阿薩姆鮮奶茶':   { cat: 'fresh_milk_tea',m: { cal:235, pro:7, carb:24, fat:15 }, l: { cal:334, pro:9, carb:34, fat:21 } },
      '四季春鮮奶茶':   { cat: 'fresh_milk_tea',m: { cal:235, pro:7, carb:24, fat:15 }, l: { cal:334, pro:9, carb:34, fat:21 } },
      '四季拿鐵':       { cat: 'fresh_milk_tea',m: { cal:235, pro:7, carb:24, fat:15 }, l: { cal:334, pro:9, carb:34, fat:21 } },
      '紅茶拿鐵':       { cat: 'fresh_milk_tea',m: { cal:235, pro:7, carb:24, fat:15 }, l: { cal:334, pro:9, carb:34, fat:21 } },
      // Topping drinks — base = same as 奶茶/烏龍奶茶, topping added separately
      '珍珠奶茶':       { cat: 'pearl_milk_tea',m: { cal:372, pro:3, carb:63, fat:12 }, l: { cal:532, pro:4, carb:90, fat:17 }, default_topping:'珍珠' },
      '波霸奶茶':       { cat: 'pearl_milk_tea',m: { cal:372, pro:3, carb:63, fat:12 }, l: { cal:532, pro:4, carb:90, fat:17 }, default_topping:'波霸' },
      '珍珠烏龍奶茶':   { cat: 'pearl_milk_tea',m: { cal:330, pro:3, carb:55, fat:11 }, l: { cal:472, pro:4, carb:78, fat:16 }, default_topping:'珍珠' },
      '波霸烏龍奶茶':   { cat: 'pearl_milk_tea',m: { cal:330, pro:3, carb:55, fat:11 }, l: { cal:472, pro:4, carb:78, fat:16 }, default_topping:'波霸' },
      '珍珠紅茶':       { cat: 'black_tea',     m: { cal:119, pro:0, carb:30, fat:0  }, l: { cal:170, pro:0, carb:42, fat:0  }, default_topping:'珍珠' },
      // Yakult series
      '多多綠':         { cat: 'yakult_tea',    m: { cal:230, pro:2, carb:55, fat:1  }, l: { cal:318, pro:3, carb:76, fat:1  } },
      '百香多多':       { cat: 'yakult_tea',    m: { cal:240, pro:1, carb:58, fat:0  }, l: { cal:330, pro:2, carb:80, fat:0  } },
    },
  },
  'CoCo': {
    display: 'CoCo 都可',
    ocr_keys: ['CoCo', 'coco', '都可', 'COCO'],
    color: '#FF9800',
    drinks: {
      // Pure teas
      '茉莉綠茶':   { cat:'green_tea',      m:{cal:105,pro:0,carb:26,fat:0 }, l:{cal:140,pro:0,carb:35,fat:0 } },
      '四季青茶':   { cat:'oolong_tea',     m:{cal:105,pro:0,carb:26,fat:0 }, l:{cal:140,pro:0,carb:35,fat:0 } },
      '手採紅茶':   { cat:'black_tea',      m:{cal:105,pro:0,carb:26,fat:0 }, l:{cal:140,pro:0,carb:35,fat:0 } },
      // Creamer-based milk tea — CoCo 阿薩姆奶茶 real data
      '奶茶':       { cat:'milk_tea',       m:{cal:404,pro:3,carb:69,fat:13}, l:{cal:584,pro:4,carb:99,fat:19} },
      '阿薩姆奶茶': { cat:'milk_tea',       m:{cal:404,pro:3,carb:69,fat:13}, l:{cal:584,pro:4,carb:99,fat:19} },
      // Fresh milk tea — real data
      '鮮奶茶':         { cat:'fresh_milk_tea', m:{cal:263,pro:7,carb:28,fat:16}, l:{cal:365,pro:10,carb:40,fat:22} },
      '英式鮮奶茶':     { cat:'fresh_milk_tea', m:{cal:263,pro:7,carb:28,fat:16}, l:{cal:365,pro:10,carb:40,fat:22} },
      // Topping drinks — base only, topping added separately
      '珍珠奶茶':       { cat:'pearl_milk_tea', m:{cal:404,pro:3,carb:69,fat:13}, l:{cal:584,pro:4,carb:99,fat:19}, default_topping:'珍珠' },
      '珍珠鮮奶茶':     { cat:'pearl_milk_tea', m:{cal:263,pro:7,carb:28,fat:16}, l:{cal:365,pro:10,carb:40,fat:22}, default_topping:'珍珠' },
      // Taro
      '鮮芋珍珠':       { cat:'taro_milk',      m:{cal:426,pro:5,carb:75,fat:11}, l:{cal:552,pro:7,carb:97,fat:14}, default_topping:'珍珠' },
      '芋頭牛奶':       { cat:'taro_milk',      m:{cal:426,pro:5,carb:75,fat:11}, l:{cal:552,pro:7,carb:97,fat:14} },
      // Others
      '檸檬蘆薈':   { cat:'lemon_tea',      m:{cal:165,pro:0,carb:41,fat:0 }, l:{cal:215,pro:0,carb:54,fat:0 } },
      '多多綠':     { cat:'yakult_tea',     m:{cal:215,pro:2,carb:51,fat:1 }, l:{cal:280,pro:3,carb:66,fat:1 } },
    },
  },
  '清心': {
    display: '清心福全',
    ocr_keys: ['清心', '清心福全'],
    color: '#4CAF50',
    drinks: {
      '珍珠奶茶': { cat:'pearl_milk_tea', m:{cal:375,pro:3,carb:64,fat:12}, l:{cal:535,pro:4,carb:91,fat:17}, default_topping:'珍珠' },
      '仙草奶茶': { cat:'grass_jelly',    m:{cal:295,pro:2,carb:53,fat:7 }, l:{cal:420,pro:3,carb:75,fat:10}, default_topping:'仙草' },
      '水果茶':   { cat:'fruit_tea',      m:{cal:180,pro:0,carb:45,fat:0 }, l:{cal:250,pro:0,carb:62,fat:0 } },
      '紅茶':     { cat:'black_tea',      m:{cal:119,pro:0,carb:30,fat:0 }, l:{cal:170,pro:0,carb:42,fat:0 } },
      '奶茶':     { cat:'milk_tea',       m:{cal:375,pro:3,carb:64,fat:12}, l:{cal:535,pro:4,carb:91,fat:17} },
    },
  },
  '迷客夏': {
    display: '迷客夏',
    ocr_keys: ['迷客夏', 'Milksha', 'milksha'],
    color: '#E91E63',
    drinks: {
      '純鮮奶':       { cat:'fresh_milk_tea', m:{cal:250,pro:8, carb:18,fat:13}, l:{cal:330,pro:10,carb:24,fat:17} },
      '鮮奶茶':       { cat:'fresh_milk_tea', m:{cal:245,pro:7, carb:29,fat:10}, l:{cal:325,pro:9, carb:38,fat:13} },
      '黑糖珍珠鮮奶': { cat:'brown_sugar_milk',m:{cal:455,pro:8,carb:72,fat:14}, l:{cal:590,pro:10,carb:93,fat:18}, default_topping:'珍珠' },
      '抹茶鮮奶':     { cat:'fresh_milk_tea', m:{cal:275,pro:7, carb:36,fat:11}, l:{cal:360,pro:9, carb:47,fat:14} },
      '芋頭鮮奶':     { cat:'taro_milk',      m:{cal:380,pro:7, carb:60,fat:12}, l:{cal:490,pro:9, carb:77,fat:16} },
    },
  },
  '麻古': {
    display: '麻古茶坊',
    ocr_keys: ['麻古', '麻古茶坊', 'Macho'],
    color: '#795548',
    drinks: {
      '翡翠檸檬': { cat:'lemon_tea',      m:{cal:155,pro:0,carb:38,fat:0 }, l:{cal:205,pro:0,carb:51,fat:0 } },
      '冬瓜拿鐵': { cat:'winter_melon',   m:{cal:285,pro:5,carb:47,fat:8 }, l:{cal:375,pro:7,carb:62,fat:11} },
      '鮮奶茶':   { cat:'fresh_milk_tea', m:{cal:245,pro:6, carb:30,fat:9 }, l:{cal:325,pro:8, carb:40,fat:12} },
    },
  },
  '得正': {
    display: '得正',
    ocr_keys: ['得正'],
    color: '#9C27B0',
    drinks: {
      '古早味紅茶': { cat:'black_tea',      m:{cal:119,pro:0,carb:30,fat:0 }, l:{cal:170,pro:0,carb:42,fat:0 } },
      '奶茶':       { cat:'milk_tea',       m:{cal:370,pro:2,carb:63,fat:12}, l:{cal:530,pro:3,carb:90,fat:17} },
      '珍珠奶茶':   { cat:'pearl_milk_tea', m:{cal:370,pro:2,carb:63,fat:12}, l:{cal:530,pro:3,carb:90,fat:17}, default_topping:'珍珠' },
    },
  },
  '茶湯會': {
    display: '茶湯會',
    ocr_keys: ['茶湯會', 'Tea Talk'],
    color: '#607D8B',
    drinks: {
      '職人四季春': { cat:'oolong_tea',     m:{cal:119,pro:0,carb:30,fat:0 }, l:{cal:170,pro:0,carb:42,fat:0 } },
      '波霸奶茶':   { cat:'pearl_milk_tea', m:{cal:370,pro:3,carb:63,fat:12}, l:{cal:530,pro:4,carb:90,fat:17}, default_topping:'波霸' },
      '鮮奶茶':     { cat:'fresh_milk_tea', m:{cal:245,pro:6, carb:27,fat:15}, l:{cal:330,pro:8, carb:37,fat:21} },
    },
  },
  '老虎堂': {
    display: '老虎堂',
    ocr_keys: ['老虎堂', 'Tiger Sugar', 'TIGER'],
    color: '#FF5722',
    drinks: {
      '黑糖珍珠鮮奶': { cat:'brown_sugar_milk', m:{cal:480,pro:9,carb:76,fat:15}, l:{cal:620,pro:12,carb:98,fat:19}, default_topping:'珍珠' },
    },
  },
  '貢茶': {
    display: '貢茶',
    ocr_keys: ['貢茶', 'Gong Cha', 'GONG CHA'],
    color: '#3F51B5',
    drinks: {
      '波霸奶茶':   { cat:'pearl_milk_tea', m:{cal:370,pro:3,carb:63,fat:12}, l:{cal:530,pro:4,carb:90,fat:17}, default_topping:'珍珠' },
      '鐵觀音拿鐵': { cat:'milk_tea',       m:{cal:375,pro:3,carb:64,fat:12}, l:{cal:535,pro:4,carb:91,fat:17} },
      '奶蓋四季春': { cat:'cheese_foam',    m:{cal:280,pro:5,carb:44,fat:9 }, l:{cal:365,pro:6,carb:57,fat:12} },
    },
  },
  '一沐日': {
    display: '一沐日',
    ocr_keys: ['一沐日', 'YIMUDAY'],
    color: '#8BC34A',
    drinks: {
      '鮮果茶':   { cat:'fruit_tea',      m:{cal:175,pro:0,carb:44,fat:0 }, l:{cal:230,pro:0,carb:57,fat:0 } },
      '鮮奶茶':   { cat:'fresh_milk_tea', m:{cal:245,pro:6, carb:27,fat:15}, l:{cal:330,pro:8, carb:37,fat:21} },
    },
  },
  '可不可': {
    display: '可不可熟成紅茶',
    ocr_keys: ['可不可', '熟成紅茶'],
    color: '#795548',
    drinks: {
      '熟成紅茶':   { cat:'black_tea',      m:{cal:119,pro:0,carb:30,fat:0 }, l:{cal:170,pro:0,carb:42,fat:0 } },
      '鮮奶茶':     { cat:'fresh_milk_tea', m:{cal:245,pro:6, carb:28,fat:15}, l:{cal:330,pro:8, carb:38,fat:21} },
      '珍珠鮮奶茶': { cat:'pearl_milk_tea', m:{cal:245,pro:6, carb:28,fat:15}, l:{cal:330,pro:8, carb:38,fat:21}, default_topping:'珍珠' },
    },
  },
  '珍煮丹': {
    display: '珍煮丹',
    ocr_keys: ['珍煮丹', 'Zhenzhudan'],
    color: '#FF6B6B',
    drinks: {
      '珍珠紅茶': { cat:'black_tea',     m:{cal:119,pro:0,carb:30,fat:0 }, l:{cal:170,pro:0,carb:42,fat:0 }, default_topping:'珍珠' },
      '珍珠奶茶': { cat:'pearl_milk_tea',m:{cal:375,pro:3,carb:64,fat:12}, l:{cal:535,pro:4,carb:91,fat:17}, default_topping:'珍珠' },
    },
  },
  '春水堂': {
    display: '春水堂',
    ocr_keys: ['春水堂', 'Chun Shui Tang'],
    color: '#4CAF50',
    drinks: {
      '珍珠奶茶': { cat:'pearl_milk_tea', m:{cal:380,pro:3,carb:65,fat:12}, l:{cal:540,pro:4,carb:93,fat:17}, default_topping:'珍珠' },
      '四季春':   { cat:'oolong_tea',     m:{cal:119,pro:0,carb:30,fat:0 }, l:{cal:170,pro:0,carb:42,fat:0 } },
    },
  },
  '大苑子': {
    display: '大苑子',
    ocr_keys: ['大苑子'],
    color: '#FF9800',
    drinks: {
      '鮮果茶': { cat:'fruit_tea',       m:{cal:175,pro:0,carb:44,fat:0 }, l:{cal:230,pro:0,carb:57,fat:0 } },
      '鮮奶茶': { cat:'fresh_milk_tea',  m:{cal:245,pro:6, carb:27,fat:15}, l:{cal:330,pro:8, carb:37,fat:21} },
    },
  },
  '先喝道': {
    display: '先喝道',
    ocr_keys: ['先喝道', 'Xianhedao'],
    color: '#607D8B',
    drinks: {
      '奶茶': { cat:'milk_tea',  m:{cal:370,pro:2,carb:63,fat:12}, l:{cal:530,pro:3,carb:90,fat:17} },
      '綠茶': { cat:'green_tea', m:{cal:105,pro:0,carb:26,fat:0 }, l:{cal:140,pro:0,carb:35,fat:0 } },
    },
  },
}

// ── Sugar levels ───────────────────────────────────────────────────────────────
// Baseline = 全糖 (100% sugar). calAdj is the calorie delta from 全糖.
// Each step removes ~14 g sugar (≈56 kcal) from a 500 ml medium cup.
export const SUGAR_LEVELS = [
  { key:'none',    pct:  0, label:'無糖 0%',    calAdj: -115 },
  { key:'thirty',  pct: 30, label:'三分糖 30%', calAdj:  -80 },
  { key:'half',    pct: 50, label:'半糖 50%',   calAdj:  -55 },
  { key:'seventy', pct: 70, label:'七分糖 70%', calAdj:  -30 },
  { key:'full',    pct:100, label:'全糖 100%',  calAdj:    0 },
]

// ── Ice levels (UI only — don't affect calories) ──────────────────────────────
export const ICE_LEVELS = [
  { key:'none',    label:'去冰' },
  { key:'less',    label:'少冰' },
  { key:'regular', label:'正常冰' },
  { key:'hot',     label:'熱' },
]

// ── Sizes ──────────────────────────────────────────────────────────────────────
// Taiwan standard: 中杯 500 ml (baseline), 大杯 700 ml
export const DRINK_SIZES = [
  { key:'s',      label:'小杯', ml: 350, mult: 0.70 },
  { key:'m',      label:'中杯', ml: 500, mult: 1.00 },  // baseline
  { key:'l',      label:'大杯', ml: 700, mult: 1.40 },
  { key:'bottle', label:'瓶裝', ml: 500, mult: 1.00 },
]

// ── Toppings ───────────────────────────────────────────────────────────────────
export const BOBA_TOPPINGS = {
  '珍珠':   { cal: 100, carb:24, pro:1, fat:0, emoji:'🟤', en:'Tapioca Pearls'   },
  '波霸':   { cal: 110, carb:26, pro:1, fat:0, emoji:'⚫', en:'Jumbo Pearls'     },
  '小珍珠': { cal:  65, carb:15, pro:0, fat:0, emoji:'🔵', en:'Mini Pearls'      },
  '仙草':   { cal:  25, carb: 6, pro:0, fat:0, emoji:'🌿', en:'Grass Jelly'      },
  '布丁':   { cal:  60, carb: 9, pro:2, fat:2, emoji:'🟡', en:'Egg Pudding'      },
  '椰果':   { cal:  40, carb:10, pro:0, fat:0, emoji:'🤍', en:'Coconut Jelly'    },
  '蘆薈':   { cal:  20, carb: 5, pro:0, fat:0, emoji:'💚', en:'Aloe Vera'        },
  '紅豆':   { cal:  65, carb:13, pro:2, fat:0, emoji:'❤️',  en:'Red Bean'         },
  '芋圓':   { cal:  75, carb:17, pro:1, fat:0, emoji:'🟣', en:'Taro Balls'       },
  '奶蓋':   { cal:  95, carb: 8, pro:3, fat:6, emoji:'🧀', en:'Cheese Foam'      },
  '燕麥':   { cal:  55, carb:10, pro:2, fat:1, emoji:'🌾', en:'Oats'             },
  '寒天':   { cal:  10, carb: 3, pro:0, fat:0, emoji:'💎', en:'Agar Jelly'       },
}

// ── Quick chips — most popular Taiwan orders ───────────────────────────────────
export const BOBA_QUICK_CHIPS = [
  { label:'珍珠奶茶',     cat:'pearl_milk_tea',  size:'m', sugarKey:'half',    toppings:['珍珠'] },
  { label:'四季春',       cat:'oolong_tea',       size:'m', sugarKey:'half',    toppings:[] },
  { label:'鮮奶茶',       cat:'fresh_milk_tea',   size:'m', sugarKey:'half',    toppings:[] },
  { label:'波霸奶茶',     cat:'pearl_milk_tea',   size:'l', sugarKey:'half',    toppings:['波霸'] },
  { label:'黑糖珍珠鮮奶', cat:'brown_sugar_milk', size:'m', sugarKey:'none',    toppings:['珍珠'] },
  { label:'仙草奶茶',     cat:'grass_jelly',      size:'m', sugarKey:'half',    toppings:['仙草'] },
  { label:'多多綠',       cat:'yakult_tea',        size:'m', sugarKey:'half',    toppings:[] },
  { label:'水果茶',       cat:'fruit_tea',         size:'l', sugarKey:'half',    toppings:[] },
]

// ── Lookup helpers ─────────────────────────────────────────────────────────────
function norm(s) {
  return (s || '').toLowerCase().replace(/[\s\-_（）()【】、。，,]/g, '')
}

export function matchBrandKey(text) {
  if (!text) return null
  const t = norm(text)
  for (const [key, brand] of Object.entries(BOBA_BRANDS)) {
    if (norm(key) === t) return key
    if (brand.ocr_keys.some(k => t.includes(norm(k)) || norm(k).includes(t))) return key
  }
  return null
}

export function matchDrinkKey(brandKey, drinkText) {
  if (!brandKey || !drinkText) return null
  const brand = BOBA_BRANDS[brandKey]
  if (!brand) return null
  const t = norm(drinkText)
  const drinkKeys = Object.keys(brand.drinks)

  // 1. Exact match
  for (const dKey of drinkKeys) {
    if (norm(dKey) === t) return dKey
  }
  // 2. OCR text contains the DB key (e.g. "波霸重燒烏龍拿鐵" contains "重燒烏龍拿鐵")
  for (const dKey of drinkKeys) {
    const dk = norm(dKey)
    if (dk.length >= 3 && t.includes(dk)) return dKey
  }
  // 3. DB key contains the OCR text
  for (const dKey of drinkKeys) {
    const dk = norm(dKey)
    if (t.length >= 3 && dk.includes(t)) return dKey
  }
  // 4. Character overlap ≥ 70% of shorter string (handles 重燒 vs 重焙 etc.)
  for (const dKey of drinkKeys) {
    const dk = norm(dKey)
    const [shorter, longer] = t.length <= dk.length ? [t, dk] : [dk, t]
    if (shorter.length >= 4) {
      const overlap = [...shorter].filter(ch => longer.includes(ch)).length
      if (overlap / shorter.length >= 0.70) return dKey
    }
  }
  return null
}

/** Detect drink category from text. Returns category key or null. */
export function detectCategory(text) {
  if (!text) return null
  const t = text.toLowerCase()
  // More specific first
  for (const [key, cat] of [
    ...Object.entries(DRINK_CATEGORIES).sort((a, b) =>
      b[1].keywords.length - a[1].keywords.length
    ),
  ]) {
    if (cat.keywords.some(k => t.includes(k.toLowerCase()))) return key
  }
  return null
}

// ── Nutrition calculation ──────────────────────────────────────────────────────
/**
 * Calculate nutrition for a complete drink order.
 * @param {object} order
 *   brandKey?  string — brand key (null = generic)
 *   drinkKey?  string — drink key within brand
 *   cat?       string — category key (fallback if no brand/drink)
 *   size       's'|'m'|'l'|'bottle'
 *   sugarKey   'none'|'thirty'|'half'|'seventy'|'full'
 *   toppings   string[]
 */
export function calcDrinkTotal(order) {
  const { brandKey, drinkKey, cat, size = 'm', sugarKey = 'full', toppings = [] } = order

  // 1. Get base from brand drink or category (values are 全糖 baseline)
  let baseMed = null  // { cal, pro, carb, fat }

  if (brandKey && drinkKey) {
    const drink = BOBA_BRANDS[brandKey]?.drinks[drinkKey]
    if (drink) {
      if (size === 'l' && drink.l) baseMed = { ...drink.l }
      else baseMed = { ...drink.m }
    }
  }

  if (!baseMed) {
    const catKey = cat || 'pearl_milk_tea'
    const catDef = DRINK_CATEGORIES[catKey] || DRINK_CATEGORIES.pearl_milk_tea
    if (size === 'l') baseMed = { ...catDef.l }
    else if (size === 's' || size === 'bottle') {
      const sizeDef = DRINK_SIZES.find(s => s.key === size)
      baseMed = {
        cal:  Math.round(catDef.m.cal  * (sizeDef?.mult ?? 0.70)),
        pro:  +(catDef.m.pro  * (sizeDef?.mult ?? 0.70)).toFixed(1),
        carb: Math.round(catDef.m.carb * (sizeDef?.mult ?? 0.70)),
        fat:  +(catDef.m.fat  * (sizeDef?.mult ?? 0.70)).toFixed(1),
      }
    } else {
      baseMed = { ...catDef.m }
    }
  }

  // 2. Sugar adjustment — scale proportionally by cup size
  const sugarDef  = SUGAR_LEVELS.find(s => s.key === sugarKey) || SUGAR_LEVELS[4]  // default full
  const sizeMult  = DRINK_SIZES.find(s => s.key === size)?.mult ?? 1.0
  const sugarAdj  = Math.round(sugarDef.calAdj * sizeMult)
  const sugarCarb = Math.round((sugarDef.calAdj / 4) * sizeMult)  // sugar is 4 kcal/g

  let cal  = Math.max(0, baseMed.cal  + sugarAdj)
  let carb = Math.max(0, baseMed.carb + sugarCarb)
  let pro  = baseMed.pro
  let fat  = baseMed.fat

  // 3. Toppings
  for (const t of toppings) {
    const tp = BOBA_TOPPINGS[t]
    if (tp) { cal += tp.cal; carb += tp.carb; pro += tp.pro; fat += tp.fat }
  }

  // 4. Build label
  const sizeLabel  = DRINK_SIZES.find(s => s.key === size)?.label || '中杯'
  const sugarLabel = sugarDef.label
  const topLabel   = toppings.length ? ` + ${toppings.join('、')}` : ''
  const drinkLabel = drinkKey || (cat ? DRINK_CATEGORIES[cat]?.label_zh : null) || '手搖飲'
  const brandLabel = brandKey || ''
  const label = `${brandLabel} ${drinkLabel} ${sizeLabel} ${sugarLabel}${topLabel}`.trim()

  return {
    calories: Math.round(cal),
    protein:  +pro.toFixed(1),
    carbs:    Math.round(carb),
    fat:      +fat.toFixed(1),
    label,
  }
}
