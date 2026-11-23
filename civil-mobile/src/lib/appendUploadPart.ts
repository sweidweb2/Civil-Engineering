import { Platform } from 'react-native'
import { File } from 'expo-file-system'

/**
 * Append a local file to FormData for Expo SDK 58+ / WinterCG fetch.
 * The legacy RN `{ uri, name, type }` part throws:
 * `Unsupported FormDataPart implementation`.
 * Native: `expo-file-system` File (implements Blob + bytes()).
 * Web: real Blob from the URI.
 */
export async function appendUploadPart(
  form: FormData,
  field: string,
  file: { uri: string; mime: string; originalName: string },
): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await fetch(file.uri).then((r) => r.blob())
    form.append(field, blob, file.originalName)
    return
  }

  const nativeFile = new File(file.uri)
  form.append(field, nativeFile, file.originalName)
}
