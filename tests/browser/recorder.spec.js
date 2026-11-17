import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('record three controls safely, edit, preview and round-trip JSON',async({page})=>{
  await page.goto('/examples/author.html');
  await page.getByRole('button',{name:'Open tutorial authoring panel'}).click();
  await expect(page.getByRole('heading',{name:'GuidedHelpJS · Author'})).toBeVisible();

  await page.getByRole('button',{name:'Record',exact:true}).click();
  await page.locator('#createProjectButton').click();
  await page.locator('[data-feature="demo.settings"]').click();
  await page.locator('#openFiles').click();
  await expect(page.locator('#hostResult')).toHaveText('Host actions: 0');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading',{name:'Steps (3/32)'})).toBeVisible();

  await page.getByRole('button',{name:'1. Step 1'}).click();
  await page.getByLabel('Description').fill('This is the project creation control.');
  await page.getByLabel('Description').blur();

  const downloading=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download JSON'}).click();
  const download=await downloading;
  const json=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  expect(json.steps).toHaveLength(3);
  expect(json.steps[0].target).toEqual({id:'createProjectButton'});
  expect(json.steps[1].target).toEqual({feature:'demo.settings'});
  expect(json.steps[2].target).toEqual({id:'openFiles'});
  expect(JSON.stringify(json)).not.toContain('Host actions');

  await page.getByRole('button',{name:'Preview',exact:true}).click();
  await expect(page.locator('.guided-help-panel')).toBeVisible();
  await expect(page.locator('.guided-help-panel')).toContainText('This is the project creation control.');
  await page.locator('.guided-help-panel').getByRole('button',{name:'Next'}).click();
  await expect(page.locator('.guided-help-panel')).toContainText('Step 2 of 3');
  await page.locator('.guided-help-panel').getByRole('button',{name:'Next'}).click();
  await page.locator('.guided-help-panel').getByRole('button',{name:'Next'}).click();
  await expect(page.locator('.guided-help-panel')).toContainText('Tutorial complete');
  await expect(page.locator('#hostResult')).toHaveText('Host actions: 0');
  await page.getByRole('button',{name:'Stop preview'}).click();
  await expect(page.locator('.guided-help-panel')).toHaveCount(0);

  await page.getByRole('button',{name:'Import JSON'}).click();
  await page.getByLabel('Paste tutorial JSON').fill(JSON.stringify(json));
  await page.getByRole('button',{name:'Validate and import'}).click();
  await expect(page.getByRole('heading',{name:'Steps (3/32)'})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Tutorial imported');
});

test('private form controls cannot be recorded; switching modes leaves no picker',async({page})=>{
  await page.goto('/examples/author.html');
  await page.locator('#openAuthor').click();
  await page.getByRole('button',{name:'Record',exact:true}).click();
  await page.locator('#demoSecretInput').click();
  await page.locator('#demoSecretInput').fill('test-do-not-record');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading',{name:'Steps (0/32)'})).toBeVisible();
  await page.locator('#createProjectButton').click();
  await expect(page.locator('#hostResult')).toHaveText('Host actions: 1');
});
