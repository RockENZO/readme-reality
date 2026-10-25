import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'test/browser',use:{baseURL:'http://127.0.0.1:4173/readme-reality/',trace:'retain-on-failure'},webServer:{command:'npx vite preview --host 127.0.0.1 --port 4173',url:'http://127.0.0.1:4173/readme-reality/',reuseExistingServer:!process.env.CI},reporter:'list'});
