const table =  document.querySelector(".cart");
const checkAll = document.getElementById("check_all");
const totalEl = document.getElementById("total");
const checkoutBtn = document.getElementById("ckeckout");
const result = document.getElementById("result");

const toInt = (v) => parseInt(v, 10) || 0;