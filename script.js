// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let products = [];
let categories = [];
let cart = [];
let selectedWeights = {};

// URL твоего Google Apps Script
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzTtNM2U-fb2ENK8eB8NgQCcUKCBLO7F2miRg9aY3ZH3XrfosvCnQIjlVqv4uAmF1XU/exec';

// ===== ЗАГРУЗКА ТОВАРОВ ИЗ ТАБЛИЦЫ =====
// ===== ЗАГРУЗКА ТОВАРОВ ИЗ ТАБЛИЦЫ (ВСЕГДА СВЕЖИЕ) =====
async function loadProducts() {
  try {
    const container = document.getElementById('productsList');
    
    // Показываем индикатор загрузки
    container.innerHTML = `
      <div class="loading-container">
        <span class="loading-icon">⏳</span>
        <h3 class="loading-title">Загружаем товары...</h3>
        <p class="loading-text">Это займёт несколько секунд</p>
      </div>
    `;
    
    console.log('🔄 Загрузка товаров из Google Таблицы...');
    
    const response = await fetch(GOOGLE_SHEET_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP ошибка: ${response.status}`);
    }
    
    products = await response.json();
    console.log('✅ Товары загружены:', products.length, 'шт');
    
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Пустой ответ или не массив');
    }
    
    // Создаём категории
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    categories = [
      { id: 'all', name: 'Все товары', emoji: '' },
      ...uniqueCategories.map(cat => ({
        id: cat,
        name: getCategoryName(cat),
        emoji: getCategoryEmoji(cat)
      }))
    ];
    
    renderCategories();
    showProducts('all');
    
  } catch (error) {
    console.error('❌ Ошибка загрузки:', error);
    
    const container = document.getElementById('productsList');
    container.innerHTML = `
      <div class="loading-container">
        <span class="loading-icon" style="animation:none">⚠️</span>
        <h3 class="loading-title">Не удалось загрузить товары</h3>
        <p class="loading-text">${error.message}</p>
        <button onclick="location.reload()" style="margin-top:20px;background:#4CAF50;color:white;border:none;padding:12px 30px;border-radius:8px;font-size:16px;cursor:pointer">🔄 Попробовать снова</button>
      </div>
    `;
  }
}
// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Старт приложения...');
  await loadProducts();
  loadCart();
  updateFAB();
  
  if (window.WebApp) {
    WebApp.ready();
    WebApp.setHeaderColor('#2C1E1E');
    WebApp.setBackgroundColor('#F5EDE4');
    WebApp.expand();
  }
  
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) {
    overlay.addEventListener('click', closeCart);
  }
  
  console.log('✅ Приложение готово');
});

// ===== КАТЕГОРИИ =====
function renderCategories() {
  const container = document.querySelector('.filter-container');
  if (!container) return;
  
  container.innerHTML = categories.map(cat => `
    <button class="filter-pill ${cat.id === 'all' ? 'active' : ''}" 
            onclick="filterCategory('${cat.id}', this)">
      ${cat.emoji} ${cat.name}
    </button>
  `).join('');
}

function getCategoryName(category) {
  const names = {
    'walnut': 'Грецкий орех',
    'almond': 'Миндаль',
    'cashew': 'Кешью',
    'peanut': 'Арахис',
    'raisin': 'Изюм',
    'dates': 'Финики',
    'dried': 'Сухофрукты',
    'pistachio': 'Фисташки',
    'macadamia': 'Макадамия',
    'seeds': 'Семечки',
    'snacks': 'Снеки',
    'honey': 'В меду',
    'candy': 'Конфеты',
    'mix': 'Смеси',
    'hazelnut': 'Фундук',
    'pineapple': 'Ананас',
    'cranberry': 'Клюква'
  };
  return names[category] || category;
}

function getCategoryEmoji(category) {
  const emojis = {
    'walnut': '🌰',
    'almond': '🥜',
    'cashew': '🥜',
    'peanut': '🥜',
    'raisin': '🍇',
    'dates': '🌴',
    'dried': '🍑',
    'pistachio': '🥜',
    'macadamia': '🥜',
    'seeds': '🌻',
    'snacks': '🍿',
    'honey': '🍯',
    'candy': '🍬',
    'pineapple': '🍍',
    'mix': '🥗',
    'hazelnut': '🌰',
    'pineapple': '🍍',
    'cranberry': '🧆'
  };
  return emojis[category] || '📦';
}

// ===== ТОВАРЫ (ИСПРАВЛЕННЫЕ КАРТИНКИ) =====
function showProducts(category) {
  const container = document.getElementById('productsList');
  if (!container) return;
  
  const filtered = category === 'all' ? products : products.filter(p => p.category === category);
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-products"><span style="font-size: 64px;">📦</span><p>В этой категории пока нет товаров</p></div>';
    return;
  }
  
  container.innerHTML = filtered.map((product, index) => {
    // Обработка весов
    let weights = product.weights;
    if (typeof weights === 'string') {
      weights = weights.split(',').map(w => w.trim());
    }
    if (!Array.isArray(weights) || weights.length === 0) {
      weights = ['1 кг'];
    }
    
    // Обработка картинки - убираем пробелы
    const imageUrl = product.image ? String(product.image).trim() : '';
    const emoji = product.emoji || getCategoryEmoji(product.category);
    
    console.log(`🖼️ Товар ${product.name}:`, imageUrl);
    
    return `
      <div class="product-card" style="animation-delay: ${index * 50}ms">
        <div class="product-image">
          <img src="${imageUrl}" 
               alt="${product.name}" 
               onerror="console.log('❌ Не загрузилось:', this.src); this.style.display='none'; this.parentElement.querySelector('.emoji-fallback').style.display='flex'">
          <div class="emoji-fallback" style="display: none; font-size: 64px; align-items: center; justify-content: center; height: 200px;">${emoji}</div>
        </div>
        <div class="product-content">
          <span class="product-category">${getCategoryName(product.category)}</span>
          <h3 class="product-name">${product.name}</h3>
          
          ${weights.length > 1 ? `
          <div class="weight-selector">
            ${weights.map((w, i) => `
              <button class="weight-btn ${i === 0 ? 'active' : ''}" 
                      onclick="selectWeight(this, ${product.id}, '${w}')">
                ${w}
              </button>
            `).join('')}
          </div>
          ` : `<p class="product-weight">${weights[0]}</p>`}
          
          <div class="product-footer">
            <span class="product-price" id="price-${product.id}">${formatPrice(getPriceForWeight(product, weights[0]))}</span>
            <button class="add-to-cart" onclick="addToCart(${product.id})">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="5 12 12 19 19 12"></polyline>
              </svg>
              <span>В корзину</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function selectWeight(btn, productId, weight) {
  const container = btn.parentElement;
  container.querySelectorAll('.weight-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedWeights[productId] = weight;
  
  const product = products.find(p => p.id == productId);
  const priceEl = document.getElementById(`price-${productId}`);
  if (priceEl && product) {
    priceEl.textContent = formatPrice(getPriceForWeight(product, weight));
  }
}

function getPriceForWeight(product, weight) {
  const match = weight.match(/(\d+)\s*(г|кг)/);
  if (!match) return product.price;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  const weightInGrams = unit === 'кг' ? value * 1000 : value;
  
  return Math.round((product.price * weightInGrams) / 1000);
}

function addToCart(productId) {
  const product = products.find(p => p.id == productId);
  if (!product) return;
  
  let weights = product.weights;
  if (typeof weights === 'string') {
    weights = weights.split(',').map(w => w.trim());
  }
  
  const selectedWeight = selectedWeights[productId] || weights[0];
  const price = getPriceForWeight(product, selectedWeight);
  
  const existing = cart.find(item => item.id == productId && item.weight === selectedWeight);
  
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ 
      id: product.id,
      name: product.name,
      price: price,
      category: product.category,
      image: product.image,
      emoji: product.emoji || getCategoryEmoji(product.category),
      weight: selectedWeight,
      quantity: 1 
    });
  }
  
  saveCart();
  if (navigator.vibrate) navigator.vibrate(10);
}

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

function filterCategory(category, btn) {
  document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
  btn.classList.add('active');
  showProducts(category);
  setTimeout(() => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function scrollToProducts() {
  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function loadCart() {
  try {
    const saved = localStorage.getItem('cart');
    if (saved) {
      cart = JSON.parse(saved);
      cart = cart.map(item => ({ ...item, weight: item.weight || '1 кг' }));
      updateCartCount();
      updateFAB();
    }
  } catch (e) {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  updateFAB();
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cartCount');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function updateFAB() {
  const fab = document.getElementById('orderFAB');
  if (!fab) return;
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const counterEl = fab.querySelector('.fab-counter');
  const textEl = fab.querySelector('.fab-text');
  const priceEl = fab.querySelector('.fab-price');
  
  if (counterEl) counterEl.textContent = totalItems;
  if (textEl) textEl.textContent = totalItems > 0 ? 'Заказать' : 'Корзина';
  if (priceEl) priceEl.textContent = formatPrice(totalPrice);
  
  fab.classList.toggle('active', totalItems > 0);
}

function showCart() {
  const sidebar = document.getElementById('cartSidebar');
  const container = document.getElementById('cartItems');
  if (!sidebar || !container) return;
  
  document.body.classList.add('no-scroll');
  
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🛒</div>
        <h3>Корзина пуста</h3>
        <p>Добавьте товары из каталога</p>
        <button class="btn btn-primary" onclick="closeCart(); scrollToProducts();" style="margin-top: 16px;">Перейти к каталогу</button>
      </div>
    `;
  } else {
    container.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-image">${item.emoji || '📦'}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-weight">${item.weight}</div>
          <div class="cart-item-price">${formatPrice(item.price)}</div>
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty(${item.id}, '${item.weight}', -1); event.stopPropagation();">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="changeQty(${item.id}, '${item.weight}', 1); event.stopPropagation();">+</button>
            <button class="remove-btn" onclick="removeFromCart(${item.id}, '${item.weight}'); event.stopPropagation();">🗑</button>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalPriceEl = document.getElementById('totalPrice');
  if (totalPriceEl) totalPriceEl.textContent = formatPrice(total);
  
  sidebar.classList.add('active');
}

function closeCart() {
  const sidebar = document.getElementById('cartSidebar');
  if (!sidebar) return;
  sidebar.classList.remove('active');
  document.body.classList.remove('no-scroll');
}

function changeQty(productId, weight, delta) {
  const item = cart.find(item => item.id == productId && item.weight === weight);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(productId, weight);
    } else {
      saveCart();
      showCart();
    }
  }
  event?.stopPropagation();
}

function removeFromCart(productId, weight) {
  cart = cart.filter(item => !(item.id == productId && item.weight === weight));
  saveCart();
  showCart();
  event?.stopPropagation();
}

function showCheckout() {
  if (cart.length === 0) {
    alert('Корзина пуста!');
    return;
  }
  closeCart();
  document.body.classList.add('no-scroll');
  
  const summary = document.getElementById('orderSummary');
  if (!summary) return;
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  summary.innerHTML = `
    <div class="order-item"><span>Товары (${itemsCount} шт)</span><span>${formatPrice(total)}</span></div>
    <div class="order-item"><span>Доставка</span><span style="color: #4CAF50;">Бесплатно</span></div>
    <div class="order-item" style="font-weight: 700; font-size: 18px; margin-top: 12px; padding-top: 12px; border-top: 2px solid #E5E5E5;">
      <span>Итого</span><span style="color: #4CAF50;">${formatPrice(total)}</span>
    </div>
  `;
  
  document.getElementById('checkoutModal')?.classList.add('active');
}

function closeCheckout() {
  document.getElementById('checkoutModal')?.classList.remove('active');
  document.body.classList.remove('no-scroll');
}

function closeSuccess() {
  document.getElementById('successModal')?.classList.remove('active');
  document.body.classList.remove('no-scroll');
  if (window.WebApp) WebApp.close();
}

async function submitOrder() {
  const name = document.getElementById('name')?.value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const address = document.getElementById('address')?.value.trim();
  const comment = document.getElementById('comment')?.value.trim();
  
  if (!name || !phone || !address) {
    alert('Заполните все обязательные поля!');
    return;
  }
  
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
  if (!phoneRegex.test(phone)) {
    alert('Введите корректный номер телефона');
    return;
  }
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const orderDate = new Date().toLocaleString('ru-RU');
  
  const submitBtn = document.querySelector('#checkoutModal .btn-primary');
  const originalText = submitBtn ? submitBtn.textContent : 'Подтвердить заказ';
  if (submitBtn) {
    submitBtn.textContent = 'Отправка...';
    submitBtn.disabled = true;
  }
  
  const orderData = {
    date: orderDate,
    name: name,
    phone: phone,
    address: address,
    comment: comment,
    items: cart,
    total: total
  };
  
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwI-pcwcxOKkp81L_I_LLDEc_geqIYNqUZeT8f3PeITGUXZT089EncRVGrVySrekqc/exec';
  
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    closeCheckout();
    document.getElementById('successModal')?.classList.add('active');
    
    cart = [];
    saveCart();
    
    document.getElementById('name').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('address').value = '';
    document.getElementById('comment').value = '';
    
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка отправки. Попробуйте позже или позвоните нам.');
  } finally {
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
}

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ =====
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.showCart = showCart;
window.closeCart = closeCart;
window.showCheckout = showCheckout;
window.closeCheckout = closeCheckout;
window.submitOrder = submitOrder;
window.closeSuccess = closeSuccess;
window.scrollToProducts = scrollToProducts;
window.filterCategory = filterCategory;
window.selectWeight = selectWeight;
