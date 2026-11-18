import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Text, View } from 'react-native'

import { Button, ButtonText } from '@/components/ui/button'
import { TYPE } from '@/theme/typography'

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
        <View className="flex-1 justify-center gap-3 bg-background px-5">
          <Text className={`${TYPE.headline} text-foreground`}>This screen stopped working.</Text>
          <Text className={`${TYPE.body} text-muted-foreground`}>
            Your data is safe. Reload the screen to carry on. If it keeps happening, sign out and
            back in.
          </Text>
          <Button className="mt-4" onPress={this.handleReset}>
            <ButtonText>Reload screen</ButtonText>
          </Button>
        </View>
      )
    }

    return this.props.children
  }
}
