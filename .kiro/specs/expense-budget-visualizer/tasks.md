# Implementation Plan: Expense & Budget Visualizer

## Overview

Implementation tasks derived from the design and requirements documents. The project produces exactly three deliverable files: `index.html`, `css/style.css`, and `js/app.js`. Tasks are ordered so that foundational work (scaffold, markup, state) is completed before dependent layers (rendering, chart, event handlers) are built on top.

## Task Dependency Graph

```json
{
  "waves": [
    ["1"],
    ["2"],
    ["3"],
    ["4"],
    ["5", "8", "10"],
    ["6", "9", "11"],
    ["7"],
    ["12"],
    ["13"]
  ]
}
```

## Tasks

- [x] 1. Project Scaffold
  - Create the folder structure: root `index.html`, `css/` directory with `style.css`, `js/` directory with `app.js`
  - Create `index.html` with DOCTYPE, `<html lang="en">`, `<head>` (charset, viewport, title, Tailwind CDN, Chart.js CDN, stylesheet link, script defer), and empty `<body>`
  - Create `css/style.css` with base custom styles (scrollbar styling, dark-mode color transitions, any Tailwind overrides)
  - Create `js/app.js` with a top-level `DOMContentLoaded` listener that calls `init()`
  - **Requirements**: Requirement 10

- [x] 2. Semantic HTML Markup
  - Add `<header>` with `<h1>` app title and theme toggle `<button id="theme-toggle">`
  - Add a hero `<section aria-labelledby="total-label">` containing `<h2 id="total-label">Total Spent</h2>` and `<span id="total-display">$0.00</span>`
  - Add `<main>` with a 3-column responsive grid containing three `<section>` cards: `id="add-card"`, `id="list-card"`, `id="chart-card"`
  - Inside add-card: `<form id="transaction-form">` with labeled inputs (item-name text, item-amount number, item-category select), Add Custom Category link `id="add-category-link"`, submit button, and `<p aria-live="polite" id="form-error"></p>`
  - Inside list-card: sort `<select id="sort-select">` with four options (newest, oldest, amount-high, amount-low), `<ul id="transaction-list">` scrollable container
  - Inside chart-card: `<canvas id="spending-chart">` with an `aria-label` describing the chart
  - **Requirements**: Requirement 2, Requirement 3

- [x] 3. Tailwind CSS Styling and Dark Mode
  - Apply Tailwind utility classes: `grid lg:grid-cols-3 gap-6` on `<main>`, `rounded-xl shadow-md p-6 bg-white dark:bg-gray-800` on each card
  - Style the header with `flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 shadow`
  - Style the hero section with large bold typography for the total amount
  - Style form inputs with `w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2` and matching dark mode variants
  - Style transaction list items with flex layout, colored category badge pills, and delete button styling
  - Add `css/style.css` rules for: custom scrollbar on `#transaction-list`, smooth color transitions (`transition: background-color 0.3s, color 0.3s`), and any badge colors
  - **Requirements**: Requirement 2, Requirement 3, Requirement 4

- [x] 4. State Management Module (`js/app.js`)
  - Define `STORAGE_KEY = "expense-app-state"` constant
  - Implement `loadState()`: reads from `localStorage`, parses JSON with try/catch, returns default state `{transactions: [], categories: ["Food", "Transport", "Fun"], isDarkMode: false}` on missing or corrupt data
  - Implement `saveState(state)`: JSON serializes state and writes to `localStorage` with try/catch for QuotaExceededError
  - Implement `addTransaction(state, transaction)`: returns new state object with transaction appended (does not mutate input)
  - Implement `removeTransaction(state, id)`: returns new state object with matching transaction filtered out (does not mutate input)
  - Implement `addCategory(state, categoryName)`: trims input, checks case-insensitive uniqueness, returns new state with category appended if unique
  - Implement `generateId()`: uses `crypto.randomUUID()` with fallback to `Date.now().toString(36) + Math.random().toString(36).slice(2)`
  - **Requirements**: Requirement 1, Requirement 7

