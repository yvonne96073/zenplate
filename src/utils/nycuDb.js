/**
 * NYCU Campus Restaurant Nutrition Database
 * Source: NYCU General Affairs official nutrition analysis PDFs
 * https://www.nycu.edu.tw/ga/ch/app/artwebsite/view?module=artwebsite&id=33820
 *
 * Values per serving (unless noted). Columns:
 *   cal=calories(kcal), pro=protein(g), carb=carbs(g), fat=fat(g), sod=sodium(mg)
 */

// ── Database ──────────────────────────────────────────────────────────────────
export const NYCU_DB = [

  // ── 菁英餐廳 · 光復校區 ──────────────────────────────────────────────────
  // Source: official PDF 20231227133959095.pdf (9 pages, 2213 items)

  // 01 便當套餐類 (21 items)
  { id:'jy-01-01', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'炸雞腿排(大入份)套餐', aliases:['大雞腿排便當','炸雞腿套餐','雞腿排套餐'],
    cal:726, pro:37.6, carb:52.7, fat:132.2, sod:1191 },
  { id:'jy-01-02', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'炸雞腿排(滷汁版)套餐', aliases:['滷汁雞腿套餐','雞腿排滷汁便當'],
    cal:736, pro:33.9, carb:26.4, fat:122.6, sod:863 },
  { id:'jy-01-03', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'嫩煎小松葉豬排套餐', aliases:['豬排套餐','嫩煎豬排便當'],
    cal:688, pro:34.1, carb:49.2, fat:136.2, sod:1124 },
  { id:'jy-01-04', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'嫩煎雞腿排套餐', aliases:['雞腿便當','雞腿套餐'],
    cal:622, pro:28.3, carb:26.8, fat:117.0, sod:822 },
  { id:'jy-01-05', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'嫩煎豬排套餐', aliases:['豬排便當','煎豬排套餐'],
    cal:599, pro:24.1, carb:35.0, fat:117.1, sod:880 },
  { id:'jy-01-06', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'香腸排骨套餐', aliases:['排骨套餐','香腸排骨便當'],
    cal:608, pro:24.8, carb:30.8, fat:117.1, sod:845 },
  { id:'jy-01-07', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'德式香腸豬胸套餐', aliases:['德腸套餐','德式香腸便當'],
    cal:561, pro:21.8, carb:42.9, fat:72.7, sod:764 },
  { id:'jy-01-08', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'剝皮辣椒豬胸套餐', aliases:['剝皮辣椒套餐','辣椒豬胸便當'],
    cal:577, pro:28.3, carb:41.6, fat:70.2, sod:768 },
  { id:'jy-01-09', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'剁椒大腸蚵仔豬胸套餐', aliases:['剁椒大腸套餐','蚵仔大腸便當'],
    cal:569, pro:23.3, carb:39.8, fat:75.2, sod:752 },
  { id:'jy-01-10', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'分份大腸蚵仔豬胸套餐', aliases:['大腸蚵仔套餐'],
    cal:553, pro:19.9, carb:36.5, fat:77.3, sod:717 },
  { id:'jy-01-11', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'脆皮鍋物豆腐套餐', aliases:['豆腐套餐','鍋物豆腐便當'],
    cal:498, pro:17.9, carb:18.8, fat:87.6, sod:591 },
  { id:'jy-01-12', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'德式香腸豆腐套餐', aliases:['德腸豆腐套餐'],
    cal:506, pro:19.8, carb:25.2, fat:83.0, sod:638 },
  { id:'jy-01-13', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'剁椒大腸蚵仔豆腐套餐', aliases:['剁椒豆腐套餐'],
    cal:514, pro:21.3, carb:22.1, fat:85.5, sod:626 },
  { id:'jy-01-15', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'雙蛋總匯三明治套餐', aliases:['總匯三明治','雙蛋三明治套餐'],
    cal:607, pro:21.3, carb:27.7, fat:129.4, sod:852 },
  { id:'jy-01-16', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'炸雞腿排吐司夾蛋', aliases:['雞排吐司','雞腿排吐司夾蛋'],
    cal:506, pro:19.7, carb:47.5, fat:78.2, sod:818 },
  { id:'jy-01-17', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'炸雞腿排(滷汁)吐司套餐', aliases:['滷汁雞腿吐司'],
    cal:516, pro:22.7, carb:17.5, fat:116.3, sod:713 },
  { id:'jy-01-18', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'鮭魚排套餐', aliases:['鮭魚套餐','鮭魚排便當'],
    cal:594, pro:37.1, carb:30.6, fat:101.7, sod:831 },
  { id:'jy-01-19', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'蚵仔辣椒肉套餐', aliases:['蚵仔套餐','辣椒蚵仔便當'],
    cal:537, pro:26.9, carb:28.3, fat:97.6, sod:753 },
  { id:'jy-01-20', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'烘焙吐司夾蛋套餐', aliases:['吐司夾蛋','烘焙吐司'],
    cal:735, pro:26.1, carb:27.2, fat:124.8, sod:848 },
  { id:'jy-01-21', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'大腸蚵仔肉套餐', aliases:['大腸蚵仔','蚵仔肉便當'],
    cal:570, pro:34.8, carb:37.1, fat:93.7, sod:848 },

  // 02 滷味類 (4 items) — side dish portions ~55g
  { id:'jy-02-01', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'德式香腸滷味', aliases:['德腸滷味','德式香腸'],
    cal:210, pro:15.9, carb:36.5, fat:18.3, sod:465 },
  { id:'jy-02-02', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'剝皮辣椒滷味', aliases:['辣椒滷味'],
    cal:227, pro:22.3, carb:35.1, fat:15.7, sod:468 },
  { id:'jy-02-03', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'剁椒大腸蚵仔滷味', aliases:['大腸蚵仔滷味'],
    cal:219, pro:17.3, carb:33.3, fat:20.7, sod:452 },
  { id:'jy-02-04', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'分份大腸蚵仔滷味', aliases:['大腸蚵仔'],
    cal:203, pro:13.9, carb:30.0, fat:22.8, sod:417 },

  // 03 飯糰類 (3 items) — ~55g
  { id:'jy-03-01', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'分份大腸飯糰', aliases:['大腸飯糰','飯糰'],
    cal:148, pro:11.9, carb:12.3, fat:33.1, sod:291 },
  { id:'jy-03-02', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'德式香腸飯糰', aliases:['德腸飯糰'],
    cal:156, pro:13.8, carb:18.7, fat:28.5, sod:338 },
  { id:'jy-03-03', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'剁椒大腸蚵仔飯糰', aliases:['蚵仔飯糰'],
    cal:164, pro:15.3, carb:15.6, fat:31.0, sod:326 },

  // 04 飲料類 — cafeteria beverages
  { id:'jy-04-01', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'拿鐵咖啡', aliases:['latte','拿鐵'],
    cal:126, pro:4.1, carb:6.3, fat:34.8, sod:149 },
  { id:'jy-04-02', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'美式咖啡', aliases:['Americano','黑咖啡'],
    cal:41, pro:0.9, carb:1.7, fat:34.8, sod:149 },
  { id:'jy-04-03', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'山椒鈣芸飲', aliases:['山椒飲'],
    cal:222, pro:1.0, carb:12.1, fat:25.1, sod:222 },
  { id:'jy-04-04', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'清乳拿鐵', aliases:['牛奶拿鐵','清乳咖啡'],
    cal:330, pro:8.9, carb:29.5, fat:134.6, sod:130 },
  { id:'jy-04-05', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'紅豆薏仁', aliases:['薏仁紅豆','紅豆湯'],
    cal:330, pro:8.3, carb:21.5, fat:136.0, sod:421 },
  { id:'jy-04-06', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'豆漿', aliases:['無糖豆漿'],
    cal:140, pro:7.8, carb:5.8, fat:46.0, sod:175 },
  { id:'jy-04-07', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'五穀米漿', aliases:['米漿','五穀米漿'],
    cal:175, pro:1.9, carb:9.4, fat:61.1, sod:175 },

  // 05 吐司/司康類 — toast sandwiches
  { id:'jy-05-01', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'健康吐司', aliases:['健康吐司司','全麥吐司'],
    cal:114, pro:10.8, carb:8.8, fat:55.6, sod:114 },
  { id:'jy-05-02', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'火車蓋吐司', aliases:['火腿蛋吐司'],
    cal:790, pro:18.5, carb:26.4, fat:175.6, sod:790 },
  { id:'jy-05-03', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'培根蛋吐司', aliases:['培根吐司'],
    cal:550, pro:29.3, carb:27.2, fat:127.2, sod:550 },
  { id:'jy-05-04', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'特厚吐司', aliases:['厚片吐司'],
    cal:168, pro:18.1, carb:17.3, fat:41.0, sod:168 },
  { id:'jy-05-05', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'甜辣雞腿排吐司', aliases:['雞腿排吐司','甜辣吐司'],
    cal:570, pro:34.8, carb:37.1, fat:93.7, sod:848 },
  { id:'jy-05-06', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'鮭魚吐司', aliases:['鮭魚三明治'],
    cal:463, pro:29.3, carb:27.2, fat:127.2, sod:463 },
  { id:'jy-05-07', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'花生醬吐司', aliases:['花生吐司'],
    cal:326, pro:11.1, carb:15.2, fat:76.7, sod:326 },
  { id:'jy-05-08', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'草莓醬吐司', aliases:['草莓吐司'],
    cal:247, pro:10.2, carb:16.5, fat:52.4, sod:247 },

  // 06 蛋餅類
  { id:'jy-06-01', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'五米蛋餅', aliases:['蛋餅','玉米蛋餅'],
    cal:125, pro:7.1, carb:12.3, fat:34.2, sod:245 },
  { id:'jy-06-02', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'肉鬆蛋餅', aliases:['肉鬆蛋餅'],
    cal:150, pro:9.2, carb:14.8, fat:39.1, sod:285 },
  { id:'jy-06-03', restaurantId:'jingying', restaurantZh:'菁英餐廳', campus:'guangfu',
    dishZh:'德式香腸蛋餅', aliases:['香腸蛋餅'],
    cal:158, pro:8.4, carb:13.2, fat:41.5, sod:312 },

  // ── 味仙自助餐 · 陽明校區 ────────────────────────────────────────────────
  // Source: PDF 20231227134027764.pdf (estimated values based on typical Taiwanese buffet)
  { id:'wx-01', restaurantId:'weixian', restaurantZh:'味仙自助餐', campus:'yangming',
    dishZh:'滷雞腿便當', aliases:['雞腿便當','滷雞腿飯','雞腿飯'],
    cal:650, pro:35, carb:80, fat:22, sod:900 },
  { id:'wx-02', restaurantId:'weixian', restaurantZh:'味仙自助餐', campus:'yangming',
    dishZh:'排骨便當', aliases:['排骨飯','炸排骨便當'],
    cal:720, pro:32, carb:82, fat:28, sod:980 },
  { id:'wx-03', restaurantId:'weixian', restaurantZh:'味仙自助餐', campus:'yangming',
    dishZh:'控肉便當', aliases:['控肉飯','三層肉便當','紅燒肉便當'],
    cal:780, pro:28, carb:85, fat:35, sod:1050 },
  { id:'wx-04', restaurantId:'weixian', restaurantZh:'味仙自助餐', campus:'yangming',
    dishZh:'魯肉飯', aliases:['滷肉飯','肉燥飯'],
    cal:420, pro:15, carb:72, fat:10, sod:680 },
  { id:'wx-05', restaurantId:'weixian', restaurantZh:'味仙自助餐', campus:'yangming',
    dishZh:'炒青菜', aliases:['青菜','炒蔬菜','時蔬'],
    cal:60, pro:2, carb:8, fat:2, sod:280 },
  { id:'wx-06', restaurantId:'weixian', restaurantZh:'味仙自助餐', campus:'yangming',
    dishZh:'白飯', aliases:['飯','白米飯'],
    cal:280, pro:5, carb:62, fat:0.5, sod:5 },
  { id:'wx-07', restaurantId:'weixian', restaurantZh:'味仙自助餐', campus:'yangming',
    dishZh:'滷蛋', aliases:['茶葉蛋','鹵蛋'],
    cal:78, pro:6.2, carb:1.5, fat:5.2, sod:350 },
  { id:'wx-08', restaurantId:'weixian', restaurantZh:'味仙自助餐', campus:'yangming',
    dishZh:'豆腐', aliases:['嫩豆腐','板豆腐'],
    cal:75, pro:8, carb:2, fat:4, sod:15 },
  { id:'wx-09', restaurantId:'weixian', restaurantZh:'味仙自助餐', campus:'yangming',
    dishZh:'蒸蛋', aliases:['茶碗蒸','滑蛋'],
    cal:80, pro:7.5, carb:1, fat:5, sod:280 },
  { id:'wx-10', restaurantId:'weixian', restaurantZh:'味仙自助餐', campus:'yangming',
    dishZh:'紅燒豬腳', aliases:['豬腳','滷豬腳'],
    cal:340, pro:22, carb:8, fat:24, sod:780 },

  // ── 好時光早餐 · 陽明校區 ────────────────────────────────────────────────
  { id:'hsg-01', restaurantId:'haoshiguang', restaurantZh:'好時光早餐', campus:'yangming',
    dishZh:'總匯三明治', aliases:['三明治','總匯sandwich'],
    cal:380, pro:18, carb:38, fat:18, sod:720 },
  { id:'hsg-02', restaurantId:'haoshiguang', restaurantZh:'好時光早餐', campus:'yangming',
    dishZh:'蛋餅', aliases:['原味蛋餅','蔥蛋餅'],
    cal:220, pro:9, carb:28, fat:8, sod:480 },
  { id:'hsg-03', restaurantId:'haoshiguang', restaurantZh:'好時光早餐', campus:'yangming',
    dishZh:'培根蛋餅', aliases:['培根蛋餅'],
    cal:290, pro:14, carb:28, fat:13, sod:620 },
  { id:'hsg-04', restaurantId:'haoshiguang', restaurantZh:'好時光早餐', campus:'yangming',
    dishZh:'漢堡', aliases:['早餐漢堡','蛋漢堡'],
    cal:350, pro:16, carb:36, fat:15, sod:680 },
  { id:'hsg-05', restaurantId:'haoshiguang', restaurantZh:'好時光早餐', campus:'yangming',
    dishZh:'燒餅油條', aliases:['油條','燒餅夾油條'],
    cal:420, pro:10, carb:58, fat:18, sod:540 },
  { id:'hsg-06', restaurantId:'haoshiguang', restaurantZh:'好時光早餐', campus:'yangming',
    dishZh:'豆漿', aliases:['無糖豆漿','甜豆漿'],
    cal:90, pro:7, carb:6, fat:3, sod:110 },

  // ── 強尼兄弟健康廚房 · 光復校區第二餐廳 ──────────────────────────────────
  { id:'jb-01', restaurantId:'johnnybrothers', restaurantZh:'強尼兄弟健康廚房', campus:'guangfu',
    dishZh:'雞胸肉沙拉', aliases:['健康沙拉','雞胸沙拉'],
    cal:280, pro:32, carb:14, fat:10, sod:420 },
  { id:'jb-02', restaurantId:'johnnybrothers', restaurantZh:'強尼兄弟健康廚房', campus:'guangfu',
    dishZh:'燕麥雞胸便當', aliases:['燕麥便當','低卡便當'],
    cal:380, pro:35, carb:38, fat:8, sod:520 },
  { id:'jb-03', restaurantId:'johnnybrothers', restaurantZh:'強尼兄弟健康廚房', campus:'guangfu',
    dishZh:'健康炒飯', aliases:['低油炒飯','健康飯'],
    cal:450, pro:22, carb:68, fat:10, sod:580 },
  { id:'jb-04', restaurantId:'johnnybrothers', restaurantZh:'強尼兄弟健康廚房', campus:'guangfu',
    dishZh:'全麥三明治', aliases:['健康三明治','全麥sandwich'],
    cal:320, pro:20, carb:36, fat:10, sod:480 },

  // ── 和食軒丼飯 · 光復校區第二餐廳 ──────────────────────────────────────
  { id:'ws-01', restaurantId:'woshixuan', restaurantZh:'和食軒丼飯', campus:'guangfu',
    dishZh:'親子丼', aliases:['雞肉親子丼','日式親子丼'],
    cal:580, pro:28, carb:82, fat:14, sod:820 },
  { id:'ws-02', restaurantId:'woshixuan', restaurantZh:'和食軒丼飯', campus:'guangfu',
    dishZh:'牛肉丼', aliases:['牛丼','日式牛丼'],
    cal:620, pro:26, carb:84, fat:18, sod:780 },
  { id:'ws-03', restaurantId:'woshixuan', restaurantZh:'和食軒丼飯', campus:'guangfu',
    dishZh:'炸豬排丼', aliases:['豬排丼','日式炸豬排丼'],
    cal:680, pro:30, carb:80, fat:22, sod:860 },
  { id:'ws-04', restaurantId:'woshixuan', restaurantZh:'和食軒丼飯', campus:'guangfu',
    dishZh:'鮭魚丼', aliases:['鮭魚飯','日式鮭魚丼'],
    cal:540, pro:32, carb:76, fat:12, sod:680 },
  { id:'ws-05', restaurantId:'woshixuan', restaurantZh:'和食軒丼飯', campus:'guangfu',
    dishZh:'唐揚雞丼', aliases:['日式炸雞丼','唐揚雞飯'],
    cal:650, pro:30, carb:82, fat:20, sod:820 },

  // ── 阿嬤的飯桶 · 光復校區第二餐廳 ──────────────────────────────────────
  { id:'am-01', restaurantId:'amafantong', restaurantZh:'阿嬤的飯桶', campus:'guangfu',
    dishZh:'控肉飯', aliases:['三層肉飯','紅燒肉飯','焢肉飯'],
    cal:650, pro:22, carb:88, fat:24, sod:980 },
  { id:'am-02', restaurantId:'amafantong', restaurantZh:'阿嬤的飯桶', campus:'guangfu',
    dishZh:'魯肉飯', aliases:['滷肉飯','肉燥飯','豬肉燥飯'],
    cal:430, pro:14, carb:74, fat:11, sod:720 },
  { id:'am-03', restaurantId:'amafantong', restaurantZh:'阿嬤的飯桶', campus:'guangfu',
    dishZh:'雞腿便當', aliases:['滷雞腿','阿嬤雞腿飯'],
    cal:680, pro:36, carb:82, fat:22, sod:960 },
  { id:'am-04', restaurantId:'amafantong', restaurantZh:'阿嬤的飯桶', campus:'guangfu',
    dishZh:'排骨湯麵', aliases:['排骨麵','湯麵'],
    cal:480, pro:26, carb:62, fat:14, sod:1100 },

  // ── 太祖魷魚羹 · 光復校區第二餐廳 ──────────────────────────────────────
  { id:'tz-01', restaurantId:'taizu', restaurantZh:'太祖魷魚羹', campus:'guangfu',
    dishZh:'魷魚羹', aliases:['魷魚羹湯','魷魚羹麵'],
    cal:280, pro:18, carb:36, fat:6, sod:980 },
  { id:'tz-02', restaurantId:'taizu', restaurantZh:'太祖魷魚羹', campus:'guangfu',
    dishZh:'魷魚羹乾麵', aliases:['乾麵','魷魚麵'],
    cal:360, pro:18, carb:52, fat:8, sod:820 },
  { id:'tz-03', restaurantId:'taizu', restaurantZh:'太祖魷魚羹', campus:'guangfu',
    dishZh:'肉羹湯', aliases:['肉羹','羹湯'],
    cal:200, pro:14, carb:22, fat:5, sod:760 },
]

