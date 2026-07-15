const AUTH = {
  Cookie: 'sessionid=sessionidmock; csrftoken=csrftokenmock',
  'X-CSRFToken': 'csrftokenmock'
}

describe('Page lifecycle & preview', () => {
  it('Should 404 a non-public page (server-side gating)', () => {
    cy.request({ method: 'GET', url: '/notpublic', failOnStatusCode: false }).should((response) => {
      expect(response.status).to.eq(404)
    })
  })

  it('Should render a non-public page under ?preview=true with session cookies', () => {
    // Authenticated preview hits pages-router-preview, which bypasses the
    // is_public gate — so the draft renders (200) instead of 404.
    cy.request({
      method: 'GET',
      url: '/notpublic?preview=true',
      headers: AUTH,
      failOnStatusCode: false
    }).should((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.contain('Preview Draft Title')
    })
  })

  it('Should NOT preview without session cookies (falls through to 404)', () => {
    // No cookies → the preview attempt is skipped and we fall through to the
    // public router, which 404s the non-public page.
    cy.request({
      method: 'GET',
      url: '/notpublic?preview=true',
      failOnStatusCode: false
    }).should((response) => {
      expect(response.status).to.eq(404)
    })
  })
})
