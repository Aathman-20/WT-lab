# Selenium WebDriver Tests

Startup order: (1) MongoDB (local service or Atlas URI in `backend/.env`), (2) `cd backend; npm start` (wait for "[Server] Running"), (3) tests.

    cd tests
    npm install
    npm test

Optional: `$env:APP_URL="http://localhost:5000"` to change the target. Needs Chrome or Edge (Selenium Manager fetches the driver).
Covers: page load, empty-form validation, create, search, view, edit, delete, empty-search state. Test data is unique per run and cleaned up.
