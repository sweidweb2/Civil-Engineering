import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Text, View } from 'react-native'

import { Button, ButtonText } from '@/components/ui/button'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
}

/**
 * Single global crash fallback — not a set of 404/500 error routes.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React error boundary', error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
          <Text className="text-center text-xl font-semibold text-foreground">
            Something went wrong
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            The screen crashed unexpectedly. You can try again, or go back to sign in if the problem
            continues.
          </Text>
          <Button onPress={this.handleReset}>
            <ButtonText>Try again</ButtonText>
          </Button>
        </View>
      )
    }

    return this.props.children
  }
}
