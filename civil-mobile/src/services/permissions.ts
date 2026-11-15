import { Alert, Linking, Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import type { TFunction } from 'i18next'

export type MediaPermission = 'camera' | 'library'

/** iOS "limited" photo access still lets the user pick the photos they shared. */
function isUsable(
  result: ImagePicker.MediaLibraryPermissionResponse | ImagePicker.CameraPermissionResponse,
): boolean {
  return result.granted || ('accessPrivileges' in result && result.accessPrivileges === 'limited')
}

function explainDenied(kind: MediaPermission, t: TFunction) {
  Alert.alert(
    t(kind === 'camera' ? 'permissions.cameraTitle' : 'permissions.libraryTitle'),
    t(kind === 'camera' ? 'permissions.cameraDenied' : 'permissions.libraryDenied'),
    [
      { text: t('permissions.notNow'), style: 'cancel' },
      {
        text: t('permissions.openSettings'),
        onPress: () => {
          void Linking.openSettings()
        },
      },
    ],
  )
}

/**
 * Makes sure the OS permission for `kind` is granted, asking once if allowed.
 * When the user has permanently denied it (iOS after the first "Don't allow",
 * Android after "Don't ask again") the only way back is the system settings
 * screen, so we explain why and deep-link there instead of failing silently.
 * Web has no permission prompt for file inputs, so it always passes.
 */
export async function ensureMediaPermission(kind: MediaPermission, t: TFunction): Promise<boolean> {
  if (Platform.OS === 'web') return true

  const current =
    kind === 'camera'
      ? await ImagePicker.getCameraPermissionsAsync()
      : await ImagePicker.getMediaLibraryPermissionsAsync()
  if (isUsable(current)) return true

  if (current.canAskAgain) {
    const asked =
      kind === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (isUsable(asked)) return true
    if (asked.canAskAgain) return false // dismissed once, can still be asked later
  }

  explainDenied(kind, t)
  return false
}
