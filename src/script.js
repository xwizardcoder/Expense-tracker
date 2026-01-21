
const sallary_input = document.getElementById("sallary-input");
const sallary_button = document.getElementById("sallary-button");
const show_balance = document.getElementById("show-balance");

const expense_name = document.getElementById("expense-name");
const expense_amount = document.getElementById("expense-amount");
const listbtn = document.getElementById("expense-list");
const exportBtn = document.getElementById("export-pdf");

const ul = document.getElementById("expense-ui");
const currencySelect = document.getElementById("currency");


let totalSalary = Number(localStorage.getItem("totalSalary")) || 0;
let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let currency = localStorage.getItem("currency") || "INR";
let warningShown = false;

currencySelect.value = currency;

let chart;
const ctx = document.getElementById("expenseChart");


function symbol() {
  return currency === "USD" ? "$" : "₹";
}

function saveData() {
  localStorage.setItem("totalSalary", totalSalary);
  localStorage.setItem("expenses", JSON.stringify(expenses));
  localStorage.setItem("currency", currency);
}

function getBalance() {
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  return totalSalary - totalExpense;
}

function checkLowBalance(balance) {
  const threshold = totalSalary * 0.1;

  if (balance < threshold && totalSalary > 0) {
    show_balance.classList.add("text-red-600", "font-bold");

    if (!warningShown) {
      alert(" Warning: Your balance is below 10% of your salary!");
      warningShown = true;
    }
  } else {
    show_balance.classList.remove("text-red-600", "font-bold");
    warningShown = false;
  }
}

function updateBalance() {
  const balance = getBalance();
  show_balance.innerText = `${symbol()} ${balance.toFixed(2)}`;
  checkLowBalance(balance);
}


function renderExpenseList() {
  ul.innerHTML = "";

  expenses.forEach((e, index) => {
    const li = document.createElement("li");
    li.className =
      "flex justify-between items-center bg-gray-100 p-3 rounded";

    li.innerHTML = `
      <span class="font-medium">${e.name}</span>
      <div class="flex items-center gap-4">
        <span class="text-red-600 font-semibold">${symbol()} ${e.amount}</span>
        <button 
          class="bg-red-500 text-white px-2 py-1 rounded text-sm delete-btn"
          data-index="${index}">
          Delete
        </button>
      </div>
    `;

    ul.appendChild(li);
  });
}



function renderChart() {
  if (chart) chart.destroy();

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = totalSalary - totalExpense;

  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Total Expenses", "Remaining Balance"],
      datasets: [
        {
          data: [totalExpense, remaining < 0 ? 0 : remaining],
          backgroundColor: ["#ef4444", "#22c55e"] // red & green
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.label}: ${symbol()} ${context.raw.toFixed(2)}`;
            }
          }
        }
      }
    }
  });
}



updateBalance();
renderExpenseList();
renderChart();


sallary_button.addEventListener("click", () => {
  const salary = Number(sallary_input.value);

  if (salary <= 0) {
    alert("Invalid salary");
    return;
  }


  totalSalary = salary;

  saveData();
  updateBalance();

  sallary_input.value = "";
});


listbtn.addEventListener("click", () => {
  const name = expense_name.value.trim();
  const amount = Number(expense_amount.value);

  if (!name || amount <= 0) {
    alert("Invalid expense");
    return;
  }

  if (amount > getBalance()) {
    alert("Insufficient balance");
    return;
  }

  expenses.push({ name, amount });
  saveData();

  updateBalance();
  renderExpenseList();
  renderChart();

  expense_name.value = "";
  expense_amount.value = "";
});


ul.addEventListener("click", (e) => {
  if (!e.target.classList.contains("delete-btn")) return;

  const index = e.target.dataset.index;
  expenses.splice(index, 1);

  saveData();
  updateBalance();
  renderExpenseList();
  renderChart();
});


currencySelect.addEventListener("change", async () => {
  const newCurrency = currencySelect.value;
  if (newCurrency === currency) return;

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${currency}&to=${newCurrency}`
    );
    const data = await res.json();
    const rate = data.rates[newCurrency];

    totalSalary = +(totalSalary * rate).toFixed(2);
    expenses = expenses.map(e => ({
      ...e,
      amount: +(e.amount * rate).toFixed(2)
    }));

    currency = newCurrency;

    saveData();
    updateBalance();
    renderExpenseList();
    renderChart();
  } catch {
    alert("Currency conversion failed");
  }
});


exportBtn.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Expense Report", 14, 15);

  doc.setFontSize(12);
  doc.text(`Total Salary: ${symbol()} ${totalSalary.toFixed(2)}`, 14, 25);
  doc.text(`Remaining Balance: ${symbol()} ${getBalance().toFixed(2)}`, 14, 33);

  let y = 45;
  expenses.forEach((e, i) => {
    doc.text(`${i + 1}. ${e.name} - ${symbol()} ${e.amount}`, 14, y);
    y += 8;
  });

  doc.save("expense-report.pdf");
});



