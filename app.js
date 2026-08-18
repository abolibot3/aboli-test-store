const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========== Admin Protection ==========
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function checkAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  
  if (adminKey && adminKey === ADMIN_SECRET) {
    return next();
  }
  
  return res.status(403).json({ error: 'دسترسی غیرمجاز' });
}

// محدودیت برای لاگین و ثبت‌نام
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
  max: 10, // حداکثر ۱۰ درخواست
  message: { error: 'تعداد درخواست‌ها زیاد است. ۱۵ دقیقه صبر کنید.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// محدودیت کلی برای APIها
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // ۱ دقیقه
  max: 60,
  message: { error: 'تعداد درخواست‌ها زیاد است.' }
});

// Middleware
app.use(cors());
// ========== Security Headers ==========
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// مسیر فایل‌های داده
const USERS_FILE = path.join(__dirname, 'users', 'users.json');
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');

// اگر فایل‌ها وجود نداشتند، بساز
// اگر فایل‌ها وجود نداشتند، بساز
function ensureFiles() {
  // اول مطمئن شو پوشه‌ها وجود دارن
  const usersDir = path.join(__dirname, 'users');
  const dataDir = path.join(__dirname, 'data');

  if (!fs.existsSync(usersDir)) {
    fs.mkdirSync(usersDir, { recursive: true });
  }
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(PRODUCTS_FILE)) {
    const defaultProducts = [
      {
        id: 1,
        name: "برنج طارم درجه یک",
        shortDesc: "برنج ایرانی معطر و خوش‌پخت",
        fullDesc: "برنج طارم درجه یک از بهترین مزارع شمال ایران. دانه‌های بلند، معطر و مناسب برای انواع پلو. بسته‌بندی ۱ کیلوگرمی.",
        price: 185000,
        image: "/images/rice.jpg",
        category: "غلات" , 
        stock: 50
      },
      {
        id: 2,
        name: "روغن زیتون فرابکر",
        shortDesc: "روغن زیتون خالص و طبیعی",
        fullDesc: "روغن زیتون فرابکر سرد فشرده، غنی از آنتی‌اکسیدان و مناسب برای سالاد و پخت‌وپز سالم. بطری ۵۰۰ میلی‌لیتری.",
        price: 320000,
        image: "/images/olive-oil.jpg",
        category: "روغن‌ها" ,
        stock: 20
      },
      {
        id: 3,
        name: "عسل طبیعی کوهستان",
        shortDesc: "عسل خالص بدون شکر اضافه",
        fullDesc: "عسل طبیعی جمع‌آوری شده از کندوهای کوهستان، کاملاً خالص و بدون هیچ افزودنی. شیشه ۴۵۰ گرمی.",
        price: 275000,
        image: "/images/honey.jpg",
        category: "شیرینی‌جات",
        stock: 35
      },
      {
        id: 4,
        name: "چای سیاه لاهیجان",
        shortDesc: "چای معطر و اصیل ایرانی",
        fullDesc: "چای سیاه درجه یک لاهیجان با عطر و طعم خاص. مناسب برای دم‌کردن سنتی. بسته ۵۰۰ گرمی.",
        price: 145000,
        image: "/images/tea.jpg",
        category: "نوشیدنی‌ها",
        stock: 104
      },
      {
        id: 5,
        name: "زعفران نگین قائنات",
        shortDesc: "زعفران درجه یک و اصل",
        fullDesc: "زعفران نگین قائنات با رنگ‌دهی عالی و عطر فوق‌العاده. مناسب برای انواع غذاهای ایرانی. بسته ۱ گرمی.",
        price: 450000,
        image: "/images/saffron.jpg",
        category: "ادویه‌جات",
        stock: 12
      },
      {
        id: 6,
        name: "ماست محلی پرچرب",
        shortDesc: "ماست تازه و سنتی",
        fullDesc: "ماست محلی پرچرب تهیه شده از شیر تازه گاو. طعم غنی و بافت خامه‌ای. ظرف ۱ کیلویی.",
        price: 95000,
        image: "/images/yogurt.jpg",
        category: "لبنیات",
        stock: 32
      }
    ];
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(defaultProducts, null, 2));
  }
}
// ========== API Routes ==========

