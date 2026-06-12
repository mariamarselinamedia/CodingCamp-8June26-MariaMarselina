/* =========================================================
   Expense & Budget Visualizer — Application Logic
   All application logic lives in this single file.
   Entry point: DOMContentLoaded → init()
   ========================================================= */

"use strict";

/** Key used to read/write app state in localStorage. */
const STORAGE_KEY = "expense-app-state";

// ── Module-level state (single source of truth for the session) ────────
// Declared at the top so all handler functions can reference and reassign
// them. Full initialization happens in init().
let state;                         // AppState — loaded from localStorage in init()
let chart;                         // Chart.js instance — created in init()
let currentSortOrder = "newest";   // default per Requirement 8.7; NOT persisted

// ── Default state factory ──────────────────────────────────────────────

/**
 * Returns a fresh default AppState object.
 * @returns {{ transactions: [], categories: string[], isDarkMode: boolean }}
 */
function defaultState() {
  return {
    transactions: [],
    categories: ["Food", "Transport", "Fun"],
    isDarkMode: false,
  };
}

// ── StateManager ───────────────────────────────────────────────────────

/**
 * Loads the application state from localStorage.
 * - Returns default state when no stored data exists (Requirement 1.2).
 * - On corrupted data, silently returns default state (Requirement 1.4).
 *
 * @returns {{ transactions: Transaction[], categories: string[], isDarkMode: boolean }}
 */
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw === null) {
    return defaultState();
  }

  try {
    const parsed = JSON.parse(raw);
    // Defensive defaults: use stored value when valid, fall back otherwise
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : ["Food", "Transport", "Fun"],
      isDarkMode: typeof parsed.isDarkMode === "boolean" ? parsed.isDarkMode : false,
    };
  } catch (_err) {
    // Corrupted JSON — reset silently (Requirement 1.4)
    return defaultState();
  }
}

/**
 * Persists the current state object to localStorage.
 * Handles QuotaExceededError gracefully without throwing (Requirement 1.3).
 *
 * @param {{ transactions: Transaction[], categories: string[], isDarkMode: boolean }} state
 */
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      console.warn(
        "Storage limit reached. The latest state change could not be saved."
      );
    }
  }
}

/**
 * Returns a NEW state object with the given transaction appended.
 * Does NOT mutate the input state (immutable update pattern).
 *
 * @param {{ transactions: Transaction[], categories: string[], isDarkMode: boolean }} state
 * @param {{ id: string, name: string, amount: number, category: string, timestamp: number }} transaction
 * @returns {{ transactions: Transaction[], categories: string[], isDarkMode: boolean }}
 */
function addTransaction(state, transaction) {
  return {
    ...state,
    transactions: [...state.transactions, transaction],
  };
}

/**
 * Returns a NEW state object with the transaction matching `id` removed.
 * Does NOT mutate the input state (immutable update pattern).
 *
 * @param {{ transactions: Transaction[], categories: string[], isDarkMode: boolean }} state
 * @param {string} id - The id of the transaction to remove.
 * @returns {{ transactions: Transaction[], categories: string[], isDarkMode: boolean }}
 */
function removeTransaction(state, id) {
  return {
    ...state,
    transactions: state.transactions.filter((t) => t.id !== id),
  };
}

/**
 * Returns a NEW state object with the given category appended (if unique).
 * - Trims the category name before comparison and storage.
 * - Case-insensitive uniqueness check (Requirement 7.4).
 * - If already present, returns the SAME state reference unchanged.
 * - Does NOT mutate the input state.
 *
 * @param {{ transactions: Transaction[], categories: string[], isDarkMode: boolean }} state
 * @param {string} categoryName - The raw category name entered by the user.
 * @returns {{ transactions: Transaction[], categories: string[], isDarkMode: boolean }}
 */
function addCategory(state, categoryName) {
  const trimmed = categoryName.trim();
  const lowerTrimmed = trimmed.toLowerCase();

  const alreadyExists = state.categories.some(
    (c) => c.toLowerCase() === lowerTrimmed
  );

  if (alreadyExists) {
    return state; // Same reference — no change
  }

  return {
    ...state,
    categories: [...state.categories, trimmed],
  };
}

