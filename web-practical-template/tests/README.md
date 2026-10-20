# Selenium WebDriver Automated Test Suite

This directory contains end-to-end automated browser tests for the CRUD web application using `selenium-webdriver` (v4.23+).

## Prerequisites & Startup Order
Before running the Selenium test suite, ensure the following services are started in order:
1. **MongoDB Database:** Either start the local MongoDB service (`net start MongoDB`) or configure a valid MongoDB Atlas URI in `backend/.env`.
2. **Node.js Backend & Frontend Server:** Start the backend server in `backend/` (`npm start`), which serves both the REST API and the frontend at `http://localhost:5000`.
3. **Browser:** Ensure Google Chrome or Microsoft Edge is installed on Windows. Selenium Manager automatically configures the matching driver.

## Installation and Execution Commands
Open PowerShell or Command Prompt inside the `tests/` directory and run:

    npm install
    npm test