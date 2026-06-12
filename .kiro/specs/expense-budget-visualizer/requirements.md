# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side single-page application that allows users to log personal expense transactions, organize them by category, and visualize spending distribution via an interactive chart. All data is persisted in the browser localStorage. The app uses only Semantic HTML5, Tailwind CSS via CDN, Vanilla JavaScript, and Chart.js via CDN with no frameworks and no backend.

## Requirements

### Requirement 1: State Persistence

**User Story:** As a user, I want my transactions, categories, and theme preference to persist after closing or refreshing the browser, so I don't have to re-enter my data every session.

#### Acceptance Criteria

1. The app MUST read state from localStorage on every page load.
2. If no stored state exists, the app MUST initialize with empty transactions, default categories of Food, Transport, and Fun, and isDarkMode set to false.
3. After any state mutation, the app MUST write the updated state to localStorage before re-rendering.
4. If localStorage data is corrupted, the app MUST silently fall back to default state without throwing an error.
5. Each transaction MUST have a unique id string, a name string, a positive float amount, a category string, and an integer timestamp.

### Requirement 2: Responsive Layout

**User Story:** As a user, I want the app to be usable on both desktop and mobile with a modern aesthetic, so I can track expenses from any device.

#### Acceptance Criteria

1. On desktop screens 1024px wide or wider, the main content MUST display as a 3-column grid showing the Add Transaction card, Transaction List card, and Visualizer card side by side.
2. On mobile screens narrower than 1024px, the 3 cards MUST stack vertically in a single column.
3. All cards MUST use Tailwind rounded border and soft shadow utility classes.
4. A css/style.css file MUST exist for any custom styles beyond Tailwind utilities.

### Requirement 3: Semantic HTML and Accessibility

**User Story:** As a user with accessibility needs, I want the page to use proper semantic HTML so assistive technologies work correctly.

#### Acceptance Criteria

1. The page MUST use header, main, and section elements appropriately.
2. Every form input and select element MUST have a corresponding label with a matching for attribute.
3. Key interactive sections MUST use aria-labelledby to associate headings.
4. Validation error messages MUST be inside an element with aria-live set to polite.

### Requirement 4: Header and Theme Toggle

**User Story:** As a user, I want to see the app name in the header and be able to toggle between dark and light themes with my preference remembered.

#### Acceptance Criteria

1. The header MUST display the application title inside an h1 element.
2. The header MUST contain a button to toggle between dark and light modes.
3. Clicking the toggle MUST add the dark class to the html element for dark mode and remove it for light mode.
4. The isDarkMode value MUST be persisted to localStorage after each toggle.
5. The button label or icon MUST reflect the current mode.
6. After toggling, Chart.js legend colors MUST update immediately to remain readable.

### Requirement 5: Total Spent Display

**User Story:** As a user, I want to see my total spending prominently displayed so I can track overall expenses at a glance.

#### Acceptance Criteria

1. A prominent Total Spent display MUST appear near the top of the page.
2. The amount MUST equal the sum of all transaction amounts.
3. The amount MUST be formatted as a currency string with 2 decimal places prefixed by a dollar sign.
4. The total MUST update immediately after every add or delete operation.
5. When no transactions exist, the display MUST show zero dollars and zero cents.

### Requirement 6: Add Transaction Form

**User Story:** As a user, I want to add a new expense with a name, amount, and category so I can track my spending with validation feedback.

#### Acceptance Criteria

1. The form MUST contain a text input for Item Name with a matching label using the for attribute.
2. The form MUST contain a number input for Amount with a matching label using the for attribute.
3. The form MUST contain a select dropdown for Category with a matching label using the for attribute populated from state categories.
4. The form MUST contain a submit button to add the transaction.
5. If Item Name is empty on submit, the app MUST show an inline error and NOT add the transaction.
6. If Amount is zero, negative, or non-numeric on submit, the app MUST show an inline error and NOT add the transaction.
7. Validation errors MUST clear after a successful submission.
8. All form fields MUST reset to empty or default values after a successful submission.

### Requirement 7: Custom Categories

**User Story:** As a user, I want to add custom spending categories so I can organize my expenses in a way that fits my habits.

#### Acceptance Criteria

1. An Add Custom Category link MUST appear near the Category select element.
2. Clicking it MUST invoke window.prompt asking for the new category name.
3. If the user cancels or enters only whitespace, state MUST remain unchanged.
4. If the trimmed name already exists case-insensitively in state categories, no duplicate MUST be added.
5. If valid, the new category MUST be appended to state, persisted to localStorage, and immediately appear in the Category select dropdown.

### Requirement 8: Transaction List with Sort and Delete

**User Story:** As a user, I want to see all my transactions in a sorted scrollable list and be able to delete individual entries.

#### Acceptance Criteria

1. Each list item MUST display the item name, amount formatted as currency, and a category tag.
2. The list container MUST be scrollable.
3. When no transactions exist, the list MUST show an empty-state message.
4. A sort dropdown MUST offer Newest, Oldest, Amount High to Low, and Amount Low to High options.
5. Changing the sort dropdown MUST immediately re-render the list in the selected order.
6. Sort order MUST be applied only at render time and MUST NOT mutate the stored order in localStorage.
7. The default sort order on load MUST be Newest.
8. Each list item MUST contain a Delete button with a data-id attribute set to the transaction id.
9. Clicking Delete MUST remove the transaction from state, persist the change, re-render the list, update the total, and update the chart.

### Requirement 9: Spending Chart

**User Story:** As a user, I want a live chart of my spending by category so I can visualize where my money is going.

#### Acceptance Criteria

1. A Chart.js Doughnut or Pie chart MUST render on a canvas element inside the Visualizer card.
2. The chart MUST show one segment per category with total spending greater than zero.
3. Each segment size MUST be proportional to total spending in that category.
4. Categories with zero spending MUST NOT appear as segments.
5. The chart MUST display a legend with category names and colors.
6. The chart MUST update via chart.update after every add or delete operation.
7. In dark mode, chart legend text MUST use a light color.
8. In light mode, chart legend text MUST use a dark color.
9. Legend colors MUST update immediately when the theme toggles.

### Requirement 10: Technology Constraints

**User Story:** As a developer, I want the project to use only vanilla technologies in a strict file structure so the app remains simple and portable.

#### Acceptance Criteria

1. The app MUST use only HTML5, CSS via style.css and Tailwind CDN, and Vanilla JavaScript via app.js.
2. No JavaScript frameworks such as React, Vue, Angular, or Svelte are permitted.
3. No backend or build tooling is permitted.
4. Tailwind CSS MUST be loaded via CDN.
5. Chart.js MUST be loaded via CDN.
6. The project MUST contain exactly index.html, css/style.css, and js/app.js.
7. All logic MUST reside in js/app.js with no other JavaScript files.
8. The app MUST work in the latest two versions of Chrome, Firefox, Safari, and Edge.

## Glossary

- **Transaction**: A single expense record with id, name, amount, category, and timestamp fields.
- **State**: The root application data object containing transactions, categories, and isDarkMode stored in localStorage.
- **Category**: A string label used to group transactions (e.g., Food, Transport, Fun).
- **Sort Order**: The display ordering of the transaction list: newest, oldest, amount-high, or amount-low.
- **Dark Mode**: A visual theme where the html element carries the dark CSS class, inverting the color palette.
- **Chart**: A Chart.js Doughnut or Pie instance rendered on a canvas element showing spending by category.
