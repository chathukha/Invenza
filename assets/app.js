const STORAGE_KEY = "touchpos-stage1-data";

const app = document.querySelector("#app");

let supabase = null;

const state = {
  data: null,
  view: "pos",
  categoryId: "all",
  search: "",
  inventorySearch: "",
  itemSearch: "",
  itemProductId: null,
  masterTab: "customers",
  masterSearch: "",
  transactionSearch: "",
  transactionType: "all",
  binProductId: "all",
  binSearch: "",
  cart: [],
  customerId: "",
  checkoutStep: "items",
  paymentMethod: "cash",
  paymentAmount: "",
  salePayments: [],
  cashReceived: "",
  saleDiscountType: "amount",
  saleDiscount: 0,
  modal: null,
  toast: null,
  sync: {
    mode: "demo",
    connected: false,
    message: "Demo mode",
    profile: null
  }
};

const PAYMENT_MODES = [
  { id: "cash", label: "Cash", hint: "Tendered amount and change" },
  { id: "card", label: "Card", hint: "Card terminal payment" },
  { id: "bank_transfer", label: "Bank Transfer", hint: "Online transfer or deposit" },
  { id: "qr", label: "QR", hint: "QR wallet payment" }
];

function formatProductCode(value) {
  return String(Math.max(1, Math.trunc(toNumber(value, 1)))).padStart(8, "0");
}

function isGeneratedProductCode(value) {
  return /^\d{8}$/.test(String(value || ""));
}

function assignGeneratedProductCodes(products) {
  const used = new Set();
  let nextCode = 1;

  for (const product of products) {
    const code = String(product.sku || "").trim();
    if (isGeneratedProductCode(code) && !used.has(code)) {
      product.sku = code;
      used.add(code);
      nextCode = Math.max(nextCode, Number(code) + 1);
    } else {
      product.sku = "";
    }
  }

  for (const product of products) {
    if (product.sku) continue;
    let code = formatProductCode(nextCode);
    while (used.has(code)) {
      nextCode += 1;
      code = formatProductCode(nextCode);
    }
    product.sku = code;
    used.add(code);
    nextCode += 1;
  }

  return products;
}

function nextProductCode(productId = null) {
  const products = state.data?.products || [];
  const highest = products.reduce((max, product) => {
    if (product.id === productId) return max;
    return isGeneratedProductCode(product.sku) ? Math.max(max, Number(product.sku)) : max;
  }, 0);
  return formatProductCode(highest + 1);
}

function makeId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function defaultData() {
  const beverages = makeId();
  const snacks = makeId();
  const grocery = makeId();
  const essentials = makeId();
  const grocerySupplier = makeId();
  const generalSupplier = makeId();
  const regularCustomer = makeId();
  const products = [
    {
      id: makeId(),
      category_id: beverages,
      supplier_id: generalSupplier,
      name: "Water Bottle 1L",
      sku: "00000001",
      barcode: "479000000001",
      cost_price: 80,
      selling_price: 130,
      current_stock: 42,
      low_stock_level: 8,
      tax_rate: 0,
      image_url: "",
      is_active: true,
      created_at: nowIso()
    },
    {
      id: makeId(),
      category_id: beverages,
      supplier_id: generalSupplier,
      name: "Iced Coffee",
      sku: "00000002",
      barcode: "479000000002",
      cost_price: 160,
      selling_price: 260,
      current_stock: 18,
      low_stock_level: 6,
      tax_rate: 0,
      image_url: "",
      is_active: true,
      created_at: nowIso()
    },
    {
      id: makeId(),
      category_id: snacks,
      supplier_id: generalSupplier,
      name: "Potato Chips",
      sku: "00000003",
      barcode: "479000000003",
      cost_price: 120,
      selling_price: 210,
      current_stock: 11,
      low_stock_level: 10,
      tax_rate: 0,
      image_url: "",
      is_active: true,
      created_at: nowIso()
    },
    {
      id: makeId(),
      category_id: grocery,
      supplier_id: grocerySupplier,
      name: "Rice 5kg",
      sku: "00000004",
      barcode: "479000000004",
      cost_price: 1450,
      selling_price: 1750,
      current_stock: 9,
      low_stock_level: 4,
      tax_rate: 0,
      image_url: "",
      is_active: true,
      created_at: nowIso()
    },
    {
      id: makeId(),
      category_id: essentials,
      supplier_id: generalSupplier,
      name: "Soap Pack",
      sku: "00000005",
      barcode: "479000000005",
      cost_price: 220,
      selling_price: 320,
      current_stock: 22,
      low_stock_level: 8,
      tax_rate: 0,
      image_url: "",
      is_active: true,
      created_at: nowIso()
    },
    {
      id: makeId(),
      category_id: essentials,
      supplier_id: generalSupplier,
      name: "Toothpaste",
      sku: "00000006",
      barcode: "479000000006",
      cost_price: 280,
      selling_price: 420,
      current_stock: 5,
      low_stock_level: 6,
      tax_rate: 0,
      image_url: "",
      is_active: true,
      created_at: nowIso()
    }
  ];

  return {
    settings: {
      store_name: "TouchPOS Store",
      store_phone: "",
      store_address: "",
      currency: "LKR",
      receipt_footer: "Thank you. Please come again.",
      default_tax_rate: 0
    },
    categories: [
      { id: beverages, name: "Beverages", color: "#0f766e", sort_order: 1, is_active: true },
      { id: snacks, name: "Snacks", color: "#b45309", sort_order: 2, is_active: true },
      { id: grocery, name: "Grocery", color: "#4f46e5", sort_order: 3, is_active: true },
      { id: essentials, name: "Essentials", color: "#be123c", sort_order: 4, is_active: true }
    ],
    customers: [
      {
        id: regularCustomer,
        name: "Regular Customer",
        phone: "0770000000",
        email: "",
        address: "",
        note: "Demo customer account",
        is_active: true,
        created_at: nowIso()
      }
    ],
    suppliers: [
      {
        id: generalSupplier,
        name: "General Supplier",
        contact_person: "Sales Desk",
        phone: "0110000000",
        email: "",
        address: "",
        note: "Default demo supplier",
        is_active: true,
        created_at: nowIso()
      },
      {
        id: grocerySupplier,
        name: "Grocery Distributor",
        contact_person: "Purchasing Desk",
        phone: "",
        email: "",
        address: "",
        note: "",
        is_active: true,
        created_at: nowIso()
      }
    ],
    products,
    sales: [],
    sale_items: [],
    payments: [],
    inventory_movements: products.map((product) => ({
      id: makeId(),
      product_id: product.id,
      supplier_id: product.supplier_id || null,
      movement_type: "opening",
      quantity_delta: Number(product.current_stock),
      stock_after: Number(product.current_stock),
      document_no: "OPENING",
      reference_type: "opening",
      reference_id: null,
      reason: "Opening stock",
      created_by: "demo-admin",
      created_at: nowIso()
    }))
  };
}

function normalizeMovementType(movement) {
  if (movement.movement_type === "stock_in") {
    return movement.reference_type === "opening" ? "opening" : "grn";
  }
  if (movement.movement_type === "stock_out") return "prn";
  return movement.movement_type || "adjustment";
}

function normalizeData(data) {
  const seeded = defaultData();
  return {
    settings: { ...seeded.settings, ...(data.settings || {}) },
    categories: Array.isArray(data.categories) ? data.categories : seeded.categories,
    customers: Array.isArray(data.customers) ? data.customers : seeded.customers,
    suppliers: Array.isArray(data.suppliers) ? data.suppliers : seeded.suppliers,
    products: assignGeneratedProductCodes(
      Array.isArray(data.products)
        ? data.products.map((product) => ({ supplier_id: null, is_active: true, ...product }))
        : seeded.products
    ),
    sales: Array.isArray(data.sales) ? data.sales : [],
    sale_items: Array.isArray(data.sale_items) ? data.sale_items : [],
    payments: Array.isArray(data.payments) ? data.payments : [],
    inventory_movements: Array.isArray(data.inventory_movements)
      ? data.inventory_movements.map((movement) => ({
          supplier_id: null,
          document_no: movement.reference_type === "opening" ? "OPENING" : "",
          ...movement,
          movement_type: normalizeMovementType(movement)
        }))
      : seeded.inventory_movements
  };
}

function loadLocalData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const seeded = defaultData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const normalized = normalizeData(JSON.parse(stored));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    const seeded = defaultData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function saveLocalData() {
  if (state.sync.mode === "demo") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  }
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function money(value) {
  const currency = state.data?.settings?.currency || "LKR";
  return `${currency} ${roundMoney(value).toFixed(2)}`;
}

function paymentLabel(method) {
  const match = PAYMENT_MODES.find((item) => item.id === method);
  return match?.label || String(method || "Payment").replaceAll("_", " ");
}

function qty(value) {
  const number = toNumber(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function localDate(value) {
  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function todayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayMovementType(type) {
  const labels = {
    opening: "Opening",
    grn: "GRN",
    prn: "PRN",
    sale: "Sale Issue",
    adjustment: "Adjustment"
  };
  return labels[type] || String(type || "Movement").replaceAll("_", " ");
}

function nextInventoryDocumentNo(type) {
  const prefix = type === "prn" ? "PRN" : "GRN";
  const today = todayKey().replaceAll("-", "");
  const count = state.data.inventory_movements.filter((movement) =>
    String(movement.document_no || "").startsWith(`${prefix}-${today}`)
  ).length;
  return `${prefix}-${today}-${String(count + 1).padStart(5, "0")}`;
}

function showToast(message) {
  state.toast = message;
  render();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    state.toast = null;
    render();
  }, 2600);
}

function friendlyErrorMessage(error, fallback) {
  const message = error?.message || "";
  const normalized = message.toLowerCase();

  if (normalized.includes("row-level security") || normalized.includes("permission denied")) {
    return "Save blocked by Supabase permissions. Sign in as admin or run the admin SQL for this email.";
  }

  if (normalized.includes("relation") && normalized.includes("does not exist")) {
    return "Supabase tables are missing. Run supabase/schema.sql in the SQL Editor.";
  }

  if (normalized.includes("next_product_code") || normalized.includes("product_code_seq")) {
    return "Product code setup is missing. Run supabase/fix-product-save.sql in the SQL Editor.";
  }

  return message || fallback;
}

function formField(form, name) {
  return form.elements.namedItem(name);
}

function formValue(form, name, fallback = "") {
  const field = formField(form, name);
  return field && "value" in field ? field.value : fallback;
}

function formTrim(form, name) {
  return formValue(form, name).trim();
}

function scheduleInputRender(inputId) {
  window.clearTimeout(scheduleInputRender.timer);
  scheduleInputRender.timer = window.setTimeout(() => {
    render();
    refocusInput(inputId);
  }, 220);
}

function refocusInput(id) {
  const input = document.querySelector(`#${id}`);
  if (!input) return;
  input.focus();
  try {
    input.setSelectionRange(input.value.length, input.value.length);
  } catch {
    // Number inputs on some mobile browsers do not support selection ranges.
  }
}

function refocusLineDiscount(productId) {
  const input = document.querySelector(`[data-line-discount][data-product-id="${productId}"]`);
  if (!input) return;
  input.focus();
  try {
    input.setSelectionRange(input.value.length, input.value.length);
  } catch {
    // Number inputs on some mobile browsers do not support selection ranges.
  }
}

async function initSupabase() {
  const cfg = window.SUPABASE_CONFIG || {};
  if (!cfg.url || !cfg.anonKey) {
    state.sync = {
      mode: "demo",
      connected: false,
      message: "Demo mode",
      profile: { full_name: "Demo Cashier", role: "admin" }
    };
    return;
  }

  try {
    const module = await import("https://esm.sh/@supabase/supabase-js@2");
    supabase = module.createClient(cfg.url, cfg.anonKey);
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      state.sync = {
        mode: "supabase",
        connected: false,
        message: "Supabase configured. Sign in.",
        profile: null
      };
      return;
    }

    await loadSupabaseData();
  } catch (error) {
    console.error(error);
    state.sync = {
      mode: "demo",
      connected: false,
      message: "Supabase client unavailable. Demo mode.",
      profile: { full_name: "Demo Cashier", role: "admin" }
    };
  }
}

async function loadSupabaseData() {
  if (!supabase) return;

  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id;
  if (!userId) return;

  const [
    settingsResponse,
    categoriesResponse,
    customersResponse,
    suppliersResponse,
    productsResponse,
    profileResponse,
    salesResponse,
    saleItemsResponse,
    paymentsResponse,
    movementsResponse
  ] = await Promise.all([
    supabase.from("store_settings").select("*").maybeSingle(),
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("customers").select("*").order("name", { ascending: true }),
    supabase.from("suppliers").select("*").order("name", { ascending: true }),
    supabase.from("products").select("*").order("name", { ascending: true }),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("sale_items").select("*").order("created_at", { ascending: false }).limit(600),
    supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(300),
    supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }).limit(300)
  ]);

  const firstError = [
    settingsResponse,
    categoriesResponse,
    customersResponse,
    suppliersResponse,
    productsResponse,
    profileResponse,
    salesResponse,
    saleItemsResponse,
    paymentsResponse,
    movementsResponse
  ].find((response) => response.error);

  if (firstError?.error) {
    throw firstError.error;
  }

  const demoShape = defaultData();
  state.data = {
    settings: settingsResponse.data || demoShape.settings,
    categories: categoriesResponse.data || [],
    customers: customersResponse.data || [],
    suppliers: suppliersResponse.data || [],
    products: productsResponse.data || [],
    sales: salesResponse.data || [],
    sale_items: saleItemsResponse.data || [],
    payments: paymentsResponse.data || [],
    inventory_movements: movementsResponse.data || []
  };

  state.sync = {
    mode: "supabase",
    connected: true,
    message: "Supabase online",
    profile: profileResponse.data
  };
}

