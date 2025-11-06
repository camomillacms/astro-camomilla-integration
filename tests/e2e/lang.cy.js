describe('HTML lang attribute rendering', () => {
  it('Should render correct attribute with default value', () => {
    cy.visit({
      method: 'GET',
      url: '/'
    })
    cy.get('html').should('have.attr', 'lang', 'en')
  })

  it('Should render correct lang attribute with custom value', () => {
    cy.visit({
      method: 'GET',
      url: '/lang'
    })
    cy.get('html').should('have.attr', 'lang', 'it')
  })
})
