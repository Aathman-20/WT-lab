const assert = require('assert');
const { Builder, By, until } = require('selenium-webdriver');

// CHANGE HERE: Update the application URL if using a different port.
const APP_URL = process.env.APP_URL || 'http://localhost:5000';
const WAIT_TIMEOUT = 10000;

// Generate a unique suffix so test runs never collide with existing database records
const uniqueSuffix = Date.now().toString().slice(-5);

// CHANGE HERE: Update test record values for the new scenario (e.g., Book title, ISBN, Author).
const testRecord = {
  name: `Rohan Verma ${uniqueSuffix}`,
  updatedName: `Rohan Verma Updated ${uniqueSuffix}`,
  rollNo: `CS-${uniqueSuffix}`,
  department: 'Computer Science',
  email: `rohan.${uniqueSuffix}@college.edu`,
  year: '3'
};

async function runTests() {
  console.log('==========================================================');
  console.log(' Starting Selenium WebDriver CRUD Automation Suite');
  console.log(' Target Application URL:', APP_URL);
  console.log('==========================================================');

  // Launches Chrome via Selenium Manager (falls back to Microsoft Edge if needed)
  let driver;
  try {
    driver = await new Builder().forBrowser('chrome').build();
  } catch (chromeErr) {
    console.log('Chrome not detected, falling back to Microsoft Edge...');
    driver = await new Builder().forBrowser('MicrosoftEdge').build();
  }

  try {
    // -----------------------------------------------------------------
    // TEST 1 & 2: Open Application and Verify Page Loads Correctly
    // -----------------------------------------------------------------
    console.log('\n[Test 1 & 2] Opening application and verifying header title...');
    await driver.get(APP_URL);

    const headingEl = await driver.wait(until.elementLocated(By.id('app-title')), WAIT_TIMEOUT);
    const headingText = await headingEl.getText();
    // CHANGE HERE: Update expected application title text.
    assert.strictEqual(headingText, 'Student Management System', 'Application heading did not match.');
    console.log(' -> PASSED: Page loaded with heading:', headingText);

    // -----------------------------------------------------------------
    // TEST 3: Test Form Validation Behavior on Empty Submission
    // -----------------------------------------------------------------
    console.log('\n[Test 3] Testing required field validation on empty submit...');
    const submitBtn = await driver.findElement(By.id('btn-submit'));
    await submitBtn.click();

    const errorBanner = await driver.wait(until.elementLocated(By.id('error-banner')), WAIT_TIMEOUT);
    await driver.wait(until.elementIsVisible(errorBanner), WAIT_TIMEOUT);
    const validationBannerText = await driver.findElement(By.id('error-message-text')).getText();
    assert.ok(validationBannerText.includes('validation errors'), 'Validation error banner should appear.');
    const nameErr = await driver.findElement(By.id('error-name'));
    await driver.wait(until.elementIsVisible(nameErr), WAIT_TIMEOUT);
    console.log(' -> PASSED: Validation prevented empty form submission.');

    // -----------------------------------------------------------------
    // TEST 4: Fill and Submit the Form to Create a Record
    // -----------------------------------------------------------------
    console.log('\n[Test 4] Filling form and creating a new record...');
    // CHANGE HERE: Update Selenium input selectors to match your HTML form field IDs.
    await driver.findElement(By.id('input-name')).clear();
    await driver.findElement(By.id('input-name')).sendKeys(testRecord.name);

    await driver.findElement(By.id('input-rollNo')).clear();
    await driver.findElement(By.id('input-rollNo')).sendKeys(testRecord.rollNo);

    const deptSelect = await driver.findElement(By.id('input-department'));
    await deptSelect.findElement(By.css(`option[value="${testRecord.department}"]`)).click();

    await driver.findElement(By.id('input-email')).clear();
    await driver.findElement(By.id('input-email')).sendKeys(testRecord.email);

    const yearInput = await driver.findElement(By.id('input-year'));
    await yearInput.clear();
    await yearInput.sendKeys(testRecord.year);

    await submitBtn.click();

    // Wait for success message banner
    const statusBanner = await driver.wait(until.elementLocated(By.id('status-banner')), WAIT_TIMEOUT);
    await driver.wait(until.elementIsVisible(statusBanner), WAIT_TIMEOUT);
    console.log(' -> PASSED: Form submitted and success banner displayed.');

    // -----------------------------------------------------------------
    // TEST 5: Verify Created Record Appears & Test Search Filtering
    // -----------------------------------------------------------------
    console.log('\n[Test 5] Searching for the newly created record...');
    const searchInput = await driver.findElement(By.id('search-input'));
    await searchInput.clear();
    await searchInput.sendKeys(testRecord.rollNo);

    // Locate the specific row by data-roll attribute
    // CHANGE HERE: Update row selector attribute if data-roll was renamed.
    const rowSelector = By.css(`tr.record-row[data-roll="${testRecord.rollNo}"]`);
    const createdRow = await driver.wait(until.elementLocated(rowSelector), WAIT_TIMEOUT);
    const rowText = await createdRow.getText();
    assert.ok(rowText.includes(testRecord.name), 'Created record name must appear in the filtered table row.');
    console.log(' -> PASSED: Created record located via search filter:', testRecord.rollNo);

    // -----------------------------------------------------------------
    // TEST 6: View Record Details Inspector
    // -----------------------------------------------------------------
    console.log('\n[Test 6] Clicking View button to inspect single record details...');
    const viewBtn = await createdRow.findElement(By.css('.btn-view'));
    await viewBtn.click();

    const detailPanel = await driver.wait(until.elementLocated(By.id('record-details-panel')), WAIT_TIMEOUT);
    await driver.wait(until.elementIsVisible(detailPanel), WAIT_TIMEOUT);
    const detailRollText = await driver.findElement(By.id('detail-rollNo')).getText();
    assert.strictEqual(detailRollText, testRecord.rollNo, 'Inspector panel rollNo should match record.');
    console.log(' -> PASSED: Record inspector loaded single record from backend.');

    // -----------------------------------------------------------------
    // TEST 7: Edit Existing Record and Verify Updated Changes
    // -----------------------------------------------------------------
    console.log('\n[Test 7] Editing the created record and verifying update...');
    const editBtn = await createdRow.findElement(By.css('.btn-edit'));
    await editBtn.click();

    const nameInput = await driver.findElement(By.id('input-name'));
    await nameInput.clear();
    await nameInput.sendKeys(testRecord.updatedName);
    await driver.findElement(By.id('btn-submit')).click();

    // Wait until the updated name is visible in the table row
    await driver.wait(async () => {
      const rows = await driver.findElements(rowSelector);
      if (rows.length === 0) return false;
      const text = await rows[0].getText();
      return text.includes(testRecord.updatedName);
    }, WAIT_TIMEOUT, 'Updated name did not appear in the table row within timeout.');
    console.log(' -> PASSED: Record updated to:', testRecord.updatedName);

    // -----------------------------------------------------------------
    // TEST 8: Delete the Record and Verify Removal
    // -----------------------------------------------------------------
    console.log('\n[Test 8] Deleting the test record and verifying removal...');
    const updatedRow = await driver.findElement(rowSelector);
    const deleteBtn = await updatedRow.findElement(By.css('.btn-delete'));
    await deleteBtn.click();

    await driver.wait(async () => {
      const remaining = await driver.findElements(rowSelector);
      return remaining.length === 0;
    }, WAIT_TIMEOUT, 'Deleted row still present in DOM.');
    console.log(' -> PASSED: Record deleted and removed from table.');

    // TEST 9: Search with no matches shows the empty-state row
    console.log('\n[Test 9] Searching for text that cannot match...');
    const s2 = await driver.findElement(By.id('search-input'));
    await s2.clear();
    await s2.sendKeys('zzz-no-such-record-' + uniqueSuffix);
    await driver.wait(until.elementLocated(By.id('empty-state-row')), WAIT_TIMEOUT);
    console.log(' -> PASSED: Empty-state row shown for no matches.');

    console.log('\n==========================================================');
    console.log(' ALL 9 SELENIUM TESTS COMPLETED SUCCESSFULLY');
    console.log('==========================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error.message);
    process.exitCode = 1;
  } finally {
    // Cleanup: remove the test record if a failure left it behind (needs Node 18+ for fetch)
    try {
      const res = await fetch(APP_URL + '/api/students');
      const body = await res.json();
      for (const s of body.data || []) {
        if (s.rollNo === testRecord.rollNo) await fetch(APP_URL + '/api/students/' + s._id, { method: 'DELETE' });
      }
    } catch (e) { /* cleanup is best effort */ }
    if (driver) {
      await driver.quit();
    }
  }
}

runTests();