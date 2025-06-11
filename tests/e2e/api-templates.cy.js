describe('API template', () => {
  it('Should fail without user authentication', () => {
    cy.request({
      method: 'GET',
      url: '/api/templates',
      failOnStatusCode: false
    }).should((response) => {
      expect(response.status).to.eq(401)
      expect(response.body).to.have.length.of.at.least(1)
    })
  })

  it('Should return available templates with user authentication', () => {
    cy.request({
      method: 'GET',
      url: '/api/templates',
      headers: {
        Cookie: `sessionid=sessionidmock; csrftoken=csrftokenmock`,
        'X-CSRFToken': 'csrftokenmock'
      }
    }).should((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.length.of.at.least(1)
    })
  })
})
