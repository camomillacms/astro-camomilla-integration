import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4321',
    defaultBrowser: 'chrome',
    specPattern: 'tests/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: false
  }
})