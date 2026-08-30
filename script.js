(() => {
    /* ---------- Payment API config ----------
     * TODO: after deploying the api/ folder to Vercel (see PAYMENT_SETUP.md),
     * replace this with your deployment's URL, e.g.
     * 'https://telekung-maryam-api.vercel.app'. Leave as '' to keep
     * checkout disabled (shows a "belum tersedia" message) until then. */
    const API_BASE = '';

    /* ---------- Toast ---------- */
    const toast = document.getElementById('toast');
    let toastTimer;
    const showToast = (message) => {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    };

    /* ---------- Image fallback (graceful placeholder instead of a broken icon) ---------- */
    const PALETTE = ['#1f6b57', '#155537', '#9df5ab'];
    const placeholderDataUri = (label) => {
        const text = (label || 'Telekung Maryam').trim();
        const words = text.split(/\s+/);
        let line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
        let line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
        const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${PALETTE[0]}"/>
      <stop offset="100%" stop-color="${PALETTE[1]}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#g)"/>
  <circle cx="300" cy="150" r="46" fill="none" stroke="${PALETTE[2]}" stroke-width="3" opacity="0.85"/>
  <path d="M270 168c8 14 52 14 60 0" fill="none" stroke="${PALETTE[2]}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
  <text x="300" y="250" font-family="Manrope, Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${esc(line1)}</text>
  <text x="300" y="280" font-family="Manrope, Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${esc(line2)}</text>
  <text x="300" y="320" font-family="Manrope, Arial, sans-serif" font-size="14" fill="${PALETTE[2]}" text-anchor="middle" letter-spacing="2">TELEKUNG MARYAM</text>
</svg>`.trim();
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    };

    document.querySelectorAll('img').forEach((img) => {
        if (!img.hasAttribute('loading')) img.loading = 'lazy';
        img.addEventListener('error', () => {
            img.src = placeholderDataUri(img.alt);
            img.classList.add('img-fallback');
        }, { once: true });
    });

    /* ---------- Cart ---------- */
    const cartCountEl = document.getElementById('cart-count');
    const cartItemsEl = document.getElementById('cart-items');
    const cartEmptyEl = document.getElementById('cart-empty');
    const cartTotalEl = document.getElementById('cart-total');
    const cart = new Map(); // name -> { price, qty }

    const money = (n) => `RM${n.toLocaleString('en-MY')}`;

    const renderCart = () => {
        if (!cartItemsEl) return;
        cartItemsEl.querySelectorAll('.cart-item').forEach((el) => el.remove());
        let totalQty = 0;
        let totalPrice = 0;
        cart.forEach((entry, name) => {
            totalQty += entry.qty;
            totalPrice += entry.qty * entry.price;
            const row = document.createElement('div');
            row.className = 'cart-item';
            row.dataset.name = name;
            row.innerHTML = `
                <div class="cart-item-info">
                    <span class="cart-item-name">${name}</span>
                    <span class="cart-item-price">${money(entry.price)} x ${entry.qty}</span>
                </div>
                <div class="cart-item-actions">
                    <button class="qty-btn minus" aria-label="Kurangkan kuantiti ${name}">−</button>
                    <span class="qty">${entry.qty}</span>
                    <button class="qty-btn plus" aria-label="Tambah kuantiti ${name}">+</button>
                    <button class="remove-btn" aria-label="Buang ${name} dari troli">🗑</button>
                </div>`;
            cartItemsEl.appendChild(row);
        });
        if (cartEmptyEl) cartEmptyEl.style.display = cart.size === 0 ? 'block' : 'none';
        if (cartCountEl) {
            cartCountEl.textContent = totalQty;
            cartCountEl.classList.toggle('is-empty', totalQty === 0);
        }
        if (cartTotalEl) cartTotalEl.textContent = money(totalPrice);
    };

    const addToCart = (name, price) => {
        const entry = cart.get(name) || { price, qty: 0 };
        entry.qty += 1;
        cart.set(name, entry);
        renderCart();
    };

    cartItemsEl?.addEventListener('click', (e) => {
        const row = e.target.closest('.cart-item');
        if (!row) return;
        const name = row.dataset.name;
        const entry = cart.get(name);
        if (!entry) return;
        if (e.target.closest('.plus')) {
            entry.qty += 1;
        } else if (e.target.closest('.minus')) {
            entry.qty -= 1;
            if (entry.qty <= 0) cart.delete(name);
        } else if (e.target.closest('.remove-btn')) {
            cart.delete(name);
        } else {
            return;
        }
        renderCart();
    });

    document.querySelectorAll('.buy-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.product-card');
            const item = card?.dataset.item || 'Produk';
            const price = Number(card?.dataset.price || 0);
            addToCart(item, price);
            showToast(`${item} dimasukkan ke troli (${money(price)}).`);
        });
    });

    document.querySelectorAll('.wishlist-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.product-card');
            const item = card?.dataset.item || 'Produk';
            const isSaved = btn.classList.toggle('active');
            btn.textContent = isSaved ? 'Disimpan ♥' : 'Wishlist';
            showToast(isSaved ? `${item} disimpan ke wishlist.` : `${item} dibuang dari wishlist.`);
        });
    });

    /* ---------- Cart drawer open/close ---------- */
    const cartDrawer = document.getElementById('cart-drawer');
    const cartBackdrop = document.getElementById('cart-backdrop');
    const cartToggle = document.getElementById('cart-toggle');
    const cartClose = document.getElementById('cart-close');
    const cartCheckout = document.getElementById('cart-checkout');

    const openCart = () => {
        cartDrawer?.classList.add('open');
        cartDrawer?.setAttribute('aria-hidden', 'false');
        cartBackdrop?.removeAttribute('hidden');
        requestAnimationFrame(() => cartBackdrop?.classList.add('show'));
        cartToggle?.setAttribute('aria-expanded', 'true');
    };
    const closeCart = () => {
        cartDrawer?.classList.remove('open');
        cartDrawer?.setAttribute('aria-hidden', 'true');
        cartBackdrop?.classList.remove('show');
        setTimeout(() => cartBackdrop?.setAttribute('hidden', ''), 250);
        cartToggle?.setAttribute('aria-expanded', 'false');
    };
    cartToggle?.addEventListener('click', openCart);
    cartClose?.addEventListener('click', closeCart);
    cartBackdrop?.addEventListener('click', () => {
        closeCart();
        closeMobileNav();
    });
    cartCheckout?.addEventListener('click', async () => {
        if (cart.size === 0) {
            showToast('Troli anda masih kosong.');
            return;
        }
        if (!API_BASE) {
            showToast('Payment belum disambung. Sila hubungi kedai untuk pesanan buat masa ini.');
            return;
        }

        const nameInput = document.getElementById('checkout-name');
        const phoneInput = document.getElementById('checkout-phone');
        const emailInput = document.getElementById('checkout-email');
        const name = nameInput?.value.trim() || '';
        const phone = phoneInput?.value.trim() || '';
        const email = emailInput?.value.trim() || '';

        if (!name) {
            showToast('Sila isi nama penuh untuk checkout.');
            nameInput?.focus();
            return;
        }
        if (!phone) {
            showToast('Sila isi no. telefon untuk checkout.');
            phoneInput?.focus();
            return;
        }
        if (!email) {
            showToast('Sila isi e-mel untuk checkout (diperlukan oleh gateway pembayaran).');
            emailInput?.focus();
            return;
        }

        const items = Array.from(cart.entries()).map(([itemName, entry]) => ({ name: itemName, qty: entry.qty }));

        const originalLabel = cartCheckout.textContent;
        cartCheckout.disabled = true;
        cartCheckout.textContent = 'Memproses...';

        try {
            const resp = await fetch(`${API_BASE}/api/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, email, items }),
            });
            const data = await resp.json().catch(() => ({}));

            if (!resp.ok || !data.url) {
                showToast(data.error || 'Gagal mulakan pembayaran. Sila cuba lagi.');
                cartCheckout.disabled = false;
                cartCheckout.textContent = originalLabel;
                return;
            }

            // Hand off to Billplz's hosted payment page (FPX / DuitNow / card).
            window.location.href = data.url;
        } catch (err) {
            showToast('Tiada sambungan ke server pembayaran. Sila cuba lagi.');
            cartCheckout.disabled = false;
            cartCheckout.textContent = originalLabel;
        }
    });

    /* ---------- Mobile nav drawer ---------- */
    const mobileNav = document.getElementById('mobile-nav');
    const mobileNavBackdrop = document.getElementById('mobile-nav-backdrop');
    const menuToggle = document.getElementById('menu-toggle');
    const mobileNavClose = document.getElementById('mobile-nav-close');

    function openMobileNav() {
        mobileNav?.classList.add('open');
        mobileNav?.setAttribute('aria-hidden', 'false');
        mobileNavBackdrop?.removeAttribute('hidden');
        requestAnimationFrame(() => mobileNavBackdrop?.classList.add('show'));
        menuToggle?.setAttribute('aria-expanded', 'true');
    }
    function closeMobileNav() {
        mobileNav?.classList.remove('open');
        mobileNav?.setAttribute('aria-hidden', 'true');
        mobileNavBackdrop?.classList.remove('show');
        setTimeout(() => mobileNavBackdrop?.setAttribute('hidden', ''), 250);
        menuToggle?.setAttribute('aria-expanded', 'false');
    }
    menuToggle?.addEventListener('click', openMobileNav);
    mobileNavClose?.addEventListener('click', closeMobileNav);
    mobileNavBackdrop?.addEventListener('click', closeMobileNav);
    mobileNav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMobileNav));

    /* ---------- Search ---------- */
    const searchPanel = document.getElementById('search-panel');
    const searchToggle = document.getElementById('search-toggle');
    const searchClose = document.getElementById('search-close');
    const searchInput = document.getElementById('search-input');
    const searchHint = document.getElementById('search-hint');
    const productCards = Array.from(document.querySelectorAll('.product-card'));

    const openSearch = () => {
        searchPanel?.removeAttribute('hidden');
        searchToggle?.setAttribute('aria-expanded', 'true');
        searchInput?.focus();
    };
    const closeSearch = () => {
        searchPanel?.setAttribute('hidden', '');
        searchToggle?.setAttribute('aria-expanded', 'false');
        if (searchInput) searchInput.value = '';
        productCards.forEach((c) => c.classList.remove('is-hidden'));
        if (searchHint) searchHint.textContent = '';
    };
    searchToggle?.addEventListener('click', () => {
        const isOpen = !searchPanel?.hasAttribute('hidden');
        if (isOpen) closeSearch(); else openSearch();
    });
    searchClose?.addEventListener('click', closeSearch);

    searchInput?.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) {
            productCards.forEach((c) => c.classList.remove('is-hidden'));
            if (searchHint) searchHint.textContent = '';
            return;
        }
        let matches = 0;
        productCards.forEach((card) => {
            const name = (card.dataset.item || '').toLowerCase();
            const found = name.includes(q);
            card.classList.toggle('is-hidden', !found);
            if (found) matches += 1;
        });
        if (searchHint) {
            searchHint.textContent = matches === 0
                ? `Tiada produk sepadan dengan "${searchInput.value}".`
                : `${matches} produk ditemui.`;
        }
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    /* ---------- Back to top ---------- */
    const backToTop = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        if (!backToTop) return;
        if (window.scrollY > 600) backToTop.removeAttribute('hidden');
        else backToTop.setAttribute('hidden', '');
    }, { passive: true });
    backToTop?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ---------- Newsletter ---------- */
    const subscribeForm = document.getElementById('subscribe-form');
    const subscribeEmail = document.getElementById('subscribe-email');
    subscribeForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const value = subscribeEmail?.value.trim() || '';
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        if (!isValid) {
            showToast('Sila masukkan e-mel yang sah.');
            subscribeEmail?.focus();
            return;
        }
        showToast('Terima kasih! Anda telah melanggan.');
        subscribeForm.reset();
    });

    /* ---------- Smooth scroll for in-page links ---------- */
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                closeMobileNav();
                closeSearch();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    /* ---------- Escape key closes any open overlay ---------- */
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        closeMobileNav();
        closeCart();
        closeSearch();
    });

    renderCart();

    /* ---------- Return from Billplz's payment page ---------- */
    const returnParams = new URLSearchParams(window.location.search);
    if (returnParams.get('order') === 'complete') {
        showToast('Terima kasih! Pesanan anda sedang diproses.');
        window.history.replaceState({}, '', window.location.pathname);
    }
})();