- [x] 5. Total Spent and Form Rendering (`js/app.js`)
  - Implement `calculateTotalSpent(transactions)`: reduces transaction amounts to a sum, returns `0` for empty array
  - Implement `renderTotal(transactions)`: formats result as `$X.XX` using `toFixed(2)` and sets `textContent` of `#total-display`
  - Implement `populateCategorySelect(categories)`: clears `#item-category` options and repopulates with one `<option>` per category
  - Implement `appendCategoryOption(categoryName)`: appends a single `<option>` to `#item-category` without full repopulation
  - **Requirements**: Requirement 5, Requirement 6

- [x] 6. Add Transaction Form Handler (`js/app.js`)
  - Implement `handleFormSubmit(event)`:
    - Call `event.preventDefault()`
    - Read and trim `name` from `#item-name`, parse `amount` as `parseFloat` from `#item-amount`, read `category` from `#item-category`
    - Validate: set `#form-error` textContent and return early if name is empty or amount is not finite or amount is <= 0
    - On valid input: build transaction object with `generateId()`, call `addTransaction`, call `saveState`, call `renderTotal`, call `renderTransactions` with current sort order, call `updateChart`, reset form, clear `#form-error`
  - Attach `handleFormSubmit` to `#transaction-form` `submit` event
  - **Requirements**: Requirement 6

- [x] 7. Custom Category Handler (`js/app.js`)
  - Implement `handleAddCategory()`:
    - Call `window.prompt("Enter new category name:")`
    - Return early if result is null or trimmed result is empty
    - Call `addCategory(state, trimmedName)` and check if categories length changed
    - If length is unchanged (duplicate), return without further action
    - If length grew: update module-level state, call `saveState`, call `appendCategoryOption(trimmedName)`
  - Attach `handleAddCategory` to `#add-category-link` `click` event, preventing default link navigation
  - **Requirements**: Requirement 7

- [x] 8. Transaction List Renderer and Sort (`js/app.js`)
  - Implement `sortTransactions(transactions, sortOrder)`:
    - Shallow-copy the input array with `.slice()`
    - Sort copy by `timestamp` descending for "newest", ascending for "oldest"
    - Sort copy by `amount` descending for "amount-high", ascending for "amount-low"
    - Return sorted copy without mutating original
  - Implement `renderTransactions(transactions, sortOrder)`:
    - Sort via `sortTransactions`
    - If array is empty, set `#transaction-list` innerHTML to a single `<li>` with empty-state text
    - Otherwise build an HTML string with each transaction as `<li>`, using `textContent` assignment (not innerHTML) for all user-provided values: name, amount, category tag
    - Each `<li>` MUST include a `<button class="delete-btn" data-id="...">Delete</button>`
  - Implement `handleSortChange(event)`: reads `event.target.value`, updates module-level `currentSortOrder`, calls `renderTransactions(state.transactions, currentSortOrder)`
  - Attach `handleSortChange` to `#sort-select` `change` event
  - **Requirements**: Requirement 8

- [x] 9. Delete Transaction Handler (`js/app.js`)
  - Implement `handleDelete(transactionId)`:
    - Call `removeTransaction(state, transactionId)`, update module-level state
    - Call `saveState`
    - Call `renderTotal(state.transactions)`
    - Call `renderTransactions(state.transactions, currentSortOrder)`
    - Call `updateChart(chart, state.transactions, state.categories, state.isDarkMode)`
  - Use event delegation: attach a single `click` listener to `#transaction-list`; inside the handler, check `event.target.dataset.id` — if present, call `handleDelete` with that id
  - **Requirements**: Requirement 8