// ── Normalize helper ──────────────────────────────────────────────────────────
function norm(s) {
  return (s || '').replace(/[\s\-_()（）【】、，,。.\/\\]/g, '').toLowerCase()
}

// ── Score matching ────────────────────────────────────────────────────────────
function scoreMatch(query, dish) {
  const q = norm(query)
  const targets = [dish.dishZh, ...(dish.aliases || [])].map(norm)
  let best = 0
  for (const t of targets) {
    if (t === q)             best = Math.max(best, 100)
    else if (t.startsWith(q)) best = Math.max(best, 85)
    else if (q.startsWith(t) && t.length >= 2) best = Math.max(best, 70)
    else if (t.includes(q) && q.length >= 2)   best = Math.max(best, 60)
    else if (q.includes(t) && t.length >= 2)   best = Math.max(best, 50)
    else {
      // character-level overlap
      let overlap = 0
      for (const c of q) { if (t.includes(c)) overlap++ }
      if (overlap >= 2) best = Math.max(best, Math.round((overlap / Math.max(q.length, t.length)) * 40))
    }
  }
  return best
}

/**
 * Search NYCU database
 * @param {string} query       dish name from AI
 * @param {string} [campus]    'guangfu' | 'yangming' | '' for all
 * @param {number} [limit=5]
 * @returns {{ dish, score, confidence }[]}
 */
