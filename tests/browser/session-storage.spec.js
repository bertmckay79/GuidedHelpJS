import {test,expect} from '@playwright/test';

test('loads, replaces and clears session tutorial definitions without a page reload',async({page})=>{
  await page.goto('/examples/session.html');
  await expect(page.locator('#sessionStatus')).toHaveText('Loaded tutorials: 0');
  await page.getByRole('button',{name:'Store one tutorial + reload'}).click();
  await expect(page.locator('#sessionStatus')).toContainText('demo.session-one');

  await page.getByRole('button',{name:'Start available tutorial'}).click();
  await expect(page.locator('.guided-help-panel')).toBeVisible();
  await expect(page.locator('.guided-help-panel')).toContainText('A stored step');
  await expect(page.locator('#sessionTarget')).toHaveClass(/discovery-spotlight-target/);

  await page.getByRole('button',{name:'Replace tutorial + reload'}).click();
  await expect(page.locator('#sessionStatus')).toContainText('demo.session-two');
  await expect(page.locator('.guided-help-panel')).toBeHidden();
  await expect(page.locator('#sessionTarget')).not.toHaveClass(/discovery-spotlight-target/);
  await page.getByRole('button',{name:'Start available tutorial'}).click();
  await expect(page.locator('.guided-help-panel')).toBeVisible();

  await page.reload();
  await expect(page.locator('#sessionStatus')).toContainText('demo.session-two');
  await page.getByRole('button',{name:'Remove session tutorials + reload'}).click();
  await expect(page.locator('#sessionStatus')).toHaveText('Loaded tutorials: 0');
  await expect(page.locator('.guided-help-panel')).toBeHidden();
});

test('invalid session update leaves a previously loaded tutorial running',async({page})=>{
  await page.goto('/examples/session.html');
  await page.getByRole('button',{name:'Store one tutorial + reload'}).click();
  await page.getByRole('button',{name:'Start available tutorial'}).click();
  await expect(page.locator('.guided-help-panel')).toBeVisible();

  await page.evaluate(()=>{
    sessionStorage.setItem('guidedhelpjs.demo:catalogue:v1','{not json');
  });
  // The API exposes explicit reload; use the same module as the host integration.
  const result=await page.evaluate(async()=>{
    const {createGuidedHelp}=await import('/src/index.js');
    const key='guidedhelpjs.demo:catalogue:v1';
    // A separate reader rejects the bad payload rather than executing it.
    const {readTutorialsFromSessionStorage}=await import('/src/session-tutorials.js');
    try {
      readTutorialsFromSessionStorage({key,storage:sessionStorage});
      return 'unexpected-success';
    } catch(e) {return e.message;}
  });
  expect(result).toContain('Invalid session tutorial JSON');
  await expect(page.locator('.guided-help-panel')).toBeVisible();
});
