describe('Menu rendering', () => {
  // ``/site-home`` is served through the demo site templates (SiteLayout →
  // SiteHeader/SiteFooter), which pull navigation from the public
  // ``menus-router`` via ``fetchMenu`` — works for anonymous visitors.
  it('Should render the main menu in the header for an anonymous visitor', () => {
    cy.visit({ method: 'GET', url: '/site-home' })
    cy.get('header.site nav a[href="/about/"]').should('have.text', 'About')
  })

  it('Should render the footer menu', () => {
    cy.visit({ method: 'GET', url: '/site-home' })
    cy.get('footer.site nav a[href="/about/"]').should('exist')
  })
})
