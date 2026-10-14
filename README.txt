TRACK & SAVE — FINANCIAL MANAGER DASHBOARD
Final Project - Web Development Course

==================================================
DEVELOPER DETAILS
==================================================
Name: Sara Shana Zivi

==================================================
PROJECT OVERVIEW
==================================================
Track & Save is a comprehensive personal finance management application. 
The system allows users to monitor their income, track daily expenses, and manage long-term savings goals. 
It features real-time currency conversion using an external API and provides visual data analysis through dynamic charts.

==================================================
PROJECT STRUCTURE & FILE ORGANIZATION
==================================================
The project follows a modular architecture to separate UI from logic:

- index.html: The main application structure, containing all tabs and modals.
- css/style.css: Modern dashboard styling and responsive design rules.
- js/main.js: Core logic, global state, currency API, and data management (Export/Reset).
- js/incomes.js: Dedicated logic for managing income entries and income-specific charts.
- js/expenses.js: Dedicated logic for managing expense entries and categorical analysis.
- js/savings.js: Logic for creating goals, tracking progress, and handling deposits.

==================================================
HOW TO RUN THE PROJECT
==================================================
1. Download the project folder.
2. Open the 'index.html' file in any modern web browser (Chrome, Edge, Firefox).
3. Note: An internet connection is required to fetch real-time exchange rates and load CSS/JS libraries via CDN.

==================================================
JAVASCRIPT LIBRARIES & IMPLEMENTATION
==================================================
1. Chart.js:
   - Usage: Data visualization via bar, pie, and doughnut charts.
   - Locations: 
     * Overview Tab: Comparison bar chart (Income vs. Expenses).
     * Incomes/Expenses Tabs: Distribution charts by category, method, and currency.

2. SweetAlert2 (Swal):
   - Usage: Professional-looking pop-up messages and confirmation dialogs.
   - Locations:
     * Header: Triggered by the 'Personal Details' button.
     * Tables: Confirmation prompts before deleting a record.
     * Reset: Confirmation before clearing the entire application data.

3. Flatpickr:
   - Usage: An interactive calendar for date selection.
   - Locations: Used in all entry forms within modals (Incomes, Expenses, and Savings goals).

==================================================
EXTERNAL API INTEGRATION
==================================================
- API: ExchangeRate-API (https://open.er-api.com/v6/latest/ILS)
- Implementation: Located in js/main.js within the 'fetchCurrencyRates' function.
- Usage: The app fetches live rates against the Israeli Shekel (ILS). This allows the system to automatically convert entries made in foreign currencies (USD, EUR, etc.) into ILS for consolidated financial reporting.

==================================================
SPECIAL FEATURES
==================================================
- Data Persistence (LocalStorage): All financial data is stored in the browser's local storage. This ensures that the user's information remains saved even after refreshing the page or closing the browser.
- Reset Data Button: A dedicated button in the header (trash icon) that allows the user to completely wipe all records and start fresh after a safety confirmation.
- Export Functionality: Users can export their entire financial database into a JSON file for local backup.
- Dynamic Updates: The application updates summary cards and charts instantly upon any data change without requiring a page reload.
==================================================