// دریافت همه محصولات
app.get('/api/products', (req, res) => {
  try {
    if (!fs.existsSync(PRODUCTS_FILE)) {
      return res.status(404).json({ error: 'فایل محصولات یافت نشد' });
    }
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    const products = JSON.parse(raw);
    res.json(products);
  } catch (err) {
    console.error('Products error:', err.message);
    res.status(500).json({ error: 'خطا در دریافت محصولات', details: err.message });
  }
});

// دریافت یک محصول
app.get('/api/products/:id', (req, res) => {
  try {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'محصول یافت نشد' });
    }
  } catch (err) {
    res.status(500).json({ error: 'خطا در دریافت محصول' });
  }
});

// ثبت‌نام کاربر
app.post('/api/register', authLimiter , async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'همه فیلدها الزامی هستند' });
    }

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'این ایمیل قبلاً ثبت شده است' });
    }
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'این نام کاربری قبلاً گرفته شده است' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

const newUser = {
  id: Date.now(),
  username,
  email,
  password: hashedPassword,   // رمز هش‌شده
  cart: [],
  createdAt: new Date().toISOString()
};

    users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    const { password: _, ...userWithoutPass } = newUser;
    res.json({ success: true, user: userWithoutPass });
  } catch (err) {
    res.status(500).json({ error: 'خطا در ثبت‌نام' });
  }
});

// ورود کاربر
app.post('/api/login', authLimiter , async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی هستند' });
    }

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = users.find(u => u.email === email);

if (!user) {
  return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
}

const isMatch = await bcrypt.compare(password, user.password);
if (!isMatch) {
  return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
}

    if (!user) {
      return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
    }

    const { password: _, ...userWithoutPass } = user;
    res.json({ success: true, user: userWithoutPass });
  } catch (err) {
    res.status(500).json({ error: 'خطا در ورود' });
  }
});

// به‌روزرسانی سبد خرید کاربر
app.post('/api/cart/update', (req, res) => {
  try {
    const { userId, cart } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'شناسه کاربر الزامی است' });
    }

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    users[userIndex].cart = cart || [];
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    const { password: _, ...userWithoutPass } = users[userIndex];
    res.json({ success: true, user: userWithoutPass });
  } catch (err) {
    res.status(500).json({ error: 'خطا در به‌روزرسانی سبد خرید' });
  }
});

// دریافت اطلاعات کاربر
app.get('/api/user/:id', (req, res) => {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (user) {
      const { password: _, ...userWithoutPass } = user;
      res.json(userWithoutPass);
    } else {
      res.status(404).json({ error: 'کاربر یافت نشد' });
    }
  } catch (err) {
    res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
  }
});

// افزودن محصول جدید (ادمین)
app.post('/api/products', checkAdmin , (req, res) => {
  try {
    const { name, shortDesc, fullDesc, price, category, image } = req.body;

    if (!name || !shortDesc || !price || !category) {
      return res.status(400).json({ error: 'نام، توضیحات کوتاه، قیمت و دسته‌بندی الزامی هستند' });
    }

    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));

    const newProduct = {
      id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1,
      name,
      shortDesc,
      fullDesc: fullDesc || shortDesc,
      price: Number(price),
      image: image || '/images/default.jpg',
      category,
      price: Number(price),
      originalPrice: req.body.originalPrice ? Number(req.body.originalPrice) : null,
      stock: Number(req.body.stock) >= 0 ? Number(req.body.stock) : 0,
    };

    products.push(newProduct);
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));

    res.json({ success: true, product: newProduct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در افزودن محصول' });
  }
});

// حذف محصول (ادمین)
app.delete('/api/products/:id', checkAdmin , (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    const before = products.length;
    products = products.filter(p => p.id !== id);

    if (products.length === before) {
      return res.status(404).json({ error: 'محصول یافت نشد' });
    }

    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطا در حذف محصول' });
  }
});

