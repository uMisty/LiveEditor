import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir:'./tests/e2e',
  timeout:90000,
  expect:{timeout:15000},
  workers:1,
  reporter:process.env.CI?[['github'],['list']]:'list',
  use:{trace:'retain-on-failure'},
  outputDir:'test-results'
})
