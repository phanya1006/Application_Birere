// Configuration globale
const config = {
  phoneNumber: "+243990462408",
  theme: localStorage.getItem('theme') || 'dark',
  cart: [],
  products: [],
  uiState: {
    cartOpen: false,
    detailsOpen: false,
    selectedProduct: null,
    selectedOptions: {}
  }
};

// Initialisation
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  await loadProducts();
  initTheme();
  initEventListeners();
  renderProducts();
  updateCartCount();
  initPromoBanners();
  initSocialLinks();
  initPWA();
}

/* ========== FONCTIONS PRODUITS ========== */

async function loadProducts() {
  try {
    const response = await fetch('products.json');
    if (!response.ok) throw new Error("Erreur de chargement");
    config.products = await response.json();
  } catch (error) {
    console.error("Erreur:", error);
    config.products = [
      {
        "id": "produit-par-defaut",
        "name": "Produit non chargé",
        "category": "erreur",
        "image": "https://via.placeholder.com/200",
        "price": "0.00",
        "description": "Impossible de charger les produits"
      }
    ];
  }
}

function extractCategories() {
  const categories = new Set(config.products.map(p => p.category));
  return Array.from(categories);
}

function renderAllCategories() {
  const container = document.getElementById('allCategories');
  container.innerHTML = '';
  
  const categories = extractCategories();
  categories.forEach(category => {
    const productsInCategory = config.products.filter(p => p.category === category);
    const hasSubcategories = productsInCategory.some(p => p.subcategory);
    
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.innerHTML = `
      ${category}
      ${hasSubcategories ? '<span class="has-sub">›</span>' : ''}
    `;
    btn.dataset.category = category;
    
    btn.addEventListener('click', () => {
      if (hasSubcategories) {
        showSubcategories(category, productsInCategory);
      } else {
        filterByCategory(category);
        document.getElementById('categoriesSlide').classList.remove('open');
        updateModalState();
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        const mainBtn = document.querySelector(`.category-btn[data-category="${category}"]`);
        if (mainBtn) mainBtn.classList.add('active');
      }
    });
    
    container.appendChild(btn);
  });
}

function showSubcategories(category, products) {
  const subcategories = [...new Set(products.map(p => p.subcategory).filter(Boolean))];
  const container = document.getElementById('subcategoriesGrid');
  const title = document.getElementById('subcategoryTitle');
  
  container.innerHTML = '';
  title.textContent = category;
  
  if (subcategories.length > 0) {
    subcategories.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'subcategory-card';
      card.dataset.category = category;
      card.dataset.subcategory = sub;
      
      const imgSrc = products.find(p => p.subcategory === sub)?.image || 'https://via.placeholder.com/150';
      
      card.innerHTML = `
        <img src="${imgSrc}" alt="${sub}" loading="lazy">
        <h4>${sub}</h4>
      `;
      
      card.addEventListener('click', () => {
        filterProductsBySubcategory(category, sub);
        document.getElementById('categoriesSlide').classList.remove('open');
        updateModalState();
      });
      
      container.appendChild(card);
    });
  } else {
    const card = document.createElement('div');
    card.className = 'subcategory-card';
    const imgSrc = products[0]?.image || 'https://via.placeholder.com/150';
    card.innerHTML = `
      <img src="${imgSrc}" alt="${category}" loading="lazy">
      <h4>Voir tous</h4>
    `;
    card.addEventListener('click', () => {
      filterProductsBySubcategory(category, '');
      document.getElementById('categoriesSlide').classList.remove('open');
      updateModalState();
    });
    container.appendChild(card);
  }
  
  document.getElementById('subcategoriesSlide').classList.add('active');
}

function filterProductsBySubcategory(category, subcategory) {
  const container = document.getElementById('categorySections');
  container.innerHTML = '';

  const products = config.products.filter(p => 
    p.category === category && 
    (p.subcategory === subcategory || !subcategory)
  );

  if (products.length === 0) {
    container.innerHTML = '<p class="no-products">Aucun produit dans cette sous-catégorie</p>';
    return;
  }

  const section = createCategorySection(subcategory || category, products);
  container.appendChild(section);

  updateActiveCategoryButton(category);
}