function activeCategories() {
  return [...state.data.categories]
    .filter((category) => category.is_active !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function activeCustomers() {
  return [...state.data.customers]
    .filter((customer) => customer.is_active !== false)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function activeSuppliers() {
  return [...state.data.suppliers]
    .filter((supplier) => supplier.is_active !== false)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function activeProducts() {
  return state.data.products.filter((product) => product.is_active !== false);
}

function findProduct(productId) {
  return state.data.products.find((product) => product.id === productId);
}

function findCategory(categoryId) {
  return state.data.categories.find((category) => category.id === categoryId);
}

function findCustomer(customerId) {
  return state.data.customers.find((customer) => customer.id === customerId);
}

function findSupplier(supplierId) {
  return state.data.suppliers.find((supplier) => supplier.id === supplierId);
}

function filteredProducts() {
  const term = state.search.trim().toLowerCase();
  return activeProducts().filter((product) => {
    const categoryMatch = state.categoryId === "all" || product.category_id === state.categoryId;
    const text = [product.name, product.sku, product.barcode].join(" ").toLowerCase();
    return categoryMatch && (!term || text.includes(term));
  });
}

function lineCalculation(line) {
  const product = findProduct(line.product_id);
  const quantity = toNumber(line.quantity);
  const gross = roundMoney(toNumber(product?.selling_price) * quantity);
  const rawDiscount = Math.max(0, toNumber(line.discount_value));
  const discount =
    line.discount_type === "percent"
      ? roundMoney(Math.min(100, rawDiscount) * gross / 100)
      : roundMoney(Math.min(rawDiscount, gross));
  const net = roundMoney(Math.max(0, gross - discount));
  const tax = roundMoney(net * (toNumber(product?.tax_rate) / 100));
  const total = roundMoney(net + tax);

  return {
    product,
    quantity,
    gross,
    discount,
    net,
    tax,
    total
  };
}

function salePaymentTotal(payments = state.salePayments) {
  return roundMoney(payments.reduce((sum, payment) => sum + Math.max(0, toNumber(payment.amount)), 0));
}

function cartTotals(payments = state.salePayments) {
  const lines = state.cart.map(lineCalculation);
  const subtotal = lines.reduce((sum, line) => sum + line.gross, 0);
  const lineDiscount = lines.reduce((sum, line) => sum + line.discount, 0);
  const netSubtotal = lines.reduce((sum, line) => sum + line.net, 0);
  const tax = lines.reduce((sum, line) => sum + line.tax, 0);
  const rawBillDiscount = Math.max(0, toNumber(state.saleDiscount));
  const billDiscount =
    state.saleDiscountType === "percent"
      ? roundMoney(Math.min(100, rawBillDiscount) * netSubtotal / 100)
      : roundMoney(Math.min(rawBillDiscount, netSubtotal));
  const totalDiscount = roundMoney(lineDiscount + billDiscount);
  const total = Math.max(0, netSubtotal + tax - billDiscount);
  const amountPaid = salePaymentTotal(payments);

  return {
    subtotal: roundMoney(subtotal),
    lineDiscount: roundMoney(lineDiscount),
    netSubtotal: roundMoney(netSubtotal),
    tax: roundMoney(tax),
    billDiscount: roundMoney(billDiscount),
    discount: totalDiscount,
    total: roundMoney(total),
    amountPaid: roundMoney(amountPaid),
    change: roundMoney(Math.max(0, amountPaid - total))
  };
}

function updateCartSummaryOnly() {
  const totals = cartTotals();
  const balance = roundMoney(Math.max(0, totals.total - totals.amountPaid));
  const targets = {
    cartSubtotal: money(totals.subtotal),
    cartLineDiscount: money(totals.lineDiscount),
    cartBillDiscount: money(totals.billDiscount),
    cartTax: money(totals.tax),
    cartTotal: money(totals.total),
    cartPaid: money(totals.amountPaid),
    cartBalance: money(balance),
    paymentBalance: money(balance),
    cartChange: money(totals.change)
  };

  for (const [id, value] of Object.entries(targets)) {
    const element = document.querySelector(`#${id}`);
    if (element) element.textContent = value;
  }
}

function icon(name) {
  const paths = {
    pos: '<path d="M4 6h16v9H4z"></path><path d="M7 19h10"></path><path d="M9 15v4"></path><path d="M15 15v4"></path>',
    box: '<path d="m3 7 9-4 9 4-9 4z"></path><path d="M3 7v10l9 4 9-4V7"></path><path d="M12 11v10"></path>',
    chart: '<path d="M4 19V5"></path><path d="M4 19h16"></path><path d="M8 16v-5"></path><path d="M13 16V8"></path><path d="M18 16v-3"></path>',
    gear: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2.1.4l-.1.1h-6.8l-.1-.1a1.7 1.7 0 0 0-2.1-.4l-.2.1-2-3.4.1-.1A1.7 1.7 0 0 0 4.6 15l-.1-.2a1.7 1.7 0 0 0-1.6-1.2H2.7V10h.2a1.7 1.7 0 0 0 1.6-1.2l.1-.2a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2.1-.4l.1-.1h6.8l.1.1a1.7 1.7 0 0 0 2.1.4l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9l.1.2a1.7 1.7 0 0 0 1.6 1.2h.2v3.6h-.2a1.7 1.7 0 0 0-1.6 1.2Z"></path>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><path d="m10 17 5-5-5-5"></path><path d="M15 12H3"></path>',
    tag: '<path d="M20.6 13.2 13.2 20.6a2 2 0 0 1-2.8 0L3 13.2V3h10.2l7.4 7.4a2 2 0 0 1 0 2.8Z"></path><circle cx="8" cy="8" r="1.5"></circle>',
    plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
    minus: '<path d="M5 12h14"></path>',
    trash: '<path d="M4 7h16"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M6 7l1 14h10l1-14"></path><path d="M9 7V4h6v3"></path>',
    search: '<circle cx="11" cy="11" r="7"></circle><path d="m16 16 4 4"></path>',
    empty: '<path d="M6 7h12l-1 13H7z"></path><path d="M9 7a3 3 0 0 1 6 0"></path>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    list: '<path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path>',
    close: '<path d="M6 6l12 12"></path><path d="M18 6 6 18"></path>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
}

function hasSupabaseConfig() {
  const cfg = window.SUPABASE_CONFIG || {};
  return Boolean(cfg.url && cfg.anonKey);
}

function shouldShowLoginPage() {
  return hasSupabaseConfig() && state.sync.mode === "supabase" && !state.sync.connected;
}

function render() {
  if (shouldShowLoginPage()) {
    app.innerHTML = `
      ${renderLoginPage()}
      ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}
    `;
    updateClock();
    return;
  }

  app.innerHTML = `
    ${renderTopbar()}
    <div class="main-shell">
      ${renderNav()}
      <main class="workspace">${renderView()}</main>
    </div>
    ${renderModal()}
    ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}
  `;
  updateClock();
}

function renderLoginPage() {
  const storeName = state.data?.settings?.store_name || "TouchPOS Store";
  const statusClass = state.sync.connected ? "online" : "";

  return `
    <main class="login-page">
      <section class="login-shell" aria-label="Sign in">
        <div class="login-brand-panel">
          <div>
            <div class="brand-mark login-mark">TP</div>
            <p class="login-kicker">Invenza POS</p>
            <h1>${esc(storeName)}</h1>
            <p class="login-copy">Secure access for today's counter work.</p>
          </div>
          <div class="login-status">
            <span class="clock" id="clock"></span>
            <span class="status-pill">
              <span class="status-dot ${statusClass}"></span>
              ${esc(state.sync.message)}
            </span>
          </div>
        </div>

        <div class="login-card">
          <div class="login-card-header">
            <h2>Sign in</h2>
            <p>Use your Supabase account to continue.</p>
          </div>
          ${renderAuthPanel("login")}
          <div class="notice warning login-note">
            New users can sign in after the first account is made admin in Supabase.
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderTopbar() {
  const profile = state.sync.profile;
  const userName = profile?.full_name || profile?.email || "Cashier";
  const statusClass = state.sync.connected ? "online" : "";
  const role = profile?.role || (state.sync.mode === "demo" ? "demo" : "user");

  return `
    <header class="topbar">
      <div class="topbar-title">
        <span>Workspace</span>
        <strong>${esc(state.data?.settings?.store_name || "TouchPOS Store")}</strong>
      </div>
      <div class="topbar-actions">
        <div class="topbar-user">
          <strong>${esc(userName)}</strong>
          <span>${esc(role)}</span>
        </div>
        <span class="clock" id="clock"></span>
        <span class="status-pill">
          <span class="status-dot ${statusClass}"></span>
          ${esc(state.sync.message)}
        </span>
        ${state.sync.connected && supabase ? `<button class="button secondary topbar-signout" data-action="sign-out">Sign Out</button>` : ""}
      </div>
    </header>
  `;
}

function renderNavGroup(label, items) {
  return `
    <div class="side-nav-section">
      <span class="nav-section-label">${esc(label)}</span>
      ${items
        .map(
          ([id, text, iconName]) => `
            <button class="nav-button ${state.view === id ? "active" : ""}" data-action="nav" data-view="${id}">
              ${icon(iconName)}
              <span>${esc(text)}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderNav() {
  const statusClass = state.sync.connected ? "online" : "";
  const groups = [
    {
      label: "Register",
      items: [
        ["pos", "Sales", "pos"],
        ["items", "Items", "tag"],
        ["inventory", "Stock", "box"]
      ]
    },
    {
      label: "Back Office",
      items: [
        ["masters", "Masters", "users"],
        ["transactions", "Ledger", "list"],
        ["bincard", "Bin Card", "box"],
        ["reports", "Reports", "chart"]
      ]
    },
    {
      label: "System",
      items: [["settings", "Settings", "gear"]]
    }
  ];

  return `
    <nav class="side-nav" aria-label="Main">
      <div class="sidebar-brand">
        <div class="brand-mark">TP</div>
        <div>
          <strong>Invenza POS</strong>
          <span>Retail operations</span>
        </div>
      </div>
      ${groups.map((group) => renderNavGroup(group.label, group.items)).join("")}
      <div class="side-nav-foot">
        <span class="status-dot ${statusClass}"></span>
        <div>
          <strong>${esc(state.sync.connected ? "Online" : "Local")}</strong>
          <span>${esc(state.sync.message)}</span>
        </div>
      </div>
    </nav>
  `;
}

function renderView() {
  if (state.view === "items") return renderItemMaster();
  if (state.view === "inventory") return renderInventory();
  if (state.view === "masters") return renderMasters();
  if (state.view === "transactions") return renderTransactions();
  if (state.view === "bincard") return renderBinCard();
  if (state.view === "reports") return renderReports();
  if (state.view === "settings") return renderSettings();
  return renderPos();
}

function renderPos() {
  const products = filteredProducts();
  const categories = activeCategories();

  return `
    <section class="toolbar">
      <div>
        <h2>Sales</h2>
        <p>Touch products, search code/barcode, then checkout.</p>
      </div>
      <div class="toolbar-actions">
        <button class="button secondary" data-action="clear-cart">Clear Cart</button>
      </div>
    </section>

    <section class="pos-layout">
      <div class="catalog-panel">
        <div class="catalog-controls">
          <label class="search-box">
            <span class="mini-label">Search or barcode</span>
            <input id="productSearch" value="${esc(state.search)}" placeholder="Search product, code, or scan barcode" autocomplete="off" />
          </label>
          <button class="button secondary" data-action="focus-search">${icon("search")} Search</button>
        </div>

        <div class="category-strip" role="tablist">
          <button class="category-chip ${state.categoryId === "all" ? "active" : ""}" data-action="category" data-category-id="all">All</button>
          ${categories
            .map(
              (category) => `
                <button class="category-chip ${state.categoryId === category.id ? "active" : ""}" data-action="category" data-category-id="${category.id}">
                  ${esc(category.name)}
                </button>
              `
            )
            .join("")}
        </div>

        <div class="product-grid">
          ${
            products.length
              ? products.map(renderProductTile).join("")
              : `<div class="empty-state">${icon("empty")}<strong>No products found</strong><span>Try another search or category.</span></div>`
          }
        </div>
      </div>
      ${renderCart()}
    </section>
  `;
}

function renderProductTile(product) {
  const stock = toNumber(product.current_stock);
  const low = stock <= toNumber(product.low_stock_level);
  const out = stock <= 0;
  const stockClass = out ? "out" : low ? "low" : "";
  const initials = product.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return `
    <button class="product-tile" data-action="add-to-cart" data-product-id="${product.id}" ${out ? "disabled" : ""}>
      <span class="product-image">
        ${
          product.image_url
            ? `<img src="${esc(product.image_url)}" alt="${esc(product.name)}" />`
            : esc(initials || "POS")
        }
      </span>
      <span class="product-name">${esc(product.name)}</span>
      <span class="product-meta">
        <span class="price">${money(product.selling_price)}</span>
        <span class="stock-badge ${stockClass}">${out ? "Out" : qty(stock)}</span>
      </span>
    </button>
  `;
}

function cartUnitCount() {
  return state.cart.reduce((sum, line) => sum + toNumber(line.quantity), 0);
}

function renderCart() {
  const totals = cartTotals();
  const customers = activeCustomers();
  const isPaymentStep = state.checkoutStep === "payment" && state.cart.length > 0;
  const title = isPaymentStep ? "Enter Payments" : "Current Sale";
  const subtitle = isPaymentStep
    ? `${state.cart.length} lines - ${qty(cartUnitCount())} units`
    : state.cart.length
      ? "Tap a line to edit qty and discounts"
      : "Ready for a new sale";

  return `
    <aside class="cart-panel ${isPaymentStep ? "payment-open" : ""}">
      <div class="cart-header">
        <div>
          <h3>${title}</h3>
          <p>${subtitle}</p>
        </div>
        <span class="pill">${state.cart.length} lines</span>
      </div>
      ${isPaymentStep ? renderPaymentStep(totals) : renderCartReviewStep(totals, customers)}
    </aside>
  `;
}

function renderCartReviewStep(totals, customers) {
  return `
    <div class="cart-items">
      ${
        state.cart.length
          ? state.cart.map(renderCartItem).join("")
          : `<div class="empty-state">${icon("empty")}<strong>Cart is empty</strong><span>Tap a product to begin.</span></div>`
      }
    </div>
    <div class="cart-footer">
      <label class="field">
        <span>Customer</span>
        <select id="saleCustomer">
          <option value="">Walk-in customer</option>
          ${customers
            .map(
              (customer) => `
                <option value="${customer.id}" ${state.customerId === customer.id ? "selected" : ""}>${esc(customer.name)}</option>
              `
            )
            .join("")}
        </select>
      </label>

      <label class="field">
        <span>Bill discount</span>
        <div class="discount-toggle">
          <button type="button" class="${state.saleDiscountType === "amount" ? "active" : ""}" data-action="bill-discount-type" data-discount-type="amount">Amount</button>
          <button type="button" class="${state.saleDiscountType === "percent" ? "active" : ""}" data-action="bill-discount-type" data-discount-type="percent">%</button>
        </div>
        <input id="saleDiscount" type="number" min="0" step="0.01" value="${esc(state.saleDiscount)}" inputmode="decimal" />
      </label>

      ${renderCartTotals(totals)}

      <button class="button primary full-width" data-action="enter-payments" ${state.cart.length ? "" : "disabled"}>Enter Payments</button>
    </div>
  `;
}

function renderPaymentStep(totals) {
  const selectedCustomer = state.customerId ? findCustomer(state.customerId) : null;
  const balance = roundMoney(Math.max(0, totals.total - totals.amountPaid));
  const suggestedAmount = balance > 0 ? balance : totals.total;

  return `
    <div class="payment-stage">
      <div class="checkout-summary">
        <span class="mini-label">Balance due</span>
        <strong id="paymentBalance">${money(balance)}</strong>
        <span>Total ${money(totals.total)} - Paid ${money(totals.amountPaid)} - ${esc(selectedCustomer?.name || "Walk-in customer")}</span>
      </div>

      <div class="payment-mode-grid" aria-label="Payment mode">
        ${PAYMENT_MODES.map(
          (mode) => `
            <button class="payment-option ${state.paymentMethod === mode.id ? "active" : ""}" data-action="payment" data-method="${mode.id}">
              <strong>${esc(mode.label)}</strong>
              <span>${esc(mode.hint)}</span>
            </button>
          `
        ).join("")}
      </div>

      <div class="payment-entry">
        <label class="field">
          <span>${esc(paymentLabel(state.paymentMethod))} amount</span>
          <input id="paymentAmount" type="number" min="0" step="0.01" value="${esc(state.paymentAmount)}" inputmode="decimal" placeholder="${esc(suggestedAmount)}" />
        </label>
        <button class="button secondary" data-action="add-sale-payment" ${balance > 0 || state.paymentMethod === "cash" ? "" : "disabled"}>Add Payment</button>
      </div>

      <div class="sale-payment-list">
        ${
          state.salePayments.length
            ? state.salePayments.map(renderSalePaymentLine).join("")
            : `<div class="empty-state compact"><strong>No payments added</strong><span>Add one or more payment modes.</span></div>`
        }
      </div>

      ${renderCartTotals(totals, { showPayments: true })}

      <div class="payment-actions">
        <button class="button secondary" data-action="back-to-items">Edit Items</button>
        <button class="button primary" data-action="checkout">${state.salePayments.length ? "Finalize Bill" : `Finalize ${esc(paymentLabel(state.paymentMethod))}`}</button>
      </div>
    </div>
  `;
}

function renderSalePaymentLine(payment) {
  return `
    <article class="sale-payment-line">
      <span>
        <strong>${esc(paymentLabel(payment.method))}</strong>
        <small>Payment</small>
      </span>
      <strong>${money(payment.amount)}</strong>
      <button class="icon-button" title="Remove payment" data-action="remove-sale-payment" data-payment-id="${payment.id}">${icon("trash")}</button>
    </article>
  `;
}

function renderCartTotals(totals, options = {}) {
  const settings = typeof options === "boolean" ? { showPayments: options } : options;
  const balance = roundMoney(Math.max(0, totals.total - totals.amountPaid));
  return `
    <div class="totals">
      <div class="total-row"><span>Subtotal</span><strong id="cartSubtotal">${money(totals.subtotal)}</strong></div>
      <div class="total-row"><span>Line discount</span><strong id="cartLineDiscount">${money(totals.lineDiscount)}</strong></div>
      <div class="total-row"><span>Bill discount</span><strong id="cartBillDiscount">${money(totals.billDiscount)}</strong></div>
      <div class="total-row"><span>Tax</span><strong id="cartTax">${money(totals.tax)}</strong></div>
      <div class="total-row grand"><span>Total</span><strong id="cartTotal">${money(totals.total)}</strong></div>
      ${
        settings.showPayments
          ? `
            <div class="total-row"><span>Paid</span><strong id="cartPaid">${money(totals.amountPaid)}</strong></div>
            <div class="total-row"><span>Balance</span><strong id="cartBalance">${money(balance)}</strong></div>
            <div class="total-row"><span>Change</span><strong id="cartChange">${money(totals.change)}</strong></div>
          `
          : ""
      }
    </div>
  `;
}

function renderCartItem(line) {
  const product = findProduct(line.product_id);
  if (!product) return "";
  const totals = lineCalculation(line);
  const discountType = line.discount_type || "amount";
  const discountValue = line.discount_value ?? 0;
  const discountLabel =
    totals.discount > 0
      ? `${discountType === "percent" ? `${discountValue}%` : money(discountValue)} discount`
      : "No line discount";

  return `
    <article class="cart-list-item">
      <button class="cart-line-button" data-action="open-cart-line-modal" data-product-id="${product.id}">
        <span class="cart-line-main">
          <strong>${esc(product.name)}</strong>
          <span>${esc(product.sku)} - ${money(product.selling_price)} each</span>
          <span class="cart-line-discount">${esc(discountLabel)}</span>
        </span>
        <span class="cart-line-summary">
          <strong>${money(totals.total)}</strong>
          <span>Qty ${qty(line.quantity)}</span>
        </span>
      </button>
      <button class="icon-button cart-remove" title="Remove item" data-action="remove-cart" data-product-id="${product.id}">${icon("trash")}</button>
    </article>
  `;
}

function itemMasterProducts() {
  const term = state.itemSearch.trim().toLowerCase();
  return activeProducts()
    .filter((product) => {
      const category = findCategory(product.category_id)?.name || "";
      const supplier = findSupplier(product.supplier_id)?.name || "";
      return [product.name, product.sku, product.barcode, category, supplier].join(" ").toLowerCase().includes(term);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderItemMaster() {
  const products = itemMasterProducts();
  const selectedProduct = state.itemProductId ? findProduct(state.itemProductId) : null;
  const formTitle = selectedProduct ? "Edit Item" : "New Item";

  return `
    <section class="toolbar">
      <div>
        <h2>Item Master</h2>
        <p>Create and maintain products, prices, categories, suppliers, and barcode details.</p>
      </div>
      <div class="toolbar-actions">
        <label class="search-box">
          <span class="mini-label">Find item</span>
          <input id="itemSearch" value="${esc(state.itemSearch)}" placeholder="Search item, code, barcode, category" autocomplete="off" />
        </label>
        <button class="button primary" data-action="new-product-form">${icon("plus")} New Item</button>
      </div>
    </section>

    <section class="item-master-layout">
      <div class="item-master-panel">
        <div class="item-list-header">
          <div>
            <h3 class="panel-title">Items</h3>
            <p>${products.length} active records</p>
          </div>
        </div>
        <div class="item-master-list">
          ${
            products.length
              ? products.map(renderItemMasterListItem).join("")
              : `<div class="empty-state">${icon("empty")}<strong>No items found</strong><span>Create the first item master record.</span></div>`
          }
        </div>
      </div>

      <div class="item-form-panel">
        <div class="item-form-header">
          <div>
            <h3>${formTitle}</h3>
            <p>${selectedProduct ? `Editing ${esc(selectedProduct.sku)}` : `Next code ${esc(nextProductCode())}`}</p>
          </div>
        </div>
        ${renderProductForm(selectedProduct, { variant: "screen" })}
      </div>
    </section>
  `;
}

function renderItemMasterListItem(product) {
  const category = findCategory(product.category_id)?.name || "Uncategorized";
  const supplier = findSupplier(product.supplier_id)?.name || "No supplier";
  const low = toNumber(product.current_stock) <= toNumber(product.low_stock_level);
  const active = state.itemProductId === product.id;

  return `
    <button class="item-master-list-item ${active ? "active" : ""}" data-action="edit-product" data-product-id="${product.id}">
      <span class="item-master-main">
        <strong>${esc(product.name)}</strong>
        <span>${esc(product.sku)} - ${esc(category)} - ${esc(supplier)}</span>
      </span>
      <span class="item-master-side">
        <strong>${money(product.selling_price)}</strong>
        <span class="stock-badge ${low ? "low" : ""}">${qty(product.current_stock)}</span>
      </span>
    </button>
  `;
}

function renderInventory() {
  const term = state.inventorySearch.trim().toLowerCase();
  const products = activeProducts().filter((product) => {
    const category = findCategory(product.category_id)?.name || "";
    const supplier = findSupplier(product.supplier_id)?.name || "";
    return [product.name, product.sku, product.barcode, category, supplier].join(" ").toLowerCase().includes(term);
  });

  return `
    <section class="toolbar">
      <div>
        <h2>Inventory</h2>
        <p>Review stock balances and post GRN or PRN inventory documents.</p>
      </div>
      <div class="toolbar-actions">
        <label class="search-box">
          <span class="mini-label">Find product</span>
          <input id="inventorySearch" value="${esc(state.inventorySearch)}" placeholder="Search inventory" autocomplete="off" />
        </label>
        <button class="button primary" data-action="open-product-modal">${icon("tag")} Item Master</button>
      </div>
    </section>

    <section class="inventory-panel">
      <table class="data-table desktop-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Supplier</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Low Level</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${products.map(renderInventoryRow).join("")}
        </tbody>
      </table>
      <div class="mobile-list">
        ${products.map(renderInventoryCard).join("")}
      </div>
      ${products.length ? "" : `<div class="empty-state">${icon("empty")}<strong>No inventory items</strong><span>Add your first product.</span></div>`}
    </section>
  `;
}

function renderInventoryRow(product) {
  const category = findCategory(product.category_id)?.name || "Uncategorized";
  const supplier = findSupplier(product.supplier_id)?.name || "-";
  const low = toNumber(product.current_stock) <= toNumber(product.low_stock_level);

  return `
    <tr>
      <td><strong>${esc(product.name)}</strong><div class="muted">${esc(product.sku)}</div></td>
      <td>${esc(category)}</td>
      <td>${esc(supplier)}</td>
      <td>${money(product.selling_price)}</td>
      <td><span class="stock-badge ${low ? "low" : ""}">${qty(product.current_stock)}</span></td>
      <td>${qty(product.low_stock_level)}</td>
      <td>
        <div class="table-actions">
          <button class="button secondary" data-action="open-stock-modal" data-direction="grn" data-product-id="${product.id}">GRN</button>
          <button class="button secondary" data-action="open-stock-modal" data-direction="prn" data-product-id="${product.id}">PRN</button>
          <button class="button secondary" data-action="open-product-modal" data-product-id="${product.id}">Edit Item</button>
        </div>
      </td>
    </tr>
  `;
}

function renderInventoryCard(product) {
  const category = findCategory(product.category_id)?.name || "Uncategorized";
  const supplier = findSupplier(product.supplier_id)?.name || "No supplier";
  const low = toNumber(product.current_stock) <= toNumber(product.low_stock_level);

  return `
    <article class="product-row-card">
      <div>
        <strong>${esc(product.name)}</strong>
        <div class="muted">${esc(product.sku)} - ${esc(category)} - ${esc(supplier)}</div>
      </div>
      <div class="total-row">
        <span>${money(product.selling_price)}</span>
        <span class="stock-badge ${low ? "low" : ""}">${qty(product.current_stock)} in stock</span>
      </div>
      <div class="table-actions">
        <button class="button secondary" data-action="open-stock-modal" data-direction="grn" data-product-id="${product.id}">GRN</button>
        <button class="button secondary" data-action="open-stock-modal" data-direction="prn" data-product-id="${product.id}">PRN</button>
        <button class="button secondary" data-action="open-product-modal" data-product-id="${product.id}">Edit Item</button>
      </div>
    </article>
  `;
}

function renderMasters() {
  const tabs = [
    ["customers", "Customers", state.data.customers.length],
    ["suppliers", "Suppliers", state.data.suppliers.length],
    ["categories", "Categories", state.data.categories.length]
  ];

  const tabTitle = tabs.find(([id]) => id === state.masterTab)?.[1] || "Masters";
  const singularTitle = {
    customers: "Customer",
    suppliers: "Supplier",
    categories: "Category"
  }[state.masterTab];
  const addAction = {
    customers: "open-customer-modal",
    suppliers: "open-supplier-modal",
    categories: "open-category-modal"
  }[state.masterTab];

  return `
    <section class="toolbar">
      <div>
        <h2>Masters</h2>
        <p>Manage the customer, supplier, and category files used by sales and inventory.</p>
      </div>
      <div class="toolbar-actions">
        <label class="search-box">
          <span class="mini-label">Search ${esc(tabTitle)}</span>
          <input id="masterSearch" value="${esc(state.masterSearch)}" placeholder="Search master records" autocomplete="off" />
        </label>
        <button class="button primary" data-action="${addAction}">${icon("plus")} Add ${esc(singularTitle)}</button>
      </div>
    </section>

    <section class="master-panel">
      <div class="master-tabs" role="tablist">
        ${tabs
          .map(
            ([id, label, count]) => `
              <button class="master-tab ${state.masterTab === id ? "active" : ""}" data-action="master-tab" data-master-tab="${id}">
                ${esc(label)}
                <span>${count}</span>
              </button>
            `
          )
          .join("")}
      </div>
      ${state.masterTab === "suppliers" ? renderSupplierMasters() : ""}
      ${state.masterTab === "categories" ? renderCategoryMasters() : ""}
      ${state.masterTab === "customers" ? renderCustomerMasters() : ""}
    </section>
  `;
}

function masterMatches(row, fields) {
  const term = state.masterSearch.trim().toLowerCase();
  if (!term) return true;
  return fields.map((field) => row[field] || "").join(" ").toLowerCase().includes(term);
}

function renderCustomerMasters() {
  const customers = state.data.customers
    .filter((customer) => masterMatches(customer, ["name", "phone", "email", "address", "note"]))
    .sort((a, b) => a.name.localeCompare(b.name));

  return `
    <table class="data-table desktop-table">
      <thead>
        <tr><th>Customer</th><th>Phone</th><th>Email</th><th>Address</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>${customers.map(renderCustomerRow).join("")}</tbody>
    </table>
    <div class="mobile-list">${customers.map(renderCustomerCard).join("")}</div>
    ${customers.length ? "" : `<div class="empty-state">${icon("empty")}<strong>No customers found</strong><span>Add a customer master record.</span></div>`}
  `;
}

function renderCustomerRow(customer) {
  return `
    <tr>
      <td><strong>${esc(customer.name)}</strong><div class="muted">${esc(customer.note || "")}</div></td>
      <td>${esc(customer.phone || "-")}</td>
      <td>${esc(customer.email || "-")}</td>
      <td>${esc(customer.address || "-")}</td>
      <td><span class="stock-badge ${customer.is_active === false ? "out" : ""}">${customer.is_active === false ? "Archived" : "Active"}</span></td>
      <td>
        <div class="table-actions">
          <button class="button secondary" data-action="open-customer-modal" data-customer-id="${customer.id}">Edit</button>
          ${customer.is_active === false ? "" : `<button class="button danger" data-action="archive-customer" data-customer-id="${customer.id}">Archive</button>`}
        </div>
      </td>
    </tr>
  `;
}

function renderCustomerCard(customer) {
  return `
    <article class="product-row-card">
      <div>
        <strong>${esc(customer.name)}</strong>
        <div class="muted">${esc(customer.phone || "No phone")} - ${esc(customer.email || "No email")}</div>
      </div>
      <div class="muted">${esc(customer.address || customer.note || "No extra details")}</div>
      <div class="table-actions">
        <button class="button secondary" data-action="open-customer-modal" data-customer-id="${customer.id}">Edit</button>
        ${customer.is_active === false ? "" : `<button class="button danger" data-action="archive-customer" data-customer-id="${customer.id}">Archive</button>`}
      </div>
    </article>
  `;
}

function renderSupplierMasters() {
  const suppliers = state.data.suppliers
    .filter((supplier) => masterMatches(supplier, ["name", "contact_person", "phone", "email", "address", "note"]))
    .sort((a, b) => a.name.localeCompare(b.name));

  return `
    <table class="data-table desktop-table">
      <thead>
        <tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>${suppliers.map(renderSupplierRow).join("")}</tbody>
    </table>
    <div class="mobile-list">${suppliers.map(renderSupplierCard).join("")}</div>
    ${suppliers.length ? "" : `<div class="empty-state">${icon("empty")}<strong>No suppliers found</strong><span>Add a supplier master record.</span></div>`}
  `;
}

function renderSupplierRow(supplier) {
  return `
    <tr>
      <td><strong>${esc(supplier.name)}</strong><div class="muted">${esc(supplier.note || "")}</div></td>
      <td>${esc(supplier.contact_person || "-")}</td>
      <td>${esc(supplier.phone || "-")}</td>
      <td>${esc(supplier.email || "-")}</td>
      <td><span class="stock-badge ${supplier.is_active === false ? "out" : ""}">${supplier.is_active === false ? "Archived" : "Active"}</span></td>
      <td>
        <div class="table-actions">
          <button class="button secondary" data-action="open-supplier-modal" data-supplier-id="${supplier.id}">Edit</button>
          ${supplier.is_active === false ? "" : `<button class="button danger" data-action="archive-supplier" data-supplier-id="${supplier.id}">Archive</button>`}
        </div>
      </td>
    </tr>
  `;
}

function renderSupplierCard(supplier) {
  return `
    <article class="product-row-card">
      <div>
        <strong>${esc(supplier.name)}</strong>
        <div class="muted">${esc(supplier.contact_person || "No contact")} - ${esc(supplier.phone || "No phone")}</div>
      </div>
      <div class="muted">${esc(supplier.email || supplier.address || "No extra details")}</div>
      <div class="table-actions">
        <button class="button secondary" data-action="open-supplier-modal" data-supplier-id="${supplier.id}">Edit</button>
        ${supplier.is_active === false ? "" : `<button class="button danger" data-action="archive-supplier" data-supplier-id="${supplier.id}">Archive</button>`}
      </div>
    </article>
  `;
}

function renderCategoryMasters() {
  const categories = state.data.categories
    .filter((category) => masterMatches(category, ["name"]))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return `
    <table class="data-table desktop-table">
      <thead>
        <tr><th>Category</th><th>Color</th><th>Sort</th><th>Products</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>${categories.map(renderCategoryRow).join("")}</tbody>
    </table>
    <div class="mobile-list">${categories.map(renderCategoryCard).join("")}</div>
    ${categories.length ? "" : `<div class="empty-state">${icon("empty")}<strong>No categories found</strong><span>Add a category master record.</span></div>`}
  `;
}

function categoryProductCount(categoryId) {
  return activeProducts().filter((product) => product.category_id === categoryId).length;
}

function renderCategoryRow(category) {
  return `
    <tr>
      <td><strong>${esc(category.name)}</strong></td>
      <td><span class="color-swatch" style="background:${esc(category.color || "#0f766e")}"></span>${esc(category.color || "-")}</td>
      <td>${toNumber(category.sort_order)}</td>
      <td>${categoryProductCount(category.id)}</td>
      <td><span class="stock-badge ${category.is_active === false ? "out" : ""}">${category.is_active === false ? "Archived" : "Active"}</span></td>
      <td>
        <div class="table-actions">
          <button class="button secondary" data-action="open-category-modal" data-category-id="${category.id}">Edit</button>
          ${category.is_active === false ? "" : `<button class="button danger" data-action="archive-category" data-category-id="${category.id}">Archive</button>`}
        </div>
      </td>
    </tr>
  `;
}

function renderCategoryCard(category) {
  return `
    <article class="product-row-card">
      <div>
        <strong>${esc(category.name)}</strong>
        <div class="muted">Sort ${toNumber(category.sort_order)} - ${categoryProductCount(category.id)} products</div>
      </div>
      <div><span class="color-swatch" style="background:${esc(category.color || "#0f766e")}"></span>${esc(category.color || "-")}</div>
      <div class="table-actions">
        <button class="button secondary" data-action="open-category-modal" data-category-id="${category.id}">Edit</button>
        ${category.is_active === false ? "" : `<button class="button danger" data-action="archive-category" data-category-id="${category.id}">Archive</button>`}
      </div>
    </article>
  `;
}

function allTransactions() {
  const rows = [];

  for (const sale of state.data.sales) {
    rows.push({
      id: `sale-${sale.id}`,
      kind: "sale",
      type: "Sale",
      date: sale.created_at,
      reference: sale.receipt_no,
      title: sale.status === "cancelled" ? "Cancelled sale" : "Completed sale",
      details: sale.customer_name || findCustomer(sale.customer_id)?.name || "Walk-in customer",
      amount: toNumber(sale.total),
      quantity: "",
      stock_after: "",
      search: [sale.receipt_no, sale.customer_name, sale.status].join(" ")
    });
  }

  for (const payment of state.data.payments) {
    const sale = state.data.sales.find((item) => item.id === payment.sale_id);
    rows.push({
      id: `payment-${payment.id}`,
      kind: "payment",
      type: "Payment",
      date: payment.created_at,
      reference: sale?.receipt_no || payment.sale_id,
      title: `${paymentLabel(payment.method)} payment`,
      details: sale?.customer_name || findCustomer(sale?.customer_id)?.name || "Walk-in customer",
      amount: toNumber(payment.amount),
      quantity: "",
      stock_after: "",
      search: [sale?.receipt_no, payment.method, sale?.customer_name].join(" ")
    });
  }

  for (const movement of state.data.inventory_movements) {
    const product = findProduct(movement.product_id);
    const supplier = findSupplier(movement.supplier_id);
    rows.push({
      id: `inventory-${movement.id}`,
      kind: "inventory",
      movementType: movement.movement_type,
      type: displayMovementType(movement.movement_type),
      date: movement.created_at,
      reference: movement.document_no || movement.reference_type || "-",
      title: displayMovementType(movement.movement_type),
      details: [product?.name || "Product", supplier?.name, movement.reason].filter(Boolean).join(" - "),
      amount: null,
      quantity: movement.quantity_delta,
      stock_after: movement.stock_after,
      search: [product?.name, product?.sku, supplier?.name, movement.movement_type, movement.reason].join(" ")
    });
  }

  const term = state.transactionSearch.trim().toLowerCase();
  return rows
    .filter(
      (row) =>
        state.transactionType === "all" ||
        row.kind === state.transactionType ||
        row.movementType === state.transactionType
    )
    .filter((row) => !term || [row.reference, row.title, row.details, row.search].join(" ").toLowerCase().includes(term))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderTransactions() {
  const rows = allTransactions();
  const filters = [
    ["all", "All"],
    ["sale", "Sales"],
    ["payment", "Payments"],
    ["grn", "GRN"],
    ["prn", "PRN"],
    ["inventory", "Stock Ledger"]
  ];

  return `
    <section class="toolbar">
      <div>
        <h2>Transactions</h2>
        <p>View every sales, payment, and inventory movement record in one ledger.</p>
      </div>
      <div class="toolbar-actions">
        <label class="search-box">
          <span class="mini-label">Find transaction</span>
          <input id="transactionSearch" value="${esc(state.transactionSearch)}" placeholder="Search receipt, product, customer, supplier" autocomplete="off" />
        </label>
        <button class="button secondary" data-action="reload-data">Refresh</button>
      </div>
    </section>

    <section class="transaction-panel">
      <div class="category-strip">
        ${filters
          .map(
            ([id, label]) => `
              <button class="category-chip ${state.transactionType === id ? "active" : ""}" data-action="transaction-filter" data-transaction-type="${id}">
                ${esc(label)}
              </button>
            `
          )
          .join("")}
      </div>
      <table class="data-table desktop-table">
        <thead>
          <tr><th>Date</th><th>Type</th><th>Reference</th><th>Details</th><th>Qty / Stock</th><th>Amount</th></tr>
        </thead>
        <tbody>${rows.map(renderTransactionRow).join("")}</tbody>
      </table>
      <div class="mobile-list">${rows.map(renderTransactionCard).join("")}</div>
      ${rows.length ? "" : `<div class="empty-state">${icon("empty")}<strong>No transactions found</strong><span>Sales and stock changes will appear here.</span></div>`}
    </section>
  `;
}

function renderTransactionRow(row) {
  return `
    <tr>
      <td>${localDate(row.date)}</td>
      <td><span class="transaction-type ${row.kind}">${esc(row.type)}</span></td>
      <td>${esc(row.reference || "-")}</td>
      <td><strong>${esc(row.title)}</strong><div class="muted">${esc(row.details || "")}</div></td>
      <td>${row.kind === "inventory" ? `${qty(row.quantity)} / ${qty(row.stock_after)}` : "-"}</td>
      <td>${row.amount === null ? "-" : money(row.amount)}</td>
    </tr>
  `;
}

function renderTransactionCard(row) {
  return `
    <article class="product-row-card">
      <div class="total-row">
        <span class="transaction-type ${row.kind}">${esc(row.type)}</span>
        <span class="muted">${localDate(row.date)}</span>
      </div>
      <div>
        <strong>${esc(row.title)}</strong>
        <div class="muted">${esc(row.reference || "-")} - ${esc(row.details || "")}</div>
      </div>
      <div class="total-row">
        <span>${row.kind === "inventory" ? `Qty ${qty(row.quantity)} / Stock ${qty(row.stock_after)}` : ""}</span>
        <strong>${row.amount === null ? "" : money(row.amount)}</strong>
      </div>
    </article>
  `;
}

function binCardRows() {
  const term = state.binSearch.trim().toLowerCase();
  return [...state.data.inventory_movements]
    .filter((movement) => state.binProductId === "all" || movement.product_id === state.binProductId)
    .filter((movement) => {
      const product = findProduct(movement.product_id);
      const supplier = findSupplier(movement.supplier_id);
      const text = [
        product?.name,
        product?.sku,
        supplier?.name,
        movement.document_no,
        movement.movement_type,
        movement.reason
      ]
        .join(" ")
        .toLowerCase();
      return !term || text.includes(term);
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

function renderBinCard() {
  const rows = binCardRows();
  const selectedProduct = state.binProductId === "all" ? null : findProduct(state.binProductId);
  const inQty = rows
    .filter((movement) => toNumber(movement.quantity_delta) > 0)
    .reduce((sum, movement) => sum + toNumber(movement.quantity_delta), 0);
  const outQty = rows
    .filter((movement) => toNumber(movement.quantity_delta) < 0)
    .reduce((sum, movement) => sum + Math.abs(toNumber(movement.quantity_delta)), 0);

  return `
    <section class="toolbar">
      <div>
        <h2>Bin Card</h2>
        <p>Product-wise stock ledger with document numbers, quantities, and running balance.</p>
      </div>
      <div class="toolbar-actions">
        <label class="search-box">
          <span class="mini-label">Product</span>
          <select id="binProduct">
            <option value="all">All products</option>
            ${activeProducts()
              .map(
                (product) => `
                  <option value="${product.id}" ${state.binProductId === product.id ? "selected" : ""}>${esc(product.name)} (${esc(product.sku)})</option>
                `
              )
              .join("")}
          </select>
        </label>
        <label class="search-box">
          <span class="mini-label">Find entry</span>
          <input id="binSearch" value="${esc(state.binSearch)}" placeholder="Search document, supplier, note" autocomplete="off" />
        </label>
      </div>
    </section>

    <section class="bin-card-panel">
      <div class="summary-grid">
        <article class="metric"><span>Current stock</span><strong>${selectedProduct ? qty(selectedProduct.current_stock) : "-"}</strong></article>
        <article class="metric"><span>Total in</span><strong>${qty(inQty)}</strong></article>
        <article class="metric"><span>Total out</span><strong>${qty(outQty)}</strong></article>
        <article class="metric"><span>Entries</span><strong>${rows.length}</strong></article>
      </div>
      <table class="data-table desktop-table">
        <thead>
          <tr><th>Date</th><th>Document</th><th>Type</th><th>Product</th><th>Party</th><th>In</th><th>Out</th><th>Balance</th><th>Note</th></tr>
        </thead>
        <tbody>${rows.map(renderBinCardRow).join("")}</tbody>
      </table>
      <div class="mobile-list">${rows.map(renderBinCardMobileRow).join("")}</div>
      ${rows.length ? "" : `<div class="empty-state">${icon("empty")}<strong>No Bin Card entries</strong><span>GRN, PRN, and sales will appear here.</span></div>`}
    </section>
  `;
}

function renderBinCardRow(movement) {
  const product = findProduct(movement.product_id);
  const supplier = findSupplier(movement.supplier_id);
  const delta = toNumber(movement.quantity_delta);
  return `
    <tr>
      <td>${localDate(movement.created_at)}</td>
      <td>${esc(movement.document_no || movement.reference_type || "-")}</td>
      <td><span class="transaction-type inventory">${esc(displayMovementType(movement.movement_type))}</span></td>
      <td><strong>${esc(product?.name || "Product")}</strong><div class="muted">${esc(product?.sku || "")}</div></td>
      <td>${esc(supplier?.name || "-")}</td>
      <td>${delta > 0 ? qty(delta) : "-"}</td>
      <td>${delta < 0 ? qty(Math.abs(delta)) : "-"}</td>
      <td><strong>${qty(movement.stock_after)}</strong></td>
      <td>${esc(movement.reason || "")}</td>
    </tr>
  `;
}

function renderBinCardMobileRow(movement) {
  const product = findProduct(movement.product_id);
  const supplier = findSupplier(movement.supplier_id);
  const delta = toNumber(movement.quantity_delta);
  return `
    <article class="product-row-card">
      <div class="total-row">
        <span class="transaction-type inventory">${esc(displayMovementType(movement.movement_type))}</span>
        <span class="muted">${localDate(movement.created_at)}</span>
      </div>
      <div>
        <strong>${esc(product?.name || "Product")}</strong>
        <div class="muted">${esc(movement.document_no || "-")} - ${esc(supplier?.name || "No party")}</div>
      </div>
      <div class="total-row">
        <span>${delta > 0 ? `In ${qty(delta)}` : `Out ${qty(Math.abs(delta))}`}</span>
        <strong>Bal ${qty(movement.stock_after)}</strong>
      </div>
      ${movement.reason ? `<div class="muted">${esc(movement.reason)}</div>` : ""}
    </article>
  `;
}

function reportData() {
  const today = todayKey();
  const completedSales = state.data.sales.filter((sale) => sale.status !== "cancelled");
  const todaysSales = completedSales.filter((sale) => todayKey(new Date(sale.created_at)) === today);
  const todaysSaleIds = new Set(todaysSales.map((sale) => sale.id));
  const todaysItems = state.data.sale_items.filter((item) => todaysSaleIds.has(item.sale_id));
  const lowStock = activeProducts().filter((product) => toNumber(product.current_stock) <= toNumber(product.low_stock_level));

  const productMap = new Map();
  for (const item of state.data.sale_items) {
    const existing = productMap.get(item.product_id) || {
      product_name: item.product_name,
      sku: item.sku,
      quantity: 0,
      revenue: 0
    };
    existing.quantity += toNumber(item.quantity);
    existing.revenue += toNumber(item.line_total);
    productMap.set(item.product_id, existing);
  }

  const paymentMap = new Map();
  for (const payment of state.data.payments) {
    const method = payment.method || "unknown";
    paymentMap.set(method, (paymentMap.get(method) || 0) + toNumber(payment.amount));
  }

  return {
    todaySalesTotal: todaysSales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
    todayTransactions: todaysSales.length,
    todayUnits: todaysItems.reduce((sum, item) => sum + toNumber(item.quantity), 0),
    lowStock,
    productSales: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    payments: [...paymentMap.entries()].map(([method, amount]) => ({ method, amount })),
    movements: state.data.inventory_movements.slice(0, 8)
  };
}

function renderReports() {
  const data = reportData();

  return `
    <section class="toolbar">
      <div>
        <h2>Reports</h2>
        <p>Basic sales and inventory visibility for Stage 1.</p>
      </div>
      <div class="toolbar-actions">
        <button class="button secondary" data-action="reload-data">Refresh</button>
      </div>
    </section>

    <section class="report-panel">
      <div class="summary-grid">
        <article class="metric"><span>Sales today</span><strong>${money(data.todaySalesTotal)}</strong></article>
        <article class="metric"><span>Transactions</span><strong>${data.todayTransactions}</strong></article>
        <article class="metric"><span>Units sold</span><strong>${qty(data.todayUnits)}</strong></article>
        <article class="metric"><span>Low stock</span><strong>${data.lowStock.length}</strong></article>
      </div>

      <div class="report-grid">
        ${renderReportCard("Product-wise Sales", renderProductSalesTable(data.productSales))}
        ${renderReportCard("Low-stock Inventory", renderLowStockTable(data.lowStock))}
        ${renderReportCard("Payment Method Summary", renderPaymentTable(data.payments))}
        ${renderReportCard("Latest Stock Movements", renderMovementTable(data.movements))}
      </div>
    </section>
  `;
}

function renderReportCard(title, body) {
  return `
    <article class="report-card">
      <header><h3>${esc(title)}</h3></header>
      ${body}
    </article>
  `;
}

function renderProductSalesTable(rows) {
  if (!rows.length) return `<div class="empty-state"><strong>No sales yet</strong><span>Completed sales will appear here.</span></div>`;
  return `
    <table class="data-table">
      <thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td><strong>${esc(row.product_name)}</strong><div class="muted">${esc(row.sku)}</div></td>
                <td>${qty(row.quantity)}</td>
                <td>${money(row.revenue)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderLowStockTable(rows) {
  if (!rows.length) return `<div class="empty-state"><strong>No low-stock items</strong><span>Everything is above reorder level.</span></div>`;
  return `
    <table class="data-table">
      <thead><tr><th>Product</th><th>Stock</th><th>Level</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (product) => `
              <tr>
                <td><strong>${esc(product.name)}</strong><div class="muted">${esc(product.sku)}</div></td>
                <td><span class="stock-badge low">${qty(product.current_stock)}</span></td>
                <td>${qty(product.low_stock_level)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderPaymentTable(rows) {
  if (!rows.length) return `<div class="empty-state"><strong>No payments yet</strong><span>Payment totals will appear here.</span></div>`;
  return `
    <table class="data-table">
      <thead><tr><th>Method</th><th>Total</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td><strong>${esc(paymentLabel(row.method))}</strong></td>
                <td>${money(row.amount)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderMovementTable(rows) {
  if (!rows.length) return `<div class="empty-state"><strong>No movements</strong><span>Stock activity will appear here.</span></div>`;
  return `
    <table class="data-table">
      <thead><tr><th>Product</th><th>Change</th><th>Time</th></tr></thead>
      <tbody>
        ${rows
          .map((move) => {
            const product = findProduct(move.product_id);
            return `
              <tr>
                <td><strong>${esc(product?.name || "Product")}</strong><div class="muted">${esc(displayMovementType(move.movement_type))} ${move.document_no ? `- ${esc(move.document_no)}` : ""}</div></td>
                <td>${qty(move.quantity_delta)}</td>
                <td>${localDate(move.created_at)}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderSettings() {
  const settings = state.data.settings;

  return `
    <section class="toolbar">
      <div>
        <h2>Settings</h2>
        <p>Store details, Supabase sign-in, and setup status.</p>
      </div>
    </section>

    <section class="settings-grid">
      <div class="settings-panel">
        <h3 class="panel-title">Store Settings</h3>
        <form id="settingsForm" class="form-grid">
          <label class="field">
            <span>Store name</span>
            <input name="store_name" value="${esc(settings.store_name)}" required />
          </label>
          <label class="field">
            <span>Currency</span>
            <input name="currency" value="${esc(settings.currency)}" required />
          </label>
          <label class="field">
            <span>Phone</span>
            <input name="store_phone" value="${esc(settings.store_phone || "")}" />
          </label>
          <label class="field">
            <span>Default tax %</span>
            <input name="default_tax_rate" type="number" min="0" step="0.001" value="${esc(settings.default_tax_rate)}" inputmode="decimal" />
          </label>
          <label class="field full">
            <span>Address</span>
            <textarea name="store_address" rows="3">${esc(settings.store_address || "")}</textarea>
          </label>
          <label class="field full">
            <span>Receipt footer</span>
            <input name="receipt_footer" value="${esc(settings.receipt_footer || "")}" />
          </label>
          <div class="full">
            <button class="button primary" type="submit">Save Settings</button>
          </div>
        </form>
      </div>

      <div class="settings-panel">
        <h3 class="panel-title">Supabase Connection</h3>
        <div class="panel-pad">
          <p><strong>Status:</strong> ${esc(state.sync.message)}</p>
          ${
            hasSupabaseConfig()
              ? renderAuthPanel()
              : `<div class="notice warning">
                  Add your Supabase Project URL and public anon key in config.js. Until then, the app runs in local demo mode.
                </div>`
          }
          <div class="notice" style="margin-top: 12px;">
            Send only the Project URL and anon public key when you want me to connect it. Keep the database password and service role key private.
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderAuthPanel(variant = "settings") {
  if (state.sync.connected) {
    return `
      <div class="notice">
        Signed in as ${esc(state.sync.profile?.email || state.sync.profile?.full_name || "Supabase user")}.
      </div>
      <div style="margin-top: 12px;">
        <button class="button secondary" data-action="sign-out">Sign Out</button>
      </div>
    `;
  }

  const isLogin = variant === "login";

  return `
    <form id="authForm" class="${isLogin ? "login-form" : "form-grid"}">
      <label class="field full">
        <span>Email</span>
        <input name="email" type="email" autocomplete="email" required />
      </label>
      <label class="field full">
        <span>Password</span>
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <div class="${isLogin ? "login-actions" : "full table-actions"}">
        <button class="button primary" type="submit" data-auth-mode="signin">${isLogin ? icon("login") : ""} Sign In</button>
        <button class="button secondary" type="submit" data-auth-mode="signup">Create Account</button>
      </div>
    </form>
  `;
}

function renderModal() {
  if (!state.modal) return "";
  if (state.modal.type === "cart-line") return renderCartLineModal();
  if (state.modal.type === "stock") return renderStockModal();
  if (state.modal.type === "customer") return renderCustomerModal();
  if (state.modal.type === "supplier") return renderSupplierModal();
  if (state.modal.type === "category") return renderCategoryModal();
  if (state.modal.type === "receipt") return renderReceiptModal();
  return "";
}

function renderCartLineModal() {
  const line = state.cart.find((item) => item.product_id === state.modal.productId);
  const product = line ? findProduct(line.product_id) : null;
  if (!line || !product) return "";

  const totals = lineCalculation(line);
  const discountType = line.discount_type || "amount";

  return `
    <div class="modal-backdrop">
      <section class="modal small" role="dialog" aria-modal="true">
        <header>
          <h3>Edit Sale Item</h3>
          <button class="icon-button" data-action="close-modal" title="Close">${icon("close")}</button>
        </header>
        <form id="cartLineForm">
          <div class="modal-body form-grid">
            <input type="hidden" name="product_id" value="${esc(product.id)}" />
            <div class="full notice">
              <strong>${esc(product.name)}</strong><br />
              ${esc(product.sku)} - ${money(product.selling_price)} each - ${qty(product.current_stock)} available
            </div>
            <label class="field full">
              <span>Quantity</span>
              <input name="quantity" type="number" min="0.001" max="${esc(product.current_stock)}" step="0.001" value="${esc(line.quantity)}" inputmode="decimal" required autofocus />
            </label>
            <label class="field">
              <span>Discount type</span>
              <select name="discount_type">
                <option value="amount" ${discountType === "amount" ? "selected" : ""}>Amount</option>
                <option value="percent" ${discountType === "percent" ? "selected" : ""}>Percent</option>
              </select>
            </label>
            <label class="field">
              <span>Discount value</span>
              <input name="discount_value" type="number" min="0" step="0.01" value="${esc(line.discount_value ?? 0)}" inputmode="decimal" />
            </label>
            <div class="full item-edit-summary">
              <div><span>Gross</span><strong id="editLineGross">${money(totals.gross)}</strong></div>
              <div><span>Line discount</span><strong id="editLineDiscount">${money(totals.discount)}</strong></div>
              <div><span>Tax</span><strong id="editLineTax">${money(totals.tax)}</strong></div>
              <div><span>Line total</span><strong id="editLineTotal">${money(totals.total)}</strong></div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="button danger" type="button" data-action="remove-cart" data-product-id="${product.id}">Remove</button>
            <button class="button secondary" type="button" data-action="close-modal">Cancel</button>
            <button class="button primary" type="submit">Save Item</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderProductForm(product, options = {}) {
  const isScreen = options.variant === "screen";
  const categories = activeCategories();
  const suppliers = activeSuppliers();
  const productCode = product?.sku || nextProductCode();

  return `
    <form id="productForm" class="${isScreen ? "item-form" : ""}">
      <div class="${isScreen ? "item-form-body form-grid" : "modal-body form-grid"}">
        <input type="hidden" name="id" value="${esc(product?.id || "")}" />
        <label class="field">
          <span>Product name</span>
          <input name="name" value="${esc(product?.name || "")}" required />
        </label>
        <label class="field">
          <span>Product code</span>
          <input name="sku" value="${esc(productCode)}" readonly required />
        </label>
        <label class="field">
          <span>Barcode</span>
          <input name="barcode" value="${esc(product?.barcode || "")}" />
        </label>
        <label class="field">
          <span>Category</span>
          <select name="category_id">
            <option value="">Uncategorized</option>
            ${categories
              .map(
                (category) => `
                  <option value="${category.id}" ${product?.category_id === category.id ? "selected" : ""}>${esc(category.name)}</option>
                `
              )
              .join("")}
          </select>
        </label>
        <label class="field full">
          <span>New category name</span>
          <input name="new_category" placeholder="Optional" />
        </label>
        <label class="field">
          <span>Supplier</span>
          <select name="supplier_id">
            <option value="">No supplier</option>
            ${suppliers
              .map(
                (supplier) => `
                  <option value="${supplier.id}" ${product?.supplier_id === supplier.id ? "selected" : ""}>${esc(supplier.name)}</option>
                `
              )
              .join("")}
          </select>
        </label>
        <label class="field">
          <span>Cost price</span>
          <input name="cost_price" type="number" min="0" step="0.01" value="${esc(product?.cost_price ?? 0)}" inputmode="decimal" />
        </label>
        <label class="field">
          <span>Selling price</span>
          <input name="selling_price" type="number" min="0" step="0.01" value="${esc(product?.selling_price ?? "")}" inputmode="decimal" required />
        </label>
        <label class="field">
          <span>${product ? "Current stock" : "Opening stock"}</span>
          <input name="current_stock" type="number" min="0" step="0.001" value="${esc(product?.current_stock ?? 0)}" inputmode="decimal" ${product ? "readonly" : ""} />
        </label>
        <label class="field">
          <span>Low-stock level</span>
          <input name="low_stock_level" type="number" min="0" step="0.001" value="${esc(product?.low_stock_level ?? 5)}" inputmode="decimal" />
        </label>
        <label class="field">
          <span>Tax %</span>
          <input name="tax_rate" type="number" min="0" step="0.001" value="${esc(product?.tax_rate ?? state.data.settings.default_tax_rate ?? 0)}" inputmode="decimal" />
        </label>
        <label class="field">
          <span>Image URL</span>
          <input name="image_url" value="${esc(product?.image_url || "")}" />
        </label>
      </div>
      <div class="${isScreen ? "item-form-actions" : "modal-actions"}">
        ${product ? `<button class="button danger" type="button" data-action="archive-product" data-product-id="${product.id}">Archive</button>` : ""}
        <button class="button secondary" type="button" data-action="${isScreen ? "new-product-form" : "close-modal"}">${isScreen ? "Clear" : "Cancel"}</button>
        <button class="button primary" type="submit">${product ? "Save Item" : "Create Item"}</button>
      </div>
    </form>
  `;
}

function renderStockModal() {
  const product = findProduct(state.modal.productId);
  const direction = state.modal.direction;
  const title = direction === "grn" ? "Goods Received Note" : "Purchase Return Note";
  const suppliers = activeSuppliers();
  const defaultDocumentNo = nextInventoryDocumentNo(direction);

  return `
    <div class="modal-backdrop">
      <section class="modal small" role="dialog" aria-modal="true">
        <header>
          <h3>${title}</h3>
          <button class="icon-button" data-action="close-modal" title="Close">${icon("close")}</button>
        </header>
        <form id="stockForm">
          <div class="modal-body form-grid">
            <input type="hidden" name="product_id" value="${esc(product.id)}" />
            <input type="hidden" name="direction" value="${esc(direction)}" />
            <div class="full notice">
              ${esc(product.name)} currently has ${qty(product.current_stock)} units. This will post a ${direction.toUpperCase()} transaction.
            </div>
            <label class="field full">
              <span>Document no</span>
              <input name="document_no" value="${esc(defaultDocumentNo)}" required />
            </label>
            <label class="field full">
              <span>Quantity</span>
              <input name="quantity" type="number" min="0.001" step="0.001" inputmode="decimal" required autofocus />
            </label>
            <label class="field full">
              <span>Supplier</span>
              <select name="supplier_id">
                <option value="">No supplier</option>
                ${suppliers
                  .map(
                    (supplier) => `
                      <option value="${supplier.id}" ${product.supplier_id === supplier.id ? "selected" : ""}>${esc(supplier.name)}</option>
                    `
                  )
                  .join("")}
              </select>
            </label>
            <label class="field full">
              <span>Note</span>
              <input name="reason" placeholder="${direction === "grn" ? "Supplier delivery" : "Returned to supplier"}" />
            </label>
          </div>
          <div class="modal-actions">
            <button class="button secondary" type="button" data-action="close-modal">Cancel</button>
            <button class="button primary" type="submit">Save Movement</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderCustomerModal() {
  const customer = state.modal.customerId ? findCustomer(state.modal.customerId) : null;
  return `
    <div class="modal-backdrop">
      <section class="modal small" role="dialog" aria-modal="true">
        <header>
          <h3>${customer ? "Edit Customer" : "Add Customer"}</h3>
          <button class="icon-button" data-action="close-modal" title="Close">${icon("close")}</button>
        </header>
        <form id="customerForm">
          <div class="modal-body form-grid">
            <input type="hidden" name="id" value="${esc(customer?.id || "")}" />
            <label class="field full">
              <span>Customer name</span>
              <input name="name" value="${esc(customer?.name || "")}" required />
            </label>
            <label class="field">
              <span>Phone</span>
              <input name="phone" value="${esc(customer?.phone || "")}" inputmode="tel" />
            </label>
            <label class="field">
              <span>Email</span>
              <input name="email" type="email" value="${esc(customer?.email || "")}" />
            </label>
            <label class="field full">
              <span>Address</span>
              <textarea name="address" rows="3">${esc(customer?.address || "")}</textarea>
            </label>
            <label class="field full">
              <span>Note</span>
              <input name="note" value="${esc(customer?.note || "")}" />
            </label>
          </div>
          <div class="modal-actions">
            ${customer ? `<button class="button danger" type="button" data-action="archive-customer" data-customer-id="${customer.id}">Archive</button>` : ""}
            <button class="button secondary" type="button" data-action="close-modal">Cancel</button>
            <button class="button primary" type="submit">Save Customer</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderSupplierModal() {
  const supplier = state.modal.supplierId ? findSupplier(state.modal.supplierId) : null;
  return `
    <div class="modal-backdrop">
      <section class="modal small" role="dialog" aria-modal="true">
        <header>
          <h3>${supplier ? "Edit Supplier" : "Add Supplier"}</h3>
          <button class="icon-button" data-action="close-modal" title="Close">${icon("close")}</button>
        </header>
        <form id="supplierForm">
          <div class="modal-body form-grid">
            <input type="hidden" name="id" value="${esc(supplier?.id || "")}" />
            <label class="field full">
              <span>Supplier name</span>
              <input name="name" value="${esc(supplier?.name || "")}" required />
            </label>
            <label class="field">
              <span>Contact person</span>
              <input name="contact_person" value="${esc(supplier?.contact_person || "")}" />
            </label>
            <label class="field">
              <span>Phone</span>
              <input name="phone" value="${esc(supplier?.phone || "")}" inputmode="tel" />
            </label>
            <label class="field">
              <span>Email</span>
              <input name="email" type="email" value="${esc(supplier?.email || "")}" />
            </label>
            <label class="field full">
              <span>Address</span>
              <textarea name="address" rows="3">${esc(supplier?.address || "")}</textarea>
            </label>
            <label class="field full">
              <span>Note</span>
              <input name="note" value="${esc(supplier?.note || "")}" />
            </label>
          </div>
          <div class="modal-actions">
            ${supplier ? `<button class="button danger" type="button" data-action="archive-supplier" data-supplier-id="${supplier.id}">Archive</button>` : ""}
            <button class="button secondary" type="button" data-action="close-modal">Cancel</button>
            <button class="button primary" type="submit">Save Supplier</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderCategoryModal() {
  const category = state.modal.categoryId ? findCategory(state.modal.categoryId) : null;
  return `
    <div class="modal-backdrop">
      <section class="modal small" role="dialog" aria-modal="true">
        <header>
          <h3>${category ? "Edit Category" : "Add Category"}</h3>
          <button class="icon-button" data-action="close-modal" title="Close">${icon("close")}</button>
        </header>
        <form id="categoryForm">
          <div class="modal-body form-grid">
            <input type="hidden" name="id" value="${esc(category?.id || "")}" />
            <label class="field full">
              <span>Category name</span>
              <input name="name" value="${esc(category?.name || "")}" required />
            </label>
            <label class="field">
              <span>Color</span>
              <input name="color" type="color" value="${esc(category?.color || "#0f766e")}" />
            </label>
            <label class="field">
              <span>Sort order</span>
              <input name="sort_order" type="number" step="1" value="${esc(category?.sort_order ?? state.data.categories.length + 1)}" inputmode="numeric" />
            </label>
          </div>
          <div class="modal-actions">
            ${category ? `<button class="button danger" type="button" data-action="archive-category" data-category-id="${category.id}">Archive</button>` : ""}
            <button class="button secondary" type="button" data-action="close-modal">Cancel</button>
            <button class="button primary" type="submit">Save Category</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function receiptPayments(receipt) {
  if (Array.isArray(receipt.payments) && receipt.payments.length) {
    return receipt.payments
      .map((payment) => ({
        method: payment.method || "cash",
        amount: roundMoney(Math.max(0, toNumber(payment.amount)))
      }))
      .filter((payment) => payment.amount > 0);
  }

  if (receipt.payment_method || receipt.amount_paid) {
    return [
      {
        method: receipt.payment_method || "cash",
        amount: roundMoney(Math.max(0, toNumber(receipt.amount_paid)))
      }
    ].filter((payment) => payment.amount > 0);
  }

  return [];
}

function renderReceiptPaymentLines(receipt) {
  const payments = receiptPayments(receipt);
  if (!payments.length) return "";

  return payments
    .map(
      (payment) => `
        <div class="receipt-line"><span>${esc(paymentLabel(payment.method))}</span><strong>${money(payment.amount)}</strong></div>
      `
    )
    .join("");
}

function receiptToText(receipt) {
  const settings = state.data.settings;
  const itemLines = receipt.items.flatMap((item) => {
    const lines = [`${item.name} x ${qty(item.quantity)} - ${money(item.line_total)}`];
    if (toNumber(item.line_discount) > 0) lines.push(`  Line discount: ${money(item.line_discount)}`);
    return lines;
  });
  const paymentLines = receiptPayments(receipt).map((payment) => `${paymentLabel(payment.method)}: ${money(payment.amount)}`);

  return [
    settings.store_name,
    settings.store_address,
    settings.store_phone ? `Tel: ${settings.store_phone}` : "",
    `Receipt: ${receipt.receipt_no}`,
    localDate(receipt.created_at),
    receipt.customer_name ? `Customer: ${receipt.customer_name}` : "",
    "",
    ...itemLines,
    "",
    `Subtotal: ${money(receipt.subtotal)}`,
    `Line discount: ${money(receipt.line_discount_total || 0)}`,
    `Bill discount: ${money(receipt.bill_discount_total || 0)}`,
    `Tax: ${money(receipt.tax_total)}`,
    `Total: ${money(receipt.total)}`,
    ...paymentLines,
    `Paid: ${money(receipt.amount_paid)}`,
    `Change: ${money(receipt.change_amount)}`,
    "",
    settings.receipt_footer || ""
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");
}

function receiptPdfFileName(receipt) {
  return `${String(receipt.receipt_no || "bill").replace(/[^a-z0-9-]+/gi, "-")}.pdf`;
}

function wrapPdfLine(line, maxLength = 42) {
  const text = String(line || "");
  if (text.length <= maxLength) return [text];

  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function sanitizePdfText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfText(value) {
  return sanitizePdfText(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function createReceiptPdfBlob(receipt) {
  const lines = receiptToText(receipt)
    .split("\n")
    .flatMap((line) => (line ? wrapPdfLine(line) : [""]));
  const margin = 16;
  const lineHeight = 13;
  const pageWidth = 260;
  const pageHeight = Math.max(380, margin * 2 + lines.length * lineHeight + 24);
  const streamLines = ["BT", "/F1 10 Tf"];
  let y = pageHeight - margin - 8;

  for (const line of lines) {
    streamLines.push(`1 0 0 1 ${margin} ${y} Tm (${escapePdfText(line)}) Tj`);
    y -= lineHeight;
  }
  streamLines.push("ET");

  const stream = streamLines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function downloadReceiptPdf(receipt) {
  const blob = createReceiptPdfBlob(receipt);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = receiptPdfFileName(receipt);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function whatsappReceiptUrl(receipt, phone) {
  const text = encodeURIComponent(receiptToText(receipt));
  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  return normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${text}`
    : `https://api.whatsapp.com/send?text=${text}`;
}

function sendWhatsAppReceipt() {
  const receipt = state.modal?.receipt;
  if (!receipt) return;
  const phone = document.querySelector("#whatsappPhone")?.value || receipt.customer_phone || "";
  window.open(whatsappReceiptUrl(receipt, phone), "_blank", "noopener");
}

async function shareReceiptPdf() {
  const receipt = state.modal?.receipt;
  if (!receipt) return;

  const blob = createReceiptPdfBlob(receipt);
  const fileName = receiptPdfFileName(receipt);
  const file = new File([blob], fileName, { type: "application/pdf" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Bill ${receipt.receipt_no}`,
        text: `Bill ${receipt.receipt_no}`
      });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error(error);
    }
  }

  downloadReceiptPdf(receipt);
  sendWhatsAppReceipt();
  showToast("PDF bill downloaded. Attach it in WhatsApp if your browser cannot share files directly.");
}

function renderReceiptModal() {
  const receipt = state.modal.receipt;
  return `
    <div class="modal-backdrop">
      <section class="modal small" role="dialog" aria-modal="true">
        <header>
          <h3>Receipt</h3>
          <button class="icon-button" data-action="close-modal" title="Close">${icon("close")}</button>
        </header>
        <div class="modal-body">
          <div class="receipt">
            <h4>${esc(state.data.settings.store_name)}</h4>
            <p>${esc(receipt.receipt_no)}</p>
            <p>${localDate(receipt.created_at)}</p>
            ${receipt.customer_name ? `<p>Customer: ${esc(receipt.customer_name)}</p>` : ""}
            <hr />
            ${receipt.items
              .map(
                (item) => `
                  <div class="receipt-line">
                    <span>${esc(item.name)} x ${qty(item.quantity)}</span>
                    <strong>${money(item.line_total)}</strong>
                  </div>
                  ${
                    toNumber(item.line_discount) > 0
                      ? `<div class="receipt-line muted"><span>Line discount</span><span>${money(item.line_discount)}</span></div>`
                      : ""
                  }
                `
              )
              .join("")}
            <hr />
            <div class="receipt-line"><span>Subtotal</span><strong>${money(receipt.subtotal)}</strong></div>
            <div class="receipt-line"><span>Line discount</span><strong>${money(receipt.line_discount_total || 0)}</strong></div>
            <div class="receipt-line"><span>Bill discount</span><strong>${money(receipt.bill_discount_total || 0)}</strong></div>
            <div class="receipt-line"><span>Tax</span><strong>${money(receipt.tax_total)}</strong></div>
            <div class="receipt-line"><span>Total</span><strong>${money(receipt.total)}</strong></div>
            ${renderReceiptPaymentLines(receipt)}
            <div class="receipt-line"><span>Paid</span><strong>${money(receipt.amount_paid)}</strong></div>
            <div class="receipt-line"><span>Change</span><strong>${money(receipt.change_amount)}</strong></div>
            <hr />
            <p>${esc(state.data.settings.receipt_footer || "")}</p>
          </div>
          <label class="field whatsapp-field">
            <span>WhatsApp number</span>
            <input id="whatsappPhone" value="${esc(receipt.customer_phone || "")}" placeholder="Enter customer mobile number" inputmode="tel" />
          </label>
        </div>
        <div class="modal-actions">
          <button class="button secondary" type="button" data-action="close-modal">New Sale</button>
          <button class="button secondary" type="button" data-action="download-receipt-pdf">Download PDF</button>
          <button class="button secondary" type="button" data-action="whatsapp-receipt">WhatsApp PDF</button>
          <button class="button primary" type="button" data-action="print-receipt">Print Bill</button>
        </div>
      </section>
    </div>
  `;
}

function updateClock() {
  const clock = document.querySelector("#clock");
  if (clock) {
    clock.textContent = new Date().toLocaleString([], {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

function addToCart(productId) {
  const product = findProduct(productId);
  if (!product || toNumber(product.current_stock) <= 0) return;

  const existing = state.cart.find((line) => line.product_id === productId);
  const existingQty = existing?.quantity || 0;

  if (existingQty + 1 > toNumber(product.current_stock)) {
    showToast("Not enough stock for this product.");
    return;
  }

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ product_id: productId, quantity: 1, discount_type: "amount", discount_value: 0 });
  }

  state.checkoutStep = "items";
  resetSalePayments();
  render();
}

function changeCartQty(productId, delta) {
  const line = state.cart.find((item) => item.product_id === productId);
  const product = findProduct(productId);
  if (!line || !product) return;

  const nextQty = line.quantity + delta;
  if (nextQty <= 0) {
    state.cart = state.cart.filter((item) => item.product_id !== productId);
  } else if (nextQty <= toNumber(product.current_stock)) {
    line.quantity = nextQty;
  } else {
    showToast("Not enough stock for this product.");
    return;
  }

  resetSalePayments();
  render();
}

function removeCartItem(productId) {
  state.cart = state.cart.filter((item) => item.product_id !== productId);
  if (state.modal?.type === "cart-line" && state.modal.productId === productId) {
    state.modal = null;
  }
  if (!state.cart.length) state.checkoutStep = "items";
  resetSalePayments();
  render();
}

function saveCartLine(form) {
  const productId = formValue(form, "product_id");
  const line = state.cart.find((item) => item.product_id === productId);
  const product = findProduct(productId);
  if (!line || !product) return;

  const quantity = toNumber(formValue(form, "quantity"));
  const discountValue = toNumber(formValue(form, "discount_value"));
  const discountType = formValue(form, "discount_type");

  if (quantity <= 0) {
    showToast("Quantity must be greater than zero.");
    return;
  }

  if (quantity > toNumber(product.current_stock)) {
    showToast("Not enough stock for this product.");
    return;
  }

  line.quantity = quantity;
  line.discount_type = discountType === "percent" ? "percent" : "amount";
  line.discount_value = Math.max(0, discountValue);
  state.modal = null;
  resetSalePayments();
  render();
}

function updateCartLinePreview(form) {
  const product = findProduct(formValue(form, "product_id"));
  if (!product) return;

  const quantity = Math.max(0, toNumber(formValue(form, "quantity")));
  const gross = roundMoney(toNumber(product.selling_price) * quantity);
  const discountValue = Math.max(0, toNumber(formValue(form, "discount_value")));
  const discount =
    formValue(form, "discount_type") === "percent"
      ? roundMoney(gross * Math.min(discountValue, 100) / 100)
      : roundMoney(Math.min(discountValue, gross));
  const net = roundMoney(Math.max(0, gross - discount));
  const tax = roundMoney(net * (toNumber(product.tax_rate) / 100));
  const total = roundMoney(net + tax);

  const values = {
    editLineGross: money(gross),
    editLineDiscount: money(discount),
    editLineTax: money(tax),
    editLineTotal: money(total)
  };

  for (const [id, value] of Object.entries(values)) {
    const element = document.querySelector(`#${id}`);
    if (element) element.textContent = value;
  }
}

function resetSalePayments() {
  state.salePayments = [];
  state.paymentAmount = "";
  state.cashReceived = "";
}

function addSalePayment() {
  if (!state.cart.length) return;

  const totals = cartTotals();
  const balance = roundMoney(Math.max(0, totals.total - totals.amountPaid));
  const method = state.paymentMethod || "cash";
  const rawAmount = roundMoney(toNumber(state.paymentAmount, balance));

  if (balance <= 0 && method !== "cash") {
    showToast("This bill is already fully paid.");
    return;
  }

  if (rawAmount <= 0) {
    showToast("Payment amount must be greater than zero.");
    return;
  }

  if (method !== "cash" && rawAmount > balance) {
    showToast("Non-cash payment cannot be more than the balance.");
    return;
  }

  state.salePayments.push({
    id: makeId(),
    method,
    amount: rawAmount
  });
  state.paymentAmount = "";
  render();
}

function removeSalePayment(paymentId) {
  state.salePayments = state.salePayments.filter((payment) => payment.id !== paymentId);
  render();
}

function checkoutPaymentsFor(totals) {
  const enteredPayments = state.salePayments
    .map((payment) => ({
      id: payment.id || makeId(),
      method: payment.method || "cash",
      amount: roundMoney(Math.max(0, toNumber(payment.amount)))
    }))
    .filter((payment) => payment.amount > 0);

  if (enteredPayments.length) return enteredPayments;

  if (totals.total <= 0) return [];

  return [
    {
      id: makeId(),
      method: state.paymentMethod || "cash",
      amount: totals.total
    }
  ];
}

async function completeCheckout() {
  const initialTotals = cartTotals();
  const checkoutPayments = checkoutPaymentsFor(initialTotals);
  const totals = cartTotals(checkoutPayments);
  const selectedCustomer = state.customerId ? findCustomer(state.customerId) : null;

  if (!state.cart.length) return;
  if (totals.amountPaid < totals.total) {
    showToast("Paid amount is less than total.");
    return;
  }

  const receiptItems = state.cart.map((line) => {
    const { product, gross, discount, tax, total } = lineCalculation(line);
    return {
      product_id: product.id,
      name: product.name,
      sku: product.sku,
      quantity: line.quantity,
      unit_price: toNumber(product.selling_price),
      line_subtotal: gross,
      line_discount: discount,
      line_tax: tax,
      line_total: total
    };
  });

  try {
    if (state.sync.connected && supabase) {
      const { data, error } = await supabase.rpc("complete_sale", {
        p_items: state.cart.map((line) => ({
          product_id: line.product_id,
          quantity: line.quantity,
          discount_type: line.discount_type || "amount",
          discount_value: toNumber(line.discount_value)
        })),
        p_payments: checkoutPayments.map((payment) => ({
          method: payment.method,
          amount: payment.amount
        })),
        p_discount_total: totals.billDiscount,
        p_bill_discount_type: state.saleDiscountType,
        p_bill_discount_value: toNumber(state.saleDiscount),
        p_customer_name: selectedCustomer?.name || null,
        p_customer_id: selectedCustomer?.id || null,
        p_note: null
      });

      if (error) throw error;

      state.cart = [];
      state.search = "";
      state.checkoutStep = "items";
      state.paymentMethod = "cash";
      resetSalePayments();
      state.saleDiscountType = "amount";
      state.saleDiscount = 0;
      state.customerId = "";
      await loadSupabaseData();
      state.modal = {
        type: "receipt",
        receipt: {
          ...data,
          customer_name: selectedCustomer?.name || data.customer_name || null,
          customer_phone: selectedCustomer?.phone || "",
          payments: checkoutPayments,
          created_at: nowIso(),
          items: receiptItems
        }
      };
      render();
      return;
    }

    const saleId = makeId();
    const receiptNo = `POS-${todayKey().replaceAll("-", "")}-${String(state.data.sales.length + 1).padStart(5, "0")}`;
    const createdAt = nowIso();

    state.data.sales.unshift({
      id: saleId,
      receipt_no: receiptNo,
      cashier_id: "demo-admin",
      customer_id: selectedCustomer?.id || null,
      customer_name: selectedCustomer?.name || null,
      subtotal: totals.subtotal,
      line_discount_total: totals.lineDiscount,
      bill_discount_type: state.saleDiscountType,
      bill_discount_value: toNumber(state.saleDiscount),
      bill_discount_total: totals.billDiscount,
      discount_total: totals.discount,
      tax_total: totals.tax,
      total: totals.total,
      status: "completed",
      note: null,
      created_at: createdAt
    });

    for (const line of state.cart) {
      const { product, gross, discount, tax, total } = lineCalculation(line);
      const stockAfter = roundMoney(toNumber(product.current_stock) - line.quantity);

      state.data.sale_items.unshift({
        id: makeId(),
        sale_id: saleId,
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity: line.quantity,
        unit_price: product.selling_price,
        line_subtotal: gross,
        line_discount_type: line.discount_type || "amount",
        line_discount_value: toNumber(line.discount_value),
        line_discount: discount,
        tax_rate: product.tax_rate,
        line_tax: tax,
        line_total: total,
        created_at: createdAt
      });

      product.current_stock = stockAfter;
      state.data.inventory_movements.unshift({
        id: makeId(),
        product_id: product.id,
        supplier_id: product.supplier_id || null,
        movement_type: "sale",
        quantity_delta: -line.quantity,
        stock_after: stockAfter,
        document_no: receiptNo,
        reference_type: "sale",
        reference_id: saleId,
        reason: "POS sale",
        created_by: "demo-admin",
        created_at: createdAt
      });
    }

    checkoutPayments.forEach((payment, index) => {
      state.data.payments.unshift({
        id: makeId(),
        sale_id: saleId,
        method: payment.method,
        amount: payment.amount,
        change_amount: index === checkoutPayments.length - 1 ? totals.change : 0,
        created_at: createdAt
      });
    });

    state.cart = [];
    state.search = "";
    state.checkoutStep = "items";
    state.paymentMethod = "cash";
    resetSalePayments();
    state.saleDiscountType = "amount";
    state.saleDiscount = 0;
    state.customerId = "";
    saveLocalData();
    state.modal = {
      type: "receipt",
      receipt: {
        receipt_no: receiptNo,
        subtotal: totals.subtotal,
        line_discount_total: totals.lineDiscount,
        bill_discount_total: totals.billDiscount,
        discount_total: totals.discount,
        tax_total: totals.tax,
        total: totals.total,
        amount_paid: totals.amountPaid,
        change_amount: totals.change,
        customer_name: selectedCustomer?.name || null,
        customer_phone: selectedCustomer?.phone || "",
        payments: checkoutPayments,
        created_at: createdAt,
        items: receiptItems
      }
    };
    render();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not complete sale.");
  }
}

async function createCategoryIfNeeded(form) {
  const name = formTrim(form, "new_category");
  if (!name) return formValue(form, "category_id") || null;

  const existing = activeCategories().find((category) => category.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;

  const category = {
    name,
    color: "#0f766e",
    sort_order: state.data.categories.length + 1,
    is_active: true
  };

  if (state.sync.connected && supabase) {
    const { data, error } = await supabase.from("categories").insert(category).select("*").single();
    if (error) throw error;
    state.data.categories.push(data);
    return data.id;
  }

  const localCategory = { id: makeId(), ...category, created_at: nowIso() };
  state.data.categories.push(localCategory);
  return localCategory.id;
}

async function saveProduct(form) {
  const productId = formValue(form, "id") || null;
  const product = productId ? findProduct(productId) : null;
  let savedProductId = productId;

  if (state.sync.mode === "supabase" && !state.sync.connected) {
    showToast("Sign in before saving items.");
    return;
  }

  try {
    const categoryId = await createCategoryIfNeeded(form);
    const productCode = product?.sku || nextProductCode(productId);
    const payload = {
      category_id: categoryId,
      supplier_id: formValue(form, "supplier_id") || null,
      name: formTrim(form, "name"),
      sku: productCode,
      barcode: formTrim(form, "barcode") || null,
      cost_price: toNumber(formValue(form, "cost_price")),
      selling_price: toNumber(formValue(form, "selling_price")),
      low_stock_level: toNumber(formValue(form, "low_stock_level")),
      tax_rate: toNumber(formValue(form, "tax_rate")),
      image_url: formTrim(form, "image_url") || null,
      is_active: true
    };

    if (!payload.name || !payload.sku) {
      showToast("Product name and product code are required.");
      return;
    }

    if (state.sync.connected && supabase) {
      if (productId) {
        const { error } = await supabase.from("products").update(payload).eq("id", productId);
        if (error) throw error;
      } else {
        const openingStock = toNumber(formValue(form, "current_stock"));
        const { data, error } = await supabase.from("products").insert({
          ...payload,
          current_stock: openingStock
        }).select("*").single();
        if (error) throw error;
        savedProductId = data.id;
        if (openingStock > 0) {
          const { error: movementError } = await supabase.from("inventory_movements").insert({
            product_id: data.id,
            supplier_id: data.supplier_id,
            movement_type: "opening",
            quantity_delta: openingStock,
            stock_after: openingStock,
            document_no: "OPENING",
            reference_type: "opening",
            reason: "Opening stock"
          });
          if (movementError) throw movementError;
        }
      }
      await loadSupabaseData();
    } else if (product) {
      Object.assign(product, payload);
      savedProductId = product.id;
      saveLocalData();
    } else {
      const createdProduct = {
        id: makeId(),
        ...payload,
        current_stock: toNumber(formValue(form, "current_stock")),
        created_at: nowIso()
      };
      savedProductId = createdProduct.id;
      state.data.products.push(createdProduct);
      if (createdProduct.current_stock > 0) {
        state.data.inventory_movements.unshift({
          id: makeId(),
          product_id: createdProduct.id,
          supplier_id: createdProduct.supplier_id || null,
          movement_type: "opening",
          quantity_delta: createdProduct.current_stock,
          stock_after: createdProduct.current_stock,
          document_no: "OPENING",
          reference_type: "opening",
          reference_id: null,
          reason: "Opening stock",
          created_by: "demo-admin",
          created_at: nowIso()
        });
      }
      saveLocalData();
    }

    if (state.view === "items") {
      state.itemProductId = savedProductId;
    } else {
      state.modal = null;
    }
    showToast("Item saved.");
  } catch (error) {
    console.error(error);
    showToast(friendlyErrorMessage(error, "Could not save item."));
  }
}

async function archiveProduct(productId) {
  try {
    if (state.sync.connected && supabase) {
      const { error } = await supabase.from("products").update({ is_active: false }).eq("id", productId);
      if (error) throw error;
      await loadSupabaseData();
    } else {
      const product = findProduct(productId);
      if (product) product.is_active = false;
      saveLocalData();
    }
    state.cart = state.cart.filter((line) => line.product_id !== productId);
    if (state.itemProductId === productId) state.itemProductId = null;
    state.modal = null;
    showToast("Item archived.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not archive item.");
  }
}

async function saveStockMovement(form) {
  const productId = formValue(form, "product_id");
  const direction = formValue(form, "direction");
  const quantity = toNumber(formValue(form, "quantity"));
  const delta = direction === "grn" ? quantity : -quantity;
  const reason = formTrim(form, "reason");
  const supplierId = formValue(form, "supplier_id") || null;
  const documentNo = formTrim(form, "document_no") || nextInventoryDocumentNo(direction);

  if (quantity <= 0) {
    showToast("Quantity must be greater than zero.");
    return;
  }

  try {
    if (state.sync.connected && supabase) {
      const { error } = await supabase.rpc("post_inventory_document", {
        p_product_id: productId,
        p_document_type: direction,
        p_quantity: quantity,
        p_document_no: documentNo,
        p_reason: reason || null,
        p_supplier_id: supplierId
      });
      if (error) throw error;
      await loadSupabaseData();
    } else {
      const product = findProduct(productId);
      const nextStock = toNumber(product.current_stock) + delta;
      if (nextStock < 0) {
        showToast("Stock cannot become negative.");
        return;
      }
      product.current_stock = nextStock;
      state.data.inventory_movements.unshift({
        id: makeId(),
        product_id: product.id,
        supplier_id: supplierId,
        movement_type: direction,
        quantity_delta: delta,
        stock_after: nextStock,
        document_no: documentNo,
        reference_type: direction,
        reference_id: null,
        reason,
        created_by: "demo-admin",
        created_at: nowIso()
      });
      saveLocalData();
    }

    state.modal = null;
    showToast("Stock updated.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not update stock.");
  }
}

async function saveCustomer(form) {
  const customerId = formValue(form, "id") || null;
  const customer = customerId ? findCustomer(customerId) : null;
  const payload = {
    name: formTrim(form, "name"),
    phone: formTrim(form, "phone"),
    email: formTrim(form, "email"),
    address: formTrim(form, "address"),
    note: formTrim(form, "note"),
    is_active: true
  };

  if (!payload.name) {
    showToast("Customer name is required.");
    return;
  }

  try {
    if (state.sync.connected && supabase) {
      const request = customerId
        ? supabase.from("customers").update(payload).eq("id", customerId)
        : supabase.from("customers").insert(payload);
      const { error } = await request;
      if (error) throw error;
      await loadSupabaseData();
    } else if (customer) {
      Object.assign(customer, payload);
      saveLocalData();
    } else {
      state.data.customers.push({ id: makeId(), ...payload, created_at: nowIso() });
      saveLocalData();
    }

    state.modal = null;
    showToast("Customer saved.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not save customer.");
  }
}

async function archiveCustomer(customerId) {
  try {
    if (state.sync.connected && supabase) {
      const { error } = await supabase.from("customers").update({ is_active: false }).eq("id", customerId);
      if (error) throw error;
      await loadSupabaseData();
    } else {
      const customer = findCustomer(customerId);
      if (customer) customer.is_active = false;
      saveLocalData();
    }

    if (state.customerId === customerId) state.customerId = "";
    state.modal = null;
    showToast("Customer archived.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not archive customer.");
  }
}

async function saveSupplier(form) {
  const supplierId = formValue(form, "id") || null;
  const supplier = supplierId ? findSupplier(supplierId) : null;
  const payload = {
    name: formTrim(form, "name"),
    contact_person: formTrim(form, "contact_person"),
    phone: formTrim(form, "phone"),
    email: formTrim(form, "email"),
    address: formTrim(form, "address"),
    note: formTrim(form, "note"),
    is_active: true
  };

  if (!payload.name) {
    showToast("Supplier name is required.");
    return;
  }

  try {
    if (state.sync.connected && supabase) {
      const request = supplierId
        ? supabase.from("suppliers").update(payload).eq("id", supplierId)
        : supabase.from("suppliers").insert(payload);
      const { error } = await request;
      if (error) throw error;
      await loadSupabaseData();
    } else if (supplier) {
      Object.assign(supplier, payload);
      saveLocalData();
    } else {
      state.data.suppliers.push({ id: makeId(), ...payload, created_at: nowIso() });
      saveLocalData();
    }

    state.modal = null;
    showToast("Supplier saved.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not save supplier.");
  }
}

async function archiveSupplier(supplierId) {
  try {
    if (state.sync.connected && supabase) {
      const { error } = await supabase.from("suppliers").update({ is_active: false }).eq("id", supplierId);
      if (error) throw error;
      await loadSupabaseData();
    } else {
      const supplier = findSupplier(supplierId);
      if (supplier) supplier.is_active = false;
      saveLocalData();
    }

    state.modal = null;
    showToast("Supplier archived.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not archive supplier.");
  }
}

async function saveCategory(form) {
  const categoryId = formValue(form, "id") || null;
  const category = categoryId ? findCategory(categoryId) : null;
  const payload = {
    name: formTrim(form, "name"),
    color: formValue(form, "color") || "#0f766e",
    sort_order: Math.trunc(toNumber(formValue(form, "sort_order"))),
    is_active: true
  };

  if (!payload.name) {
    showToast("Category name is required.");
    return;
  }

  try {
    if (state.sync.connected && supabase) {
      const request = categoryId
        ? supabase.from("categories").update(payload).eq("id", categoryId)
        : supabase.from("categories").insert(payload);
      const { error } = await request;
      if (error) throw error;
      await loadSupabaseData();
    } else if (category) {
      Object.assign(category, payload);
      saveLocalData();
    } else {
      state.data.categories.push({ id: makeId(), ...payload, created_at: nowIso() });
      saveLocalData();
    }

    state.modal = null;
    showToast("Category saved.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not save category.");
  }
}

async function archiveCategory(categoryId) {
  try {
    if (state.sync.connected && supabase) {
      const { error } = await supabase.from("categories").update({ is_active: false }).eq("id", categoryId);
      if (error) throw error;
      await loadSupabaseData();
    } else {
      const category = findCategory(categoryId);
      if (category) category.is_active = false;
      saveLocalData();
    }

    if (state.categoryId === categoryId) state.categoryId = "all";
    state.modal = null;
    showToast("Category archived.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not archive category.");
  }
}

async function saveSettings(form) {
  const settings = {
    store_name: formTrim(form, "store_name"),
    store_phone: formTrim(form, "store_phone"),
    store_address: formTrim(form, "store_address"),
    currency: formTrim(form, "currency") || "LKR",
    receipt_footer: formTrim(form, "receipt_footer"),
    default_tax_rate: toNumber(formValue(form, "default_tax_rate"))
  };

  try {
    if (state.sync.connected && supabase) {
      const { error } = await supabase.from("store_settings").upsert({ id: true, ...settings });
      if (error) throw error;
      await loadSupabaseData();
    } else {
      state.data.settings = settings;
      saveLocalData();
    }

    showToast("Settings saved.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not save settings.");
  }
}

async function handleAuth(form, mode) {
  if (!supabase) {
    showToast("Supabase is not configured yet.");
    return;
  }

  const email = formTrim(form, "email");
  const password = formValue(form, "password");

  try {
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: email.split("@")[0] } }
      });
      if (error) throw error;
      if (data.session) {
        await loadSupabaseData();
        state.view = "pos";
        showToast("Account created and signed in.");
      } else {
        showToast("Account created. Run the admin bootstrap SQL, then sign in.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await loadSupabaseData();
      state.view = "pos";
      showToast("Signed in.");
    }
    render();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Authentication failed.");
  }
}

async function reloadData() {
  try {
    if (state.sync.connected && supabase) {
      await loadSupabaseData();
    } else {
      state.data = loadLocalData();
    }
    render();
    showToast("Data refreshed.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not refresh data.");
  }
}

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;

  if (action === "nav") {
    state.view = target.dataset.view;
    state.modal = null;
    render();
  }

  if (action === "category") {
    state.categoryId = target.dataset.categoryId;
    render();
  }

  if (action === "master-tab") {
    state.masterTab = target.dataset.masterTab;
    state.masterSearch = "";
    render();
  }

  if (action === "transaction-filter") {
    state.transactionType = target.dataset.transactionType;
    render();
  }

  if (action === "focus-search") {
    document.querySelector("#productSearch")?.focus();
  }

  if (action === "add-to-cart") addToCart(target.dataset.productId);
  if (action === "qty-up") changeCartQty(target.dataset.productId, 1);
  if (action === "qty-down") changeCartQty(target.dataset.productId, -1);
  if (action === "remove-cart") removeCartItem(target.dataset.productId);

  if (action === "open-cart-line-modal") {
    state.modal = { type: "cart-line", productId: target.dataset.productId };
    render();
  }

  if (action === "clear-cart") {
    state.cart = [];
    state.customerId = "";
    state.checkoutStep = "items";
    state.paymentMethod = "cash";
    resetSalePayments();
    state.saleDiscountType = "amount";
    state.saleDiscount = 0;
    render();
  }

  if (action === "enter-payments") {
    if (!state.cart.length) {
      showToast("Add at least one item before payment.");
      return;
    }
    state.checkoutStep = "payment";
    render();
  }

  if (action === "back-to-items") {
    state.checkoutStep = "items";
    render();
  }

  if (action === "payment") {
    state.paymentMethod = target.dataset.method;
    render();
  }

  if (action === "bill-discount-type") {
    state.saleDiscountType = target.dataset.discountType;
    resetSalePayments();
    render();
  }

  if (action === "add-sale-payment") addSalePayment();
  if (action === "remove-sale-payment") removeSalePayment(target.dataset.paymentId);

  if (action === "checkout") {
    if (state.checkoutStep !== "payment") {
      state.checkoutStep = "payment";
      render();
      return;
    }
    await completeCheckout();
  }

  if (action === "open-product-modal") {
    state.view = "items";
    state.itemProductId = target.dataset.productId || null;
    state.modal = null;
    render();
  }

  if (action === "new-product-form") {
    state.itemProductId = null;
    state.modal = null;
    render();
  }

  if (action === "edit-product") {
    state.itemProductId = target.dataset.productId || null;
    state.modal = null;
    render();
  }

  if (action === "open-customer-modal") {
    state.modal = { type: "customer", customerId: target.dataset.customerId || null };
    render();
  }

  if (action === "open-supplier-modal") {
    state.modal = { type: "supplier", supplierId: target.dataset.supplierId || null };
    render();
  }

  if (action === "open-category-modal") {
    state.modal = { type: "category", categoryId: target.dataset.categoryId || null };
    render();
  }

  if (action === "open-stock-modal") {
    state.modal = {
      type: "stock",
      productId: target.dataset.productId,
      direction: target.dataset.direction
    };
    render();
  }

  if (action === "archive-product") await archiveProduct(target.dataset.productId);
  if (action === "archive-customer") await archiveCustomer(target.dataset.customerId);
  if (action === "archive-supplier") await archiveSupplier(target.dataset.supplierId);
  if (action === "archive-category") await archiveCategory(target.dataset.categoryId);

  if (action === "close-modal") {
    state.modal = null;
    render();
  }

  if (action === "print-receipt") window.print();
  if (action === "download-receipt-pdf" && state.modal?.receipt) downloadReceiptPdf(state.modal.receipt);
  if (action === "whatsapp-receipt") await shareReceiptPdf();
  if (action === "reload-data") await reloadData();

  if (action === "sign-out" && supabase) {
    await supabase.auth.signOut();
    state.data = loadLocalData();
    state.sync.mode = "supabase";
    state.sync.connected = false;
    state.sync.message = "Supabase configured. Sign in.";
    state.sync.profile = null;
    state.view = "pos";
    state.cart = [];
    state.customerId = "";
    state.checkoutStep = "items";
    state.salePayments = [];
    render();
  }
});

app.addEventListener("input", (event) => {
  if (event.target.closest("#cartLineForm")) {
    updateCartLinePreview(event.target.closest("#cartLineForm"));
  }

  if (event.target.id === "productSearch") {
    state.search = event.target.value;
    scheduleInputRender("productSearch");
  }

  if (event.target.id === "inventorySearch") {
    state.inventorySearch = event.target.value;
    scheduleInputRender("inventorySearch");
  }

  if (event.target.id === "itemSearch") {
    state.itemSearch = event.target.value;
    scheduleInputRender("itemSearch");
  }

  if (event.target.id === "masterSearch") {
    state.masterSearch = event.target.value;
    scheduleInputRender("masterSearch");
  }

  if (event.target.id === "transactionSearch") {
    state.transactionSearch = event.target.value;
    scheduleInputRender("transactionSearch");
  }

  if (event.target.id === "binSearch") {
    state.binSearch = event.target.value;
    scheduleInputRender("binSearch");
  }

  if (event.target.id === "saleDiscount") {
    state.saleDiscount = event.target.value;
    resetSalePayments();
    updateCartSummaryOnly();
  }

  if (event.target.id === "cashReceived") {
    state.cashReceived = event.target.value;
    updateCartSummaryOnly();
  }

  if (event.target.id === "paymentAmount") {
    state.paymentAmount = event.target.value;
  }

  if (event.target.matches("[data-line-discount]")) {
    const productId = event.target.dataset.productId;
    const line = state.cart.find((item) => item.product_id === productId);
    if (line) {
      line.discount_value = event.target.value;
      updateCartSummaryOnly();
    }
  }
});

app.addEventListener("change", (event) => {
  if (event.target.closest("#cartLineForm")) {
    updateCartLinePreview(event.target.closest("#cartLineForm"));
  }

  if (event.target.id === "saleCustomer") {
    state.customerId = event.target.value;
    render();
  }

  if (event.target.id === "binProduct") {
    state.binProductId = event.target.value;
    render();
  }
});

app.addEventListener("keydown", (event) => {
  if (event.target.id !== "productSearch" || event.key !== "Enter") return;
  const term = state.search.trim().toLowerCase();
  const exact = activeProducts().find(
    (product) => product.sku.toLowerCase() === term || String(product.barcode || "").toLowerCase() === term
  );
  if (exact) {
    addToCart(exact.id);
    state.search = "";
    render();
  }
});

app.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const formId = form.getAttribute("id");

  if (formId === "cartLineForm") saveCartLine(form);
  if (formId === "productForm") await saveProduct(form);
  if (formId === "stockForm") await saveStockMovement(form);
  if (formId === "customerForm") await saveCustomer(form);
  if (formId === "supplierForm") await saveSupplier(form);
  if (formId === "categoryForm") await saveCategory(form);
  if (formId === "settingsForm") await saveSettings(form);
  if (formId === "authForm") {
    const submitter = event.submitter;
    await handleAuth(form, submitter?.dataset.authMode || "signin");
  }
});

window.addEventListener("unhandledrejection", (event) => {
  console.error(event.reason);
  showToast(friendlyErrorMessage(event.reason, "Something went wrong while saving."));
});

function registerPwa() {
  if (!("serviceWorker" in navigator)) return;
  if (!["http:", "https:"].includes(window.location.protocol)) return;

  navigator.serviceWorker.register("/service-worker.js").catch((error) => {
    console.warn("Service worker registration failed.", error);
  });
}

async function boot() {
  state.data = loadLocalData();
  await initSupabase();
  render();
  registerPwa();
  window.setInterval(updateClock, 30000);
}

boot();
