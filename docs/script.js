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
document.querySelector('.category-btn[data-category="all"]').addEventListener('click', () => {
  resetFilters();
});
document.querySelector('.back-to-categories').addEventListener('click', () => {
  document.getElementById('subcategoriesSlide').classList.remove('active');
  // Réinitialiser le filtre si nécessaire
  if (!document.querySelector('.category-btn.active')) {
    resetFilters();
  }
});

async function initApp() {
  await loadProducts();
  initTheme();
  initEventListeners();
  renderProducts();
  updateCartCount();
  
  // Initialisation PWA
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
    // Fallback si le chargement échoue
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

// Dans la fonction renderAllCategories
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

// Modifiez la fonction showSubcategories comme suit :
function showSubcategories(category, products) {
  const subcategories = [...new Set(products.map(p => p.subcategory).filter(Boolean))];
  const container = document.getElementById('subcategoriesGrid');
  const title = document.getElementById('subcategoryTitle');
  
  container.innerHTML = '';
  title.textContent = category;
  
  if (subcategories.length > 0) {
    subcategories.forEach(sub => {
      const productsInSub = products.filter(p => p.subcategory === sub);
      const card = document.createElement('div');
      card.className = 'subcategory-card';
      card.dataset.category = category;
      card.dataset.subcategory = sub;
      
      const imgSrc = productsInSub[0]?.image || 'https://via.placeholder.com/150';
      
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
    // Fallback si pas de sous-catégories
    const card = document.createElement('div');
    card.className = 'subcategory-card';
    card.innerHTML = `
      <img src="${products[0]?.image || 'https://via.placeholder.com/150'}" alt="${category}" loading="lazy">
      <h4>Voir tous</h4>
    `;
    card.addEventListener('click', () => {
      filterByCategory(category);
      document.getElementById('categoriesSlide').classList.remove('open');
      updateModalState();
    });
    container.appendChild(card);
  }
  
  document.getElementById('subcategoriesSlide').classList.add('active');
}

// Nouvelle fonction pour filtrer les produits
function filterProductsBySubcategory(category, subcategory) {
  const productGrid = document.getElementById('productGrid');
  productGrid.innerHTML = '';
  
  const filteredProducts = config.products.filter(p => 
    p.category === category && 
    (p.subcategory === subcategory || !subcategory)
  );
  
  if (filteredProducts.length === 0) {
    productGrid.innerHTML = '<p class="no-products">Aucun produit dans cette sous-catégorie</p>';
    return;
  }
  
  filteredProducts.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.name = product.name.toLowerCase();
    card.dataset.category = product.category;
    card.dataset.subcategory = product.subcategory || '';
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
    
    productGrid.appendChild(card);
  });
}
// Nouvelle fonction pour filtrer par sous-catégorie
function filterBySubcategory(category, subcategory) {
  document.querySelectorAll('.product-card').forEach(card => {
    const matches = card.dataset.category === category && 
                   (card.dataset.subcategory === subcategory || 
                    !subcategory);
    card.style.display = matches ? 'block' : 'none';
  });
  
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
  const mainBtn = document.querySelector(`.category-btn[data-category="${category}"]`);
  if (mainBtn) mainBtn.classList.add('active');
}

// Dans initEventListeners, ajouter :
document.querySelector('.back-to-categories').addEventListener('click', () => {
  document.getElementById('subcategoriesSlide').classList.remove('active');
});

function renderProducts() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';

  config.products.forEach((product, index) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.name = product.name.toLowerCase();
    card.dataset.category = product.category;
    card.dataset.id = product.id;
    card.style.animationDelay = `${index * 0.1}s`;
   
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

    grid.appendChild(card);
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
  const cartItem = {
    ...product,
    options,
    quantity,
    cartId: `${product.id}-${Date.now()}`,
    addedAt: new Date().toISOString(),
    selectedImage: config.uiState.selectedImage || product.image // Sauvegarde l'image sélectionnée
  };

  const existingIndex = config.cart.findIndex(item => 
    item.id === product.id && 
    JSON.stringify(item.options) === JSON.stringify(options) &&
    item.selectedImage === cartItem.selectedImage // Ajoute cette comparaison
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
    
    // Utiliser item.selectedImage si elle existe, sinon l'image par défaut
    const displayImage = item.selectedImage || item.image;
    
    li.innerHTML = `
      <img src="${displayImage}" alt="${item.name}" loading="lazy">
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
    // Ajouter le lien de l'image sélectionnée
    if (item.selectedImage) {
      message += `\nImage: ${item.selectedImage}`;
    }
    message += `\n`;
  });

  const total = config.cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  message += `\nTotal: ${total.toFixed(2)} USD`;

  openWhatsApp(message);
}

function addToCart(product, options = {}) {
  const quantity = options.quantity || 1;
  
  // Garantie que l'image vient bien du produit courant
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

  // Vérifie si l'article existe déjà (même ID, mêmes options et même image)
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
/* ========== FICHE PRODUIT DÉTAILLÉE ========== */
function showProductDetails(productId) {
  const product = config.products.find(p => p.id === productId);
  if (!product) return;

  // Réinitialisation complète de l'état
  config.uiState = {
    detailsOpen: true,
    selectedProduct: product,
    selectedOptions: {},
    selectedImage: product.image // Toujours partir de l'image par défaut
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

  // Gestion des événements
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

  // Gestion des options
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

  // Gestion des thumbnails
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
  config.uiState.selectedImage= null;
  updateModalState();
  document.getElementById('productDetailsSlide').classList.remove('open');
}

/* ========== FONCTIONS UTILITAIRES ========== */

function openWhatsApp(message) {
  window.open(`https://wa.me/${config.phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
}

function filterProducts() {
  const input = document.getElementById('searchInput').value.toLowerCase();
  document.querySelectorAll('.product-card').forEach(card => {
    const matches = card.dataset.name.includes(input);
    card.style.display = matches ? 'block' : 'none';
  });
}

function filterByCategory(category) {
  // Réinitialiser complètement l'affichage
  if (category === 'all') {
    renderProducts(); // Réaffiche tous les produits
    return;
  }

  const productGrid = document.getElementById('productGrid');
  productGrid.innerHTML = '';

  const filteredProducts = config.products.filter(p => p.category === category);
  
  if (filteredProducts.length === 0) {
    productGrid.innerHTML = '<p class="no-products">Aucun produit dans cette catégorie</p>';
    return;
  }

  filteredProducts.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.name = product.name.toLowerCase();
    card.dataset.category = product.category;
    card.dataset.subcategory = product.subcategory || '';
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
    
    // Ajoutez les écouteurs d'événements comme avant...
    productGrid.appendChild(card);
  });
}
function resetFilters() {
  // Réinitialise tous les filtres et réaffiche tous les produits
  document.getElementById('searchInput').value = '';
  renderProducts();
  
  // Réinitialise l'état actif des boutons
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
      filterByCategory(this.dataset.category);
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
  // fermeture produits
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
}