// ── Utility ────────────────────────────────────────────────────────────

/**
 * Generates a unique ID string.
 * Uses `crypto.randomUUID()` when available; falls back to a
 * timestamp + random string combination for older environments.
 *
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Total Spent ────────────────────────────────────────────────────────

/**
 * Calculates the sum of all transaction amounts.
 * Returns 0 for an empty array (Requirement 5.2, 5.5).
 *
 * @param {{ id: string, name: string, amount: number, category: string, timestamp: number }[]} transactions
 * @returns {number}
 */
function calculateTotalSpent(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Formats the total spent as a "$X.XX" string and sets it as the
 * textContent of #total-display (Requirement 5.3, 5.4).
 *
 * @param {{ id: string, name: string, amount: number, category: string, timestamp: number }[]} transactions
 */
function renderTotal(transactions) {
  const total = calculateTotalSpent(transactions);
  const el = document.getElementById("total-display");
  if (el) {
    el.textContent = "$" + total.toFixed(2);
  }
}

// ── Category Select ────────────────────────────────────────────────────

/**
 * Clears the #item-category <select> and repopulates it with one
 * <option> per category (Requirement 6.3).
 *
 * @param {string[]} categories
 */
function populateCategorySelect(categories) {
  const select = document.getElementById("item-category");
  if (!select) return;

  // Remove all existing options
  select.innerHTML = "";

  categories.forEach((categoryName) => {
    const option = document.createElement("option");
    option.value = categoryName;
    option.textContent = categoryName;
    select.appendChild(option);
  });
}

/**
 * Appends a single <option> for the given category name to #item-category
 * without clearing and repopulating the entire list (Requirement 7.5).
 *
 * @param {string} categoryName
 */
function appendCategoryOption(categoryName) {
  const select = document.getElementById("item-category");
  if (!select) return;

  const option = document.createElement("option");
  option.value = categoryName;
  option.textContent = categoryName;
  select.appendChild(option);
}

// ── Custom Category Handler ────────────────────────────────────────────

/**
 * Handles the "Add Custom Category" link click.
 * - Prompts the user for a new category name (Requirement 7.2).
 * - Returns early if the user cancels (null) or enters only whitespace (Requirement 7.3).
 * - If the trimmed name already exists case-insensitively, no duplicate is added (Requirement 7.4).
 * - If valid: appends to state, persists to localStorage, and updates the <select> (Requirement 7.5).
 *
 * @param {Event} event - The click event from the #add-category-link anchor.
 */
function handleAddCategory(event) {
  event.preventDefault();

  const result = window.prompt("Enter new category name:");

  // User cancelled (null) or entered only whitespace — do nothing (Requirement 7.3)
  if (result === null || result.trim() === "") {
    return;
  }

  const trimmedName = result.trim();
  const prevLength = state.categories.length;

  const newState = addCategory(state, trimmedName);

  // If length is unchanged, the category was a duplicate — do nothing (Requirement 7.4)
  if (newState.categories.length === prevLength) {
    return;
  }

  // Valid new category: update state, persist, and update the dropdown (Requirement 7.5)
  state = newState;
  saveState(state);
  appendCategoryOption(trimmedName);
}

// ── Theme Toggle Handler ───────────────────────────────────────────────

/**
 * Handles the #theme-toggle button click.
 * - Flips state.isDarkMode (Requirement 4.3, 4.4).
 * - Adds/removes the `dark` class on <html> (Requirement 4.3).
 * - Persists the updated preference to localStorage (Requirement 4.4).
 * - Updates Chart.js legend colors immediately (Requirement 4.6).
 * - Updates the button label to reflect the new mode (Requirement 4.5):
 *     dark ON  → "☀️ Light"
 *     dark OFF → "🌙 Dark"
 */
function handleThemeToggle() {
  // Immutable state update — toggle isDarkMode
  state = { ...state, isDarkMode: !state.isDarkMode };

  // Apply/remove dark class on <html> (Requirement 4.3)
  if (state.isDarkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // Persist the preference (Requirement 4.4)
  saveState(state);

  // Update chart legend colors immediately (Requirement 4.6)
  updateChartColors(chart, state.isDarkMode);

  // Update button label to reflect current mode (Requirement 4.5)
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.textContent = state.isDarkMode ? "☀️ Light" : "🌙 Dark";
  }
}

// ── Transaction List Renderer and Sort ────────────────────────────────

/**
 * Returns a NEW sorted copy of the transactions array.
 * The original array is NEVER mutated (Requirement 8.5, 8.6).
 *
 * Sort orders:
 *  "newest"      – timestamp descending  (Requirement 8.7)
 *  "oldest"      – timestamp ascending
 *  "amount-high" – amount descending
 *  "amount-low"  – amount ascending
 *
 * @param {{ id: string, name: string, amount: number, category: string, timestamp: number }[]} transactions
 * @param {"newest"|"oldest"|"amount-high"|"amount-low"} sortOrder
 * @returns {{ id: string, name: string, amount: number, category: string, timestamp: number }[]}
 */
function sortTransactions(transactions, sortOrder) {
  const sorted = transactions.slice(); // shallow copy — never mutate original

  switch (sortOrder) {
    case "newest":
      sorted.sort((a, b) => b.timestamp - a.timestamp);
      break;
    case "oldest":
      sorted.sort((a, b) => a.timestamp - b.timestamp);
      break;
    case "amount-high":
      sorted.sort((a, b) => b.amount - a.amount);
      break;
    case "amount-low":
      sorted.sort((a, b) => a.amount - b.amount);
      break;
    default:
      sorted.sort((a, b) => b.timestamp - a.timestamp); // fallback to newest
  }

  return sorted;
}

/**
 * Renders all transactions into the #transaction-list element.
 *
 * - Sorts via sortTransactions before rendering (Requirement 8.4, 8.5).
 * - When empty, displays an empty-state message (Requirement 8.3).
 * - User-provided values (name, category) are set via textContent,
 *   never innerHTML, to prevent XSS.
 * - Each list item includes a Delete button with data-id attribute
 *   for event delegation (Requirement 8.8).
 *
 * @param {{ id: string, name: string, amount: number, category: string, timestamp: number }[]} transactions
 * @param {"newest"|"oldest"|"amount-high"|"amount-low"} sortOrder
 */
function renderTransactions(transactions, sortOrder) {
  const list = document.getElementById("transaction-list");
  if (!list) return;

  // Empty state (Requirement 8.3)
  if (transactions.length === 0) {
    list.innerHTML = '<li class="text-gray-400 dark:text-gray-500 text-center py-8 text-sm italic">No transactions yet. Add one above!</li>';
    return;
  }

  const sorted = sortTransactions(transactions, sortOrder);

  // Build the list — user-provided strings use textContent to prevent XSS
  list.innerHTML = ""; // clear existing items

  sorted.forEach((transaction) => {
    const li = document.createElement("li");
    li.className =
      "flex items-center justify-between gap-2 py-3 px-1 border-b border-gray-100 dark:border-gray-700 last:border-0";

    // Left group: name + category badge
    const leftDiv = document.createElement("div");
    leftDiv.className = "flex flex-col gap-1 min-w-0";

    const nameSpan = document.createElement("span");
    nameSpan.className = "font-medium text-gray-800 dark:text-gray-100 truncate";
    nameSpan.textContent = transaction.name; // textContent prevents XSS

    const categoryBadge = document.createElement("span");
    // Use the CSS badge classes from style.css (supports dark mode variants)
    categoryBadge.className = getCategoryBadgeClass(transaction.category, state.categories) + " self-start";
    categoryBadge.textContent = transaction.category; // textContent prevents XSS

    leftDiv.appendChild(nameSpan);
    leftDiv.appendChild(categoryBadge);

    // Right group: amount + delete button
    const rightDiv = document.createElement("div");
    rightDiv.className = "flex items-center gap-3 shrink-0";

    const amountSpan = document.createElement("span");
    amountSpan.className = "font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap";
    amountSpan.textContent = "$" + transaction.amount.toFixed(2);

    const deleteBtn = document.createElement("button");
    deleteBtn.className =
      "delete-btn text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30";
    deleteBtn.dataset.id = transaction.id; // data-id for event delegation (Requirement 8.8)
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("aria-label", "Delete transaction: " + transaction.name);

    rightDiv.appendChild(amountSpan);
    rightDiv.appendChild(deleteBtn);

    li.appendChild(leftDiv);
    li.appendChild(rightDiv);

    list.appendChild(li);
  });
}

/**
 * Handles the sort dropdown change event.
 * Updates the module-level currentSortOrder and re-renders the list.
 * Sort order is applied at render time only — NOT persisted to localStorage
 * (Requirement 8.5, 8.6).
 *
 * @param {Event} event - The change event from #sort-select.
 */
function handleSortChange(event) {
  currentSortOrder = event.target.value;
  renderTransactions(state.transactions, currentSortOrder);
}

// ── Delete Transaction Handler ────────────────────────────────────────

/**
 * Removes a transaction by ID from state and re-renders all affected
 * UI components (Requirement 8.9).
 *
 * - Calls removeTransaction to produce a new state (immutable update).
 * - Persists the new state to localStorage.
 * - Re-renders total, transaction list, and chart.
 *
 * @param {string} transactionId - The id of the transaction to delete.
 */
function handleDelete(transactionId) {
  state = removeTransaction(state, transactionId);
  saveState(state);
  renderTotal(state.transactions);
  renderTransactions(state.transactions, currentSortOrder);
  updateChart(chart, state.transactions, state.categories, state.isDarkMode);
}

/**
 * Event delegation handler attached to #transaction-list.
 * Checks whether the clicked element carries a data-id attribute
 * (set by the Delete button); if so, delegates to handleDelete.
 *
 * Using delegation avoids attaching per-item listeners and keeps the
 * handler live even after list re-renders (Requirement 8.8, 8.9).
 *
 * @param {MouseEvent} event
 */
function handleListClick(event) {
  const id = event.target.dataset.id;
  if (id) {
    handleDelete(id);
  }
}

// ── Form Handler ──────────────────────────────────────────────────────

/**
 * Handles the Add Transaction form submission.
 * - Validates name (non-empty) and amount (positive finite number).
 * - On failure: sets #form-error textContent and returns early.
 * - On success: builds a transaction, updates state, re-renders
 *   the total, list, and chart, resets the form, and clears any
 *   prior error message.
 *
 * Satisfies: Requirement 6.5, 6.6, 6.7, 6.8
 *
 * @param {SubmitEvent} event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  // ── Read inputs ──────────────────────────────────────────────────
  const nameInput     = document.getElementById("item-name");
  const amountInput   = document.getElementById("item-amount");
  const categoryInput = document.getElementById("item-category");
  const formError     = document.getElementById("form-error");

  const name     = nameInput   ? nameInput.value.trim()        : "";
  const amount   = amountInput ? parseFloat(amountInput.value) : NaN;
  const category = categoryInput ? categoryInput.value         : "";

  // ── Validate ─────────────────────────────────────────────────────
  if (name === "") {
    if (formError) formError.textContent = "Item name is required.";
    return;
  }

  if (!isFinite(amount) || amount <= 0) {
    if (formError) formError.textContent = "Amount must be a positive number.";
    return;
  }

  // ── Build transaction object ──────────────────────────────────────
  const transaction = {
    id:        generateId(),
    name:      name,
    amount:    amount,
    category:  category,
    timestamp: Date.now(),
  };

  // ── Update state ──────────────────────────────────────────────────
  state = addTransaction(state, transaction);
  saveState(state);

  // ── Re-render affected components ─────────────────────────────────
  renderTotal(state.transactions);
  renderTransactions(state.transactions, currentSortOrder);
  updateChart(chart, state.transactions, state.categories, state.isDarkMode);

  // ── Reset form ────────────────────────────────────────────────────
  event.target.reset();
  if (formError) formError.textContent = "";
}

// ── Chart.js Integration ──────────────────────────────────────────────

/**
 * Maps a category name to its CSS badge class suffix.
 * Falls back to "default" for unknown categories.
 * The badge class cycle follows the palette order defined in style.css.
 *
 * @param {string} categoryName
 * @param {string[]} allCategories - Full list of categories from state (for index-based fallback).
 * @returns {string} CSS class string, e.g. "badge badge-food"
 */
function getCategoryBadgeClass(categoryName, allCategories) {
  // Named map for built-in categories
  const namedMap = {
    food:      "badge-food",
    transport: "badge-transport",
    fun:       "badge-fun",
  };

  const key = categoryName.toLowerCase();
  if (namedMap[key]) {
    return "badge " + namedMap[key];
  }

  // For custom categories, cycle through the extended palette by position
  const extendedPalette = [
    "badge-purple",
    "badge-green",
    "badge-orange",
    "badge-teal",
    "badge-rose",
    "badge-sky",
  ];

  // Find the index of this category among non-built-in categories
  const builtIns = new Set(["food", "transport", "fun"]);
  const customCategories = allCategories.filter(
    (c) => !builtIns.has(c.toLowerCase())
  );
  const idx = customCategories.findIndex(
    (c) => c.toLowerCase() === key
  );

  if (idx >= 0) {
    return "badge " + extendedPalette[idx % extendedPalette.length];
  }

  return "badge badge-default";
}

/**
 * A hardcoded palette of 10 visually distinct CSS color strings used
 * to fill Doughnut chart segments (Requirement 9.5).
 *
 * @type {string[]}
 */
const CHART_COLORS = [
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#3b82f6", // blue
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#8b5cf6", // violet
  "#84cc16", // lime
];

/**
 * Returns an array of `count` color strings drawn from CHART_COLORS.
 * When count exceeds CHART_COLORS.length, colors are cycled (wrapped).
 * Returns an empty array when count is 0.
 *
 * @param {number} count - The number of colors to return.
 * @returns {string[]}
 */
function generateColorPalette(count) {
  if (count === 0) return [];
  const palette = [];
  for (let i = 0; i < count; i++) {
    palette.push(CHART_COLORS[i % CHART_COLORS.length]);
  }
  return palette;
}

/**
 * Aggregates transaction amounts by category.
 * Every category in the `categories` array is guaranteed to appear as a
 * key in the returned object, with value 0 when no matching transactions
 * exist (Requirement 9.2, 9.3, 9.4).
 *
 * @param {{ id: string, name: string, amount: number, category: string, timestamp: number }[]} transactions
 * @param {string[]} categories
 * @returns {{ [categoryName: string]: number }}
 */
function aggregateByCategory(transactions, categories) {
  /** @type {{ [categoryName: string]: number }} */
  const totals = {};

  // Seed every category with 0 so all keys are always present
  categories.forEach((cat) => {
    totals[cat] = 0;
  });

  // Accumulate amounts — ignore transactions whose category is not in the list
  transactions.forEach((transaction) => {
    if (Object.prototype.hasOwnProperty.call(totals, transaction.category)) {
      totals[transaction.category] += transaction.amount;
    }
  });

  return totals;
}

/**
 * Initializes a Chart.js Doughnut chart on the canvas identified by
 * `canvasId` and returns the Chart instance.
 *
 * Guard: if Chart.js is not loaded (CDN failure), inserts a fallback
 * paragraph inside #chart-card and returns null (Requirement 9.1,
 * Error Scenario 4).
 *
 * @param {string}  canvasId   - The id of the <canvas> element.
 * @param {boolean} isDarkMode - Whether dark mode is currently active.
 * @returns {Chart|null}
 */
function initChart(canvasId, isDarkMode) {
  // Guard: Chart.js may not be loaded if the CDN request failed
  if (typeof Chart === "undefined") {
    const chartCard = document.getElementById("chart-card");
    if (chartCard) {
      const fallback = document.createElement("p");
      fallback.textContent = "Chart unavailable (Chart.js failed to load).";
      chartCard.appendChild(fallback);
    }
    return null;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const legendColor = isDarkMode ? "#e5e7eb" : "#374151";

  return new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: legendColor,
          },
        },
      },
    },
  });
}