- [x] 10. Chart.js Integration (`js/app.js`)
  - Define `CHART_COLORS` as a hardcoded palette of at least 10 distinct CSS color strings for category segments
  - Implement `generateColorPalette(count)`: returns a slice/cycle of `CHART_COLORS` of length `count`
  - Implement `aggregateByCategory(transactions, categories)`: returns an object mapping each category to its total amount (0 for categories with no transactions)
  - Implement `initChart(canvasId, isDarkMode)`:
    - Guard: if `typeof Chart === "undefined"`, insert a fallback text message into `#chart-card` and return `null`
    - Create and return a new `Chart` instance with type `"doughnut"`, empty data, `responsive: true`, `maintainAspectRatio: false`, and legend label color based on isDarkMode
  - Implement `updateChart(chart, transactions, categories, isDarkMode)`:
    - Return early if chart is null
    - Call `aggregateByCategory`, filter to categories with amount > 0
    - Update `chart.data.labels`, dataset data array, and dataset backgroundColor array
    - Update `chart.options.plugins.legend.labels.color` based on isDarkMode
    - Call `chart.update()`
  - Implement `updateChartColors(chart, isDarkMode)`: updates only the legend text color and calls `chart.update()`
  - **Requirements**: Requirement 9

- [x] 11. Theme Toggle Handler (`js/app.js`)
  - Implement `handleThemeToggle()`:
    - Toggle `state.isDarkMode`
    - Toggle `dark` class on `document.documentElement`
    - Call `saveState(state)`
    - Call `updateChartColors(chart, state.isDarkMode)`
    - Update `#theme-toggle` textContent or innerHTML to reflect new mode (e.g., "☀️ Light" vs "🌙 Dark")
  - Attach `handleThemeToggle` to `#theme-toggle` `click` event
  - **Requirements**: Requirement 4

- [x] 12. App Initialization (`js/app.js`)
  - Declare module-level variables: `let state`, `let chart`, `let currentSortOrder = "newest"`
  - Implement `init()`:
    - Assign `state = loadState()`
    - If `state.isDarkMode`, add `dark` class to `document.documentElement` and update toggle button label
    - Call `populateCategorySelect(state.categories)`
    - Call `renderTotal(state.transactions)`
    - Call `renderTransactions(state.transactions, currentSortOrder)`
    - Assign `chart = initChart("spending-chart", state.isDarkMode)`
    - Call `updateChart(chart, state.transactions, state.categories, state.isDarkMode)`
    - Attach all event listeners: form submit, sort change, list click (delegation), theme toggle click, add category click
  - Call `init()` inside the `DOMContentLoaded` listener
  - **Requirements**: Requirement 1, Requirement 4, Requirement 6, Requirement 8, Requirement 9

- [x] 13. Integration Testing and Polish
  - Manually verify: Add 3 transactions across different categories, confirm chart shows 3 segments and total is correct
  - Manually verify: Delete a transaction, confirm chart updates, total decreases, and transaction is gone from list
  - Manually verify: Reload the page, confirm all transactions and theme preference persist from localStorage
  - Manually verify: Toggle dark mode, confirm `<html>` gets/loses `dark` class, chart legend text color changes, preference survives reload
  - Manually verify: Add a custom category, confirm it appears in dropdown; add a transaction with it, confirm it appears in chart
  - Manually verify: Attempt to add a duplicate category (same name, different case), confirm no duplicate in dropdown
  - Manually verify: Submit form with empty name and with zero amount, confirm inline validation errors and no transaction added
  - Manually verify: App renders correctly on 375px wide mobile viewport with cards stacked vertically
  - Manually verify: All labels have matching `for` attributes, all inputs have matching `id` attributes (accessibility audit)
  - **Requirements**: All requirements

## Notes

- All user-provided string values (item name, category name) MUST be inserted into the DOM via `textContent`, never `innerHTML`, to prevent XSS.
- The module-level `state` variable is the single source of truth during a session. All mutations return new objects (immutable update pattern) and are assigned back to `state` before `saveState` is called.
- The sort order is tracked in `currentSortOrder` at the module level and is NOT persisted to localStorage — it resets to "newest" on every page load.
- If the Chart.js CDN fails to load, the app remains functional for all non-chart features; the chart card shows a fallback text message.
