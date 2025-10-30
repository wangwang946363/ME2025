/***** 商品資料（保留即可） *****/
const products = [
  {name:'T-Shirt',       price:25, gender:'男裝', category:'上衣',   image_url:'../static/img/T-Shirt.png'},
  {name:'Blouse',        price:30, gender:'女裝', category:'上衣',   image_url:'../static/img/Blouse.png'},
  {name:'Jeans',         price:50, gender:'通用', category:'褲/裙子', image_url:'../static/img/Jeans.png'},
  {name:'Skirt',         price:40, gender:'女裝', category:'褲/裙子', image_url:'../static/img/Skirt.png'},
  {name:'Sneakers',      price:60, gender:'通用', category:'鞋子',   image_url:'../static/img/Sneakers.png'},
  {name:'Leather Shoes', price:80, gender:'男裝', category:'鞋子',   image_url:'../static/img/LeatherShoes.png'},
  {name:'Baseball Cap',  price:20, gender:'通用', category:'帽子',   image_url:'../static/img/BaseballCap.png'},
  {name:'Sun Hat',       price:25, gender:'女裝', category:'帽子',   image_url:'../static/img/SunHat.png'},
  {name:'Running Shoes', price:85, gender:'通用', category:'鞋子',   image_url:'../static/img/RunningShoes.png'},
  {name:'Dress',         price:75, gender:'女裝', category:'上衣',   image_url:'../static/img/Dress.png'}
];

/* ========= 需求 #1：左上角顯示目前登入者，點「登出」回登入 ========= */
(function showUsername() {
  const username = localStorage.getItem('username') || 'Guest';
  const holder = document.querySelector('.quixnav-scroll div');
  if (holder) holder.textContent = `👤 使用者：${username}`;
})();

/* ======== 公用狀態（保存每列是否勾選與數量） ======== */
const rowState = new Map();

/* 小工具：金額格式化 */
const money = (n) => Number(n || 0).toLocaleString();

/* ========= 需求 #2：未勾選任何品項時，數量為 0；「-」「+」皆不可按 =========
   ========= 需求 #3：勾選時數量 0→1，且「-」禁用；取消勾選數量回 0 =========
   ========= 需求 #4：未勾選任何品項，下單鍵禁用 =========
   ========= 需求 #5：任一選擇/增減，總金額與按鈕旁摘要即時更新 ========= */

/* 建立右下角「下單」區塊（按鈕+摘要） */
(function ensureOrderBar() {
  if (document.getElementById('place-order')) return;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:12px;bottom:12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;box-shadow:0 6px 18px rgba(0,0,0,.06);z-index:20;display:flex;gap:12px;align-items:center';
  const btn = document.createElement('button');
  btn.id = 'place-order';
  btn.textContent = '下單';
  btn.disabled = true;
  btn.style.cssText = 'background:#2563eb;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer';
  const span = document.createElement('span');
  span.id = 'cart-summary';
  span.style.color = '#475569';
  span.textContent = '已選 0 項、總數量 0、總金額 $0';
  wrap.appendChild(btn); wrap.appendChild(span);
  document.body.appendChild(wrap);
})();

/* 渲染商品表格 */
function display_products(list) {
  const tbody = document.querySelector('#products table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  list.forEach((p, i) => {
    const key = `${p.name}-${i}`;
    if (!rowState.has(key)) rowState.set(key, { checked:false, qty:0, price:p.price });

    const st = rowState.get(key);
    const tr = document.createElement('tr');
    tr.dataset.key = key;
    tr.innerHTML = `
      <td><input type="checkbox" class="row-check" ${st.checked ? 'checked':''}></td>
      <td><img src="${p.image_url}" alt="${p.name}" style="width:56px;height:56px;object-fit:cover;border:1px solid #e5e7eb;border-radius:6px;"></td>
      <td>${p.name}</td>
      <td data-price="${p.price}">${money(p.price)}</td>
      <td>
        <div style="display:inline-flex;align-items:center;gap:6px">
          <button type="button" class="btn-dec">-</button>
          <input type="number" class="qty-input" min="0" value="${st.qty}" style="width:64px">
          <button type="button" class="btn-inc">+</button>
        </div>
      </td>
      <td class="row-total">${money(p.price * st.qty)}</td>
    `;
    tbody.appendChild(tr);
    // 初始狀態：若未勾選，數量=0，±都禁用；若已勾選，數量至少 1、- 禁用
    applyRowEnable(tr, st.checked, st.qty);
  });

  refreshSummary();
}

/* 啟用/停用一列的控制器 */
function applyRowEnable(tr, checked, qty) {
  const btnDec = tr.querySelector('.btn-dec');
  const btnInc = tr.querySelector('.btn-inc');
  const input  = tr.querySelector('.qty-input');
  if (!checked) {
    input.value = 0;
    input.disabled = true;
    btnInc.disabled = true;
    btnDec.disabled = true;
  } else {
    // 勾選 → 若 qty<1，強制成 1 並禁用「-」
    const v = Math.max(1, Number(qty || 0));
    input.value = v;
    input.disabled = false;
    btnInc.disabled = false;
    btnDec.disabled = v <= 1;
  }
  updateRowTotal(tr);
}