/**
 * Updates the Doughnut chart with the latest spending data.
 * - Aggregates totals per category.
 * - Filters to only categories with total > 0 (Requirement 9.2, 9.4).
 * - Refreshes labels, data, colors, and legend text color.
 * - Calls chart.update() to animate the transition (Requirement 9.6).
 *
 * Returns early when `chart` is null (e.g. CDN load failure).
 *
 * @param {Chart|null} chart         - The Chart.js instance to update.
 * @param {{ id: string, name: string, amount: number, category: string, timestamp: number }[]} transactions
 * @param {string[]}   categories    - Full list of category names from state.
 * @param {boolean}    isDarkMode    - Whether dark mode is currently active.
 */
function updateChart(chart, transactions, categories, isDarkMode) {
  if (chart === null) return;

  const totals = aggregateByCategory(transactions, categories);

  // Only show segments for categories with spending > 0 (Requirement 9.4)
  const labels = categories.filter((cat) => totals[cat] > 0);
  const data   = labels.map((cat) => totals[cat]);
  const colors = generateColorPalette(labels.length);

  chart.data.labels                        = labels;
  chart.data.datasets[0].data             = data;
  chart.data.datasets[0].backgroundColor  = colors;

  chart.options.plugins.legend.labels.color = isDarkMode ? "#e5e7eb" : "#374151";

  chart.update();
}

