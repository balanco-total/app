describe('jest setup sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })

  it('has fetch polyfill', () => {
    expect(typeof fetch).toBe('function')
  })

  it('has Request polyfill', () => {
    expect(typeof Request).toBe('function')
  })
})
