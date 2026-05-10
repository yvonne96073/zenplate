// McDonald's Taiwan 官方營養資料
// 來源：https://www.mcdonalds.com/tw/zh-tw/sustainability/good-food/nutrition-calculator.html
// 抓取方式：/dnaapp/itemDetails API（2026-05）

export const MCD_ITEMS = [
  // ── 早餐 ──────────────────────────────────────────────
  { id:'200028', cat:'早餐', name:'豬肉滿福堡加蛋',       cal:389,  pro:22,  fat:20,  carb:30,  fib:2.0,  sod:725,  kw:['豬肉滿福堡加蛋','滿福堡加蛋','豬肉滿福堡','滿福堡'] },
  { id:'200027', cat:'早餐', name:'豬肉滿福堡',           cal:328,  pro:17,  fat:16,  carb:30,  fib:2.0,  sod:668,  kw:['豬肉滿福堡','滿福堡'] },
  { id:'200032', cat:'早餐', name:'無敵豬肉滿福堡加蛋',   cal:513,  pro:30,  fat:30,  carb:31,  fib:2.3,  sod:917,  kw:['無敵豬肉滿福堡加蛋','無敵滿福堡','無敵'] },
  { id:'200026', cat:'早餐', name:'滿福堡',               cal:286,  pro:17,  fat:11,  carb:30,  fib:1.7,  sod:690,  kw:['滿福堡'] },
  { id:'200031', cat:'早餐', name:'青蔬滿福堡',           cal:288,  pro:17,  fat:11,  carb:30,  fib:1.8,  sod:691,  kw:['青蔬滿福堡','青蔬'] },
  { id:'200041', cat:'早餐', name:'豬肉蛋堡',             cal:410,  pro:21,  fat:23,  carb:31,  fib:2.1,  sod:720,  kw:['豬肉蛋堡','蛋堡'] },
  { id:'200039', cat:'早餐', name:'火腿蛋堡',             cal:302,  pro:15,  fat:13,  carb:31,  fib:1.3,  sod:644,  kw:['火腿蛋堡','火腿'] },
  { id:'200038', cat:'早餐', name:'吉事蛋堡',             cal:281,  pro:12,  fat:12,  carb:30,  fib:1.3,  sod:487,  kw:['吉事蛋堡','吉事'] },
  { id:'200285', cat:'早餐', name:'蕈菇起司嫩蛋焙果堡',   cal:478,  pro:22,  fat:19,  carb:56,  fib:3.6,  sod:836,  kw:['蕈菇嫩蛋焙果堡','焙果堡','蕈菇焙果','嫩蛋焙果'] },
  { id:'200265', cat:'早餐', name:'番茄嫩蛋焙果堡',       cal:452,  pro:20,  fat:17,  carb:53,  fib:2.5,  sod:684,  kw:['番茄嫩蛋焙果堡','番茄焙果','焙果堡'] },
  { id:'200269', cat:'早餐', name:'現烤焙果',             cal:249,  pro:7.9, fat:1.2, carb:52,  fib:1.7,  sod:402,  kw:['現烤焙果','焙果'] },
  { id:'200034', cat:'早餐', name:'鷄塊鬆餅大早餐',       cal:695,  pro:33,  fat:34,  carb:64,  fib:3.9,  sod:1352, kw:['鷄塊鬆餅大早餐','雞塊鬆餅','大早餐'] },
  { id:'200035', cat:'早餐', name:'豬肉鬆餅',             cal:439,  pro:16,  fat:18,  carb:53,  fib:3.2,  sod:933,  kw:['豬肉鬆餅','鬆餅'] },
  { id:'200036', cat:'早餐', name:'鬆餅(3片)',             cal:319,  pro:8,   fat:8.6, carb:53,  fib:2.8,  sod:711,  kw:['鬆餅'] },
  { id:'200050', cat:'早餐', name:'原味可頌',             cal:256,  pro:4.8, fat:13,  carb:30,  fib:0.3,  sod:273,  kw:['原味可頌','可頌'] },
  { id:'200051', cat:'早餐', name:'巧克力榛果風味可頌',   cal:264,  pro:4.3, fat:14,  carb:31,  fib:0.7,  sod:216,  kw:['巧克力榛果可頌','榛果可頌','巧克力可頌'] },
  { id:'200053', cat:'早餐', name:'肉桂捲',               cal:350,  pro:5.5, fat:19,  carb:41,  fib:1.6,  sod:329,  kw:['肉桂捲'] },

  // ── 超值全餐 / 主餐 ────────────────────────────────────
  { id:'200008', cat:'超值全餐', name:'大麥克',           cal:503,  pro:26,  fat:25,  carb:43,  fib:3.1,  sod:1093, kw:['大麥克','麥克'] },
  { id:'200007', cat:'超值全餐', name:'雙層牛肉吉事堡',   cal:475,  pro:26,  fat:26,  carb:35,  fib:2.9,  sod:855,  kw:['雙層牛肉吉事堡','雙層吉事','牛肉吉事'] },
  { id:'200302', cat:'超值全餐', name:'四盎司牛肉堡',     cal:541,  pro:32,  fat:28,  carb:40,  fib:3.0,  sod:1002, kw:['四盎司牛肉堡','四盎司','牛肉堡'] },
  { id:'200303', cat:'超值全餐', name:'雙層四盎司牛肉堡', cal:780,  pro:52,  fat:46,  carb:40,  fib:3.0,  sod:1060, kw:['雙層四盎司牛肉堡','雙層四盎司'] },
  { id:'200019', cat:'超值全餐', name:'麥香鷄',           cal:393,  pro:14,  fat:17,  carb:45,  fib:2.8,  sod:797,  kw:['麥香鷄','麥香雞'] },
  { id:'200297', cat:'超值全餐', name:'雙層麥香鷄',       cal:529,  pro:22,  fat:25,  carb:54,  fib:3.7,  sod:1126, kw:['雙層麥香鷄','雙層麥香雞'] },
  { id:'200158', cat:'超值全餐', name:'嫩煎鷄腿堡',       cal:391,  pro:25,  fat:13,  carb:43,  fib:3.0,  sod:738,  kw:['嫩煎鷄腿堡','嫩煎雞腿堡','嫩煎鷄腿','嫩煎'] },
  { id:'200017', cat:'超值全餐', name:'勁辣鷄腿堡',       cal:537,  pro:23,  fat:28,  carb:49,  fib:2.4,  sod:977,  kw:['勁辣鷄腿堡','勁辣雞腿堡','勁辣'] },
  { id:'200012', cat:'超值全餐', name:'麥香魚',           cal:343,  pro:15,  fat:15,  carb:36,  fib:2.2,  sod:603,  kw:['麥香魚'] },
  { id:'200162', cat:'超值全餐', name:'原味麥脆鷄腿(2塊)', cal:700, pro:43,  fat:46,  carb:28,  fib:2.1,  sod:1079, kw:['原味麥脆鷄腿2塊','原味麥脆雞腿2塊','麥脆鷄腿2塊','原味麥脆'] },
  { id:'200163', cat:'超值全餐', name:'辣味麥脆鷄腿(2塊)', cal:714, pro:41,  fat:47,  carb:31,  fib:3.8,  sod:1411, kw:['辣味麥脆鷄腿2塊','辣味麥脆雞腿2塊','辣味麥脆'] },
  { id:'200009', cat:'極選系列', name:'BLT 安格斯牛肉堡', cal:543,  pro:29,  fat:29,  carb:41,  fib:2.6,  sod:923,  kw:['BLT安格斯牛肉堡','BLT安格斯','安格斯牛肉堡','安格斯'] },
  { id:'200166', cat:'極選系列', name:'BLT 嫩煎鷄腿堡',  cal:457,  pro:27,  fat:20,  carb:42,  fib:3.1,  sod:953,  kw:['BLT嫩煎鷄腿堡','BLT嫩煎雞腿','BLT嫩煎'] },
  { id:'200300', cat:'極選系列', name:'帕瑪森安格斯牛肉堡',cal:560, pro:27,  fat:34,  carb:37,  fib:2.9,  sod:851,  kw:['帕瑪森安格斯牛肉堡','帕瑪森安格斯','帕瑪森牛肉堡'] },
  { id:'200301', cat:'極選系列', name:'帕瑪森主廚鷄腿堡', cal:716,  pro:28,  fat:41,  carb:58,  fib:2.8,  sod:1333, kw:['帕瑪森主廚鷄腿堡','帕瑪森主廚雞腿堡','帕瑪森鷄腿堡'] },
  { id:'200010', cat:'極選系列', name:'蕈菇安格斯牛肉堡', cal:593,  pro:31,  fat:35,  carb:40,  fib:3.4,  sod:1055, kw:['蕈菇安格斯牛肉堡','蕈菇安格斯','蕈菇牛肉堡'] },
  { id:'200299', cat:'極選系列', name:'蕈菇主廚鷄腿堡',  cal:744,  pro:31,  fat:42,  carb:60,  fib:3.1,  sod:1486, kw:['蕈菇主廚鷄腿堡','蕈菇主廚雞腿堡','蕈菇鷄腿堡'] },
  { id:'200323', cat:'極選系列', name:'藜麥沙拉(大)',    cal:96,   pro:4.1, fat:2.6, carb:14,  fib:3.7,  sod:173,  kw:['藜麥沙拉','藜麥'] },
  { id:'200324', cat:'極選系列', name:'藜麥沙拉+魚肉片', cal:218,  pro:12,  fat:9.7, carb:21,  fib:4.5,  sod:301,  kw:['藜麥沙拉魚肉片','藜麥魚'] },
  { id:'200325', cat:'極選系列', name:'藜麥沙拉+嫩煎雞肉片',cal:264,pro:22, fat:13,  carb:16,  fib:4.6,  sod:434,  kw:['藜麥沙拉嫩煎雞肉片','藜麥嫩煎雞'] },
  { id:'200326', cat:'極選系列', name:'藜麥沙拉+辣脆雞肉片',cal:377,pro:20, fat:21,  carb:27,  fib:4.3,  sod:683,  kw:['藜麥沙拉辣脆雞肉片','藜麥辣脆雞'] },

  // ── McCafé ────────────────────────────────────────────
  { id:'200339', cat:'McCafé', name:'金選美式咖啡(冰大杯)',cal:25,  pro:1.4, fat:0.5, carb:3.6, fib:1.1,  sod:2,    kw:['金選美式大杯','金選美式咖啡冰大杯'] },
  { id:'200332', cat:'McCafé', name:'金選美式咖啡(熱)',   cal:15,   pro:0.9, fat:0.3, carb:2.2, fib:0.6,  sod:1,    kw:['金選美式咖啡熱','金選美式熱'] },
  { id:'200334', cat:'McCafé', name:'金選美式咖啡(冰)',   cal:20,   pro:1.2, fat:0.4, carb:2.9, fib:0.9,  sod:2,    kw:['金選美式咖啡冰','金選美式冰'] },
  { id:'200333', cat:'McCafé', name:'金選那堤(熱)',       cal:124,  pro:6.4, fat:6.5, carb:9.9, fib:0.5,  sod:66,   kw:['金選那堤熱','金選拿鐵熱'] },
  { id:'200335', cat:'McCafé', name:'金選那堤(冰)',       cal:117,  pro:6.1, fat:6.1, carb:9.5, fib:0.6,  sod:62,   kw:['金選那堤冰','金選拿鐵冰'] },
  { id:'200114', cat:'McCafé', name:'義式濃縮咖啡(熱)',   cal:6,    pro:0.4, fat:0.1, carb:0.9, fib:0.3,  sod:1,    kw:['義式濃縮咖啡','濃縮咖啡','espresso'] },
  { id:'200058', cat:'McCafé', name:'經典美式咖啡(熱)',   cal:15,   pro:0.9, fat:0.3, carb:2.2, fib:0.6,  sod:1,    kw:['經典美式咖啡熱','美式咖啡熱','美式熱'] },
  { id:'200072', cat:'McCafé', name:'經典美式咖啡(冰)',   cal:20,   pro:1.2, fat:0.4, carb:2.9, fib:0.9,  sod:2,    kw:['經典美式咖啡冰','美式咖啡冰','美式冰'] },
  { id:'200059', cat:'McCafé', name:'經典那堤(熱)',       cal:123,  pro:6.4, fat:6.5, carb:9.9, fib:0.5,  sod:66,   kw:['經典那堤熱','那堤熱','拿鐵熱','latte'] },
  { id:'200108', cat:'McCafé', name:'經典那堤(冰)',       cal:117,  pro:6.1, fat:6.1, carb:9.5, fib:0.6,  sod:62,   kw:['經典那堤冰','那堤冰','拿鐵冰'] },
  { id:'200123', cat:'McCafé', name:'經典卡布奇諾(熱)',   cal:148,  pro:7.6, fat:7.9, carb:12,  fib:0.6,  sod:81,   kw:['經典卡布奇諾熱','卡布奇諾熱','卡布熱','cappuccino'] },
  { id:'200279', cat:'McCafé', name:'經典卡布奇諾(冰)',   cal:110,  pro:5.7, fat:5.7, carb:9.1, fib:0.6,  sod:57,   kw:['經典卡布奇諾冰','卡布奇諾冰','卡布冰'] },
  { id:'200245', cat:'McCafé', name:'蜂蜜紅茶(冰)',       cal:138,  pro:0,   fat:0,   carb:34,  fib:0,    sod:9,    kw:['蜂蜜紅茶冰','蜂蜜紅茶'] },
  { id:'200275', cat:'McCafé', name:'蜂蜜奶茶(熱)',       cal:177,  pro:2.6, fat:4.7, carb:31,  fib:0,    sod:43,   kw:['蜂蜜奶茶熱','蜂蜜奶茶'] },
  { id:'200266', cat:'McCafé', name:'蜂蜜奶茶(冰)',       cal:212,  pro:2.6, fat:4.7, carb:39,  fib:0,    sod:44,   kw:['蜂蜜奶茶冰'] },
  { id:'200321', cat:'McCafé', name:'焦糖冰奶茶',         cal:188,  pro:2.8, fat:4.4, carb:34,  fib:0,    sod:58,   kw:['焦糖冰奶茶','焦糖奶茶'] },

  // ── 飲料 ──────────────────────────────────────────────
  { id:'200055', cat:'飲料', name:'紅茶(熱)',             cal:0,    pro:0,   fat:0,   carb:0,   fib:0,    sod:0,    kw:['紅茶熱','紅茶'] },
  { id:'200057', cat:'飲料', name:'奶茶(熱)',             cal:75,   pro:2.7, fat:4.9, carb:5,   fib:0,    sod:37,   kw:['奶茶熱','奶茶'] },
  { id:'200110', cat:'飲料', name:'奶茶(冰)',             cal:213,  pro:2.5, fat:4.5, carb:41,  fib:0,    sod:39,   kw:['奶茶冰'] },
  { id:'200273', cat:'飲料', name:'台灣鮮榨柳丁汁',       cal:119,  pro:2.1, fat:0,   carb:28,  fib:0,    sod:4,    kw:['台灣鮮榨柳丁汁','柳丁汁','柳橙汁','OJ'] },
  { id:'200073', cat:'飲料', name:'鮮乳',                 cal:145,  pro:7.3, fat:8.1, carb:11,  fib:0,    sod:99,   kw:['鮮乳','牛奶','milk'] },
  { id:'200288', cat:'飲料', name:'Evian天然礦泉水',      cal:0,    pro:0,   fat:0,   carb:0,   fib:0,    sod:114,  kw:['礦泉水','evian','水'] },
  { id:'200063', cat:'飲料', name:'可口可樂(小)',         cal:158,  pro:0,   fat:0,   carb:39,  fib:0,    sod:8,    kw:['可口可樂','可樂','coke'] },
  { id:'200066', cat:'飲料', name:'可口可樂zero(小)',     cal:0,    pro:0,   fat:0,   carb:0,   fib:0,    sod:39,   kw:['可口可樂zero','可樂zero','零卡可樂','diet coke'] },
  { id:'200069', cat:'飲料', name:'雪碧(小)',             cal:128,  pro:0,   fat:0,   carb:32,  fib:0,    sod:41,   kw:['雪碧','sprite'] },
  { id:'200104', cat:'飲料', name:'檸檬風味紅茶(冰小)',   cal:123,  pro:0,   fat:0,   carb:31,  fib:0,    sod:15,   kw:['檸檬風味紅茶','檸檬紅茶'] },
  { id:'200098', cat:'飲料', name:'無糖紅茶(冰小)',       cal:0,    pro:0,   fat:0,   carb:0,   fib:0,    sod:5,    kw:['無糖紅茶','無糖紅茶冰'] },
  { id:'200101', cat:'飲料', name:'無糖綠茶(冰小)',       cal:0,    pro:0,   fat:0,   carb:0,   fib:0,    sod:0,    kw:['無糖綠茶','無糖綠茶冰','綠茶'] },

  // ── 點心 ──────────────────────────────────────────────
  { id:'200290', cat:'點心', name:'麥克雙牛堡',           cal:429,  pro:24,  fat:22,  carb:35,  fib:2.7,  sod:680,  kw:['麥克雙牛堡','雙牛堡'] },
  { id:'200006', cat:'點心', name:'漢堡',                 cal:276,  pro:13,  fat:10,  carb:34,  fib:2.1,  sod:434,  kw:['漢堡','hamburger'] },
  { id:'200005', cat:'點心', name:'吉事漢堡',             cal:325,  pro:16,  fat:14,  carb:34,  fib:2.3,  sod:618,  kw:['吉事漢堡','起司漢堡','吉事堡'] },
  { id:'200076', cat:'點心', name:'薯條(小)',             cal:241,  pro:3.7, fat:11,  carb:31,  fib:3.0,  sod:171,  kw:['薯條','小薯','fries'] },
  { id:'200037', cat:'點心', name:'薯餅',                 cal:177,  pro:1.9, fat:13,  carb:14,  fib:1.8,  sod:320,  kw:['薯餅','hash brown'] },
  { id:'200182', cat:'點心', name:'原味麥脆鷄腿',         cal:275,  pro:18,  fat:17,  carb:11,  fib:0.7,  sod:459,  kw:['原味麥脆鷄腿','原味麥脆雞腿','麥脆鷄腿','原味麥脆'] },
  { id:'200179', cat:'點心', name:'原味麥脆鷄腿(大腿)',   cal:425,  pro:25,  fat:29,  carb:16,  fib:1.4,  sod:621,  kw:['原味麥脆鷄腿大腿','麥脆大腿'] },
  { id:'200181', cat:'點心', name:'辣味麥脆鷄腿',         cal:267,  pro:18,  fat:17,  carb:10,  fib:0.5,  sod:621,  kw:['辣味麥脆鷄腿','辣味麥脆雞腿','辣麥脆'] },
  { id:'200180', cat:'點心', name:'辣味麥脆鷄腿(大腿)',   cal:447,  pro:23,  fat:30,  carb:21,  fib:3.3,  sod:790,  kw:['辣味麥脆鷄腿大腿','辣麥脆大腿'] },
  { id:'200018', cat:'點心', name:'勁辣香鷄翅(2塊)',      cal:250,  pro:12,  fat:17,  carb:12,  fib:0.6,  sod:384,  kw:['勁辣香鷄翅','勁辣雞翅','香鷄翅2塊'] },
  { id:'200169', cat:'點心', name:'勁辣香鷄翅(6塊)',      cal:749,  pro:35,  fat:52,  carb:35,  fib:1.8,  sod:1153, kw:['勁辣香鷄翅6塊','勁辣雞翅6塊'] },
  { id:'200016', cat:'點心', name:'麥克鷄塊(4塊)',        cal:174,  pro:10,  fat:11,  carb:9.7, fib:0.5,  sod:370,  kw:['麥克鷄塊4塊','雞塊4塊','nuggets 4'] },
  { id:'200015', cat:'點心', name:'麥克鷄塊(6塊)',        cal:261,  pro:16,  fat:16,  carb:14,  fib:0.8,  sod:555,  kw:['麥克鷄塊6塊','雞塊6塊','nuggets 6','麥克雞塊'] },
  { id:'200170', cat:'點心', name:'麥克鷄塊(10塊)',       cal:436,  pro:26,  fat:26,  carb:24,  fib:1.4,  sod:926,  kw:['麥克鷄塊10塊','雞塊10塊','nuggets 10'] },
  { id:'200080', cat:'點心', name:'蘋果派',               cal:217,  pro:2,   fat:9.2, carb:32,  fib:1.6,  sod:123,  kw:['蘋果派','apple pie'] },
  { id:'200020', cat:'點心', name:'玉米杯',               cal:93,   pro:3,   fat:1.2, carb:18,  fib:2.7,  sod:174,  kw:['玉米杯','corn cup','玉米'] },
  { id:'200025', cat:'點心', name:'四季沙拉',             cal:20,   pro:0.7, fat:0.2, carb:3.9, fib:0.9,  sod:25,   kw:['四季沙拉','side salad'] },
  { id:'200075', cat:'點心', name:'水果袋(芭樂)',         cal:31,   pro:0.4, fat:0,   carb:7.2, fib:0,    sod:3,    kw:['水果袋','芭樂','fruit'] },
  { id:'200021', cat:'點心', name:'玉米湯(小)',            cal:93,   pro:1.9, fat:2.1, carb:17,  fib:1.0,  sod:638,  kw:['玉米湯','corn soup'] },
  { id:'200082', cat:'點心', name:'蛋捲冰淇淋',           cal:145,  pro:2.5, fat:4.6, carb:23,  fib:0,    sod:69,   kw:['蛋捲冰淇淋','冰淇淋','ice cream cone'] },
  { id:'200083', cat:'點心', name:'大蛋捲冰淇淋',         cal:202,  pro:3.6, fat:6.5, carb:32,  fib:0.1,  sod:100,  kw:['大蛋捲冰淇淋','大冰淇淋'] },
  { id:'200081', cat:'點心', name:'OREO冰炫風',           cal:312,  pro:5.2, fat:11,  carb:49,  fib:0.2,  sod:210,  kw:['OREO冰炫風','OREO McFlurry','oreo'] },
  { id:'200286', cat:'點心', name:'雙倍OREO冰炫風',       cal:382,  pro:6.1, fat:13,  carb:60,  fib:0.5,  sod:305,  kw:['雙倍OREO冰炫風','雙倍OREO'] },
  { id:'200337', cat:'點心', name:'香草奶昔',             cal:430,  pro:3.6, fat:3,   carb:21,  fib:0,    sod:91,   kw:['香草奶昔','奶昔','milkshake','vanilla'] },
  { id:'200338', cat:'點心', name:'草莓奶昔',             cal:427,  pro:3.6, fat:3,   carb:20,  fib:0,    sod:75,   kw:['草莓奶昔','草莓milkshake','strawberry'] },

  // ── 早餐同款但不同 category 版 ─────────────────────────
  { id:'200317', cat:'早餐', name:'早餐麥香魚',           cal:343,  pro:15,  fat:15,  carb:36,  fib:2.2,  sod:603,  kw:['早餐麥香魚'] },
  { id:'200331', cat:'早餐', name:'麥香鷄(早餐)',         cal:393,  pro:14,  fat:17,  carb:45,  fib:2.8,  sod:797,  kw:['麥香鷄早餐','麥香雞早餐'] },
  { id:'200287', cat:'早餐', name:'麥克鷄塊(6塊/早餐)',   cal:261,  pro:16,  fat:16,  carb:14,  fib:0.8,  sod:555,  kw:['麥克鷄塊6塊早餐'] },
  { id:'200291', cat:'早餐', name:'麥克鷄塊(10塊/早餐)',  cal:436,  pro:26,  fat:26,  carb:24,  fib:1.4,  sod:926,  kw:['麥克鷄塊10塊早餐'] },
]

