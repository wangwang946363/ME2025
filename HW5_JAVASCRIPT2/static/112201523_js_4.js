const table =  document.querySelector(".cart");
const checkAll = document.getElementById("check_all");
const totalEl = document.getElementById("total");
const checkoutBtn = document.getElementById("ckeckout");
const result = document.getElementById("result");

const toInt = (v) => parseInt(v, 10) || 0;

function updateRowSubtotal(tr)
{
    const price = toInt(tr.querySelector(".price").textContent);
    const qtyInput = tr.querySelector(".qty");
    let qty = toInt(qtyInput.value);
    //限制數量
    const stock = toInt(tr.querySelector(".stock").textContent);
    if (qty < 0) qty = 0;
    if (qty >stock) qty = stock;
    qtyInput.value = qty;

    tr.querySelector(".subtotal").textContent = price * qty;

    //數量=0，checkbox不能勾
    const checkbox = tr.querySelector(".check");
    checkbox.disabled = (stock === 0 || qty === 0);
    if (checkbox.disabled) checkbox.checked = false;
}

function updateTotal()
{
    let total = 0;
    DocumentFragment.querySelectorAll(".item").forEach((tr) => 
    {
        const checkbox = tr.querySelector(".check");
        if (checkbox.checked)
        {
            total += toInt(tr.querySelector(".subtotal").textContent);
        }
    });
    totalEl.textContent = total;
}