/* ========== FONCTIONS PWA ========== */

function initPWA() {
  // Installation
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  // Vérification mise à jour
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}

function showInstallButton() {
  if (document.getElementById('installBtn')) return;

  const installBtn = document.createElement('button');
  installBtn.id = 'installBtn';
  installBtn.className = 'install-btn';
  installBtn.innerHTML = '📲 Installer l\'app';
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      // Si deferredPrompt n'est pas disponible, guidez l'utilisateur
      alert("Pour installer l'application, utilisez le menu de votre navigateur (icône de partage ou menu ⋮)");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('App installée');
      installBtn.remove();
    }
    deferredPrompt = null;
  });
  document.body.appendChild(installBtn);
  
  // Affichez toujours le bouton après 10s (solution alternative)
  setTimeout(() => {
    if (!document.getElementById('installBtn')) {
      showInstallButton();
    }
  }, 10000);
}
/* ==================== SERVICE WORKER & PWA ==================== */

// Enregistrement et gestion du Service Worker
// Remplacez les deux définitions de initPWA() par cette version unique
function initPWA() {
  // 1. Enregistrement du Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker enregistré avec succès');

        // 2. Gestion des mises à jour
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

    // 3. Rafraîchissement après mise à jour
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  // 4. Gestion de l'installation PWA
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });
}

// Affiche le bouton d'installation
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

// Appelez initPWA() dans votre fonction initApp()
async function initApp() {
  await loadProducts();
  initTheme();
  initEventListeners();
  renderProducts();
  updateCartCount();
  initPWA(); // <-- Ajoutez cette ligne !
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('beforeinstallprompt event fired'); // Debug
  showInstallButton();
  
  // Debug: affichez les critères d'installation
  e.userChoice.then(choice => {
    console.log('User choice:', choice.outcome);
  });
});
