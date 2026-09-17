/**
 * colors.ts — everything related to color.
 *
 * Prepare a palette for:
 * - primary
 * - secondary
 * - background
 * - surface
 * - text
 * - border
 * - success
 * - warning
 * - error
 * - info
 * - disabled
 *
 * Ideally support light + dark modes (e.g. colors.light / colors.dark,
 * or parallel tokens consumed by a theme provider / useColorScheme).
 *
 * Fill real values later; keep semantic names stable so screens
 * never hardcode raw hex in StyleSheet code.
 *
 * Note: Expo template still has src/constants/theme.ts — prefer
 * this folder as the source of truth going forward.
 */

export const colors = {
  light: {
    primary: '#2FA084',
    secondary: '#6FCF97',
    background: '#EEEEEE',
    surface: '#EEEEEE',
    text: '#1F6F5F',
    border: '#2FA084',
    success: '#6FCF97',
    // warning: '',
    // error: '',
    // info: '',
    // disabled: '',
  },
  // dark: {
  //   primary: '',
  //   secondary: '',
  //   background: '',
  //   surface: '',
  //   text: '',
  //   border: '',
  //   success: '',
  //   warning: '',
  //   error: '',
  //   info: '',
  //   disabled: '',
  // },
} as const;

export type ColorToken = keyof typeof colors.light;
