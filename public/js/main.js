/**
 * FreshMart - فروشگاه مواد غذایی
 * JavaScript کامل - مرحله ۳
 */

// ==================== State ====================
let currentUser = null;
let products = [];
let cart = [];
let activeCategory = 'all';

// ==================== DOM Elements ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== Validation Helpers =====
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  // شماره ایرانی: 09xxxxxxxxx یا +989xxxxxxxxx
  const cleaned = phone.replace(/[\s\-]/g, '');
  return /^(09\d{9}|\+989\d{9}|9\d{9})$/.test(cleaned);
}

function isValidPostal(postal) {
  if (!postal) return true; // اختیاری
  return /^\d{10}$/.test(postal.replace(/\s/g, ''));
}

function isValidName(name) {
  return name.trim().length >= 3;
}

function isValidPassword(pass) {
  return pass.length >= 4;
}

function isValidPrice(price) {
  const n = Number(price);
  return !isNaN(n) && n >= 1000;
}

function isValidStock(stock) {
  const n = Number(stock);
  return !isNaN(n) && n >= 0 && Number.isInteger(n);
}

function showFieldError(input, message) {
  // حذف خطای قبلی
  const old = input.parentElement.querySelector('.field-error');
  if (old) old.remove();

  input.style.borderColor = 'var(--danger)';
  const err = document.createElement('div');
  err.className = 'field-error';
  err.style.cssText = 'color:var(--danger);font-size:0.8rem;margin-top:4px;';
  err.textContent = message;
  input.parentElement.appendChild(err);
}

function clearFieldError(input) {
  input.style.borderColor = '';
  const old = input.parentElement.querySelector('.field-error');
  if (old) old.remove();
}

function clearAllErrors(form) {
  form.querySelectorAll('.field-error').forEach(e => e.remove());
  form.querySelectorAll('input, select').forEach(i => i.style.borderColor = '');
}

// ==================== Init ====================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadUserFromStorage();
  loadProducts();
  bindEvents();
  updateUI();
});

// ==================== Theme ====================
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = $('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ==================== User & Auth ====================
function loadUserFromStorage() {
  try {
    const saved = localStorage.getItem('freshmart_user');
    if (saved) {
      currentUser = JSON.parse(saved);
      cart = currentUser.cart || [];
    }
  } catch (e) {
    currentUser = null;
    cart = [];
  }
}

function saveUserToStorage() {
  if (currentUser) {
    currentUser.cart = cart;
    localStorage.setItem('freshmart_user', JSON.stringify(currentUser));
  }
}

function updateUI() {
  const authArea = $('#authArea');
  const userArea = $('#userArea');
  const userNameDisplay = $('#userNameDisplay');

  if (currentUser) {
    authArea?.classList.add('hidden');
    userArea?.classList.remove('hidden');
    if (userNameDisplay) userNameDisplay.textContent = currentUser.username;
  } else {
    authArea?.classList.remove('hidden');
    userArea?.classList.add('hidden');
  }

  updateCartCount();
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  clearAllErrors(form);

  const emailInput = $('#loginEmail');
  const passInput = $('#loginPassword');
  const email = emailInput.value.trim();
  const password = passInput.value;

  let valid = true;

  if (!email) {
    showFieldError(emailInput, 'ایمیل الزامی است');
    valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError(emailInput, 'فرمت ایمیل صحیح نیست');
    valid = false;
  }

  if (!password) {
    showFieldError(passInput, 'رمز عبور الزامی است');
    valid = false;
  }

  if (!valid) return;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'خطا در ورود', 'error');
      return;
    }

    currentUser = data.user;
    cart = currentUser.cart || [];
    saveUserToStorage();
    updateUI();
    closeModal('loginModal');
    showToast(`خوش آمدید ${currentUser.username}!`, 'success');
    form.reset();
  } catch (err) {
    showToast('خطا در ارتباط با سرور', 'error');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const form = e.target;
  clearAllErrors(form);

  const userInput = $('#signupUsername');
  const emailInput = $('#signupEmail');
  const passInput = $('#signupPassword');

  const username = userInput.value.trim();
  const email = emailInput.value.trim();
  const password = passInput.value;

  let valid = true;

  if (!username || username.length < 3) {
    showFieldError(userInput, 'نام کاربری حداقل ۳ کاراکتر باشد');
    valid = false;
  }

  if (!email) {
    showFieldError(emailInput, 'ایمیل الزامی است');
    valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError(emailInput, 'فرمت ایمیل صحیح نیست');
    valid = false;
  }

  if (!isValidPassword(password)) {
    showFieldError(passInput, 'رمز عبور حداقل ۴ کاراکتر باشد');
    valid = false;
  }

  if (!valid) return;

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'خطا در ثبت‌نام', 'error');
      return;
    }

    currentUser = data.user;
    cart = [];
    saveUserToStorage();
    updateUI();
    closeModal('signupModal');
    showToast('ثبت‌نام با موفقیت انجام شد!', 'success');
    form.reset();
  } catch (err) {
    showToast('خطا در ارتباط با سرور', 'error');
  }
}

