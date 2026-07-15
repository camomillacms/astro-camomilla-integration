const AUTH = {
  Cookie: 'sessionid=sessionidmock; csrftoken=csrftokenmock',
  'X-CSRFToken': 'csrftokenmock'
}

describe('API djsuperadmin content proxy', () => {
  it('Should fail GET without user authentication', () => {
    cy.request({
      method: 'GET',
      url: '/api/djsuperadmin/content/1',
      failOnStatusCode: false
    }).should((response) => {
      expect(response.status).to.eq(401)
    })
  })

  it('Should proxy GET to camomilla with user authentication', () => {
    cy.request({
      method: 'GET',
      url: '/api/djsuperadmin/content/1',
      headers: AUTH
    }).should((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.property('content')
    })
  })

  it('Should fail PATCH without user authentication', () => {
    cy.request({
      method: 'PATCH',
      url: '/api/djsuperadmin/content/1',
      body: { content: '<p>x</p>' },
      failOnStatusCode: false
    }).should((response) => {
      expect(response.status).to.eq(401)
    })
  })

  it('Should proxy PATCH (forwarding body + CSRF) with user authentication', () => {
    cy.request({
      method: 'PATCH',
      url: '/api/djsuperadmin/content/1',
      headers: AUTH,
      body: { content: '<p>updated</p>' }
    }).should((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.property('content', '<p>updated</p>')
    })
  })
})
