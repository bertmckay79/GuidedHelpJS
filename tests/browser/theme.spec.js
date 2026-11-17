import {test,expect} from '@playwright/test';

test('palette and host CSS variable mapping update recorder and preview without DOM leaks',async({page})=>{
  await page.goto('/examples/author.html');
  await page.getByRole('button',{name:'Open tutorial authoring panel'}).click();
  const panel=page.locator('.ghr-panel');
  await page.getByRole('button',{name:'Use purple palette'}).click();
  await expect(panel).toHaveCSS('background-color','rgb(245, 240, 255)');
  expect(await panel.evaluate(node=>node.style.getPropertyValue('--gh-accent'))).toBe('#7c3aed');

  await page.getByRole('button',{name:'Map application CSS variables'}).click();
  await expect(panel).toHaveCSS('background-color','rgb(245, 240, 255)');
  expect(await panel.evaluate(node=>node.style.getPropertyValue('--gh-surface')))
    .toBe('var(--demo-brand-surface)');

  await page.getByRole('button',{name:'Record',exact:true}).click();
  await page.locator('#createProjectButton').hover();
  const target=page.locator('#createProjectButton');
  expect(await target.evaluate(node=>node.style.getPropertyValue('--gh-highlight')))
    .toBe('var(--demo-brand-primary)');
  await target.click();
  await page.keyboard.press('Escape');
  expect(await target.evaluate(node=>node.style.getPropertyValue('--gh-highlight'))).toBe('');
  await page.getByRole('button',{name:'Preview',exact:true}).click();
  const preview=page.locator('.guided-help-panel');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveCSS('background-color','rgb(245, 240, 255)');
  expect(await target.evaluate(node=>node.style.getPropertyValue('--gh-highlight')))
    .toBe('var(--demo-brand-primary)');
  await page.getByRole('button',{name:'Stop preview'}).click();
  expect(await target.evaluate(node=>node.style.getPropertyValue('--gh-highlight'))).toBe('');
  await page.getByRole('button',{name:'Use app/default CSS'}).click();
  expect(await panel.evaluate(node=>node.style.getPropertyValue('--gh-surface'))).toBe('');
});

test('appearance editor chooses fixed palette or CSS custom properties without changing tutorial JSON',async({page})=>{
  await page.goto('/examples/author.html');
  await page.locator('#openAuthor').click();
  await page.getByRole('button',{name:'Appearance'}).click();
  const firstRow=page.locator('.ghr-theme-row').first();
  await firstRow.locator('select').selectOption('palette');
  await firstRow.locator('input').fill('#ab12cd');
  await firstRow.locator('input').blur();
  expect(await page.locator('.ghr-panel').evaluate(el=>el.style.getPropertyValue('--gh-accent')))
    .toBe('#ab12cd');

  await firstRow.locator('select').selectOption('variables');
  await firstRow.locator('input').fill('--demo-brand-primary');
  await firstRow.locator('input').blur();
  expect(await page.locator('.ghr-panel').evaluate(el=>el.style.getPropertyValue('--gh-accent')))
    .toBe('var(--demo-brand-primary)');
  await expect(page.getByLabel('Theme configuration JSON')).toHaveValue(/demo-brand-primary/);
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.getByRole('button',{name:'Record',exact:true}).click();
  await page.locator('#createProjectButton').click();
  await page.keyboard.press('Escape');
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download JSON'}).click();
  const file=await download;
  const text=await file.createReadStream().then(async stream=>{
    let content='';for await(const chunk of stream)content+=chunk.toString('utf8');
    return content;
  });
  expect(text).not.toContain('demo-brand-primary');
  expect(text).not.toContain('palette');
  expect(JSON.parse(text).steps).toHaveLength(1);
});