function handleLogout() {
  currentUser = null;
  cart = [];
  localStorage.removeItem('freshmart_user');
  updateUI();
  closeModal('profileModal');
  showToast('از حساب خارج شدید', 'success');
}

function showProfile() {
  window.location.href = '/profile.html';
}

// ==================== Products ====================
async function loadProducts() {
  const grid = $('#productsGrid');
  if (grid) {
    grid.innerHTML = `
      <div class="loading-wrap">
        <div class="spinner"></div>
        <div class="loading-text">در حال بارگذاری محصولات...</div>
      </div>
    `;
  }

  try {
    const res = await fetch('/api/products');
    products = await res.json();
    applyFilters();
  } catch (err) {
    console.error(err);
    if (grid) {
      grid.innerHTML = `
        <div class="loading-wrap">
          <div class="loading-text" style="color:var(--danger);">خطا در بارگذاری محصولات</div>
        </div>
      `;
    }
    showToast('خطا در بارگذاری محصولات', 'error');
  }
}


function initLazyImages() {
  const images = document.querySelectorAll('img.lazy-img');
  if (!images.length) return;

  // اگر مرورگر IntersectionObserver نداشت، همه رو یکجا لود کن
  if (!('IntersectionObserver' in window)) {
    images.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.classList.add('loaded');
      }
    });
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.onload = () => img.classList.add('loaded');
          img.removeAttribute('data-src');
        }
        obs.unobserve(img);
      }
    });
  }, {
    rootMargin: '100px', // کمی زودتر از دیده شدن لود بشه
    threshold: 0.01
  });

  images.forEach(img => observer.observe(img));
}


function renderProducts(list) {
  const grid = $('#productsGrid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `<p style="text-align:center;color:var(--text-secondary);grid-column:1/-1;padding:40px;">محصولی یافت نشد</p>`;
    return;
  }

  // ایموجی پیش‌فرض برای هر دسته‌بندی (چون عکس واقعی نداریم)
  const emojiMap = {
    'غلات': '🌾',
    'روغن‌ها': '🫒',
    'شیرینی‌جات': '🍯',
    'نوشیدنی‌ها': '🍵',
    'ادویه‌جات': '🌺',
    'لبنیات': '🥛'
  };

 grid.innerHTML = list.map(p => {
  const imageHtml = (p.image && p.image.startsWith('data:'))
  ? `<img data-src="${p.image}" alt="${p.name}" class="lazy-img" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E">`
  : (emojiMap[p.category] || '🛒');

  const stock = p.stock ?? 0;
  const stockHtml = stock > 0
    ? `<span style="font-size:0.8rem;color:var(--success);">موجود: ${stock}</span>`
    : `<span style="font-size:0.8rem;color:var(--danger);">ناموجود</span>`;

  const btnHtml = stock > 0
    ? `<button class="add-to-cart-btn" data-id="${p.id}">افزودن</button>`
    : `<button class="add-to-cart-btn" disabled style="opacity:0.5;cursor:not-allowed;">ناموجود</button>`;

  const hasDiscount = p.originalPrice && p.originalPrice > p.price;
const discountPercent = hasDiscount
  ? Math.round((1 - p.price / p.originalPrice) * 100)
  : 0;

const priceHtml = hasDiscount
  ? `<div class="price-box">
       <span class="price-original">${formatPrice(p.originalPrice)} تومان</span>
       <span class="price-final">
         <span class="discount-badge">${discountPercent}٪</span>
         ${formatPrice(p.price)} <span style="font-size:0.8rem;font-weight:500;">تومان</span>
       </span>
     </div>`
  : `<div class="product-price">${formatPrice(p.price)} <span>تومان</span></div>`;

  return `
  <div class="product-card" data-id="${p.id}">
    <div class="product-image">
      ${imageHtml}
    </div>
    <div class="product-body">
      <span class="product-category">${p.category}</span>
      <h3 class="product-name">${p.name}</h3>
      <p class="product-desc">${p.shortDesc}</p>
      <div class="product-footer">
        <div>
          ${priceHtml}
          ${stockHtml}
        </div>
        ${btnHtml}
      </div>
    </div>
  </div>
`;
}).join('');

  // رویداد کلیک روی کارت
grid.querySelectorAll('.product-card').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) return;
    const id = parseInt(card.dataset.id);
    openProductModal(id);
  });
});

