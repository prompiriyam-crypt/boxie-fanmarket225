const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'boxie_fanmarket.db');
const db = new sqlite3.Database(dbPath);

// เพิ่มคอลัมน์ stock ในตาราง products อัตโนมัติ 
db.run("ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 2", (err) => {
  if (!err) console.log("✅ เพิ่มระบบสต็อกสินค้าเรียบร้อย (ค่าเริ่มต้น 2 ชิ้น)");
});

// --- API สำหรับดึงข้อความแจ้งเตือนตามผู้รับ (receiver_id หรือ user_id) ---
app.get('/api/messages', async (req, res) => {
  try {
    const userId = req.query.user_id || req.query.receiver_id;
    if (!userId) {
      const messages = await all(`SELECT * FROM messages ORDER BY id DESC`);
      return res.json(messages);
    }
    // ดึงข้อความที่ส่งมาหาผู้ใช้นี้ (receiver_id = userId)
    const messages = await all(`
      SELECT * FROM messages 
      WHERE receiver_id = ? 
      ORDER BY id DESC
    `, [userId]);
    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 🛡️ ขยายลิมิตให้รับข้อมูล JSON ขนาดใหญ่ได้ (เช่น รูปภาพ Base64)
app.use(express.urlencoded({ limit: '50mb', extended: true })); // 🛡️ รองรับฟอร์มขนาดใหญ่ด้วย
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions (Promise)
const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});
const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
});

/* ============================================================
   1. AUTHENTICATION APIs (สมัครสมาชิก & เข้าสู่ระบบ)
   ============================================================ */

