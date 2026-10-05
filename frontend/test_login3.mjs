import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('response', async response => {
    if (response.url().includes('login')) {
      console.log('Login response status:', response.status());
      try {
        console.log('Login response body:', await response.text());
      } catch (e) {}
    }
  });

  page.on('console', msg => console.log('Browser console:', msg.text()));

  try {
    await page.goto('http://localhost:5174/admin/login');
    // Find input by value '9999999999' or type
    await page.fill('input:not([type="password"])', '9999999999');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Enter admin")');
    
    await page.waitForTimeout(2000);
    
    console.log('Toasts:', await page.locator('.fixed.right-4.top-4 > div').allTextContents());
  } finally {
    await browser.close();
  }
})();