(() => {
    const toast = document.getElementById('toast');
    let toastTimer;
    let cartCount = 0;

    const cartCountEl = document.getElementById('cart-count');

    const showToast = (message) => {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    };

    const updateCart = () => {
        if (!cartCountEl) return;
        cartCountEl.textContent = cartCount;
        cartCountEl.classList.toggle('is-empty', cartCount === 0);
    };

    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.product-card');
            const item = card?.dataset.item || 'Produk';
            const price = Number(card?.dataset.price || 0);
            cartCount += 1;
            updateCart();
            showToast(`${item} dimasukkan ke keranjang (RM${price}).`);
        });
    });

    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.product-card');
            const item = card?.dataset.item || 'Produk';
            showToast(`${item} disimpan ke wishlist.`);
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    updateCart();
})();
