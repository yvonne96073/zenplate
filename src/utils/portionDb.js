// ─────────────────────────────────────────────────────────────────────────────
// PORTION SCIENCE v1 — Food Component Database
// Provides: portion priors (S/M/L) + per-100g nutrition for Taiwan common foods
// AI is told to use these component IDs so lookups are reliable.
// ─────────────────────────────────────────────────────────────────────────────

// ── Component Table ───────────────────────────────────────────────────────────
// portions: S / M / L in grams
// per100g: calories, protein, carbs, fat
// count_based: true if "per piece" makes more sense than grams
// per_piece_g: grams per piece for count-based items
// tags: used for Plate Score reasoning
export const COMPONENTS = {

  // ── Staples ──────────────────────────────────────────────────────────────
  white_rice: {
    id: 'white_rice', name_zh: '白飯', name_en: 'White Rice',
    keywords: ['白飯', '米飯', '飯', 'white rice', 'rice', '糙米'],
    portions: { small: 120, medium: 200, large: 280 }, default_g: 200,
    per100g: { cal: 130, pro: 2.7, carb: 28.2, fat: 0.3 },
    count_based: false, tags: ['carb'],
  },
  brown_rice: {
    id: 'brown_rice', name_zh: '糙米飯', name_en: 'Brown Rice',
    keywords: ['糙米飯', '糙米', 'brown rice'],
    portions: { small: 120, medium: 200, large: 280 }, default_g: 200,
    per100g: { cal: 124, pro: 2.9, carb: 26, fat: 1 },
    count_based: false, tags: ['carb'],
  },
  noodles: {
    id: 'noodles', name_zh: '麵條', name_en: 'Noodles',
    keywords: ['麵', '麵條', '拉麵', '烏龍', '冬粉', '米粉', '義大利麵', '河粉', 'noodle', 'pasta'],
    portions: { small: 180, medium: 280, large: 380 }, default_g: 280,
    per100g: { cal: 138, pro: 4.5, carb: 28, fat: 0.8 },
    count_based: false, tags: ['carb'],
  },
  fried_rice: {
    id: 'fried_rice', name_zh: '炒飯', name_en: 'Fried Rice',
    keywords: ['炒飯', '蛋炒飯', '揚州炒飯', 'fried rice'],
    portions: { small: 200, medium: 300, large: 420 }, default_g: 300,
    per100g: { cal: 185, pro: 4.5, carb: 28, fat: 6.5 },
    count_based: false, tags: ['carb', 'fried'],
  },
  bread: {
    id: 'bread', name_zh: '麵包', name_en: 'Bread',
    keywords: ['麵包', '吐司', '貝果', '可頌', '饅頭', '漢堡包', 'bread', 'toast', 'bun', 'bagel'],
    portions: { small: 50, medium: 80, large: 120 }, default_g: 80,
    per100g: { cal: 265, pro: 8, carb: 50, fat: 3 },
    count_based: false, tags: ['carb'],
  },
  rice_ball: {
    id: 'rice_ball', name_zh: '飯糰', name_en: 'Rice Ball',
    keywords: ['飯糰', '御飯糰', 'rice ball', 'onigiri'],
    portions: { small: 100, medium: 120, large: 160 }, default_g: 120,
    per100g: { cal: 185, pro: 4.5, carb: 37, fat: 2 },
    count_based: true, per_piece_g: 120, tags: ['carb'],
  },
  dumpling: {
    id: 'dumpling', name_zh: '水餃/鍋貼', name_en: 'Dumpling',
    keywords: ['水餃', '鍋貼', '餃子', '湯包', '小籠包', 'dumpling', 'potsticker'],
    portions: { small: 100, medium: 200, large: 300 }, default_g: 200,
    per100g: { cal: 195, pro: 9, carb: 26, fat: 6 },
    count_based: true, per_piece_g: 25, tags: ['carb', 'protein'],
  },
  cereal: {
    id: 'cereal', name_zh: '麥片/穀物', name_en: 'Cereal',
    keywords: ['麥片', '穀物麥片', '燕麥', '玉米片', '早餐穀物', '綜合穀物', 'cereal', 'oatmeal', 'granola'],
    portions: { small: 30, medium: 45, large: 60 }, default_g: 40,
    per100g: { cal: 370, pro: 8, carb: 75, fat: 5 },
    count_based: false, tags: ['carb'],
  },

  // ── Proteins ──────────────────────────────────────────────────────────────
  fried_chicken: {
    id: 'fried_chicken', name_zh: '炸雞', name_en: 'Fried Chicken',
    keywords: ['炸雞', '雞排', '雞腿排', '鹽酥雞', '唐揚', 'fried chicken', 'crispy chicken'],
    portions: { small: 100, medium: 150, large: 220 }, default_g: 150,
    per100g: { cal: 280, pro: 18, carb: 12, fat: 18 },
    count_based: true, per_piece_g: 150, tags: ['protein', 'fried'],
  },
  chicken_leg: {
    id: 'chicken_leg', name_zh: '雞腿', name_en: 'Chicken Leg',
    keywords: ['雞腿', '棒棒腿', '腿排', 'chicken leg', 'drumstick'],
    portions: { small: 110, medium: 160, large: 230 }, default_g: 160,
    per100g: { cal: 240, pro: 20, carb: 5, fat: 15 },
    count_based: true, per_piece_g: 160, tags: ['protein', 'fried'],
  },
  grilled_chicken: {
    id: 'grilled_chicken', name_zh: '烤雞胸', name_en: 'Grilled Chicken',
    keywords: ['烤雞', '雞胸', '嫩切雞', '烤雞肉', '水煮雞', 'grilled chicken', 'chicken breast'],
    portions: { small: 80, medium: 120, large: 180 }, default_g: 120,
    per100g: { cal: 165, pro: 31, carb: 0, fat: 3.6 },
    count_based: false, tags: ['protein'],
  },
  braised_pork: {
    id: 'braised_pork', name_zh: '滷肉', name_en: 'Braised Pork',
    keywords: ['滷肉', '焢肉', '控肉', '紅燒肉', '滷豬肉', '爌肉', 'braised pork'],
    portions: { small: 50, medium: 80, large: 120 }, default_g: 80,
    per100g: { cal: 290, pro: 14, carb: 5, fat: 24 },
    count_based: false, tags: ['protein', 'fried'],
  },
  pork_chop: {
    id: 'pork_chop', name_zh: '豬排', name_en: 'Pork Chop',
    keywords: ['豬排', '排骨', '炸排骨', '豬里肌', 'pork chop', 'cutlet'],
    portions: { small: 80, medium: 120, large: 180 }, default_g: 120,
    per100g: { cal: 250, pro: 19, carb: 8, fat: 16 },
    count_based: true, per_piece_g: 120, tags: ['protein', 'fried'],
  },
  beef: {
    id: 'beef', name_zh: '牛肉', name_en: 'Beef',
    keywords: ['牛肉', '牛排', '燒牛', '滷牛', '嫩牛', '牛肉片', 'beef', 'steak'],
    portions: { small: 80, medium: 120, large: 180 }, default_g: 120,
    per100g: { cal: 215, pro: 26, carb: 0, fat: 12 },
    count_based: false, tags: ['protein'],
  },
  fish: {
    id: 'fish', name_zh: '魚', name_en: 'Fish',
    keywords: ['魚', '鱸魚', '鮭魚', '鯖魚', '秋刀魚', '虱目魚', 'fish', 'salmon', 'tilapia'],
    portions: { small: 80, medium: 120, large: 180 }, default_g: 120,
    per100g: { cal: 140, pro: 20, carb: 0, fat: 6 },
    count_based: false, tags: ['protein'],
  },
  shrimp_tempura: {
    id: 'shrimp_tempura', name_zh: '炸蝦', name_en: 'Shrimp Tempura',
    keywords: ['炸蝦', '天婦羅蝦', '蝦天婦羅', 'shrimp tempura', 'prawn tempura'],
    portions: { small: 60, medium: 120, large: 180 }, default_g: 120,
    per100g: { cal: 250, pro: 6, carb: 22, fat: 15 },
    count_based: true, per_piece_g: 40, tags: ['protein', 'fried'],
  },
  egg: {
    id: 'egg', name_zh: '蛋', name_en: 'Egg',
    keywords: ['蛋', '荷包蛋', '炒蛋', '水煮蛋', '溫泉蛋', '嫩蛋', '蛋花', 'egg'],
    portions: { small: 50, medium: 60, large: 120 }, default_g: 60,
    per100g: { cal: 147, pro: 12.6, carb: 0.7, fat: 10 },
    count_based: true, per_piece_g: 60, tags: ['protein'],
  },
  braised_egg: {
    id: 'braised_egg', name_zh: '滷蛋', name_en: 'Braised Egg',
    keywords: ['滷蛋', '茶葉蛋', '鐵蛋', 'braised egg'],
    portions: { small: 50, medium: 60, large: 120 }, default_g: 60,
    per100g: { cal: 155, pro: 13, carb: 1.5, fat: 10.5 },
    count_based: true, per_piece_g: 60, tags: ['protein'],
  },
  tofu: {
    id: 'tofu', name_zh: '豆腐', name_en: 'Tofu',
    keywords: ['豆腐', '嫩豆腐', '板豆腐', '凍豆腐', '臭豆腐', 'tofu'],
    portions: { small: 80, medium: 150, large: 220 }, default_g: 150,
    per100g: { cal: 76, pro: 8.1, carb: 2, fat: 3.8 },
    count_based: false, tags: ['protein'],
  },
  burger_patty: {
    id: 'burger_patty', name_zh: '漢堡肉', name_en: 'Burger Patty',
    keywords: ['漢堡', '漢堡肉', '牛肉堡', 'burger', 'patty'],
    portions: { small: 100, medium: 150, large: 220 }, default_g: 150,
    per100g: { cal: 270, pro: 16, carb: 15, fat: 17 },
    count_based: false, tags: ['protein', 'fried'],
  },

  // ── Vegetables ────────────────────────────────────────────────────────────
  vegetables: {
    id: 'vegetables', name_zh: '青菜', name_en: 'Vegetables',
    keywords: ['青菜', '蔬菜', '燙青菜', '炒青菜', '花椰菜', '菠菜', '高麗菜', '空心菜', '地瓜葉', 'vegetable', 'veggies', 'greens'],
    portions: { small: 40, medium: 80, large: 130 }, default_g: 80,
    per100g: { cal: 35, pro: 2, carb: 6, fat: 0.5 },
    count_based: false, tags: ['veggie'],
  },
  salad: {
    id: 'salad', name_zh: '沙拉', name_en: 'Salad',
    keywords: ['沙拉', '生菜', '綠沙拉', '沙拉碗', 'salad', 'greens'],
    portions: { small: 80, medium: 150, large: 250 }, default_g: 150,
    per100g: { cal: 20, pro: 1.5, carb: 3, fat: 0.2 },
    count_based: false, tags: ['veggie'],
  },
  fruit: {
    id: 'fruit', name_zh: '水果', name_en: 'Fruit',
    keywords: ['水果', '蘋果', '香蕉', '西瓜', '橘子', '葡萄', '草莓', 'fruit'],
    portions: { small: 80, medium: 150, large: 250 }, default_g: 150,
    per100g: { cal: 55, pro: 0.8, carb: 13, fat: 0.2 },
    count_based: false, tags: ['veggie'],
  },

  // ── Sauces / Soup ─────────────────────────────────────────────────────────
  sauce: {
    id: 'sauce', name_zh: '醬汁', name_en: 'Sauce',
    keywords: ['醬汁', '醬料', '淋醬', '沾醬', '番茄醬', '醬', 'sauce', 'gravy', 'dressing'],
    portions: { small: 10, medium: 20, large: 40 }, default_g: 15,
    per100g: { cal: 120, pro: 1, carb: 18, fat: 5 },
    count_based: false, tags: ['sauce'],
  },
  curry_sauce: {
    id: 'curry_sauce', name_zh: '咖哩醬', name_en: 'Curry Sauce',
    keywords: ['咖哩', '咖哩醬', '咖哩汁', 'curry', 'curry sauce'],
    portions: { small: 80, medium: 130, large: 200 }, default_g: 130,
    per100g: { cal: 100, pro: 2.5, carb: 12, fat: 4.5 },
    count_based: false, tags: ['sauce'],
  },
  soup_broth: {
    id: 'soup_broth', name_zh: '湯', name_en: 'Soup / Broth',
    keywords: ['湯', '高湯', '清湯', '味噌湯', '湯底', '火鍋湯', 'soup', 'broth'],
    portions: { small: 150, medium: 250, large: 400 }, default_g: 250,
    per100g: { cal: 15, pro: 1.2, carb: 1.5, fat: 0.5 },
    count_based: false, tags: [],
  },

  // ── Drinks ────────────────────────────────────────────────────────────────
  bubble_tea: {
    id: 'bubble_tea', name_zh: '珍珠奶茶', name_en: 'Bubble Tea',
    keywords: ['珍奶', '珍珠奶茶', '珍珠', '波霸', 'bubble tea', 'boba'],
    portions: { small: 500, medium: 700, large: 1000 }, default_g: 700,
    per100g: { cal: 68, pro: 1, carb: 14, fat: 1.5 },
    count_based: false, tags: ['sweet', 'drink'],
  },
  milk_tea: {
    id: 'milk_tea', name_zh: '奶茶', name_en: 'Milk Tea',
    keywords: ['奶茶', '手搖', '紅茶拿鐵', '鮮奶茶', 'milk tea'],
    portions: { small: 400, medium: 500, large: 700 }, default_g: 500,
    per100g: { cal: 50, pro: 0.8, carb: 10, fat: 1 },
    count_based: false, tags: ['sweet', 'drink'],
  },
  milk: {
    id: 'milk', name_zh: '牛奶', name_en: 'Milk',
    keywords: ['牛奶', '鮮奶', '鮮乳', '全脂牛奶', '脫脂牛奶', '高脂鮮乳', 'milk'],
    portions: { small: 150, medium: 240, large: 400 }, default_g: 240,
    per100g: { cal: 65, pro: 3.3, carb: 4.8, fat: 3.6 },
    count_based: false, tags: ['drink'],
  },
  soy_milk: {
    id: 'soy_milk', name_zh: '豆漿', name_en: 'Soy Milk',
    keywords: ['豆漿', '豆奶', '無糖豆漿', 'soy milk'],
    portions: { small: 240, medium: 350, large: 500 }, default_g: 350,
    per100g: { cal: 54, pro: 3.3, carb: 6.3, fat: 1.8 },
    count_based: false, tags: ['drink'],
  },
  milk_powder: {
    id: 'milk_powder', name_zh: '奶粉', name_en: 'Milk Powder',
    keywords: ['奶粉', '全脂奶粉', '脫脂奶粉', '配方奶粉', 'milk powder'],
    portions: { small: 20, medium: 30, large: 40 }, default_g: 25,
    per100g: { cal: 496, pro: 26, carb: 38, fat: 27 },
    count_based: false, tags: [],
  },

  // ── Snacks / Others ───────────────────────────────────────────────────────
  potato_fries: {
    id: 'potato_fries', name_zh: '薯條', name_en: 'Potato Fries',
    keywords: ['薯條', '炸薯條', '薯餅', 'fries', 'french fries', 'potato fries'],
    portions: { small: 60, medium: 110, large: 180 }, default_g: 110,
    per100g: { cal: 312, pro: 3.4, carb: 41, fat: 15 },
    count_based: false, tags: ['fried', 'carb'],
  },
}

