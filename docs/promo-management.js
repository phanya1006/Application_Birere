// Gestionnaire des codes promo
const PromoManager = {
    promoCodes: [],
    currentPromo: null,
    discountAmount: 0,

    // Charger les codes promo
    async loadPromoCodes() {
        try {
            const response = await fetch('promo-codes.json');
            if (!response.ok) throw new Error("Erreur de chargement des codes promo");
            const data = await response.json();
            this.promoCodes = data.promoCodes || [];
            console.log(`${this.promoCodes.length} codes promo chargés`);
        } catch (error) {
            console.error("Erreur lors du chargement des codes promo:", error);
            this.promoCodes = [];
        }
    },

    // Valider un code promo
    validatePromoCode(promoCode, totalAmount) {
        const statusElement = document.getElementById('promoCodeStatus');
        
        if (!promoCode) {
            statusElement.textContent = "Veuillez entrer un code promo";
            statusElement.className = 'promo-invalid';
            this.currentPromo = null;
            this.discountAmount = 0;
            this.updateCartTotalWithDiscount(totalAmount);
            return false;
        }

        // Rechercher le code promo dans la liste
        const foundCode = this.promoCodes.find(code => 
            code.code === promoCode && code.active
        );
        
        if (foundCode) {
            // Vérifier la date d'expiration
            const now = new Date();
            const expiration = new Date(foundCode.expiration);
            
            if (now > expiration) {
                statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Code expiré';
                statusElement.className = 'promo-invalid';
                this.currentPromo = null;
                this.discountAmount = 0;
                this.updateCartTotalWithDiscount(totalAmount);
                return false;
            }
            
            // Vérifier le montant minimum d'achat
            if (foundCode.minPurchase && totalAmount < foundCode.minPurchase) {
                statusElement.innerHTML = `<i class="fas fa-times-circle"></i> Minimum ${foundCode.minPurchase}$ requis`;
                statusElement.className = 'promo-invalid';
                this.currentPromo = null;
                this.discountAmount = 0;
                this.updateCartTotalWithDiscount(totalAmount);
                return false;
            }
            
            statusElement.innerHTML = `<i class="fas fa-check-circle"></i> Code vérifié - ${foundCode.discount}% de réduction`;
            statusElement.className = 'promo-valid';
            this.currentPromo = foundCode;
            this.updateCartTotalWithDiscount(totalAmount);
            return true;
        } else {
            statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Code invalide';
            statusElement.className = 'promo-invalid';
            this.currentPromo = null;
            this.discountAmount = 0;
            this.updateCartTotalWithDiscount(totalAmount);
            return false;
        }
    },

    // Mettre à jour l'affichage du total avec réduction
    updateCartTotalWithDiscount(totalAmount) {
        const total = totalAmount || config.cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
        const totalElement = document.getElementById('cartTotal');
        
        if (this.currentPromo && this.currentPromo.active) {
            this.discountAmount = total * (this.currentPromo.discount / 100);
            const discountedTotal = total - this.discountAmount;
            
            totalElement.innerHTML = `
                <div class="price-discounted">
                    <span class="original-price">${convertCurrency(total)}</span>
                    <span class="discounted-price">${convertCurrency(discountedTotal)}</span>
                    <div class="savings">Économie: ${convertCurrency(this.discountAmount)} (${this.currentPromo.discount}%)</div>
                </div>
            `;
        } else {
            this.discountAmount = 0;
            totalElement.textContent = `${translate('total')} ${convertCurrency(total)}`;
        }
    },

    // Appliquer la réduction au message de commande
    applyDiscountToOrder(message, total) {
        if (this.currentPromo) {
            message += `\nCode Promo Appliqué: ${this.currentPromo.code}`;
            message += `\nRéduction: -${convertCurrency(this.discountAmount)} (${this.currentPromo.discount}%)`;
            message += `\n${translate('total')} Avant Réduction: ${convertCurrency(total)}`;
            message += `\n${translate('total')} Après Réduction: ${convertCurrency(total - this.discountAmount)}`;
        } else {
            message += `\n\n${translate('total')}: ${convertCurrency(total)}`;
        }
        return message;
    },

    // Réinitialiser le code promo
    resetPromo() {
        this.currentPromo = null;
        this.discountAmount = 0;
        const promoInput = document.getElementById('promoCodeInput');
        const statusElement = document.getElementById('promoCodeStatus');
        
        if (promoInput) promoInput.value = '';
        if (statusElement) {
            statusElement.textContent = '';
            statusElement.className = '';
        }
        
        this.updateCartTotalWithDiscount();
    },

    // Vérifier si un code promo est actif
    hasActivePromo() {
        return this.currentPromo !== null;
    },

    // Obtenir le montant de la réduction
    getDiscountAmount() {
        return this.discountAmount;
    }
};