// رویداد دکمه افزودن
grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = parseInt(btn.dataset.id);
    if (!btn.disabled) {
      addToCart(id);
    }
  });
});

initLazyImages();
}

function openProductModal(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const emojiMap = {
    'غلات': '🌾', 'روغن‌ها': '🫒', 'شیرینی‌جات': '🍯',
    'نوشیدنی‌ها': '🍵', 'ادویه‌جات': '🌺', 'لبنیات': '🥛'
  };

  const imageHtml = (product.image && product.image.startsWith('data:'))
    ? `<img src="${product.image}" alt="${product.name}">`
    : (emojiMap[product.category] || '🛒');

  const stock = product.stock ?? 0;
  const stockText = stock > 0 ? `${stock} عدد` : 'ناموجود';
  const addBtnHtml = stock > 0
    ? `<button class="btn primary full" id="modalAddBtn" data-id="${product.id}">افزودن به سبد خرید</button>`
    : `<button class="btn full" disabled style="opacity:0.5;cursor:not-allowed;">ناموجود</button>`;

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
const discountPercent = hasDiscount
  ? Math.round((1 - product.price / product.originalPrice) * 100)
  : 0;

const priceBlock = hasDiscount
  ? `<div class="price-box" style="margin-bottom:16px;">
       <span class="price-original">${formatPrice(product.originalPrice)} تومان</span>
       <span class="price-final">
         <span class="discount-badge">${discountPercent}٪ تخفیف</span>
         ${formatPrice(product.price)} تومان
       </span>
     </div>`
  : `<div class="price">${formatPrice(product.price)} تومان</div>`;

  const content = $('#productModalContent');
  content.innerHTML = `
    <div class="product-modal-image">${imageHtml}</div>
    <div class="product-modal-info">
      <div class="category">${product.category}</div>
      <h3>${product.name}</h3>
      <p class="full-desc">${product.fullDesc}</p>
      <p style="margin-bottom:8px;font-size:0.95rem;">موجودی: <strong>${stockText}</strong></p>
      ${priceBlock}
      ${addBtnHtml}
    </div>
  `;

  const addBtn = $('#modalAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      addToCart(product.id);
    });
  }

  openModal('productModal');
}

function handleSearch() {
  applyFilters();
}

function applyFilters() {
  const q = ($('#searchInput')?.value || '').trim().toLowerCase();

  let filtered = products;

  // فیلتر دسته‌بندی
  if (activeCategory && activeCategory !== 'all') {
    filtered = filtered.filter(p => p.category === activeCategory);
  }

  // فیلتر جستجو
  if (q) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.shortDesc.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  renderProducts(filtered);
}

// ==================== Cart ====================
function addToCart(productId) {
  if (!currentUser) {
    showToast('لطفاً ابتدا وارد حساب شوید', 'error');
    openModal('loginModal');
    return;
  }

  const product = products.find(p => p.id === productId);
  if (!product) {
    showToast('محصول یافت نشد', 'error');
    return;
  }

  const stock = product.stock ?? 999;
  if (stock <= 0) {
    showToast('این محصول ناموجود است', 'error');
    return;
  }

  const existing = cart.find(i => i.id === productId);
  const currentQty = existing ? existing.qty : 0;

  if (currentQty + 1 > stock) {
    showToast(`حداکثر موجودی این محصول ${stock} عدد است`, 'error');
    return;
  }

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image || '',
      qty: 1
    });
  }

  saveUserToStorage();
  syncCartToServer();
  updateCartCount();
  showToast(`${product.name} به سبد اضافه شد`, 'success');
}

function updateCartCount() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const el = $('#cartCount');
  if (el) el.textContent = count;
}

