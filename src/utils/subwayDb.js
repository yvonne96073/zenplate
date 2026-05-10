// ─────────────────────────────────────────────────────────────────────────────
// SUBWAY TAIWAN OFFICIAL NUTRITION DATABASE
// Source: https://subway.com.tw/GoWeb2/include/meals-nutrition.html
// Last updated: 2025
// Note: sodium_mg not published by Subway Taiwan
// ─────────────────────────────────────────────────────────────────────────────

export const SUBWAY_DB = [

  // ── 6-inch Sandwiches ────────────────────────────────────────────────────
  { item_id: 'sub_sliced_chicken',     category: '6inch', product_name_zh: '嫩切雞肉',     product_name_en: 'Sliced Chicken',          serving_size_g: 207, calories: 300, protein_g: 20, carbs_g: 41,   fat_g: 6.3,  sugar_g: 5,    sodium_mg: null, keywords: ['嫩切雞肉', '雞肉', 'sliced chicken'] },
  { item_id: 'sub_teriyaki',           category: '6inch', product_name_zh: '照燒雞肉',     product_name_en: 'Chicken Teriyaki',        serving_size_g: 257, calories: 362, protein_g: 27, carbs_g: 46,   fat_g: 7.3,  sugar_g: 11,   sodium_mg: null, keywords: ['照燒', '照燒雞肉', 'teriyaki', '照燒雞'] },
  { item_id: 'sub_chicken_strips',     category: '6inch', product_name_zh: '鮮嫩雞柳',     product_name_en: 'Chicken Strips',          serving_size_g: 229, calories: 324, protein_g: 25, carbs_g: 39,   fat_g: 7.1,  sugar_g: 5,    sodium_mg: null, keywords: ['鮮嫩雞柳', '雞柳', 'chicken strips'] },
  { item_id: 'sub_roasted_chicken',    category: '6inch', product_name_zh: '香烤雞肉',     product_name_en: 'Roasted Chicken Breast',  serving_size_g: 232, calories: 331, protein_g: 23, carbs_g: 41,   fat_g: 8.0,  sugar_g: 6,    sodium_mg: null, keywords: ['香烤雞肉', '烤雞', 'roasted chicken'] },
  { item_id: 'sub_ham',                category: '6inch', product_name_zh: '火腿',         product_name_en: 'Ham',                     serving_size_g: 221, calories: 317, protein_g: 19, carbs_g: 44,   fat_g: 7.3,  sugar_g: 6,    sodium_mg: null, keywords: ['火腿', 'ham'] },
  { item_id: 'sub_meatballs',          category: '6inch', product_name_zh: '義大利牛肉丸', product_name_en: 'Italian Meatballs',       serving_size_g: 255, calories: 383, protein_g: 20, carbs_g: 47,   fat_g: 11.7, sugar_g: 8,    sodium_mg: null, keywords: ['牛肉丸', '義大利牛肉丸', 'meatball', 'meatballs'] },
  { item_id: 'sub_roast_beef',         category: '6inch', product_name_zh: '燒烤牛肉',     product_name_en: 'Roast Beef',              serving_size_g: 224, calories: 346, protein_g: 21, carbs_g: 40,   fat_g: 7.1,  sugar_g: 6,    sodium_mg: null, keywords: ['燒烤牛肉', '牛肉', 'roast beef'] },
  { item_id: 'sub_taco_beef',          category: '6inch', product_name_zh: '墨西哥辣牛',   product_name_en: 'Taco Beef',               serving_size_g: 211, calories: 320, protein_g: 17, carbs_g: 42,   fat_g: 8.9,  sugar_g: 6,    sodium_mg: null, keywords: ['墨西哥辣牛', '辣牛', 'taco', 'taco beef'] },
  { item_id: 'sub_italian_bmt',        category: '6inch', product_name_zh: '義大利經典',   product_name_en: 'Italian B.M.T.',          serving_size_g: 229, calories: 409, protein_g: 22, carbs_g: 42,   fat_g: 16.7, sugar_g: 5,    sodium_mg: null, keywords: ['義大利經典', 'BMT', 'B.M.T', 'italian bmt'] },
  { item_id: 'sub_club',               category: '6inch', product_name_zh: '百味俱樂部',   product_name_en: 'Subway Club',             serving_size_g: 226, calories: 325, protein_g: 21, carbs_g: 41,   fat_g: 7.1,  sugar_g: 6,    sodium_mg: null, keywords: ['百味俱樂部', 'club', 'subway club'] },
  { item_id: 'sub_melt',               category: '6inch', product_name_zh: '哈燒起司總匯', product_name_en: 'Subway Melt',             serving_size_g: 211, calories: 321, protein_g: 18, carbs_g: 42,   fat_g: 8.6,  sugar_g: 5,    sodium_mg: null, keywords: ['哈燒起司總匯', '起司總匯', 'melt', 'subway melt'] },
  { item_id: 'sub_tuna',               category: '6inch', product_name_zh: '鮪魚',         product_name_en: 'Tuna',                    serving_size_g: 239, calories: 507, protein_g: 22, carbs_g: 39,   fat_g: 29.1, sugar_g: 5,    sodium_mg: null, keywords: ['鮪魚', 'tuna'] },
  { item_id: 'sub_egg_mayo',           category: '6inch', product_name_zh: '蛋沙拉',       product_name_en: 'Egg Mayo',                serving_size_g: 225, calories: 421, protein_g: 17, carbs_g: 41,   fat_g: 20.7, sugar_g: 6,    sodium_mg: null, keywords: ['蛋沙拉', '蛋', 'egg mayo', 'egg salad'] },
  { item_id: 'sub_veggie',             category: '6inch', product_name_zh: '素食蔬菜',     product_name_en: 'Veggie Delight',          serving_size_g: 165, calories: 250, protein_g: 10, carbs_g: 39,   fat_g: 5.7,  sugar_g: 5,    sodium_mg: null, keywords: ['素食蔬菜', '素食', '蔬菜', 'veggie', 'veggie delight'] },
  { item_id: 'sub_diced_beef',         category: '6inch', product_name_zh: '厚切嫩牛',     product_name_en: 'Diced Beef',              serving_size_g: 236, calories: 366, protein_g: 26, carbs_g: 40,   fat_g: 10.6, sugar_g: 6,    sodium_mg: null, keywords: ['厚切嫩牛', '嫩牛', 'diced beef'] },
  { item_id: 'sub_falafel',            category: '6inch', product_name_zh: '鷹嘴豆泥餅',   product_name_en: 'Falafel',                 serving_size_g: 240, calories: 425, protein_g: 16, carbs_g: 58,   fat_g: 13.2, sugar_g: 9,    sodium_mg: null, keywords: ['鷹嘴豆', '鷹嘴豆泥餅', 'falafel'] },
  { item_id: 'sub_mala_beef',          category: '6inch', product_name_zh: '辣豆瓣嫩牛',   product_name_en: 'Mala Beef',               serving_size_g: 270, calories: 460, protein_g: 29, carbs_g: 49,   fat_g: 15.2, sugar_g: 11.2, sodium_mg: null, keywords: ['辣豆瓣嫩牛', '麻辣牛', '辣牛', 'mala beef'] },
  { item_id: 'sub_double_cheese_steak',category: '6inch', product_name_zh: '雙重起司厚牛', product_name_en: 'Double Cheese Steak',     serving_size_g: 205, calories: 347, protein_g: 25, carbs_g: 39,   fat_g: 10.1, sugar_g: 5.3,  sodium_mg: null, keywords: ['雙重起司厚牛', '起司牛', 'double cheese steak', 'cheese steak'] },
  { item_id: 'sub_pulled_pork',        category: '6inch', product_name_zh: '墨西哥手撕豬', product_name_en: 'Mexican Pulled Pork',     serving_size_g: 205, calories: 321, protein_g: 16, carbs_g: 39,   fat_g: 10.0, sugar_g: 6.5,  sodium_mg: null, keywords: ['手撕豬', '墨西哥手撕豬', 'pulled pork'] },

  // ── Salads ────────────────────────────────────────────────────────────────
  { item_id: 'sal_teriyaki',     category: 'salad', product_name_zh: '照燒雞肉沙拉', product_name_en: 'Chicken Teriyaki Salad', serving_size_g: 273, calories: 195, protein_g: 21,  carbs_g: 14,  fat_g: 6.7,  sugar_g: 9.7, sodium_mg: null, keywords: ['照燒雞肉沙拉', '照燒沙拉'] },
  { item_id: 'sal_chicken',      category: 'salad', product_name_zh: '鮮嫩雞柳沙拉', product_name_en: 'Chicken Strips Salad',  serving_size_g: 245, calories: 158, protein_g: 19,  carbs_g: 6.8, fat_g: 6.0,  sugar_g: 4.0, sodium_mg: null, keywords: ['雞柳沙拉', 'chicken salad'] },
  { item_id: 'sal_diced_beef',   category: 'salad', product_name_zh: '厚切嫩牛沙拉', product_name_en: 'Diced Beef Salad',      serving_size_g: 245, calories: 161, protein_g: 18,  carbs_g: 7.1, fat_g: 7.0,  sugar_g: 4.2, sodium_mg: null, keywords: ['嫩牛沙拉', '牛肉沙拉'] },
  { item_id: 'sal_taco_beef',    category: 'salad', product_name_zh: '墨西哥辣牛沙拉',product_name_en: 'Taco Beef Salad',       serving_size_g: 227, calories: 182, protein_g: 16,  carbs_g: 7.7, fat_g: 10.0, sugar_g: 4.8, sodium_mg: null, keywords: ['辣牛沙拉', 'taco salad'] },
  { item_id: 'sal_ham',          category: 'salad', product_name_zh: '火腿沙拉',     product_name_en: 'Ham Salad',             serving_size_g: 241, calories: 143, protein_g: 13,  carbs_g: 7.8, fat_g: 6.9,  sugar_g: 4.5, sodium_mg: null, keywords: ['火腿沙拉', 'ham salad'] },
  { item_id: 'sal_tuna',         category: 'salad', product_name_zh: '鮪魚沙拉',     product_name_en: 'Tuna Salad',            serving_size_g: 255, calories: 336, protein_g: 17,  carbs_g: 6.1, fat_g: 28.0, sugar_g: 3.8, sodium_mg: null, keywords: ['鮪魚沙拉', 'tuna salad'] },
  { item_id: 'sal_egg_mayo',     category: 'salad', product_name_zh: '蛋沙拉',       product_name_en: 'Egg Mayo Salad',        serving_size_g: 241, calories: 257, protein_g: 11,  carbs_g: 8.3, fat_g: 20.0, sugar_g: 5.0, sodium_mg: null, keywords: ['蛋沙拉', 'egg salad'] },
  { item_id: 'sal_falafel',      category: 'salad', product_name_zh: '鷹嘴豆泥沙拉', product_name_en: 'Falafel Salad',         serving_size_g: 256, calories: 249, protein_g: 11,  carbs_g: 24,  fat_g: 11.0, sugar_g: 7.5, sodium_mg: null, keywords: ['鷹嘴豆沙拉', 'falafel salad'] },
  { item_id: 'sal_veggie',       category: 'salad', product_name_zh: '素食蔬菜沙拉', product_name_en: 'Veggie Delight Salad',  serving_size_g: 181, calories: 86,  protein_g: 4.7, carbs_g: 6.0, fat_g: 5.2,  sugar_g: 3.7, sodium_mg: null, keywords: ['蔬菜沙拉', 'veggie salad'] },

  // ── Breakfast ─────────────────────────────────────────────────────────────
  { item_id: 'bkf_egg_cheese',       category: 'breakfast', product_name_zh: '起司蛋',       product_name_en: 'Egg & Cheese',        serving_size_g: 125, calories: 276, protein_g: 15, carbs_g: 37, fat_g: 7.6,  sugar_g: 3, sodium_mg: null, keywords: ['起司蛋', 'egg cheese', '早餐'] },
  { item_id: 'bkf_ham_egg',          category: 'breakfast', product_name_zh: '火腿起司蛋',   product_name_en: 'Ham & Egg',           serving_size_g: 153, calories: 309, protein_g: 19, carbs_g: 39, fat_g: 8.4,  sugar_g: 4, sodium_mg: null, keywords: ['火腿起司蛋', 'ham egg', '火腿蛋'] },
  { item_id: 'bkf_steak_egg',        category: 'breakfast', product_name_zh: '厚切牛起司蛋', product_name_en: 'Steak Egg & Cheese',  serving_size_g: 160, calories: 341, protein_g: 20, carbs_g: 39, fat_g: 10.8, sugar_g: 3, sodium_mg: null, keywords: ['厚切牛起司蛋', '牛蛋', 'steak egg'] },
  { item_id: 'bkf_bacon_egg',        category: 'breakfast', product_name_zh: '培根起司蛋',   product_name_en: 'Bacon & Egg',         serving_size_g: 135, calories: 324, protein_g: 18, carbs_g: 37, fat_g: 11.2, sugar_g: 3, sodium_mg: null, keywords: ['培根起司蛋', '培根蛋', 'bacon egg'] },

  // ── Breads (6-inch) ───────────────────────────────────────────────────────
  { item_id: 'bread_white',     category: 'bread', product_name_zh: '白麵包',       product_name_en: 'White',            serving_size_g: 67,   calories: 195, protein_g: 7,   carbs_g: 35, fat_g: 2.5, sugar_g: 3,   sodium_mg: null, keywords: ['白麵包', 'white'] },
  { item_id: 'bread_wheat',     category: 'bread', product_name_zh: '小麥麵包',     product_name_en: 'Wheat',            serving_size_g: 69,   calories: 195, protein_g: 8,   carbs_g: 35, fat_g: 2.1, sugar_g: 3,   sodium_mg: null, keywords: ['小麥', '小麥麵包', 'wheat'] },
  { item_id: 'bread_honey_oat', category: 'bread', product_name_zh: '蜂蜜燕麥麵包', product_name_en: 'Honey Oat',        serving_size_g: 73,   calories: 210, protein_g: 8,   carbs_g: 38, fat_g: 2.3, sugar_g: 4,   sodium_mg: null, keywords: ['蜂蜜燕麥', '燕麥', 'honey oat'] },
  { item_id: 'bread_parmesan',  category: 'bread', product_name_zh: '巴馬乾酪麵包', product_name_en: 'Parmesan Oregano', serving_size_g: 70,   calories: 206, protein_g: 8,   carbs_g: 37, fat_g: 2.7, sugar_g: 3,   sodium_mg: null, keywords: ['巴馬乾酪', '帕馬森', 'parmesan', 'oregano'] },
  { item_id: 'bread_flatbread', category: 'bread', product_name_zh: '火焰烤餅',     product_name_en: 'Flatbread',        serving_size_g: 86.5, calories: 258, protein_g: 9.3, carbs_g: 44, fat_g: 4.8, sugar_g: 0.1, sodium_mg: null, keywords: ['火焰烤餅', '烤餅', 'flatbread'] },
  { item_id: 'bread_spinach',   category: 'bread', product_name_zh: '菠菜捲餅',     product_name_en: 'Spinach Wrap',     serving_size_g: 65,   calories: 196, protein_g: 5,   carbs_g: 32, fat_g: 5.4, sugar_g: 2,   sodium_mg: null, keywords: ['菠菜捲', '菠菜捲餅', 'spinach wrap'] },

  // ── Sauces (6-inch serving) ───────────────────────────────────────────────
  { item_id: 'sauce_chipotle',    category: 'sauce', product_name_zh: '墨西哥西南醬',       product_name_en: 'Chipotle Southwest',  serving_size_g: 14,   calories: 66,   protein_g: 0,   carbs_g: 1,   fat_g: 6.7, sugar_g: 1,   sodium_mg: null, keywords: ['墨西哥西南醬', '辣醬', 'chipotle'] },
  { item_id: 'sauce_mustard',     category: 'sauce', product_name_zh: '黃芥末',             product_name_en: 'Yellow Mustard',      serving_size_g: 14,   calories: 9,    protein_g: 1,   carbs_g: 1,   fat_g: 0.6, sugar_g: 0,   sodium_mg: null, keywords: ['黃芥末', '芥末', 'mustard'] },
  { item_id: 'sauce_marinara',    category: 'sauce', product_name_zh: '獨家秘方義大利番茄醬',product_name_en: 'Marinara',            serving_size_g: 14,   calories: 10,   protein_g: 0,   carbs_g: 2,   fat_g: 0.2, sugar_g: 1,   sodium_mg: null, keywords: ['義大利番茄醬', '番茄醬', 'marinara'] },
  { item_id: 'sauce_sweet_onion', category: 'sauce', product_name_zh: '甜蔥醬',             product_name_en: 'Sweet Onion',         serving_size_g: 18,   calories: 33,   protein_g: 0,   carbs_g: 8,   fat_g: 0.1, sugar_g: 7,   sodium_mg: null, keywords: ['甜蔥醬', '甜蔥', 'sweet onion'] },
  { item_id: 'sauce_honey_mustard',category:'sauce', product_name_zh: '蜂蜜芥末醬',         product_name_en: 'Honey Mustard',       serving_size_g: 14,   calories: 21,   protein_g: 0,   carbs_g: 5,   fat_g: 0.1, sugar_g: 4,   sodium_mg: null, keywords: ['蜂蜜芥末', 'honey mustard'] },
  { item_id: 'sauce_mayo',        category: 'sauce', product_name_zh: '美乃滋',             product_name_en: 'Mayonnaise',          serving_size_g: 14,   calories: 100,  protein_g: 0,   carbs_g: 0,   fat_g: 11,  sugar_g: 0,   sodium_mg: null, keywords: ['美乃滋', 'mayo', 'mayonnaise'] },
  { item_id: 'sauce_olive_oil',   category: 'sauce', product_name_zh: '橄欖油',             product_name_en: 'Olive Oil',           serving_size_g: 5,    calories: 44,   protein_g: 0,   carbs_g: 0,   fat_g: 4.9, sugar_g: 0,   sodium_mg: null, keywords: ['橄欖油', 'olive oil'] },
  { item_id: 'sauce_vinegar',     category: 'sauce', product_name_zh: '紅酒醋',             product_name_en: 'Red Wine Vinegar',    serving_size_g: 4,    calories: 0.3,  protein_g: 0,   carbs_g: 0,   fat_g: 0,   sugar_g: 0.1, sodium_mg: null, keywords: ['紅酒醋', '醋', 'vinegar'] },
  { item_id: 'sauce_italian',     category: 'sauce', product_name_zh: '義大利油醋醬',       product_name_en: 'Italian Dressing',    serving_size_g: 14,   calories: 14.8, protein_g: 0,   carbs_g: 3.6, fat_g: 0,   sugar_g: 3.3, sodium_mg: null, keywords: ['義大利油醋', 'italian dressing'] },
  { item_id: 'sauce_thousand',    category: 'sauce', product_name_zh: '千島醬',             product_name_en: 'Thousand Island',     serving_size_g: 14,   calories: 36.7, protein_g: 0.2, carbs_g: 3,   fat_g: 2.7, sugar_g: 2.4, sodium_mg: null, keywords: ['千島醬', '千島', 'thousand island'] },
  { item_id: 'sauce_ranch',       category: 'sauce', product_name_zh: '鄉村醬',             product_name_en: 'Ranch',               serving_size_g: 21.3, calories: 74,   protein_g: 0.1, carbs_g: 3.7, fat_g: 6.5, sugar_g: 2.4, sodium_mg: null, keywords: ['鄉村醬', 'ranch'] },
  { item_id: 'sauce_jalapeno',    category: 'sauce', product_name_zh: '墨西哥辣椒起司醬',   product_name_en: 'Jalapeno Cheese Sauce',serving_size_g: 14,  calories: 37,   protein_g: 0,   carbs_g: 2,   fat_g: 3.1, sugar_g: 1.1, sodium_mg: null, keywords: ['辣椒起司醬', 'jalapeno', '辣椒醬'] },

  // ── Sides / Extras ────────────────────────────────────────────────────────
  { item_id: 'side_chicken_wrap', category: 'side', product_name_zh: '嫩雞沙拉捲餅', product_name_en: 'Chicken Strip Wrap', serving_size_g: 191, calories: 398, protein_g: 26,  carbs_g: 34,   fat_g: 17.8, sugar_g: 3,   sodium_mg: null, keywords: ['嫩雞捲餅', '雞肉捲', 'wrap'] },
  { item_id: 'side_taco_wrap',    category: 'side', product_name_zh: '辣牛沙拉捲餅', product_name_en: 'Taco Beef Wrap',     serving_size_g: 173, calories: 394, protein_g: 18,  carbs_g: 37,   fat_g: 19.7, sugar_g: 4,   sodium_mg: null, keywords: ['辣牛捲餅', '辣牛捲', 'taco wrap'] },
  { item_id: 'side_falafel_wrap', category: 'side', product_name_zh: '鷹嘴豆泥捲餅', product_name_en: 'Falafel Wrap',       serving_size_g: 162, calories: 398, protein_g: 12,  carbs_g: 35,   fat_g: 23.8, sugar_g: 4,   sodium_mg: null, keywords: ['鷹嘴豆捲', 'falafel wrap'] },
  { item_id: 'side_blt_wrap',     category: 'side', product_name_zh: '美式B.L.T.捲餅',product_name_en: 'B.L.T. Wrap',       serving_size_g: 191, calories: 534, protein_g: 15,  carbs_g: 46,   fat_g: 31.4, sugar_g: 6,   sodium_mg: null, keywords: ['BLT', 'BLT捲', 'blt wrap'] },
  { item_id: 'side_hash_brown',   category: 'side', product_name_zh: '薯餅',         product_name_en: 'Hash Brown',         serving_size_g: 53,  calories: 115, protein_g: 1.4, carbs_g: 12,   fat_g: 6.7,  sugar_g: 0.4, sodium_mg: null, keywords: ['薯餅', 'hash brown'] },
  { item_id: 'side_soup',         category: 'side', product_name_zh: '蘑菇濃湯',     product_name_en: 'Mushroom Soup',      serving_size_g: 280, calories: 152, protein_g: 3.2, carbs_g: 12.3, fat_g: 9.8,  sugar_g: 5.3, sodium_mg: null, keywords: ['蘑菇湯', '濃湯', 'mushroom soup'] },

  // ── Cookies ───────────────────────────────────────────────────────────────
  { item_id: 'cookie_white_choc', category: 'cookie', product_name_zh: '白巧克力夏威夷豆', product_name_en: 'White Chocolate Macadamia Nut', serving_size_g: 45, calories: 217, protein_g: 2, carbs_g: 28, fat_g: 10.8, sugar_g: 18,   sodium_mg: null, keywords: ['白巧克力', '夏威夷豆', 'white chocolate'] },
  { item_id: 'cookie_choc_chip',  category: 'cookie', product_name_zh: '巧克力豆',         product_name_en: 'Chocolate Chip Cookie',         serving_size_g: 45, calories: 220, protein_g: 2, carbs_g: 30, fat_g: 10.4, sugar_g: 18,   sodium_mg: null, keywords: ['巧克力豆餅乾', 'chocolate chip'] },
  { item_id: 'cookie_dbl_choc',   category: 'cookie', product_name_zh: '濃巧克力',         product_name_en: 'Double Chocolate Chip Cookie',  serving_size_g: 45, calories: 200, protein_g: 2, carbs_g: 28, fat_g: 8.9,  sugar_g: 19,   sodium_mg: null, keywords: ['濃巧克力', 'double chocolate'] },
  { item_id: 'cookie_oatmeal',    category: 'cookie', product_name_zh: '葡萄燕麥',         product_name_en: 'Oatmeal Raisin Cookie',          serving_size_g: 45, calories: 187, protein_g: 2, carbs_g: 28, fat_g: 7.6,  sugar_g: 11,   sodium_mg: null, keywords: ['葡萄燕麥', 'oatmeal raisin'] },
  { item_id: 'cookie_cream',      category: 'cookie', product_name_zh: '奶油巧克力',       product_name_en: 'Cookie & Cream',                serving_size_g: 45, calories: 165, protein_g: 1.6,carbs_g: 20.2,fat_g: 8.7, sugar_g: 11.1, sodium_mg: null, keywords: ['奶油巧克力', 'cookie cream'] },
  { item_id: 'cookie_orange',     category: 'cookie', product_name_zh: '橙皮可可餅乾',     product_name_en: 'Orange Chocolate Cookie',       serving_size_g: 45, calories: 220, protein_g: 2, carbs_g: 28, fat_g: 11.1, sugar_g: 17.3, sodium_mg: null, keywords: ['橙皮可可', '橙皮', 'orange chocolate'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const SUBWAY_KEYWORDS = ['subway', '潛艇堡', '6吋', '六吋', 'sub sandwich', 'subw']

/**
 * Returns true if an AI candidate looks like a Subway order.
 * Checks brand field, name, and clues array.
 */
export function isSubwayContext(candidate) {
  const text = [
    candidate?.brand  || '',
    candidate?.name   || '',
    ...(candidate?.clues || []),
  ].join(' ').toLowerCase()
  return SUBWAY_KEYWORDS.some(kw => text.includes(kw))
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find top-N matching 6-inch sandwiches for a query string.
 * Searches product_name_zh, product_name_en, and keywords.
 */
export function matchSubwayItems(query = '', n = 3) {
  const q = query.toLowerCase().replace(/\s+/g, '')
  const sandwiches = SUBWAY_DB.filter(x => x.category === '6inch')

  const scored = sandwiches.map(item => {
    let score = 0
    const zh  = item.product_name_zh.toLowerCase()
    const en  = item.product_name_en.toLowerCase().replace(/\s+/g, '')
    const kws = (item.keywords || []).map(k => k.toLowerCase())

    if (q === zh || zh === q) score += 100
    if (q.includes(zh) || zh.includes(q)) score += 50
    if (q.includes(en) || en.includes(q)) score += 40
    for (const kw of kws) {
      const k = kw.replace(/\s+/g, '')
      if (q === k) score += 80
      else if (q.includes(k) || k.includes(q)) score += 25
    }
    return { item, score }
  })

  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(x => x.item)
}

// ─────────────────────────────────────────────────────────────────────────────
// NUTRITION CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BREAD_ID = 'bread_white'

/**
 * Calculate total nutrition for a configured Subway meal.
 * - sandwichId: item_id of the 6-inch sandwich (required)
 * - breadId: item_id of the bread (default: white)
 * - sauceIds: array of sauce item_ids to add
 * - sizeMult: 1 = 6-inch, 2 = 12-inch
 */
export function calcSubwayMeal({ sandwichId, breadId = DEFAULT_BREAD_ID, sauceIds = [], sizeMult = 1 }) {
  const sandwich = SUBWAY_DB.find(x => x.item_id === sandwichId)
  if (!sandwich) return null

  let cal  = sandwich.calories
  let pro  = sandwich.protein_g
  let carb = sandwich.carbs_g
  let fat  = sandwich.fat_g

  // Bread swap — 6-inch data already assumes white bread
  if (breadId !== DEFAULT_BREAD_ID) {
    const defBread = SUBWAY_DB.find(x => x.item_id === DEFAULT_BREAD_ID)
    const selBread = SUBWAY_DB.find(x => x.item_id === breadId)
    if (defBread && selBread) {
      cal  += selBread.calories  - defBread.calories
      pro  += selBread.protein_g - defBread.protein_g
      carb += selBread.carbs_g   - defBread.carbs_g
      fat  += selBread.fat_g     - defBread.fat_g
    }
  }

  // Add sauce(s)
  for (const id of sauceIds) {
    const sauce = SUBWAY_DB.find(x => x.item_id === id)
    if (sauce) {
      cal  += sauce.calories
      pro  += sauce.protein_g
      carb += sauce.carbs_g
      fat  += sauce.fat_g
    }
  }

  return {
    calories:  Math.round(cal  * sizeMult),
    protein_g: +((pro  * sizeMult).toFixed(1)),
    carbs_g:   +((carb * sizeMult).toFixed(1)),
    fat_g:     +((fat  * sizeMult).toFixed(1)),
  }
}

// Convenience: get all items of a category
export const subwayByCategory = (cat) => SUBWAY_DB.filter(x => x.category === cat)
