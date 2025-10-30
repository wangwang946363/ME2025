// ===================== 產品資料（保留原資料；渲染時自動修正圖片路徑） =====================
const products = [
  { name: 'T-Shirt',        price: 25, gender: '男裝', category: '上衣',    image_url: '.../static/img/T-Shirt.png' },
  { name: 'Blouse',         price: 30, gender: '女裝', category: '上衣',    image_url: '.../static/img/Blouse.png' },
  { name: 'Jeans',          price: 50, gender: '通用', category: '褲/裙子', image_url: '.../static/img/Jeans.png' },
  { name: 'Skirt',          price: 40, gender: '女裝', category: '褲/裙子', image_url: '.../static/img/Skirt.png' },
  { name: 'Sneakers',       price: 60, gender: '通用', category: '鞋子',    image_url: '.../static/img/Sneakers.png' },
  { name: 'Leather Shoes',  price: 80, gender: '男裝', category: '鞋子',    image_url: '.../static//img/LeatherShoes.png' },
  { name: 'Baseball Cap',   price: 20, gender: '通用', category: '帽子',    image_url: '.../static/img/BaseballCap.png' },
  { name: 'Sun Hat',        price: 25, gender: '女裝', category: '帽子',    image_url: '.../static/img/SunHat.png' },
  { name: 'Running Shoes',  price: 85, gender: '通用', category: '鞋子',    image_url: '.../static/img/RunningShoes.png' },
  { name: 'Dress',          price: 75, gender: '女裝', category: '上衣',    image_url: '.../static/img/Dress.png' }
];

// ===================== 導覽列顯示登入者 =====================
(function showUsername() {
  // 優先取後端模板塞在 body 的 data-username，其次 localStorage，最後 Guest
  const fromBody = document.body?.dataset?.username;
  const username = (fromBody && fromBody.trim()) || localStorage.getItem('username') || 'Guest';
  const holder = document.querySelector('.quixnav-scroll div') || document.querySelector('.quixnav div');
  if (holder) holder.innerHTML = `👤 使用者：${username}　<a href="/logout" id="logout-link">登出</a>`;
})();

// ===================== 下單按鈕（固定在左下） =====================
(function ensureOrderButton() {
  if (document.getElementById('place-order')) return;
  const wrap = document.createElement('div');
  wrap.style.position = 'fixed';
  wrap.style.left = '12px';
  wrap.style.bottom = '12px';
  wrap.style.background = '#fff';
  wrap.style.border = '1px solid #e5e7eb';
  wrap.style.borderRadius = '8px';
  wrap.style.padding = '10px 12px';
  wrap.style.boxShadow = '0 6px 18px rgba(0,0,0,.06)';
  wrap.style.zIndex = '20';

  const btn = document.createElement('button');
  btn.id = 'place-order';
  btn.textContent = '下單';
  btn.disabled = true;
  btn.style.background = '#2563eb';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.padding = '8px 14px';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'pointer';

  const span = document.createElement('span');
  span.id = 'cart-summary';
  span.style.marginLeft = '12px';
  span.style.color = '#475569';

  wrap.appendChild(btn);
  wrap.appendChild(span);
  document.body.appendChild(wrap);
})();

// ===================== 工具 & 狀態 =====================
const rowState = new Map(); // key → {checked, qty}

