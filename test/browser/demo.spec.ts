import {test,expect}from'@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const viewport of [{width:1440,height:1100},{width:390,height:844}])test(`real example, keyboard, evidence, responsive and accessibility ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('');
 await expect(page.locator('#status-pill')).toHaveText('Needs attention');
 await page.getByRole('button',{name:'Corrected',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(page.locator('#status-pill')).toHaveText('Checked');
 await page.getByRole('button',{name:'Honest coverage',exact:true}).click();
 await page.getByRole('button',{name:'Corrected',exact:true}).click();await expect(page.locator('#status-pill')).toHaveText('Partial coverage');
 await page.getByRole('button',{name:'Python quickstart',exact:true}).click();
 await page.getByText('View repository evidence',{exact:true}).first().click();
 await expect(page.locator('#findings')).toContainText('requirements-dev.txt: missing');
 const violations=(await new AxeBuilder({page}).analyze()).violations;expect(violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('editable Markdown is text, not executable HTML; empty and error states',async({page})=>{
 await page.goto('');const editor=page.getByRole('textbox',{name:'README source'});
 await editor.fill('# Empty');await page.getByRole('button',{name:'Run check'}).click();await expect(page.locator('#findings')).toContainText('No findings');
 await editor.fill('[<img src=x onerror=alert(1)>](missing.md)');await page.getByRole('button',{name:'Run check'}).click();await expect(page.locator('#status-pill')).toHaveText('Needs attention');expect(await page.locator('#findings img').count()).toBe(0);
 await editor.fill('x'.repeat(2_000_001));await page.getByRole('button',{name:'Run check'}).click();await expect(page.locator('#status-pill')).toHaveText('Input error');await expect(page.locator('#result-summary')).toContainText('2 MB');
});
test('conditional commands display honest partial coverage in the browser',async({page})=>{
 await page.goto('');await page.getByRole('textbox',{name:'README source'}).fill('```bash\nif false\nthen\npython optional.py\nfi\n```');
 await page.getByRole('button',{name:'Run check'}).click();await expect(page.locator('#status-pill')).toHaveText('Partial coverage');await expect(page.locator('#result-summary')).toContainText('NOT CHECKED');await expect(page.locator('#findings')).toContainText('Shell control flow is not simulated');await expect(page.locator('#findings .error')).toHaveCount(0);
});

test('HTML profile references share the engine without rendering supplied markup',async({page})=>{
 await page.goto('');await page.getByRole('button',{name:'Profile media',exact:true}).click();await expect(page.locator('#status-pill')).toHaveText('Needs attention');
 await expect(page.locator('#findings')).toContainText('assets/preview.gif');await expect(page.locator('#findings')).toContainText('LINE 3');
 await page.getByRole('button',{name:'Corrected',exact:true}).click();await expect(page.locator('#status-pill')).toHaveText('Checked');
 await page.getByRole('textbox',{name:'README source'}).fill('<img src="missing.png" onerror="window.HTML_EXECUTED=true">');await page.getByRole('button',{name:'Run check'}).click();await expect(page.locator('#status-pill')).toHaveText('Needs attention');
 expect(await page.locator('#findings img').count()).toBe(0);expect(await page.evaluate(()=>(window as unknown as {HTML_EXECUTED?:boolean}).HTML_EXECUTED)).toBeUndefined();
});
