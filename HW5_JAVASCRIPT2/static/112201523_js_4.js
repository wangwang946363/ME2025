const table =  document.querySelector(".cart");
const checkAll = document.getElementById("check_all");
const totalEl = document.getElementById("total");
const checkoutBtn = document.getElementById("checkout");
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
    document.querySelectorAll(".item").forEach((tr) => 
    {
        const checkbox = tr.querySelector(".check");
        if (checkbox.checked)
        {
            total += toInt(tr.querySelector(".subtotal").textContent);
        }
    });
    totalEl.textContent = total;
}

function syncCheckAll()
{
    const rows = [...document.querySelectorAll(".item")];
    const allChecked = rows.length > 0 && rows.every(tr => tr.querySelector(".check").checked);
    checkAll.checked = allChecked;
}

document.querySelectorAll(".item").forEach(updateRowSubtotal);
updateTotal();
syncCheckAll();

checkAll.addEventListener("change", () =>
{
    document.querySelectorAll(".item").forEach((tr) => 
    {
        const checkbox = tr.querySelector(".check");
        if (!checkbox.disabled) checkbox.checked = checkAll.checked;
        updateRowSubtotal(tr);
    });
    updateTotal();
});

table.addEventListener("click", (e) => 
{
    const target = e.target;
    const tr = target.closest(".item");
    if (!tr) return;

    //勾選單列checkbox
    if (target.classList.contains("check"))
    {
        updateTotal();
        syncCheckAll( );
        return;
    }

    //加減按鈕
    if (target.classList.contains("plus") || target.classList.contains("minus"))
    {
        const qtyInput = tr.querySelector(".qty");
        const stock = toInt(tr.querySelector(".stock").textContent);
        let qty = toInt(qtyInput.value);

        if (target.classList.contains("plus"))
        {
            if (qty < stock) qty += 1; //不超過庫存
        }
        else
        {
            if (qty > 1) qty -= 1;
            if (stock === 0) qty = 0;
        }
        qtyInput.value = qty;

        updateRowSubtotal(tr);
        updateTotal();
        syncCheckAll( );
    }
});

table.addEventListener("blur", (e) => 
{
    if (!e.target.classList.contains("qty")) return;
    const tr = e.target.closest(".item");
    let qty = toInt(e.target.value);
    const stock = toInt(tr.querySelector(".stock").textContent);

    if(isNaN(qty) || qty < 1) qty = 1;
    if(qty > stock) qty = stock;

    if (stock === 0) qty = 0;

    e.target.value = qty;

    updateRowSubtotal(tr);
    updateTotal();
    syncCheckAll( );
}, true);

checkoutBtn.addEventListener("click", () => 
{
    const total = toInt(totalEl.textContent);
    if (total <= 0)
    {
        return;
    }

    //明細
    let lines = [];
    document.querySelectorAll(".item").forEach((tr) => 
    {
        const checkbox = tr.querySelector(".check");
        if (!checkbox.checked) return;

        const name = tr.querySelector(".name").textContent;
        const price = toInt(tr.querySelector(".price").textContent);
        const qtyInput = tr.querySelector(".qty");
        const qty = toInt(qtyInput.value);
        const subtotal = price * qty;

        lines.push(`${name} × ${qty} = ${subtotal}`);

        //庫存扣除
        const stockEl = tr.querySelector(".stock");
        let stock = toInt(stockEl.textContent);
        stock = Math.max(0, stock - qty);
        stockEl.textContent = stock;

        checkbox.checked = false;

        if (stock === 0)
        {
            qtyInput.value = 0;
        }
        else
        {
            qtyInput.value = 1;
        }

        updateRowSubtotal(tr);
    });

    result.innerHTML = `這個網頁顯示\n\n${lines.join("\n")}\n\n總計: ${total}`;
    updateTotal();
    syncCheckAll( );
});
