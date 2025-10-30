async function loadGrades() {
  const res = await fetch("/api/grades");
  const data = await res.json();

  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.student_name}</td>
      <td>${row.student_id}</td>
      <td>${row.score}</td>
      <td><button data-sid="${row.student_id}">刪除</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-sid]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const sid = btn.getAttribute("data-sid");
      if (!confirm(`確定刪除學號 ${sid}？`)) return;
      const res = await fetch(`/api/grades/${encodeURIComponent(sid)}`, { method: "DELETE" });
      const out = await res.json();
      if (out.ok) loadGrades(); else alert(out.error || "刪除失敗");
    });
  });
}

async function addGrade() {
  const name = document.getElementById("name").value.trim();
  const sid  = document.getElementById("sid").value.trim();
  const score= document.getElementById("score").value.trim();
  if (!name || !sid || score === "") { alert("請填寫完整資料"); return; }

  const res = await fetch("/api/grades", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_name: name, student_id: sid, score })
  });
  const out = await res.json();
  if (out.ok) {
    document.getElementById("name").value = "";
    document.getElementById("sid").value = "";
    document.getElementById("score").value = "";
    loadGrades();
  } else {
    alert(out.error || "新增失敗");
  }
}

document.getElementById("btnAdd").addEventListener("click", addGrade);
loadGrades();