// ── Meal Templates (25 common Taiwan meals) ───────────────────────────────────
// Guides the AI on how to decompose each meal type
export const MEAL_TEMPLATES = {
  chicken_leg_bento:   { name_zh: '雞腿便當',  components: ['white_rice','chicken_leg','vegetables','sauce'],          container: 'taiwan_bento_box' },
  fried_chicken_bento: { name_zh: '炸雞便當',  components: ['white_rice','fried_chicken','vegetables','sauce'],        container: 'taiwan_bento_box' },
  pork_chop_bento:     { name_zh: '豬排便當',  components: ['white_rice','pork_chop','vegetables','sauce'],            container: 'taiwan_bento_box' },
  braised_pork_rice:   { name_zh: '滷肉飯',    components: ['white_rice','braised_pork','braised_egg','vegetables'],   container: 'round_bowl_medium' },
  chicken_rice:        { name_zh: '雞肉飯',    components: ['white_rice','grilled_chicken','sauce'],                   container: 'round_bowl_medium' },
  beef_noodle_soup:    { name_zh: '牛肉麵',    components: ['noodles','beef','vegetables','soup_broth'],               container: 'ramen_bowl' },
  fried_rice_dish:     { name_zh: '炒飯',      components: ['fried_rice','egg'],                                       container: 'round_bowl_medium' },
  fried_noodles:       { name_zh: '炒麵',      components: ['noodles','egg','vegetables'],                            container: 'round_bowl_medium' },
  tempura_rice_bowl:   { name_zh: '天婦羅丼',  components: ['white_rice','shrimp_tempura','vegetables','sauce'],       container: 'round_bowl_medium' },
  curry_rice:          { name_zh: '咖哩飯',    components: ['white_rice','beef','curry_sauce','vegetables'],           container: 'round_bowl_medium' },
  beef_bowl:           { name_zh: '牛丼',      components: ['white_rice','beef','egg','sauce'],                        container: 'round_bowl_medium' },
  ramen:               { name_zh: '拉麵',      components: ['noodles','braised_pork','egg','soup_broth','vegetables'], container: 'ramen_bowl' },
  hot_pot:             { name_zh: '火鍋',      components: ['soup_broth','beef','vegetables','tofu','noodles'],        container: null },
  burger_meal:         { name_zh: '漢堡套餐',  components: ['bread','burger_patty','vegetables','potato_fries'],       container: null },
  pizza_slice:         { name_zh: '披薩',      components: ['bread','beef','vegetables','sauce'],                      container: null },
  salad_bowl:          { name_zh: '沙拉碗',    components: ['salad','grilled_chicken','vegetables'],                  container: null },
  dumpling_set:        { name_zh: '水餃',      components: ['dumpling'],                                               container: null },
  rice_ball_single:    { name_zh: '飯糰',      components: ['rice_ball'],                                             container: 'convenience_rice_ball' },
  bubble_tea_drink:    { name_zh: '珍奶',      components: ['bubble_tea'],                                            container: 'bubble_tea_700ml' },
  milk_tea_drink:      { name_zh: '奶茶',      components: ['milk_tea'],                                              container: 'bubble_tea_500ml' },
  congee:              { name_zh: '粥',         components: ['white_rice','vegetables'],                               container: 'round_bowl_medium' },
  breakfast_set:       { name_zh: '早餐套餐',  components: ['bread','egg','milk'],                                     container: null },
  cereal_bowl:         { name_zh: '麥片碗',    components: ['cereal','milk'],                                         container: 'round_bowl_medium' },
  convenience_bento:   { name_zh: '超商便當',  components: ['white_rice','braised_pork','egg','vegetables'],           container: 'taiwan_bento_box' },
  fish_bento:          { name_zh: '魚便當',    components: ['white_rice','fish','vegetables','sauce'],                 container: 'taiwan_bento_box' },
}