// 快速 lookup by ID
const MCD_BY_ID = Object.fromEntries(MCD_ITEMS.map(i => [i.id, i]))

// 麥當勞場景偵測
const MCD_CONTEXT_PATTERNS = [
  /麥當勞|mcdonald'?s|mc\s*donald/i,
  /大麥克|麥克|麥香魚|麥香鷄|麥脆|麥克鷄塊/,
  /滿福堡|蛋堡|焙果堡|勁辣鷄腿堡|嫩煎鷄腿堡/,
  /BLT|帕瑪森.*堡|蕈菇.*堡|安格斯.*堡/,
  /mcflurry|冰炫風|蛋捲冰淇淋/i,
  /金選那堤|金選美式|金選咖啡/,
]

export function isMcdonaldsContext(text = '') {
  return MCD_CONTEXT_PATTERNS.some(p => p.test(text))
}

// 模糊比對：根據 name 找最接近的 MCD_ITEMS
export function matchMcdonaldsItem(name = '') {
  if (!name) return null
  const n = name.replace(/[\s®·・（）()【】]/g, '').toLowerCase()

  // 完全比對 name
  const exact = MCD_ITEMS.find(i => i.name.replace(/[\s®·・（）()【】]/g, '').toLowerCase() === n)
  if (exact) return exact

  // keyword 比對（keyword 完整包含在查詢字串，或查詢字串包含 keyword）
  let best = null, bestScore = 0
  for (const item of MCD_ITEMS) {
    for (const kw of item.kw) {
      const k = kw.replace(/[\s®·・（）()【】]/g, '').toLowerCase()
      if (n.includes(k) || k.includes(n)) {
        const score = k.length
        if (score > bestScore) { best = item; bestScore = score }
      }
    }
    // name 部分比對
    const itemName = item.name.replace(/[\s®·・（）()【】]/g, '').toLowerCase()
    if (n.includes(itemName) || itemName.includes(n)) {
      const score = itemName.length
      if (score > bestScore) { best = item; bestScore = score }
    }
  }
  return best
}

// 給定 basket（已辨識產品清單），回傳多項結果
export function matchMcdonaldsItems(names = []) {
  return names.map(n => matchMcdonaldsItem(n)).filter(Boolean)
}

// 把 MCD item 轉成 nutrition object（給 ScanModal 用）
export function mcdToNutrition(item) {
  if (!item) return null
  return {
    calories: item.cal,
    protein_g: item.pro,
    fat_g: item.fat,
    carbs_g: item.carb,
    fiber_g: item.fib,
    sodium_mg: item.sod,
  }
}