/**
 * Updates only the Chart.js legend text color to match the current theme,
 * then calls chart.update() to apply the change (Requirement 9.7, 9.8, 9.9).
 *
 * Returns early when `chart` is null.
 *
 * @param {Chart|null} chart      - The Chart.js instance to update.
 * @param {boolean}    isDarkMode - Whether dark mode is currently active.
 */
function updateChartColors(chart, isDarkMode) {
  if (chart === null) return;

  chart.options.plugins.legend.labels.color = isDarkMode ? "#e5e7eb" : "#374151";
  chart.update();
}

// ── Entry Point ────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);

/**
 * Initializes the application.
 *
 * Boot sequence (Requirement 1, 4, 6, 8, 9):
 *  1. Load persisted state from localStorage.
 *  2. Apply dark mode class and toggle button label if needed.
 *  3. Populate the category <select> from state.
 *  4. Render the total spent display.
 *  5. Render the sorted transaction list.
 *  6. Create the Chart.js Doughnut instance.
 *  7. Populate the chart with current spending data.
 *  8. Attach all event listeners.
 */
function init() {
  // ── 1. Hydrate state from localStorage (Requirement 1.1, 1.2) ────────
  state = loadState();

  // ── 2. Apply dark mode if persisted (Requirement 4.3, 4.4, 4.5) ──────
  const themeToggle = document.getElementById("theme-toggle");
  if (state.isDarkMode) {
    document.documentElement.classList.add("dark");
    if (themeToggle) themeToggle.textContent = "☀️ Light";
  } else {
    document.documentElement.classList.remove("dark");
    if (themeToggle) themeToggle.textContent = "🌙 Dark";
  }

  // ── 3. Populate category dropdown (Requirement 6.3) ───────────────────
  populateCategorySelect(state.categories);

  // ── 4. Render total spent (Requirement 5) ─────────────────────────────
  renderTotal(state.transactions);

  // ── 5. Render transaction list with default sort order (Requirement 8.7) ──
  renderTransactions(state.transactions, currentSortOrder);

  // ── 6. Initialize the Doughnut chart (Requirement 9.1) ───────────────
  chart = initChart("spending-chart", state.isDarkMode);

  // ── 7. Populate chart with current data (Requirement 9.2–9.6) ────────
  updateChart(chart, state.transactions, state.categories, state.isDarkMode);

  // ── 8. Attach all event listeners ─────────────────────────────────────

  // Form submit → add transaction (Requirement 6)
  const form = document.getElementById("transaction-form");
  if (form) form.addEventListener("submit", handleFormSubmit);

  // Sort dropdown change → re-render list (Requirement 8.4, 8.5)
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) sortSelect.addEventListener("change", handleSortChange);

  // List click (delegation) → delete transaction (Requirement 8.8, 8.9)
  const transactionList = document.getElementById("transaction-list");
  if (transactionList) transactionList.addEventListener("click", handleListClick);

  // Theme toggle → dark/light switch (Requirement 4)
  if (themeToggle) themeToggle.addEventListener("click", handleThemeToggle);

  // Add custom category link (Requirement 7)
  const addCategoryLink = document.getElementById("add-category-link");
  if (addCategoryLink) addCategoryLink.addEventListener("click", handleAddCategory);
}
