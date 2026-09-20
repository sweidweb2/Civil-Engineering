import { View } from 'react-native';

import { Header } from '@/components/layout/Header';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }} className="bg-background" testID="e2e-root">
      <Header title="Home" />
    </View>
  );
}
