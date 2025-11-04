describe('Seo data rendering', () => {
  it('Should render mocked seo data', () => {
    cy.visit({
      method: 'GET',
      url: '/seo'
    })

    cy.get('title').should('have.text', 'Seo Mocked Title')
    cy.get('meta[name="description"]').should('have.attr', 'content', 'Seo mocked description')
    cy.get('meta[name="keywords"]').should('have.attr', 'content', 'MockedKey, MockedKey2')
    cy.get('meta[property="og:type"]').should('have.attr', 'content', 'Seo mocked og_type')
    cy.get('meta[property="og:title"]').should('have.attr', 'content', 'Seo mocked og_title')
    cy.get('meta[property="og:description"]').should(
      'have.attr',
      'content',
      'Seo mocked og_description'
    )
    cy.get('meta[property="og:image"]').should(
      'have.attr',
      'content',
      'http://seo_mocked_image_path.png'
    )
    cy.get('meta[property="og:url"]').should('have.attr', 'content', 'Seo mocked url')
    cy.get('meta[name="twitter:card"]').should('have.attr', 'content', 'summary_large_image')
    cy.get('meta[name="twitter:title"]').should('have.attr', 'content', 'Seo Mocked Title')
    cy.get('meta[name="twitter:description"]').should(
      'have.attr',
      'content',
      'Seo mocked description'
    )
    cy.get('meta[name="twitter:image"]').should(
      'have.attr',
      'content',
      'http://seo_mocked_image_path.png'
    )
    cy.get('script[type="application/ld+json"]').should(
      'have.text',
      '{"@context":"https://schema.org","@type":"WebSite","name":"Seo Mocked Title"}'
    )
  })
})
