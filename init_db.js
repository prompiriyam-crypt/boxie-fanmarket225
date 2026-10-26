const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'boxie_fanmarket.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('--- กำลังเตรียมฐานข้อมูล BOXIE FanMarket (ระบบสมาชิก + ตลาดซื้อขาย) ---');

  // 1. ตาราง users (รองรับสมัครสมาชิก + ล็อคอิน)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    rating REAL DEFAULT 5.0,
    total_sales INTEGER DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    follower_count INTEGER DEFAULT 0,
    joined_date TEXT,
    badge TEXT
  )`);

  // 2. ตาราง categories (หมวดหมู่สินค้า)
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_name TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT
  )`);

  // 3. ตาราง artists (ศิลปิน / ซีรีส์)
  db.run(`CREATE TABLE IF NOT EXISTS artists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )`);

  // 4. ตาราง products (สินค้า)
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category_id INTEGER,
    artist_id INTEGER,
    seller_id INTEGER,
    price REAL NOT NULL,
    original_price REAL,
    condition_status TEXT NOT NULL,
    delivery_status TEXT NOT NULL,
    badge_label TEXT,
    image_url TEXT,
    FOREIGN KEY(category_id) REFERENCES categories(id),
    FOREIGN KEY(artist_id) REFERENCES artists(id),
    FOREIGN KEY(seller_id) REFERENCES users(id)
  )`);

  // 5. ตาราง cart_items (ตะกร้าสินค้า)
  db.run(`CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);

  // 6. ตาราง messages (ระบบแชท)
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    product_id INTEGER,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  // 7. ตาราง orders & order_items (คำสั่งซื้อ)
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER,
    subtotal REAL,
    shipping_fee REAL,
    total REAL,
    shipping_method TEXT,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY(order_id) REFERENCES orders(id)
  )`);

  console.log('สร้างตารางเรียบร้อยแล้ว กำลังลงข้อมูลเริ่มต้น...');

  // --- ข้อมูลผู้ใช้เริ่มต้น (ผู้ซื้อ somchai + ร้านค้า namtan_ja) ---
  const insertUser = db.prepare(`INSERT OR REPLACE INTO users 
    (id, username, email, password, display_name, avatar, bio, rating, total_sales, item_count, follower_count, joined_date, badge) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  // บัญชีแม่ค้าตัวอย่าง (id: 1)
  insertUser.run(1, 'Yibsee_25', 'Yib@boxie.com', '123456', 'Yibsee_25', 'images/my-avatar.png', 'ของสะสมแท้ทุกชิ้นค่ะ จัดส่งไว แพ็คของอย่างดี', 4.9, 120, 48, 356, '12/05/2567', 'ร้านค้าแนะนำ');
  // บัญชีผู้ซื้อตัวอย่าง (id: 2 สมชาย ใจดี ตามแถบบนขวา)
  insertUser.run(2, 'somchai_jaidee', 'somchai@boxie.com', '123456', 'สมชาย ใจดี', 'https://api.dicebear.com/7.x/avataaars/svg?seed=somchai', 'แฟนคลับ GMMTV สะสมทุกอย่าง', 5.0, 0, 0, 10, '01/01/2567', '');
  
  // ผู้ขายอื่นตามการ์ดสินค้า
  insertUser.run(3, 'pp_mm', 'pp_mm@boxie.com', '123456', 'pp_mm', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ppmm', 'ปล่อยการ์ดสะสมแท้', 5.0, 45, 12, 80, '01/02/2567', '');
  insertUser.run(4, 'moonlight', 'moonlight@boxie.com', '123456', 'moonlight', 'https://api.dicebear.com/7.x/avataaars/svg?seed=moonlight', 'ส่งต่อน้องตุ๊กตาสภาพกริบ', 4.8, 28, 5, 45, '10/08/2567', '');
  insertUser.run(5, 'winny_shop', 'winny@boxie.com', '123456', 'winny_shop', 'https://api.dicebear.com/7.x/avataaars/svg?seed=winny', 'เสื้อผ้า Official แท้', 5.0, 20, 8, 30, '15/09/2567', '');
  insertUser.run(6, 'numfon', 'numfon@boxie.com', '123456', 'numfon', 'https://api.dicebear.com/7.x/avataaars/svg?seed=numfon', 'ส่งต่อแท่งไฟ', 4.7, 15, 3, 20, '20/07/2567', '');
  insertUser.run(7, 'jelly_b', 'jelly@boxie.com', '123456', 'jelly_b', 'https://api.dicebear.com/7.x/avataaars/svg?seed=jelly', 'สแตนดี้ตั้งโต๊ะ', 5.0, 12, 6, 18, '05/06/2567', '');
  insertUser.run(8, 'peemai', 'peemai@boxie.com', '123456', 'peemai', 'https://api.dicebear.com/7.x/avataaars/svg?seed=peemai', 'ปล่อยอัลบั้ม', 4.9, 18, 4, 25, '11/04/2567', '');
  insertUser.run(9, 'tttt', 'tttt@boxie.com', '123456', 'tttt', 'https://api.dicebear.com/7.x/avataaars/svg?seed=tttt', 'พวงกุญแจน่ารัก', 4.8, 26, 9, 52, '18/03/2567', '');
  insertUser.finalize();

  // --- หมวดหมู่ 8 หมวด ---
  const insertCat = db.prepare(`INSERT OR REPLACE INTO categories (id, key_name, name, icon) VALUES (?, ?, ?, ?)`);
  insertCat.run(1, 'all', 'ทั้งหมด', 'grid');
  insertCat.run(2, 'doll', 'ตุ๊กตา', 'bear');
  insertCat.run(3, 'photocard', 'Photocard', 'card');
  insertCat.run(4, 'cloth', 'เสื้อผ้า', 'tshirt');
  insertCat.run(5, 'album', 'อัลบั้ม', 'disc');
  insertCat.run(6, 'misc', 'ของใช้/อื่นๆ', 'bag');
  insertCat.run(7, 'concert', 'Concert', 'ticket');
  insertCat.run(8, 'special', 'ของสะสมพิเศษ', 'star');
  insertCat.finalize();

  // --- รายการสินค้า 8 ชิ้นตาม UI เป๊ะๆ ---
  const insertProd = db.prepare(`INSERT OR REPLACE INTO products 
    (id, title, category_id, artist_id, seller_id, price, original_price, condition_status, delivery_status, badge_label, image_url) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  insertProd.run(1, 'ตุ๊กตา Krist GMMTV', 2, 1, 1, 1200, null, 'สภาพดี', 'พร้อมส่ง', 'ขายดี', 'images/item1.jpg');
  insertProd.run(2, 'Photocard GeminiFourth', 3, 2, 3, 350, null, 'สภาพดี', 'มีรอยเล็กน้อย', '', 'images/item2.jpg');
  insertProd.run(3, 'ตุ๊กตา Bright Win', 2, 3, 4, 890, null, 'สภาพดี', 'พร้อมส่ง', '', 'images/item3.jpg');
  insertProd.run(4, 'เสื้อศาลาวัด', 4, 4, 5, 650, null, 'สภาพดี', 'ไซส์ M', '', 'images/item4.jpg');
  insertProd.run(5, 'ไฟเชียร์ GMMTV', 7, 4, 6, 1490, 1990, 'สภาพดี', 'ใช้งานได้ปกติ', 'ลดราคา', 'images/item5.jpg');
  insertProd.run(6, 'ติ้งสายรหัสเทวดา', 6, 5, 7, 450, null, 'สภาพดี', 'พร้อมส่ง', 'มาใหม่', 'images/item6.jpg');
  insertProd.run(7, 'อัลบั้ม F4 Thailand', 5, 6, 8, 1100, null, 'สภาพดี', 'แกะแล้ว', '', 'images/item7.jpg');
  insertProd.run(8, 'พวงกุญแจตุ๊กตาน้องเน่า แค่เพื่อนครับเพื่อน', 6, 7, 9, 320, null, 'สภาพดี', 'พร้อมส่ง', '', 'images/item8.jpg');

  console.log('✅ สร้างฐานข้อมูลและบัญชีสมาชิกเริ่มต้นเรียบร้อยแล้ว!');
});