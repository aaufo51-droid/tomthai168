const LINE_TOKEN = 'ใส่ Line Notify Token ของคุณที่นี่';

let cart = JSON.parse(localStorage.getItem('cart') || '{}');
let products = JSON.parse(localStorage.getItem('products') || '[]');
let shopInfo = JSON.parse(localStorage.getItem('shopInfo') || '{}');
let orders = JSON.parse(localStorage.getItem('orders') || '[]');

// ข้อมูลเริ่มต้นสินค้า
if (products.length === 0) {
    products = [
        {id: 1, name: 'สินค้าตัวอย่าง #1', price: 199, image: 'https://via.placeholder.com/300/ff0000/000000?text=สินค้า1'},
        {id: 2, name: 'สินค้าตัวอย่าง #2', price: 299, image: 'https://via.placeholder.com/300/ff0000/000000?text=สินค้า2'},
        {id: 3, name: 'สินค้าตัวอย่าง #3', price: 499, image: 'https://via.placeholder.com/300/ff0000/000000?text=สินค้า3'}
    ];
    localStorage.setItem('products', JSON.stringify(products));
}

// Default ร้าน + บัญชีพี่ AA
if (!shopInfo.logo) shopInfo.logo = 'https://via.placeholder.com/60/ff0000/000000?text=LOGO';
if (!shopInfo.qr) shopInfo.qr = 'https://via.placeholder.com/250?text=QR+Code';
if (!shopInfo.bankName || !shopInfo.bankOwner || !shopInfo.bankNumber) {
    shopInfo.bankName = 'ไทยพาณิชย์';
    shopInfo.bankOwner = 'ธนพล บุดารมย์';
    shopInfo.bankNumber = '415-047-2070';
}
localStorage.setItem('shopInfo', JSON.stringify(shopInfo));

// โหลดข้อมูล
document.getElementById('shop-logo').src = shopInfo.logo;
document.getElementById('shop-qr').src = shopInfo.qr;

function updateCartBadge() {
    const count = Object.values(cart).reduce((a, q) => a + q, 0);
    document.getElementById('cart-badge').innerText = count;
}