// 修正圖片路徑：把 '.../static'、多餘斜線統一成 '../static'
function normalizeImg(url = '') {
  return url
    .replace(/^\.{3,}\//, '../')   // .../ 或 ....// → ../
    .replace('.../static', '../static')
    .replace(/\/{2,}/g, '/');
}

function setRowEnabled(tr, enabled) {
  const dec = tr.querySelector('.btn-dec');
  const inc = tr.querySelector('.btn-inc');
  const input = tr.querySelector('.qty-input');
  input.disabled = !enabled;
  inc.disabled = !enabled;
  const qty = Number(input.value || 0);
  dec.disabled = !enabled || qty <= 0;
}

// ===================== 渲染表格（符合題目 1/2 條件） =====================
function display_products(list) {
  const tbody = document.querySelector('#products table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  list.forEach((p, i) => {
    const key = `${p.name}-${i}`;
    if (!rowState.has(key)) rowState.set(key, { checked: false, qty: 0 });
    const st = rowState.get(key);
    const price = Number(p.price) || 0;
    const total = price * (st.qty || 0);

    const html = `
      <tr data-key="${key}">
        <td><input type="checkbox" class="row-check" ${st.checked ? 'checked' : ''}></td>
        <td><img src="${normalizeImg(p.image_url)}" alt="${p.name}" style="width:56px;height:56px;object-fit:cover;border:1px solid #e5e7eb;border-radius:6px;"></td>
        <td>${p.name}</td>
        <td data-price="${price}">${price.toLocaleString()}</td>
        <td>${p.gender}</td>
        <td>${p.category}</td>
        <td>
          <div class="qty" style="display:inline-flex;align-items:center;gap:6px;">
            <button type="button" class="btn-dec" style="padding:2px 8px;" ${(!st.checked || (st.qty||0)<=0) ? 'disabled' : ''}>-</button>
            <input type="number" class="qty-input" min="0" value="${st.qty}" style="width:64px;" ${st.checked ? '' : 'disabled'}>
            <button type="button" class="btn-inc" style="padding:2px 8px;" ${st.checked ? '' : 'disabled'}>+</button>
          </div>
        </td>
        <td class="row-total">${total.toLocaleString()}</td>
      </tr>`;
    tbody.insertAdjacentHTML('beforeend', html);
    setRowEnabled(tbody.lastElementChild, st.checked);
  });

  refreshSummary();
}

// ===================== 篩選 =====================
function apply_filter(list) {
  const max_price = document.getElementById('max_price')?.value ?? '';
  const min_price = document.getElementById('min_price')?.value ?? '';
  const gender = document.getElementById('gender')?.value ?? 'All';

  const category_shirts = document.getElementById('shirts')?.checked ?? false;
  const category_pants  = document.getElementById('pants')?.checked ?? false;
  const category_shoes  = document.getElementById('shoes')?.checked ?? false;
  const category_cap    = document.getElementById('cap')?.checked ?? false;

  const selectedCats = [];
  if (category_shirts) selectedCats.push('上衣');
  if (category_pants)  selectedCats.push('褲/裙子');
  if (category_shoes)  selectedCats.push('鞋子');
  if (category_cap)    selectedCats.push('帽子');

  const result = list.filter(p => {
    const price = Number(p.price);
    const inMin = (min_price === '' || price >= Number(min_price));
    const inMax = (max_price === '' || price <= Number(max_price));
    const fitPrice = inMin && inMax;

    let fitGender = true;
    if (gender === 'Male')   fitGender = (p.gender === '男裝' || p.gender === '通用');
    if (gender === 'Female') fitGender = (p.gender === '女裝' || p.gender === '通用');

    const fitCat = (selectedCats.length === 0) || selectedCats.includes(p.category);
    return fitPrice && fitGender && fitCat;
  });

  display_products(result);
}