// ── Container Reference Table ─────────────────────────────────────────────────
// Helps anchor portion estimates to known container sizes
export const CONTAINER_DB = {
  taiwan_bento_box:      { name_zh: '台式便當盒',  vol_ml: 800,  clues: ['便當', '塑膠盒', '鋁箔盒', 'bento'] },
  round_bowl_medium:     { name_zh: '中碗',         vol_ml: 400,  clues: ['碗', '丼碗', '飯碗'] },
  ramen_bowl:            { name_zh: '拉麵碗',        vol_ml: 700,  clues: ['大碗', '拉麵碗'] },
  bubble_tea_700ml:      { name_zh: '大杯飲料',      vol_ml: 700,  clues: ['大杯', '700', 'L杯'] },
  bubble_tea_500ml:      { name_zh: '中杯飲料',      vol_ml: 500,  clues: ['中杯', '500', 'M杯'] },
  convenience_rice_ball: { name_zh: '超商飯糰包裝',  vol_ml: null, clues: ['三角', '飯糰包', '7-11', '全家'] },
  paper_lunch_box:       { name_zh: '紙便當',         vol_ml: 600,  clues: ['紙盒', '紙便當', '外帶'] },
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find a component by component_id or by name/keyword matching.
 * Returns the component object or null.
 */
export function lookupComponent(name = '') {
  if (!name) return null
  const q = name.trim().toLowerCase()

  // 1. Direct ID match (AI returned our component_id)
  if (COMPONENTS[q]) return COMPONENTS[q]
  // e.g. "White_Rice" → "white_rice"
  const normalized = q.replace(/\s+/g, '_')
  if (COMPONENTS[normalized]) return COMPONENTS[normalized]

  // 2. Exact name_zh or name_en match
  for (const comp of Object.values(COMPONENTS)) {
    if (comp.name_zh === name || comp.name_en.toLowerCase() === q) return comp
  }

  // 3. Keyword match — longest keyword wins to avoid over-matching
  let bestComp = null, bestLen = 0
  for (const comp of Object.values(COMPONENTS)) {
    for (const kw of comp.keywords) {
      const k = kw.toLowerCase()
      if ((q.includes(k) || k.includes(q)) && kw.length > bestLen) {
        bestComp = comp; bestLen = kw.length
      }
    }
  }
  return bestComp
}

/**
 * Calculate nutrition for a component at a given gram amount.
 * Uses our curated per-100g data.
 */
export function compNutrition(comp, grams) {
  if (!comp || !grams) return null
  const p = comp.per100g
  return {
    calories: Math.round(p.cal  * grams / 100),
    protein:  +((p.pro  * grams / 100).toFixed(1)),
    carbs:    +((p.carb * grams / 100).toFixed(1)),
    fat:      +((p.fat  * grams / 100).toFixed(1)),
  }
}

// Convenience accessor
export const compById = (id) => COMPONENTS[id] ?? null

// Prompt-friendly ID list (used in VISION_PROMPT)
export const COMPONENT_ID_LIST = Object.keys(COMPONENTS).join(', ')