function loadProducts() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${p.image}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p>${p.price} บาท</p>
            <label><input type="checkbox" onchange="toggleCart(${p.id}, this.checked)" ${cart[p.id] ? 'checked' : ''}> เลือก</label>
            <input type="number" min="1" value="${cart[p.id] || 1}" onchange="updateQuantity(${p.id}, this.value)" ${cart[p.id] ? '' : 'disabled'}>
        `;
        grid.appendChild(card);
    });
}

function toggleCart(id, checked) {
    if (checked) cart[id] = cart[id] || 1;
    else delete cart[id];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    loadProducts();
}

function updateQuantity(id, qty) {
    qty = parseInt(qty);
    if (qty > 0) cart[id] = qty;
    else delete cart[id];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
}

function showCart() {
    const itemsDiv = document.getElementById('cart-items');
    itemsDiv.innerHTML = '';
    let total = 0;
    for (let id in cart) {
        const p = products.find(pr => pr.id == id);
        if (p) {
            const sub = p.price * cart[id];
            total += sub;
            itemsDiv.innerHTML += `<p>${p.name} × ${cart[id]} = ${sub} บาท</p>`;
        }
    }
    document.getElementById('cart-total').innerText = total;
    document.getElementById('cart-modal').classList.add('show');
}

let currentOrder = {items: {}, total: 0, customer: {}, payment: ''};

function checkout() {
    closeModal('cart-modal');
    document.getElementById('checkout-modal').classList.add('show');
}

function goToPayment() {
    const name = document.getElementById('customer-name').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    if (!name || !address || !phone) return alert('กรุณากรอกข้อมูลให้ครบครับ!');
    currentOrder.customer = {name, address, phone};
    currentOrder.items = {...cart};
    currentOrder.total = parseInt(document.getElementById('cart-total').innerText);
    closeModal('checkout-modal');
    showPage('payment-page');
    document.getElementById('payment-total').innerText = currentOrder.total;
    document.querySelectorAll('input[name="payment"]').forEach(r => {
        r.onchange = () => {
            currentOrder.payment = r.value;
            document.getElementById('qr-section').style.display = r.value === 'qr' ? 'block' : 'none';
        };
    });
}

function completeOrder() {
    if (!currentOrder.payment) return alert('กรุณาเลือกวิธีชำระเงิน');
    const orderId = Date.now();
    const order = {id: orderId, ...currentOrder, date: new Date().toLocaleString('th-TH')};
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));

    if (LINE_TOKEN && LINE_TOKEN !== 'ใส่ Line Notify Token ของคุณที่นี่') {
        let msg = `🔥 มีออเดอร์ใหม่!\nหมายเลข: ${orderId}\nชื่อ: ${order.customer.name}\nที่อยู่: ${order.customer.address}\nโทร: ${order.customer.phone}\nยอด: ${order.total} บาท\nวิธีชำระ: ${order.payment === 'cod' ? 'เก็บเงินปลายทาง' : 'QR Code'}\nรายการ:\n`;
        for (let id in order.items) {
            const p = products.find(pr => pr.id == id);
            msg += `• ${p.name} × ${order.items[id]}\n`;
        }
        fetch('https://notify-api.line.me/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Bearer ' + LINE_TOKEN
            },
            body: 'message=' + encodeURIComponent(msg)
        });
    }

    document.getElementById('order-id').innerText = orderId;
    document.getElementById('success-modal').classList.add('show');
}

function clearCart() {
    cart = {};
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    loadProducts();
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    closeMenu();
}

function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function goBack() { history.back(); closeMenu(); }

function showBankInfo() {
    updateBankDisplay();
    document.getElementById('bank-modal').classList.add('show');
    closeMenu();
}

function updateBankDisplay() {
    document.getElementById('bank-name-display').innerText = shopInfo.bankName || 'ยังไม่ได้ตั้งค่า';
    document.getElementById('bank-owner-display').innerText = shopInfo.bankOwner || 'ยังไม่ได้ตั้งค่า';
    document.getElementById('bank-number-display').innerText = shopInfo.bankNumber || 'ยังไม่ได้ตั้งค่า';
}

function copyBankNumber() {
    if (shopInfo.bankNumber) {
        navigator.clipboard.writeText(shopInfo.bankNumber).then(() => {
            alert('คัดลอกเลขบัญชีแล้วครับ! 🔥');
        });
    } else {
        alert('ยังไม่ได้ตั้งค่าเลขบัญชีครับ');
    }
}

function closeMenu() { document.getElementById('menu').classList.remove('show'); }

function enterAdmin() {
    const pass = prompt('รหัสผ่านแอดมิน:');
    if (pass === 'admin123') {
        showPage('admin-page');
        loadAdminProducts();
    } else alert('รหัสผิดครับ!');
    closeMenu();
}

function loadAdminProducts() {
    const container = document.getElementById('admin-products');
    container.innerHTML = '';
    products.forEach(p => {
        const div = document.createElement('div');
        div.style = 'background:rgba(255,255,255,0.1); padding:15px; margin:10px 0; border-radius:10px;';
        div.innerHTML = `
            <img src="${p.image}" style="width:100px; border-radius:10px;"><br>
            ชื่อ: <input type="text" value="${p.name}" onchange="updateProduct(${p.id}, 'name', this.value)"><br>
            ราคา: <input type="number" value="${p.price}" onchange="updateProduct(${p.id}, 'price', parseInt(this.value))"><br>
            เปลี่ยนรูป: <input type="file" accept="image/*" onchange="uploadProductImage(${p.id}, this.files[0])"><br>
            <button onclick="deleteProduct(${p.id})" style="background:#cc0000;">ลบสินค้า</button><hr>
        `;
        container.appendChild(div);
    });
    document.getElementById('shop-logo-preview').src = shopInfo.logo;
    document.getElementById('qr-preview').src = shopInfo.qr;
    document.getElementById('bank-number').value = shopInfo.bankNumber || '';
    document.getElementById('bank-owner').value = shopInfo.bankOwner || '';
    document.getElementById('bank-name').value = shopInfo.bankName || '';
}

function updateProduct(id, field, value) {
    const p = products.find(pr => pr.id === id);
    p[field] = value;
    saveProducts();
    loadProducts();
}

function uploadProductImage(id, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const p = products.find(pr => pr.id === id);
        p.image = e.target.result;
        saveProducts();
        loadProducts();
        loadAdminProducts();
    };
    reader.readAsDataURL(file);
}

function addProduct() {
    const newId = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({id: newId, name: 'สินค้าใหม่', price: 100, image: 'https://via.placeholder.com/300/ff0000/000000?text=ใหม่'});
    saveProducts();
    loadProducts();
    loadAdminProducts();
}

function deleteProduct(id) {
    if (confirm('ลบจริง ๆ ?')) {
        products = products.filter(p => p.id !== id);
        delete cart[id];
        saveProducts();
        localStorage.setItem('cart', JSON.stringify(cart));
        loadProducts();
        loadAdminProducts();
        updateCartBadge();
    }
}

function saveProducts() { localStorage.setItem('products', JSON.stringify(products)); }

document.getElementById('shop-logo-input').onchange = e => readFilePreview(e, 'shop-logo-preview');
document.getElementById('qr-input').onchange = e => readFilePreview(e, 'qr-preview');
function readFilePreview(e, previewId) {
    if (e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = ev => document.getElementById(previewId).src = ev.target.result;
        reader.readAsDataURL(e.target.files[0]);
    }
}

function saveShopLogo() { shopInfo.logo = document.getElementById('shop-logo-preview').src; saveShopInfo(); document.getElementById('shop-logo').src = shopInfo.logo; }
function saveQR() { shopInfo.qr = document.getElementById('qr-preview').src; saveShopInfo(); document.getElementById('shop-qr').src = shopInfo.qr; }
function saveBank() {
    shopInfo.bankNumber = document.getElementById('bank-number').value.trim();
    shopInfo.bankOwner = document.getElementById('bank-owner').value.trim();
    shopInfo.bankName = document.getElementById('bank-name').value.trim();
    saveShopInfo();
    updateBankDisplay();
}
function saveShopInfo() { localStorage.setItem('shopInfo', JSON.stringify(shopInfo)); }

document.getElementById('hamburger