function createCategorySection(title, products) {
  const section = document.createElement('div');
  section.className = 'category-section';
  
  const titleElement = document.createElement('h3');
  titleElement.className = 'category-title';
  titleElement.textContent = title;
  section.appendChild(titleElement);

  // Sous-catégories
  const subcategories = [...new Set(products.map(p => p.subcategory).filter(Boolean))];
  if (subcategories.length > 1) {
    const subcatContainer = document.createElement('div');
    subcatContainer.className = 'subcategories-container';
    
    subcategories.forEach(sub => {
      const btn = document.createElement('button');
      btn.className = 'subcategory-btn';
      btn.textContent = sub;
      btn.dataset.category = title;
      btn.dataset.subcategory = sub;
      
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterProductsBySubcategory(title, sub);
      });
      
      subcatContainer.appendChild(btn);
    });
    
    section.appendChild(subcatContainer);
  }

  // Produits
  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'product-scroll-container';
  
  products.forEach(product => {
    scrollContainer.appendChild(createProductCard(product));
  });
  
  section.appendChild(scrollContainer);
  return section;
}

function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.dataset.name = product.name.toLowerCase();
  card.dataset.category = product.category;
  card.dataset.id = product.id;
  
  card.innerHTML = `
    <img src="${product.image}" alt="${product.name}" loading="lazy">
    <div class="product-info">
      <h3>${product.name}</h3>
      <div class="price">${product.price} USD</div>
      ${product.rating ? `
      <div class="rating">
        ${'★'.repeat(Math.round(product.rating))}${'☆'.repeat(5-Math.round(product.rating))}
        <span>(${product.reviews || 0})</span>
      </div>` : ''}
    </div>
    <div class="product-actions">
      <button class="order-btn">Commander</button>
      <button class="add-cart-btn">Ajouter</button>
    </div>
  `;
  
  card.querySelector('img').addEventListener('click', () => showProductDetails(product.id));
  card.querySelector('.order-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openWhatsApp(`Bonjour, je veux commander : ${product.name} (${product.price} USD)`);
  });
  card.querySelector('.add-cart-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    addToCart(product);
  });

  return card;
}

function renderProducts() {
  const container = document.getElementById('categorySections');
  container.innerHTML = '';
  
  const categories = [...new Set(config.products.map(p => p.category))];
  const shuffledCategories = shuffleArray(categories);

  shuffledCategories.forEach(category => {
    const products = config.products.filter(p => p.category === category);
    const shuffledProducts = shuffleArray(products);
    
    const section = createCategorySection(category, shuffledProducts);
    container.appendChild(section);
  });
}

/* ========== FONCTIONS PANIER ========== */

function toggleCart() {
  config.uiState.cartOpen = !config.uiState.cartOpen;
  document.getElementById('cartSidebar').classList.toggle('open', config.uiState.cartOpen);
  updateModalState();
}

function addToCart(product, options = {}) {
  const quantity = options.quantity || 1;
  
  const selectedImage = config.uiState.selectedProduct?.id === product.id 
    ? config.uiState.selectedImage 
    : product.image;

  const cartItem = {
    ...product,
    options,
    quantity,
    cartId: `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    addedAt: new Date().toISOString(),
    selectedImage: selectedImage
  };

  const existingIndex = config.cart.findIndex(item => 
    item.id === product.id && 
    JSON.stringify(item.options) === JSON.stringify(options) &&
    item.selectedImage === selectedImage
  );

  if (existingIndex >= 0) {
    config.cart[existingIndex].quantity += quantity;
  } else {
    config.cart.push(cartItem);
  }
  
  updateCartUI();
  showNotification(`${product.name} ajouté au panier`);
}

function updateCartUI() {
  displayCart();
  updateCartCount();
 
  if (config.cart.length === 1 && !config.uiState.cartOpen) {
    toggleCart();
  }
}

function displayCart() {
  const cartItems = document.getElementById('cartItems');
  cartItems.innerHTML = '';

  if (config.cart.length === 0) {
    cartItems.innerHTML = `
      <li class="empty-cart">
        <p>Votre panier est vide</p>
      </li>
    `;
    return;
  }

  config.cart.forEach(item => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    
    let optionsText = '';
    if (item.options && Object.keys(item.options).length > 0) {
      optionsText = `<div class="cart-item-options">${Object.entries(item.options)
        .map(([key, val]) => `<span>${key}: ${val}</span>`)
        .join('')}</div>`;
    }
    
    li.innerHTML = `
      <img src="${item.selectedImage || item.image}" alt="${item.name}" loading="lazy">
      <div class="cart-item-info">
        <h4>${item.name} <span class="item-qty">×${item.quantity}</span></h4>
        <div class="price">${(parseFloat(item.price) * item.quantity)} USD</div>
        ${optionsText}
      </div>
      <button class="remove-item-btn">&times;</button>
    `;
   
    li.querySelector('.remove-item-btn').addEventListener('click', () => removeFromCart(item.cartId));
    cartItems.appendChild(li);
  });

  const total = config.cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  document.getElementById('cartTotal').textContent = `${total.toFixed(2)} USD`;
}

function removeFromCart(cartId) {
  config.cart = config.cart.filter(item => item.cartId !== cartId);
  updateCartUI();
}

function clearCart() {
  if (confirm("Êtes-vous sûr de vouloir vider tout votre panier ?")) {
    config.cart = [];
    updateCartUI();
  }
}

function updateCartCount() {
  const count = config.cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartCountSidebar').textContent = count;
}

function orderCart() {
  if (config.cart.length === 0) {
    alert("Votre panier est vide.");
    return;
  }

  let message = "Bonjour, je souhaite commander :\n";
  config.cart.forEach(item => {
    message += `- ${item.name} (${item.price} USD)`;
    if (item.quantity > 1) message += ` × ${item.quantity}`;
    if (item.options) {
      message += ` [${Object.entries(item.options)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ')}]`;
    }
    if (item.selectedImage) {
      message += `\nImage: ${item.selectedImage}`;
    }
    message += `\n`;
  });

  const total = config.cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  message += `\nTotal: ${total.toFixed(2)} USD`;

  openWhatsApp(message);
}

