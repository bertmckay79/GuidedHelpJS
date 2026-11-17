import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/browser',
  retries:0,
  workers:1,
  timeout:30000,
  use:{
    baseURL:'http://127.0.0.1:8041',
    browserName:'chromium',
    viewport:{width:1360,height:1000},
    screenshot:'only-on-failure',
    trace:'off',
    video:'off'
  },
  reporter:'list',
  webServer:{
    command:'python3 -m http.server 8041 --bind 127.0.0.1',
    url:'http://127.0.0.1:8041/examples/author.html',
    reuseExistingServer:!process.env.CI,
    timeout:15000
  }
});
