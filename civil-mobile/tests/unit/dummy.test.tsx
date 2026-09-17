import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'

function Dummy() {
  return <Text>mobile unit ok</Text>
}

describe('mobile unit (dummy)', () => {
  it('adds numbers', () => {
    expect(1 + 1).toBe(2)
  })

  it('renders with React Native Testing Library', async () => {
    const { getByText } = await render(<Dummy />)
    expect(getByText('mobile unit ok')).toBeTruthy()
  })
})