/* ========== FICHE PRODUIT DÉTAILLÉE ========== */

function showProductDetails(productId) {
  const product = config.products.find(p => p.id === productId);
  if (!product) return;

  config.uiState = {
    detailsOpen: true,
    selectedProduct: product,
    selectedOptions: {},
    selectedImage: product.image
  };
  
  updateModalState();

  document.getElementById('detailsContent').innerHTML = `
    <div class="product-gallery">
      <div class="main-image">
        <img src="${product.image}" alt="${product.name}" loading="lazy" id="mainProductImage">
      </div>
      ${product.images && product.images.length > 0 ? `
      <div class="thumbnail-container">
        ${[product.image, ...product.images].map((img, index) => `
          <div class="thumbnail ${index === 0 ? 'selected' : ''}" data-image="${img}">
            <img src="${img}" alt="${product.name}" loading="lazy">
          </div>
        `).join('')}
      </div>` : ''}
    </div>
    
    <div class="product-details">
      <div class="product-header">
        <h2>${product.name}</h2>
        <div class="price">${product.price} USD</div>
        ${product.rating ? `
        <div class="rating">
          ${'★'.repeat(Math.round(product.rating))}${'☆'.repeat(5-Math.round(product.rating))}
          <span>(${product.reviews || 0} avis)</span>
        </div>` : ''}
      </div>
      
      <p class="description">${product.description || 'Pas de description disponible.'}</p>
      
      ${product.details ? `
      <div class="specs">
        <h4>Détails techniques</h4>
        <ul>
          ${Object.entries(product.details).map(([key, value]) => `
            <li><strong>${key}:</strong> ${value}</li>
          `).join('')}
        </ul>
      </div>` : ''}
      
      ${product.options ? `
      <div class="product-options">
        <h4>Options</h4>
        ${product.options.map(opt => `
          <div class="option-group">
            <h5>${opt.name}</h5>
            <div class="option-values">
              ${opt.values.map(val => `
                <button class="option-btn" 
                        data-option="${opt.name}" 
                        data-value="${val}">
                  ${opt.type === 'color' ? `<span style="background:${val}"></span>` : val}
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>` : ''}
      
      <div class="details-actions">
        <div class="quantity-selector">
          <button class="qty-btn minus">-</button>
          <input type="number" value="1" min="1" class="qty-input">
          <button class="qty-btn plus">+</button>
        </div>
        <button class="add-cart-btn full-width">Ajouter au panier</button>
      </div>
    </div>
  `;

  const qtyInput = document.querySelector('.qty-input');
  document.querySelector('.qty-btn.minus').addEventListener('click', () => {
    if (parseInt(qtyInput.value) > 1) qtyInput.value = parseInt(qtyInput.value) - 1;
  });
  
  document.querySelector('.qty-btn.plus').addEventListener('click', () => {
    qtyInput.value = parseInt(qtyInput.value) + 1;
  });

  document.querySelector('.add-cart-btn').addEventListener('click', () => {
    const quantity = parseInt(qtyInput.value);
    addToCart(product, { 
      ...config.uiState.selectedOptions,
      quantity 
    });
    closeProductDetails();
  });

  if (product.options) {
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const optionName = this.dataset.option;
        const optionValue = this.dataset.value;
        
        document.querySelectorAll(`.option-btn[data-option="${optionName}"]`)
          .forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        
        config.uiState.selectedOptions = {
          ...config.uiState.selectedOptions,
          [optionName]: optionValue
        };
      });
    });
  }

  if (product.images && product.images.length > 0) {
    document.querySelectorAll('.thumbnail').forEach((thumb) => {
      thumb.addEventListener('click', function() {
        const imgUrl = this.dataset.image;
        document.getElementById('mainProductImage').src = imgUrl;
        config.uiState.selectedImage = imgUrl;
        
        document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('selected'));
        this.classList.add('selected');
      });
    });
  }

  document.getElementById('productDetailsSlide').classList.add('open');
}