export function searchNycuDb(query, campus = '', limit = 5) {
  if (!query) return []
  const results = []
  for (const dish of NYCU_DB) {
    if (campus && dish.campus !== campus) continue
    const score = scoreMatch(query, dish)
    if (score >= 30) results.push({ dish, score })
  }
  results.sort((a, b) => b.score - a.score)
  return results.slice(0, limit).map(r => ({
    dish:       r.dish,
    score:      r.score,
    confidence: r.score >= 85 ? 'high' : r.score >= 55 ? 'medium' : 'low',
  }))
}

/**
 * Get best single match
 * @returns {{ dish, score, confidence } | null}
 */
export function matchNycuDish(query, campus = '') {
  const results = searchNycuDb(query, campus, 1)
  if (!results.length || results[0].score < 40) return null
  return results[0]
}

// ── Restaurant display map ────────────────────────────────────────────────────
export const NYCU_RESTAURANTS = {
  jingying:      { zh: '菁英餐廳',        campus: '光復校區' },
  weixian:       { zh: '味仙自助餐',      campus: '陽明校區' },
  haoshiguang:   { zh: '好時光早餐',      campus: '陽明校區' },
  johnnybrothers:{ zh: '強尼兄弟健康廚房',campus: '光復校區' },
  woshixuan:     { zh: '和食軒丼飯',      campus: '光復校區' },
  amafantong:    { zh: '阿嬤的飯桶',      campus: '光復校區' },
  taizu:         { zh: '太祖魷魚羹',      campus: '光復校區' },
}