/* 更新單列小計 */
function updateRowTotal(tr) {
  const price = Number(tr.querySelector('[data-price]').dataset.price || 0);
  const qty   = Number(tr.querySelector('.qty-input').value || 0);
  tr.querySelector('.row-total').textContent = money(price * qty);
}

/* 表格事件委派：checkbox、±、輸入數量 */
(function bindTableEvents() {
  const tbody = document.querySelector('#products table tbody');
  if (!tbody) return;

  tbody.addEventListener('click', e => {
    const tr  = e.target.closest('tr'); if (!tr) return;
    const key = tr.dataset.key;         if (!key) return;
    const st  = rowState.get(key);

    // 勾選/取消
    if (e.target.classList.contains('row-check')) {
      st.checked = e.target.checked;
      // 勾選→數量至少 1；取消→數量 0
      st.qty = st.checked ? Math.max(1, Number(st.qty||0)) : 0;
      rowState.set(key, st);
      applyRowEnable(tr, st.checked, st.qty);
      refreshSummary();
      return;
    }

    // 減少
    if (e.target.classList.contains('btn-dec')) {
      if (!st.checked) return;
      st.qty = Math.max(1, Number(st.qty||1) - 1);
      tr.querySelector('.qty-input').value = st.qty;
      // 當 qty==1 時「-」禁用
      applyRowEnable(tr, true, st.qty);
      refreshSummary();
      return;
    }

    // 增加
    if (e.target.classList.contains('btn-inc')) {
      if (!st.checked) return;
      st.qty = Number(st.qty||1) + 1;
      tr.querySelector('.qty-input').value = st.qty;
      applyRowEnable(tr, true, st.qty);
      refreshSummary();
      return;
    }
  });

  tbody.addEventListener('input', e => {
    if (!e.target.classList.contains('qty-input')) return;
    const tr  = e.target.closest('tr');
    const key = tr.dataset.key;
    const st  = rowState.get(key);
    if (!st.checked) return; // 未勾選不處理
    st.qty = Math.max(1, Number(e.target.value || 1));
    e.target.value = st.qty;
    applyRowEnable(tr, true, st.qty);
    refreshSummary();
  });
})();

/* 計算摘要 + 控制下單按鈕 */
function refreshSummary() {
  const tbody = document.querySelector('#products table tbody');
  let selected = 0, totalQty = 0, totalPrice = 0;

  tbody.querySelectorAll('tr').forEach(tr => {
    const chk  = tr.querySelector('.row-check').checked;
    const qty  = Number(tr.querySelector('.qty-input').value || 0);
    const price= Number(tr.querySelector('[data-price]').dataset.price || 0);
    if (chk && qty > 0) {
      selected += 1;
      totalQty += qty;
      totalPrice += qty * price;
    }
  });

  const btn = document.getElementById('place-order');
  const sum = document.getElementById('cart-summary');
  if (btn) btn.disabled = !(selected > 0 && totalQty > 0);
  if (sum) sum.textContent = `已選 ${selected} 項、總數量 ${totalQty}、總金額 $${money(totalPrice)}`;
}

/* 篩選（index.html 的「篩選」按鈕 onClick 會呼叫） */
function apply_filter(list) {
  const maxP = Number(document.getElementById('max_price')?.value || NaN);
  const minP = Number(document.getElementById('min_price')?.value || NaN);
  const gSel = document.getElementById('gender')?.value || 'All';
  const c1 = document.getElementById('shirts')?.checked;
  const c2 = document.getElementById('pants')?.checked;
  const c3 = document.getElementById('shoes')?.checked;
  const c4 = document.getElementById('cap')?.checked;

  const cats = [];
  if (c1) cats.push('上衣');
  if (c2) cats.push('褲/裙子');
  if (c3) cats.push('鞋子');
  if (c4) cats.push('帽子');

  const result = list.filter(p => {
    const priceOK = (isNaN(minP) || p.price >= minP) && (isNaN(maxP) || p.price <= maxP);
    const genderOK = (gSel === 'All') ||
      (gSel === 'Male' && (p.gender === '男裝' || p.gender === '通用')) ||
      (gSel === 'Female' && (p.gender === '女裝' || p.gender === '通用'));
    const catOK = !cats.length || cats.includes(p.category);
    return priceOK && genderOK && catOK;
  });

  display_products(result);
}

/* 綁定下單按鈕，送到 /place_order */
(function bindOrder() {
  const btn = document.getElementById('place-order');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const tbody = document.querySelector('#products table tbody');
    const items = [];
    tbody.querySelectorAll('tr').forEach(tr => {
      if (!tr.querySelector('.row-check').checked) return;
      const name  = tr.children[2].textContent.trim();
      const price = Number(tr.querySelector('[data-price]').dataset.price || 0);
      const qty   = Number(tr.querySelector('.qty-input').value || 0);
      if (qty > 0) items.push({ name, price, qty });
    });
    if (!items.length) return;

    try {
      const res = await fetch('/place_order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const r = await res.json();
      alert(r.message || '下單完成');
    } catch {
      alert('下單失敗，請稍後再試');
    }
  });
})();

/* 首次渲染 */
document.addEventListener('DOMContentLoaded', () => {
  display_products(products);
});