function renderCart() {
  const container = $('#cartItems');
  const totalEl = $('#cartTotal');

  if (!cart.length) {
    container.innerHTML = `<div class="cart-empty">سبد خرید شما خالی است 🛒</div>`;
    totalEl.textContent = '۰ تومان';
    return;
  }

  const emojiMap = {
    'غلات': '🌾', 'روغن‌ها': '🫒', 'شیرینی‌جات': '🍯',
    'نوشیدنی‌ها': '🍵', 'ادویه‌جات': '🌺', 'لبنیات': '🥛'
  };

  container.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-image">${emojiMap[item.category] || '🛒'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatPrice(item.price)} تومان</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-minus" data-id="${item.id}">−</button>
        <span>${item.qty}</span>
        <button class="qty-plus" data-id="${item.id}">+</button>
      </div>
      <span class="cart-item-remove" data-id="${item.id}">🗑️</span>
    </div>
  `).join('');

  // رویدادها
  container.querySelectorAll('.qty-plus').forEach(btn => {
    btn.addEventListener('click', () => changeQty(parseInt(btn.dataset.id), 1));
  });
  container.querySelectorAll('.qty-minus').forEach(btn => {
    btn.addEventListener('click', () => changeQty(parseInt(btn.dataset.id), -1));
  });
  container.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
  });

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  totalEl.textContent = formatPrice(total) + ' تومان';
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  const product = products.find(p => p.id === id);
  const stock = product ? (product.stock ?? 0) : 999;

  const newQty = item.qty + delta;

  if (newQty <= 0) {
    cart = cart.filter(i => i.id !== id);
  } else if (newQty > stock) {
    showToast(`حداکثر موجودی این محصول ${stock} عدد است`, 'error');
    return;
  } else {
    item.qty = newQty;
  }

  saveUserToStorage();
  syncCartToServer();
  updateCartCount();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveUserToStorage();
  syncCartToServer();
  updateCartCount();
  renderCart();
  showToast('محصول از سبد حذف شد', 'success');
}

async function syncCartToServer() {
  if (!currentUser) return;
  try {
    await fetch('/api/cart/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, cart })
    });
  } catch (e) {
    console.error('Sync cart failed', e);
  }
}

function openCart() {
  window.location.href = '/cart.html';
}

// ==================== Modals ====================
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => modal.classList.add('active'));
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('active');
  document.body.classList.remove('modal-open');
  setTimeout(() => modal.classList.add('hidden'), 300);
}

// ==================== Toast ====================
function showToast(message, type = 'success') {
  const container = $('#toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== Helpers ====================
function formatPrice(num) {
  return num.toLocaleString('fa-IR');
}

// ==================== Events ====================
function bindEvents() {
  // Theme
  $('#themeToggle')?.addEventListener('click', toggleTheme);

  // Auth buttons
  $('#loginBtn')?.addEventListener('click', () => openModal('loginModal'));
  $('#signupBtn')?.addEventListener('click', () => openModal('signupModal'));
  $('#profileBtn')?.addEventListener('click', showProfile);
  $('#logoutBtn')?.addEventListener('click', handleLogout);

  // Forms
  $('#loginForm')?.addEventListener('submit', handleLogin);
  $('#signupForm')?.addEventListener('submit', handleSignup);

  // Switch between login/signup
  $('#switchToSignup')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal('loginModal');
    setTimeout(() => openModal('signupModal'), 320);
  });
  $('#switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal('signupModal');
    setTimeout(() => openModal('loginModal'), 320);
  });

  // Cart
  $('#cartBtn')?.addEventListener('click', openCart);
 $('#checkoutBtn')?.addEventListener('click', () => {
  if (!cart.length) {
    showToast('سبد خرید خالی است', 'error');
    return;
  }

  // چک موجودی قبل از رفتن به صفحه پرداخت
  for (const item of cart) {
    const product = products.find(p => p.id === item.id);
    const stock = product ? (product.stock ?? 0) : 0;
    if (item.qty > stock) {
      showToast(`موجودی «${item.name}» فقط ${stock} عدد است. تعداد سبد را کم کنید.`, 'error');
      return;
    }
  }

  window.location.href = '/checkout.html';
});
  // Search
  $('#searchInput')?.addEventListener('input', handleSearch);

  // Close modals
  $$('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-close');
      if (id) closeModal(id);
    });
  });

  // Close on overlay click
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // Mobile menu
  $('#menuToggle')?.addEventListener('click', () => {
    $('#nav')?.classList.toggle('open');
  });

  // Header scroll effect
  window.addEventListener('scroll', () => {
    const header = $('#header');
    if (window.scrollY > 40) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  });

  // Smooth nav active
  $$('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      $$('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      $('#nav')?.classList.remove('open');
    });
  });

  // Category filters
$$('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.category;
    applyFilters();
  });
});
}