// ویرایش محصول (ادمین)
app.put('/api/products/:id', checkAdmin , (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, shortDesc, fullDesc, price, category, image } = req.body;

    if (!name || !shortDesc || !price || !category) {
      return res.status(400).json({ error: 'نام، توضیحات کوتاه، قیمت و دسته‌بندی الزامی هستند' });
    }

    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'محصول یافت نشد' });
    }

    products[index] = {
      ...products[index],
      name,
      shortDesc,
      fullDesc: fullDesc || shortDesc,
      price: Number(price),
      category,
      image: image || products[index].image,
      stock: req.body.stock !== undefined ? Number(req.body.stock) : products[index].stock,
      price: Number(price),
      originalPrice: req.body.originalPrice !== undefined && req.body.originalPrice !== ''
      ? Number(req.body.originalPrice)
      : null,
    };

    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    res.json({ success: true, product: products[index] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ویرایش محصول' });
  }
});

const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

// مطمئن شو فایل سفارش‌ها وجود داره
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
}

// ثبت سفارش جدید
app.post('/api/orders', (req, res) => {
  try {
    const { fullName, phone, address, postal, payMethod, items, total, userId } = req.body;

    if (!fullName || !phone || !address || !items || !items.length) {
      return res.status(400).json({ error: 'اطلاعات ناقص است' });
    }

    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));

    // کم کردن موجودی
const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
for (const item of items) {
  const pIndex = products.findIndex(p => p.id === item.id);
  if (pIndex === -1) {
    return res.status(400).json({ error: `محصول ${item.name} یافت نشد` });
  }
  if (products[pIndex].stock < item.qty) {
    return res.status(400).json({ error: `موجودی «${products[pIndex].name}» کافی نیست` });
  }
  products[pIndex].stock -= item.qty;
}
fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));

    const newOrder = {
      id: Date.now(),
      code: 'FM-' + Date.now().toString().slice(-8),
      fullName,
      phone,
      address,
      postal: postal || '',
      payMethod: payMethod || 'online',
      items,
      total: Number(total) || 0,
      userId: userId || null,
      status: 'paid',        // paid | shipped | cancelled
      createdAt: new Date().toISOString(),
      shippedAt: null
    };

    orders.unshift(newOrder); // جدیدها بالا
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));

    res.json({ success: true, order: newOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ثبت سفارش' });
  }
});

// دریافت همه سفارش‌ها
app.get('/api/orders', (req, res) => {
  try {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'خطا در دریافت سفارش‌ها' });
  }
});

// جستجو با شماره موبایل
// جستجو با شماره موبایل یا کد سفارش
app.get('/api/orders/search', (req, res) => {
  try {
    const q = (req.query.q || req.query.phone || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'عبارت جستجو الزامی است' });
    }

    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    const result = orders.filter(o =>
      o.phone.includes(q) ||
      (o.code && o.code.toLowerCase().includes(q.toLowerCase()))
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'خطا در جستجو' });
  }
});

// تغییر وضعیت سفارش (ارسال شد / لغو و ...)
app.patch('/api/orders/:id/status', checkAdmin , (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body; // paid | shipped | cancelled

    if (!['paid', 'shipped', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'وضعیت نامعتبر است' });
    }

    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    const index = orders.findIndex(o => o.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'سفارش یافت نشد' });
    }

    orders[index].status = status;
    if (status === 'shipped') {
      orders[index].shippedAt = new Date().toISOString();
    }

    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    res.json({ success: true, order: orders[index] });
  } catch (err) {
    res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت' });
  }
});

// سفارش‌های یک کاربر
app.get('/api/orders/user/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    const userOrders = orders.filter(o => o.userId === userId);
    res.json(userOrders);
  } catch (err) {
    res.status(500).json({ error: 'خطا در دریافت سفارش‌ها' });
  }
});

// همه روت‌های دیگر به index.html بروند
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 سرور فروشگاه مواد غذایی روی پورت ${PORT} اجرا شد`);
  console.log(`👉 http://localhost:${PORT}`);
});