function closeProductDetails() {
  config.uiState.detailsOpen = false;
  config.uiState.selectedProduct = null;
  config.uiState.selectedOptions = {};
  config.uiState.selectedImage = null;
  updateModalState();
  document.getElementById('productDetailsSlide').classList.remove('open');
}

/* ========== FONCTIONS UTILITAIRES ========== */

function openWhatsApp(message) {
  window.open(`https://wa.me/${config.phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
}

function filterProducts() {
  const input = document.getElementById('searchInput').value.toLowerCase();
  const container = document.getElementById('categorySections');
  container.innerHTML = '';

  const filteredProducts = config.products.filter(p => 
    p.name.toLowerCase().includes(input) || 
    p.description.toLowerCase().includes(input) ||
    p.category.toLowerCase().includes(input) ||
    (p.subcategory && p.subcategory.toLowerCase().includes(input))
  );

  if (input.trim() === '') {
    renderProducts();
    return;
  }

  if (filteredProducts.length === 0) {
    container.innerHTML = '<p class="no-products">Aucun résultat trouvé pour "' + input + '"</p>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'product-grid vertical-scroll';
  
  filteredProducts.forEach(product => {
    grid.appendChild(createProductCard(product));
  });
  
  container.appendChild(grid);
}

function filterByCategory(category) {
  const container = document.getElementById('categorySections');
  container.innerHTML = '';
  
  if (category === 'all') {
    renderProducts();
    return;
  }

  const products = config.products.filter(p => p.category === category);
  const subcategories = [...new Set(products.map(p => p.subcategory).filter(Boolean))];

  if (subcategories.length === 0) {
    const section = createCategorySection(category, products);
    container.appendChild(section);
    return;
  }

  subcategories.forEach(subcategory => {
    const subProducts = products.filter(p => p.subcategory === subcategory);
    const section = createCategorySection(subcategory, subProducts);
    container.appendChild(section);
  });

  updateActiveCategoryButton(category);
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  renderProducts();
  
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector('.category-btn[data-category="all"]').classList.add('active');
}

function updateModalState() {
  const hasCartOrDetails = config.uiState.cartOpen || config.uiState.detailsOpen;
  const hasCategoriesSlide = document.getElementById('categoriesSlide').classList.contains('open');
  
  document.body.classList.toggle('modal-open', hasCartOrDetails || hasCategoriesSlide);
  document.getElementById('overlay').style.display = (hasCartOrDetails || hasCategoriesSlide) ? 'block' : 'none';
  document.body.style.overflow = (hasCartOrDetails || hasCategoriesSlide) ? 'hidden' : 'auto';
}

function showNotification(message) {
  const notification = document.getElementById('cartNotification');
  notification.textContent = message;
  notification.classList.add('show');
 
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

/* ========== GESTION DU THÈME ========== */

function initTheme() {
  document.body.setAttribute('data-theme', config.theme);
  updateThemeButtons();
}

function updateThemeButtons() {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === config.theme);
  });
}

/* ========== ÉCOUTEURS D'ÉVÉNEMENTS ========== */

function initEventListeners() {
  // Overlay
  document.getElementById('overlay').addEventListener('click', () => {
    if (config.uiState.cartOpen) toggleCart();
    if (config.uiState.detailsOpen) closeProductDetails();
    document.getElementById('categoriesSlide').classList.remove('open');
    updateModalState();
  });
 
  // Touche Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (config.uiState.cartOpen) toggleCart();
      if (config.uiState.detailsOpen) closeProductDetails();
      document.getElementById('categoriesSlide').classList.remove('open');
      updateModalState();
    }
  });
 
  // Panier
  document.getElementById('cartButton').addEventListener('click', toggleCart);
  document.querySelector('.close-cart').addEventListener('click', toggleCart);
  document.querySelector('.clear-cart-btn').addEventListener('click', clearCart);
  document.querySelector('.order-btn').addEventListener('click', orderCart);
 
  // Recherche
  document.getElementById('searchButton').addEventListener('click', filterProducts);
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') filterProducts();
  });
 
  // Catégories principales
  document.querySelectorAll('.category-btn:not(.more-btn)').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const category = this.dataset.category;
      if (category === 'all') {
        renderProducts();
      } else {
        filterByCategory(category);
      }
    });
  });
 
  // Bouton Plus
  document.getElementById('moreCategories').addEventListener('click', () => {
    renderAllCategories();
    document.getElementById('categoriesSlide').classList.add('open');
    updateModalState();
  });
 
  // Fermeture catégories
  document.querySelector('.close-categories').addEventListener('click', () => {
    document.getElementById('categoriesSlide').classList.remove('open');
    updateModalState();
  });

  document.querySelector('.close-details').addEventListener('click', (e) => {
    e.stopPropagation();
    closeProductDetails();
  });
 
  // Thème
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      config.theme = this.dataset.theme;
      document.body.setAttribute('data-theme', config.theme);
      localStorage.setItem('theme', config.theme);
      updateThemeButtons();
    });
  });

  // Bouton "Voir tous les produits"
  document.getElementById('seeAllBtn').addEventListener('click', function() {
    document.querySelector('.main-container').style.display = 'none';
    document.getElementById('allProductsPage').style.display = 'block';
    initMasonryGrid();
  });

  // Bouton Retour à l'accueil
  document.querySelector('.back-to-home-btn').addEventListener('click', function() {
    document.getElementById('allProductsPage').style.display = 'none';
    document.querySelector('.main-container').style.display = 'block';
    window.scrollTo(0, 0);
  });
}

/* ========== FONCTIONS PWA ========== */

function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker enregistré avec succès');

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (confirm("Une nouvelle version est disponible. Recharger l'application ?")) {
                newWorker.postMessage({ action: 'skipWaiting' });
              }
            }
          });
        });
      })
      .catch(err => console.error("Échec de l'enregistrement :", err));

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });
}

function showInstallButton() {
  if (document.getElementById('installBtn')) return;

  const installBtn = document.createElement('button');
  installBtn.id = 'installBtn';
  installBtn.className = 'install-btn';
  installBtn.innerHTML = '📲 Installer l\'app';
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('App installée');
      installBtn.remove();
    }
    deferredPrompt = null;
  });
  document.body.appendChild(installBtn);
}

/* ========== FONCTIONS MASONRY ========== */

function initMasonryGrid() {
  const grid = document.getElementById('masonryGrid');
  if (!grid) return;

  grid.innerHTML = '';
  
  // Créer un tableau de colonnes
  const columns = 3;
  const columnElements = [];
  
  for (let i = 0; i < columns; i++) {
    const column = document.createElement('div');
    column.className = 'masonry-column';
    grid.appendChild(column);
    columnElements.push(column);
  }
  
  // Répartir les produits dans les colonnes
  config.products.forEach((product, index) => {
    const columnIndex = index % columns;
    const column = columnElements[columnIndex];
    
    const item = document.createElement('div');
    item.className = 'masonry-item';
    item.dataset.id = product.id;
    
    item.innerHTML = `
      <img src="${product.image}" alt="${product.name}" class="masonry-img">
      <div class="masonry-overlay">
        <h3>${product.name}</h3>
        <p>${product.price} USD</p>
      </div>
    `;
    
    item.addEventListener('click', () => {
      showProductDetails(product.id);
    });
    
    column.appendChild(item);
  });
}

/* ========== FONCTIONS PROMO BANNERS ========== */

function initPromoBanners() {
  const banners = document.querySelectorAll('.promo-banner');
  let currentBanner = 0;
  
  // Afficher la première bannière
  banners[currentBanner].classList.add('active');
  
  // Rotation automatique
  setInterval(() => {
    banners[currentBanner].classList.remove('active');
    currentBanner = (currentBanner + 1) % banners.length;
    banners[currentBanner].classList.add('active');
  }, 5000);
}

/* ========== FONCTIONS SOCIALES ========== */

function initSocialLinks() {
  const socialConfig = {
    facebook: 'https://facebook.com/birereexpress',
    whatsapp: `https://wa.me/${config.phoneNumber}`,
    instagram: 'https://instagram.com/birereexpress',
    tiktok: 'https://tiktok.com/@birereexpress',
    snapchat: 'https://snapchat.com/add/birereexpress'
  };

  Object.entries(socialConfig).forEach(([platform, url]) => {
    const element = document.getElementById(`${platform}Link`);
    if (element) element.href = url;
  });
}

/* ========== FONCTIONS UTILITAIRES ========== */

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function updateActiveCategoryButton(category) {
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.category === category) {
      btn.classList.add('active');
    } else if (category === 'all' && btn.dataset.category === 'all') {
      btn.classList.add('active');
    }
  });
}
