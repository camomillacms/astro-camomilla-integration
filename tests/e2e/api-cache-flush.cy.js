describe('API template', () => {
  it('Should fail without user authentication', () => {
    cy.request({
      method: 'GET',
      url: '/api/cache-flush',
      failOnStatusCode: false
    }).should((response) => {
      expect(response.status).to.eq(401)
      expect(response.body).to.have.length.of.at.least(1)
    })
  })

  it('Should return current cache keys with user authentication', () => {
    cy.request({
      method: 'GET',
      url: '/api/cache-flush',
      headers: {
        Cookie: `sessionid=sessionidmock; csrftoken=csrftokenmock`,
        'X-CSRFToken': 'csrftokenmock'
      }
    }).should((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.length.of.at.least(1)
    })
  })

  it('Should fail to flush cache without user authentication', () => {
    cy.request({
      method: 'POST',
      url: '/api/cache-flush',
      failOnStatusCode: false
    }).should((response) => {
      expect(response.status).to.eq(401)
      expect(response.body).to.have.length.of.at.least(1)
    })
  })
  it('Should flush cache with user authentication', () => {
    cy.request({
      method: 'POST',
      url: '/api/cache-flush',
      body: { keys: 'ALL' },
      headers: {
        Cookie: `sessionid=sessionidmock; csrftoken=csrftokenmock`,
        'X-CSRFToken': 'csrftokenmock'
      }
    }).should((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.property('success', true)
    })
  })
})
