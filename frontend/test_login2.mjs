import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Intercept and print network requests and responses
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
    await page.fill('input[type="text"]', '9999999999'); // Ensure mobile is set
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button.btn-secondary');
    
    await page.waitForTimeout(2000);
    
    console.log('Toasts:', await page.locator('.fixed.right-4.top-4 > div').allTextContents());
  } finally {
    await browser.close();
  }
})();