// ===================== 事件（符合題目 2/3/4/5 行為） =====================
(function bindTableEvents() {
  const tbody = document.querySelector('#products table tbody');
  if (!tbody) return;

  tbody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const key = tr.dataset.key;
    const st = rowState.get(key) || { checked: false, qty: 0 };

    // 勾選：數量 0→1；取消：數量歸 0（題目 3）
    if (e.target.classList.contains('row-check')) {
      const input = tr.querySelector('.qty-input');
      if (e.target.checked) { st.checked = true; st.qty = 1; input.value = 1; }
      else { st.checked = false; st.qty = 0; input.value = 0; }
      rowState.set(key, st);
      updateRowTotal(tr);
      setRowEnabled(tr, st.checked);
      refreshSummary();
      return;
    }

    if (e.target.classList.contains('btn-dec')) {
      const input = tr.querySelector('.qty-input');
      const v = Math.max(0, Number(input.value || 0) - 1);
      input.value = v; st.qty = v;
      const chk = tr.querySelector('.row-check');
      if (!chk.checked && v > 0) { chk.checked = true; st.checked = true; }
      if (v === 0) { /* 題目 3：- 反白 */ }
      rowState.set(key, st);
      updateRowTotal(tr);
      setRowEnabled(tr, st.checked);
      refreshSummary();
      return;
    }

    if (e.target.classList.contains('btn-inc')) {
      const input = tr.querySelector('.qty-input');
      const v = Math.max(0, Number(input.value || 0) + 1);
      input.value = v; st.qty = v;
      const chk = tr.querySelector('.row-check');
      if (!chk.checked && v > 0) { chk.checked = true; st.checked = true; }
      rowState.set(key, st);
      updateRowTotal(tr);
      setRowEnabled(tr, st.checked);
      refreshSummary();
      return;
    }
  });

  tbody.addEventListener('input', (e) => {
    if (!e.target.classList.contains('qty-input')) return;
    const tr = e.target.closest('tr');
    const key = tr.dataset.key;
    const st = rowState.get(key) || { checked: false, qty: 0 };

    const v = Math.max(0, Number(e.target.value || 0));
    e.target.value = v; st.qty = v;

    const chk = tr.querySelector('.row-check');
    if (!chk.checked && v > 0) { chk.checked = true; st.checked = true; }
    rowState.set(key, st);
    updateRowTotal(tr);
    setRowEnabled(tr, st.checked);
    refreshSummary();
  });
})();

function updateRowTotal(tr) {
  const price = Number(tr.querySelector('[data-price]')?.dataset?.price || 0);
  const qty = Number(tr.querySelector('.qty-input')?.value || 0);
  const cell = tr.querySelector('.row-total');
  if (cell) cell.textContent = (price * qty).toLocaleString();
}

// ===================== 合計/下單（題目 4/5 & 寫入 DB） =====================
function refreshSummary() {
  const tbody = document.querySelector('#products table tbody');
  if (!tbody) return;

  let selectedCount = 0, totalQty = 0, totalPrice = 0;

  tbody.querySelectorAll('tr').forEach(tr => {
    const chk = tr.querySelector('.row-check');
    const qty = Number(tr.querySelector('.qty-input')?.value || 0);
    const price = Number(tr.querySelector('[data-price]')?.dataset?.price || 0);
    if (chk?.checked && qty > 0) {
      selectedCount += 1;
      totalQty += qty;
      totalPrice += qty * price;
    }
  });

  const btn = document.getElementById('place-order');
  if (btn) btn.disabled = !(selectedCount > 0 && totalQty > 0); // 題目 4

  const s = document.getElementById('cart-summary');
  if (s) s.textContent = `已選 ${selectedCount} 項、總數量 ${totalQty}、總金額 $${totalPrice.toLocaleString()}`; // 題目 5
}

// 下單：送到後端 /place_order，後端會回題目規定格式的訊息
(function bindOrderButton() {
  const btn = document.getElementById('place-order');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const tbody = document.querySelector('#products table tbody');
    if (!tbody) return;

    const items = [];
    tbody.querySelectorAll('tr').forEach(tr => {
      const chk = tr.querySelector('.row-check');
      if (!chk?.checked) return;
      const qty = Number(tr.querySelector('.qty-input')?.value || 0);
      if (qty <= 0) return;
      const name = tr.children[2]?.textContent?.trim() || '';
      const price = Number(tr.querySelector('[data-price]')?.dataset?.price || 0);
      items.push({ name, price, qty });
    });
    if (!items.length) return;

    try {
      const res = await fetch('/place_order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (data?.status === 'success') {
        alert(data.message); // 顯示「YYYY/MM/DD HH:MM，已成功下單：... 此單花費總金額: XXX NT」
      } else {
        alert(data?.message || '下單失敗');
      }
    } catch (err) {
      alert('下單失敗，請稍後重試');
    }
  });
})();

// ===================== 首次渲染 =====================
display_products(products);
