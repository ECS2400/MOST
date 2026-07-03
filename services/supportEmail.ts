import { Linking } from 'react-native';

export const SUPPORT_EMAIL = 'biuro@sdit.space';

export async function openSupportEmail(options?: {
  subject?: string;
  body?: string;
}): Promise<void> {
  const subject = options?.subject ?? 'Most — zgłoszenie problemu';
  const body = options?.body ?? 'Opisz problem:\n\n';
  const url = `mailto:${encodeURIComponent(SUPPORT_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
}
