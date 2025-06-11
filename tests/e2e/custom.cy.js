describe('Page /', () => {
  it('Should handle visit without user authenticated', () => {
    cy.visit({
      method: 'GET',
      url: '/'
    })

    cy.get('body > h1').should('not.exist')
    cy.get('body > p').should('not.exist')
    cy.get('a[href="/custom"]').should('exist')
    cy.get('a[href="/test"]').should('exist')
    cy.get('.container-react h1').should('have.text', 'Hello World')
    cy.get('.container h1').should('have.text', 'Hello World 🌍')
  })

  it('Should handle visit with user authenticated', () => {
    cy.visit({
      method: 'GET',
      url: '/',
      headers: {
        Cookie: `sessionid=sessionidmock; csrftoken=csrftokenmock`,
        'X-CSRFToken': 'csrftokenmock'
      }
    })

    cy.get('body > h1').should('not.exist')
    cy.get('body > p').should('not.exist')
    cy.get('a[href="/custom"]').should('exist')
    cy.get('a[href="/test"]').should('exist')
    cy.get('.container-react h1').should('have.text', 'Hello World')
    cy.get('.container h1').should('have.text', 'Hello Pippo!')
  })
})

describe('Page /custom', () => {
  it('Should handle visit without user authenticated', () => {
    cy.visit({
      method: 'GET',
      url: '/custom'
    })

    cy.get('body > h1').should('have.text', 'Random Page')
    cy.get('body > p').should('have.text', 'This is a random page')
    cy.get('a[href="/custom"]').should('not.exist')
    cy.get('a[href="/test"]').should('exist')
    cy.get('.container-react h1').should('have.text', 'Hello World')
    cy.get('.container h1').should('have.text', 'Hello World 🌍')
  })

  it('Should handle visit with user authenticated', () => {
    cy.visit({
      method: 'GET',
      url: '/custom',
      headers: {
        Cookie: `sessionid=sessionidmock; csrftoken=csrftokenmock`,
        'X-CSRFToken': 'csrftokenmock'
      }
    })

    cy.get('body > h1').should('have.text', 'Random Page')
    cy.get('body > p').should('have.text', 'This is a random page')
    cy.get('a[href="/custom"]').should('not.exist')
    cy.get('a[href="/test"]').should('exist')
    cy.get('.container-react h1').should('have.text', 'Hello World')
    cy.get('.container h1').should('have.text', 'Hello Pippo!')
  })
})

describe('Page /test', () => {
  it('Should handle visit without user authenticated', () => {
    cy.visit({
      method: 'GET',
      url: '/test'
    })

    cy.get('body > h1').should('not.exist')
    cy.get('body > p').should('not.exist')
    cy.get('a[href="/custom"]').should('exist')
    cy.get('.container-react h1').should('have.text', 'Hello World')
    cy.get('.container h1').should('have.text', 'Hello World 🌍')
  })

  it('Should handle visit with user authenticated', () => {
    cy.visit({
      method: 'GET',
      url: '/test',
      headers: {
        Cookie: `sessionid=sessionidmock; csrftoken=csrftokenmock`,
        'X-CSRFToken': 'csrftokenmock'
      }
    })

    cy.get('body > h1').should('not.exist')
    cy.get('body > p').should('not.exist')
    cy.get('a[href="/custom"]').should('exist')
    cy.get('.container-react h1').should('have.text', 'Hello World')
    cy.get('.container h1').should('have.text', 'Hello Pippo!')
  })
})