// สมัครสมาชิกใหม่ (Register)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, display_name } = req.body;

    if (!username || !email || !password || !display_name) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง' });
    }

    const existing = await get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username.trim(), email.trim()]
    );

    if (existing) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว' });
    }

    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username.trim())}`;
    const today = new Date().toLocaleDateString('th-TH');

    const result = await run(`
      INSERT INTO users (username, email, password, display_name, avatar, bio, rating, total_sales, item_count, follower_count, joined_date, badge)
      VALUES (?, ?, ?, ?, ?, 'ยินดีที่ได้รู้จักครับ!', 5.0, 0, 0, 0, ?, '')
    `, [username.trim(), email.trim(), password, display_name.trim(), avatar, today]);

    const newUser = {
      id: result.lastID,
      username: username.trim(),
      email: email.trim(),
      display_name: display_name.trim(),
      avatar
    };

    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// เข้าสู่ระบบ (Login)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน' });
    }

    const user = await get(`
      SELECT id, username, email, display_name, avatar, bio, rating, total_sales, badge
      FROM users 
      WHERE (username = ? OR email = ?) AND password = ?
    `, [identifier.trim(), identifier.trim(), password]);

    if (!user) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ดึงข้อมูลผู้ใช้ปัจจุบัน (Current User Profile)
app.get('/api/auth/me/:id', async (req, res) => {
  try {
    const user = await get(`
      SELECT id, username, email, display_name, avatar, bio, rating, total_sales, item_count, follower_count, joined_date, badge
      FROM users WHERE id = ?
    `, [Number(req.params.id)]);

    if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   2. MARKET & CONTENT APIs
   ============================================================ */

// หมวดหมู่สินค้า
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await all('SELECT * FROM categories ORDER BY id ASC');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// รายการสินค้า + ตัวกรองละเอียด (ไม่มีศิลปินแล้ว)
app.get('/api/products', async (req, res) => {
  try {
    const { q, category, condition, delivery, sort } = req.query;
    let sql = `
      SELECT 
        p.*,
        c.name AS category_name,
        c.key_name AS category_key,
        u.username AS seller_username,
        u.display_name AS seller_display_name,
        u.avatar AS seller_avatar,
        u.rating AS seller_rating,
        u.total_sales AS seller_sales
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN users u ON u.id = p.seller_id
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      sql += ` AND p.title LIKE ?`;
      params.push(`%${q}%`);
    }
    if (category && category !== 'all') {
      sql += ` AND c.key_name = ?`;
      params.push(category);
    }
    if (condition && condition !== 'all') {
      sql += ` AND p.condition_status LIKE ?`;
      params.push(`%${condition}%`);
    }
    if (delivery && delivery !== 'all') {
      sql += ` AND p.delivery_status LIKE ?`;
      params.push(`%${delivery}%`);
    }

    if (sort === 'price_asc') {
      sql += ` ORDER BY p.price ASC`;
    } else if (sort === 'price_desc') {
      sql += ` ORDER BY p.price DESC`;
    } else {
      sql += ` ORDER BY p.id ASC`;
    }

    const products = await all(sql, params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ข้อมูลร้านค้า (สำหรับ Sidebar ด้านขวา)
app.get('/api/seller/:id', async (req, res) => {
  try {
    const sellerId = Number(req.params.id);

    // 1. ดึงข้อมูลผู้ขาย/ร้านค้าตามปกติ
    const seller = await get('SELECT * FROM users WHERE id = ?', [sellerId]);
    if (!seller) return res.status(404).json({ error: 'ไม่พบผู้ขาย' });

    // 2. Query นับจำนวนสินค้าจริงจากตารางสินค้า (เปลี่ยนชื่อตาราง 'products' และฟิลด์ 'seller_id' )
    const productCountResult = await get('SELECT COUNT(*) AS count FROM products');

    // 3. กำหนดค่า item_count ให้เท่ากับจำนวนที่นับได้จริง (ถ้าไม่มีสินค้า ให้เป็น 0)
    seller.item_count = productCountResult ? productCountResult.count : 0;

    res.json(seller);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API อัปเดตข้อมูลโปรไฟล์ (ชื่อ, Bio, รูป Avatar)
app.post('/api/auth/update-profile', async (req, res) => {
  try {
    const { userId, display_name, bio, avatar } = req.body;
    if (!userId) return res.status(400).json({ error: 'ไม่พบรหัสผู้ใช้งาน' });

    await run(`
      UPDATE users 
      SET display_name = ?, bio = ?, avatar = ? 
      WHERE id = ?
    `, [display_name, bio, avatar, userId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// API เปลี่ยนรหัสผ่านผู้ใช้
app.post('/api/auth/update-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    // ตรวจสอบรหัสผ่านเดิมว่าถูกต้องไหม
    const user = await get(`SELECT id FROM users WHERE id = ? AND password = ?`, [userId, oldPassword]);
    if (!user) {
      return res.status(400).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
    }

    // อัปเดตรหัสผ่านใหม่
    await run(`UPDATE users SET password = ? WHERE id = ?`, [newPassword, userId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   3. CART & CHECKOUT APIs
   ============================================================ */

// ดึงตะกร้าสินค้าของผู้ใช้
app.get('/api/cart', async (req, res) => {
  try {
    const userId = Number(req.query.user_id) || 2;
    const items = await all(`
      SELECT 
        ci.id AS cart_item_id,
        ci.quantity,
        p.id AS product_id,
        p.title,
        p.price,
        p.image_url
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = ?
      ORDER BY ci.id DESC
    `, [userId]);

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.json({ items, total, count: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เพิ่มสินค้าลงตะกร้า
// ตัวจัดการตะกร้าสินค้าฝั่งเซิร์ฟเวอร์ (วางทับ app.post('/api/cart', ...) เดิมใน server.js)
// 1. เพิ่มสินค้าลงตะกร้า (รองรับจำนวน quantity และใช้ตาราง cart_items ให้ตรงกัน)
app.post('/api/cart', (req, res) => {
  const { user_id, product_id, quantity } = req.body;
  const qty = parseInt(quantity) || 1;
  const uid = user_id || 1;

  db.get(`SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?`, [uid, product_id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (row) {
      // ถ้ามีสินค้าอยู่แล้ว ให้บวกจำนวนเพิ่มเข้าไปตามที่กดเลือก
      const newQty = row.quantity + qty;
      db.run(`UPDATE cart_items SET quantity = ? WHERE id = ?`, [newQty, row.id], function(updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: 'Failed to update cart' });
        }
        res.json({ success: true, quantity: newQty });
      });
    } else {
      // ถ้ายังไม่มี ให้เพิ่มรายการใหม่ด้วยจำนวน qty ที่ส่งมา
      db.run(`INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)`, [uid, product_id, qty], function(insertErr) {
        if (insertErr) {
          return res.status(500).json({ error: 'Failed to add to cart' });
        }
        res.json({ success: true, quantity: qty });
      });
    }
  });
});

// เส้นทางอัปเดตสต็อกสินค้าสำหรับแอดมิน 
app.post('/api/admin/update-stock', async (req, res) => {
  try {
    const { product_id, stock } = req.body;
    const newStock = parseInt(stock) || 0;
    const prodId = Number(product_id);

    // อัปเดตสต็อกลงในตาราง products
    await run(`UPDATE products SET stock = ? WHERE id = ?`, [newStock, prodId]);
    
    res.json({ success: true, product_id: prodId, stock: newStock });
  } catch (err) {
    console.error('Update stock error:', err);
    res.status(500).json({ error: err.message });
  }
});

const multer = require('multer');

// ตั้งค่าที่เก็บไฟล์รูปภาพ
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public/images_slip')); // ใช้ขีดล่าง _ ให้ตรงกับโฟลเดอร์จริง
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // ตั้งชื่อไฟล์กันซ้ำ
  }
});
const upload = multer({ storage: storage });

// ตรง Route ที่รับข้อมูลเพิ่มสินค้า (เช่น app.post('/api/products', ...)) 
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { title, price, category_id, condition_status, delivery_status, badge_label } = req.body;
    
    // ดึง path ไฟล์รูปที่อัปโหลด (ถ้ามี)
    const image_url = req.file ? `images/${req.file.filename}` : 'images/default.jpg';

    // บันทึกลงฐานข้อมูล SQLite
    await run(
      `INSERT INTO products (title, price, category_id, condition_status, delivery_status, badge_label, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, price, category_id, condition_status, delivery_status, badge_label, image_url]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// สั่งซื้อและชำระเงิน (Checkout)
// สั่งซื้อและชำระเงิน (รองรับ FormData และรับไฟล์สลิป)
app.post('/api/checkout', upload.single('slip'), async (req, res) => {
  try {
    const userId = Number(req.body.user_id) || 2;
    const slipFilename = req.file ? req.file.filename : null;
    
    // 🛑 1. เช็กว่าผู้ใช้แนบรูปสลิปมาหรือยัง (ถ้าไม่มี ให้ตีกลับทันที)
    if (!slipFilename) {
      return res.status(400).json({ error: 'กรุณาอัปโหลดรูปภาพสลิปการโอนเงินด้วยครับ' });
    }

    const shippingFee = 50;

    const cart = await all(`
      SELECT c.product_id, c.quantity, p.price, p.stock, p.title 
      FROM cart_items c 
      JOIN products p ON p.id = c.product_id 
      WHERE c.user_id = ?
    `, [userId]);

    if (!cart.length) return res.status(400).json({ error: 'ไม่มีสินค้าในตะกร้า' });

    for (const item of cart) {
      const currentStock = (item.stock !== undefined && item.stock !== null) ? Number(item.stock) : 3;
      if (currentStock < item.quantity) {
        return res.status(400).json({ error: `สินค้า "${item.title}" หมดสต็อกหรือมีไม่พอครับ` });
      }
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vat = Math.round(subtotal * 0.07);
    const total = subtotal + vat + shippingFee;

    // 🛑 2. (ทางเลือก) ถ้าต้องการเช็กยอดเงินที่ผู้ใช้กรอกเทียบกับยอดจริง
    // 🛑 บังคับเช็กยอดเงินต้องตรงเป๊ะห้ามขาดห้ามเกินแม้แต่บาทเดียว
    // 🛑 บังคับเช็กยอดเงินต้องตรงเป๊ะ 100% (ห้ามขาดห้ามเกินแม้แต่บาทเดียว)
const userEnteredAmount = parseFloat(req.body.entered_amount);
if (isNaN(userEnteredAmount) || userEnteredAmount !== total) {
  return res.status(400).json({ error: `ยอดเงินในสลิป (${userEnteredAmount || 0} บาท) ไม่ตรงกับยอดชำระจริง (${total} บาท) ครับ ` });
}

    // บันทึกข้อมูลออเดอร์พร้อมชื่อไฟล์สลิป
    const orderRes = await run(`
      INSERT INTO orders (buyer_id, subtotal, shipping_fee, total, shipping_method, status, shipping_status, slip) 
      VALUES (?, ?, ?, ?, 'parcel', 'completed', 'preparing', ?)
    `, [userId, subtotal, shippingFee, total, slipFilename]);

    const orderId = orderRes.lastID;

    for (const item of cart) {
      await run(`
        INSERT INTO order_items (order_id, product_id, quantity, price) 
        VALUES (?, ?, ?, ?)
      `, [orderId, item.product_id, item.quantity, item.price]);

      await run(`
        UPDATE products 
        SET stock = CASE WHEN COALESCE(stock, 2) - ? < 0 THEN 0 ELSE COALESCE(stock, 2) - ? END 
        WHERE id = ?
      `, [item.quantity, item.quantity, item.product_id]);
    }

    await run(`DELETE FROM cart_items WHERE user_id = ?`, [userId]);

    res.json({ success: true, orderId, subtotal, vat, shippingFee, total });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ดึงประวัติคำสั่งซื้อ (ฉบับสมบูรณ์ดึงสลิปมาด้วย)
app.get('/api/orders', async (req, res) => {
  try {
    const userId = Number(req.query.user_id) || 2;
    const orders = await all(`
      SELECT 
        o.id,
        o.total,
        o.status,
        o.shipping_method,
        o.shipping_status,
        o.tracking_number,
        o.slip,             -- 🔍 เพิ่มคอลัมน์ slip ตรงนี้ เพื่อให้เอาชื่อไฟล์ไปโชว์รูปได้ครับ!
        o.created_at,
        COUNT(oi.id) AS total_items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.buyer_id = ?
      GROUP BY o.id
      ORDER BY o.id DESC
    `, [userId]);

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   4. SELL & CHAT APIs
   ============================================================ */

// ลงขายสินค้าใหม่ (Admin Store - รองรับ image_url)
app.post('/api/products/new', async (req, res) => {
  try {
    const { title, price, category_id, condition_status, delivery_status, badge_label, image_url } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'กรุณากรอกชื่อและราคาสินค้า' });

    const result = await run(`
      INSERT INTO products (title, category_id, artist_id, seller_id, price, condition_status, delivery_status, badge_label, image_url)
      VALUES (?, ?, 1, 1, ?, ?, ?, ?, ?)
    `, [
      title,
      Number(category_id) || 2,
      Number(price),
      condition_status || 'สภาพดี',
      delivery_status || 'พร้อมส่ง',
      badge_label || '',
      image_url || ''
    ]);

    // เพิ่มตัวเลขสินค้าของแอดมิน
    await run('UPDATE users SET item_count = item_count + 1 WHERE id = 1');

    res.status(201).json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

    // API สำหรับลบสินค้า
app.delete('/api/products/:id', (req, res) => {
  const prodId = req.params.id;
  db.run('DELETE FROM products WHERE id = ?', [prodId], function(err) {
    if (err) {
      console.error('Delete error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`ลบสินค้า ID ${prodId} สำเร็จ`);
    res.json({ success: true, message: 'ลบสินค้าสำเร็จ' });
  });
});

// แชท
app.get('/api/messages', async (req, res) => {
  try {
    const msgs = await all(`SELECT * FROM messages ORDER BY id ASC`);
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ตรวจสอบและสร้างคอลัมน์ is_read อัตโนมัติ (ป้องกันลืมสร้างตาราง)
db.run("ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0", () => {});

// API สำหรับบันทึกว่าข้อความของยูสเซอร์คนนี้อ่านหมดแล้ว
app.post('/api/messages/mark-read', async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'ไม่พบรหัสผู้ใช้งาน' });
    
    // ลบข้อความของยูสเซอร์นี้ทิ้งจากฐานข้อมูลทันที
    await run(`DELETE FROM messages WHERE receiver_id = ? OR sender_id = ?`, [user_id, user_id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Clear messages error:', err);
    res.status(500).json({ error: err.message });
  }
});

// บังคับสร้างหรือเพิ่มคอลัมน์ is_read ให้ตาราง messages
db.run(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER,
  receiver_id INTEGER,
  product_id INTEGER,
  message TEXT,
  created_at TEXT,
  is_read INTEGER DEFAULT 0
)`, () => {});

// หรือถ้ามีตารางอยู่แล้ว ให้รันคำสั่งนี้เพื่อเพิ่มคอลัมน์กันเหนียว
db.run(`ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0`, (err) => {
  // ถ้ามีคอลัมน์อยู่แล้วปล่อยผ่าน ไม่ต้องทำอะไร
});

// --- ตรวจสอบและสร้างคอลัมน์สถานะและเลขพัสดุในตาราง orders อัตโนมัติ ---
db.run("ALTER TABLE orders ADD COLUMN shipping_status TEXT DEFAULT 'preparing'", () => {});
db.run("ALTER TABLE orders ADD COLUMN tracking_number TEXT DEFAULT ''", () => {});

// --- API ดึงรายการออเดอร์ทั้งหมดสำหรับแอดมิน (ดึงชื่อลูกค้ามาด้วย) ---
// --- API ดึงรายการออเดอร์ทั้งหมดสำหรับแอดมิน (เพิ่ม shipping_status และ tracking_number) ---
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await all(`
      SELECT 
        o.id,
        o.buyer_id,
        o.subtotal,
        o.shipping_fee,
        o.total,
        o.shipping_method,
        o.shipping_status, -- ต้องมีบรรทัดนี้
        o.tracking_number, -- และบรรทัดนี้
        o.created_at,
        u.display_name AS buyer_name,
        u.username AS buyer_username,
        COUNT(oi.id) AS total_items
      FROM orders o
      LEFT JOIN users u ON u.id = o.buyer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id
      ORDER BY o.id DESC
    `);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- API อัปเดตสถานะและเลขพัสดุสำหรับแอดมิน (เวอร์ชันสมบูรณ์รวมระบบแจ้งเตือน) ---
app.post('/api/admin/orders/update-status', async (req, res) => {
  try {
    const { order_id, shipping_status, tracking_number } = req.body;
    if (!order_id) return res.status(400).json({ error: 'ไม่พบรหัสคำสั่งซื้อ' });

    // กำหนดค่าสถานะสำรองป้องกันค่าว่าง
    const finalStatus = shipping_status || 'preparing';
    const finalTracking = tracking_number || ('TH' + String(order_id).padStart(6, '0') + 'BOX');

    // 1. ดึงข้อมูลออเดอร์ เพื่อเอา buyer_id ของลูกค้า
    const order = await get(`SELECT buyer_id FROM orders WHERE id = ?`, [order_id]);
    if (!order) return res.status(404).json({ error: 'ไม่พบข้อมูลคำสั่งซื้อ' });

    // 2. อัปเดตสถานะและเลขพัสดุลงตาราง orders จริงๆ
    await run(`
      UPDATE orders 
      SET shipping_status = ?, tracking_number = ? 
      WHERE id = ?
    `, [finalStatus, finalTracking, order_id]);

    // 3. แปลงสถานะเป็นข้อความแจ้งเตือนตามค่าที่แอดมินเลือกจริงๆ แบบแม่นยำ
    let statusText = 'เตรียมจัดส่ง (แพ็กของ)';
    if (finalStatus === 'shipping') {
      statusText = `กำลังจัดส่งพัสดุ (Tracking: ${finalTracking})`;
    } else if (finalStatus === 'delivered') {
      statusText = 'จัดส่งสำเร็จเรียบร้อยแล้ว';
    }

    const notifMessage = `📦 ออเดอร์ #${order_id}: สถานะสินค้าอัปเดตเป็น "${statusText}"`;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 4. บันทึกข้อความแจ้งเตือนเข้าตาราง messages ส่งตรงหา buyer_id ของลูกค้ารายนั้น
    await run(`
      INSERT INTO messages (sender_id, receiver_id, product_id, message, created_at) 
      VALUES (1, ?, 1, ?, ?)
    `, [order.buyer_id, notifMessage, timeStr]);

    res.json({ success: true, shipping_status: finalStatus });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// เส้นทางอัปเดตสต็อกสินค้าสำหรับแอดมิน
app.post('/api/admin/update-stock', (req, res) => {
  const { product_id, stock } = req.body;
  const newStock = parseInt(stock) || 0;
  
  db.run(`UPDATE products SET stock = ? WHERE id = ?`, [newStock, product_id], function(err) {
    if (err) {
      console.error('Update stock error:', err);
      return res.status(500).json({ error: 'Failed to update stock' });
    }
    res.json({ success: true, stock: newStock });
  });
});

// API สำหรับรับคำสั่งลบสินค้าในตะกร้า
app.delete('/api/cart/:id', async (req, res) => {
  try {
    const cartItemId = req.params.id;
    // เปลี่ยนจาก cart เป็น cart_items ให้ตรงกับตารางจริงที่ใช้เก็บสินค้าในตะกร้า
    await run(`DELETE FROM cart_items WHERE id = ?`, [cartItemId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete cart error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- API สำหรับลบข้อความแจ้งเตือนเก่าทั้งหมด ---
app.delete('/api/admin/clear-messages', async (req, res) => {
  try {
    await run(`DELETE FROM messages`);
    res.json({ success: true, message: 'เคลียร์ข้อความทั้งหมดเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Clear messages error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. API สำหรับแอดมินลบสินค้า (ตัวนี้แหละครับที่ต้องเอามาแปะเพิ่ม เพื่อให้ตรงกับหน้าเว็บที่ยิงมา /api/admin/products/:id)
app.delete('/api/admin/products/:id', (req, res) => {
  const prodId = req.params.id;
  
  db.run("PRAGMA foreign_keys = OFF;", (err) => {
    db.run('DELETE FROM products WHERE id = ?', [prodId], function(err) {
      db.run("PRAGMA foreign_keys = ON;");
      
      if (err) {
        console.error('Delete error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`ลบสินค้า ID ${prodId} สำเร็จ`);
      res.json({ success: true, message: 'ลบสินค้าสำเร็จ' });
    });
  });
});

// 📊 API ดึงข้อมูลรายงานสำหรับแอดมิน
app.get('/api/admin/reports', (req, res) => {
  // ดึงข้อมูลยอดขายแบบเซฟตี้ (ต่อให้ตาราง orders ว่างก็ไม่พัง)
  db.get(`
    SELECT 
      COALESCE(SUM(total), 0) as total_sales,
      COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now') THEN total ELSE 0 END), 0) as daily_sales,
      COALESCE(SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN total ELSE 0 END), 0) as monthly_sales,
      COALESCE(SUM(CASE WHEN strftime('%Y', created_at) = strftime('%Y', 'now') THEN total ELSE 0 END), 0) as yearly_sales
    FROM orders
  `, (err, salesRow) => {
    if (err) {
      salesRow = { total_sales: 0, daily_sales: 0, monthly_sales: 0, yearly_sales: 0 };
    }

    // ดึงสินค้าขายดี (ดึงแบบยืดหยุ่น ป้องกัน Error กรณีตาราง order_items ยังไม่มีข้อมูล)
    db.all(`
      SELECT p.title, COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 3
    `, (err, topProducts) => {
      if (err) topProducts = [];

          // ตรวจสอบว่าชื่อตารางใน DB คือ products หรือไม่  
    db.all(`SELECT id, title, price, stock FROM products`, (err, products) => {
      if (err) {
        console.error("Error fetching products:", err);
        products = [];
      }

      res.json({
        sales: salesRow,
        topProducts: topProducts,
        products: products // ส่งค่านี้กลับไป
      });
    });
    });
  });
});

// 📦 API สำหรับอัปเดตจำนวนสต็อกสินค้า
app.post('/api/admin/update-stock', (req, res) => {
  const { productId, newStock } = req.body;
  db.run(`UPDATE products SET stock = ? WHERE id = ?`, [newStock, productId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'อัปเดตสต็อกสำเร็จ' });
  });
});

// Middleware ให้บริการหน้าเว็บหลัก
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// สตาร์ตเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`BOXIE FanMarket Server is running on port ${PORT}!`);
  console.log(`==================================================`);
});