import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5174/admin/login');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button.btn-secondary');
    
    // Wait for network or navigation
    await page.waitForTimeout(2000);
    
    const url = page.url();
    console.log('Current URL after login:', url);
    
    const toasts = await page.locator('.fixed.right-4.top-4 > div').allTextContents();
    console.log('Toasts:', toasts);
    
    const html = await page.innerHTML('body');
    if (html.includes('Admin Dashboard')) {
      console.log('Admin Dashboard found in body.');
    } else {
      console.log('Admin Dashboard NOT found.');
    }
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
})();