import { APP_NAME, DATA_CONTROLLER, LEGAL_LAST_UPDATED } from '@/constants/legal';
import type { LegalDocumentContent } from './types';

export const privacyPolicyEn: LegalDocumentContent = {
  title: 'Privacy Policy',
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      title: '1. Data controller',
      paragraphs: [
        `The data controller for the ${APP_NAME} app is ${DATA_CONTROLLER.name}.`,
        `Privacy contact: ${DATA_CONTROLLER.email}.`,
        'This policy explains what data we collect, why we process it, and your rights under the GDPR.',
      ],
    },
    {
      title: '2. Data we process',
      paragraphs: [
        'Account data: email, name or display name, hashed password, user ID, registration date, language, subscription plan.',
        'Profile data: optional profile photo, avatar color, in-app activity statistics.',
        'Relationship data: couple ID, invite code, connection date — if you use partner features.',
        'User content: dispute perspectives, live mediation messages, agreements, Solo Analysis notes, chat screenshots for OCR (if used), exported PDF reports.',
        'Payment and subscription data: transaction ID, plan type, purchase and expiry dates, subscription status. We do not store card numbers — Google Play handles payments.',
        'Technical data: IP address, device type, OS and app version, error logs — as needed for operation and security.',
        'Push notifications: device token — only if you enable notifications.',
      ],
    },
    {
      title: '3. Purposes and legal bases',
      paragraphs: [
        'Providing the service (Art. 6(1)(b) GDPR): account, mediations, Solo Analysis, partner linking.',
        'Payments and subscriptions (Art. 6(1)(b) GDPR): Premium activation, renewals, restore purchases.',
        'Security (Art. 6(1)(f) GDPR): account protection, abuse prevention, infrastructure maintenance.',
        'User communication (Art. 6(1)(f) GDPR): support requests, policy updates.',
        'Notifications (Art. 6(1)(a) GDPR — consent): streak and partner alerts — only when enabled.',
      ],
    },
    {
      title: '4. AI processing',
      paragraphs: [
        `${APP_NAME} uses language models (e.g. OpenAI) for AI Mediator, Solo Analysis, perspective analysis, and summaries.`,
        'Content you submit is sent to the AI provider only to generate responses. We do not use it to train our own models.',
        'Individual-phase perspectives are not shown to your partner — only processed by AI for mediation as described in the app.',
      ],
    },
    {
      title: '5. Recipients and processors',
      paragraphs: [
        'Supabase — database, authentication, file storage.',
        'OpenAI — AI conversation processing.',
        'Google (Google Play, optional Google Sign-In) — authentication and billing.',
        'RevenueCat — subscription status and Google Play Billing sync.',
        'Push notification providers (e.g. Expo / FCM) — if enabled.',
        'We do not sell personal data for marketing.',
      ],
    },
    {
      title: '6. Retention',
      paragraphs: [
        'Account and mediation data are kept while you use the app and until you request deletion.',
        'Billing records — as required by tax and accounting law (typically up to 5 years).',
        'Technical logs — up to 12 months unless longer retention is needed for security incidents.',
      ],
    },
    {
      title: '7. Your rights',
      paragraphs: [
        'You may request access, rectification, erasure, restriction, portability, and object to processing based on legitimate interests.',
        'You may withdraw consent for notifications at any time.',
        'You may lodge a complaint with your local data protection authority.',
        `Contact us at ${DATA_CONTROLLER.email} to exercise your rights.`,
      ],
    },
    {
      title: '8. Security',
      paragraphs: [
        'We use HTTPS/TLS, access controls, and provider security measures. Passwords are stored hashed via Supabase Auth.',
      ],
    },
    {
      title: '9. Children',
      paragraphs: [
        `${APP_NAME} is not intended for users under 16. Contact us if you believe a child has created an account.`,
      ],
    },
    {
      title: '10. Changes',
      paragraphs: [
        'We may update this policy. Material changes will be communicated in the app or by email.',
      ],
    },
  ],
};

export const termsOfServiceEn: LegalDocumentContent = {
  title: 'Terms of Service',
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      title: '1. General',
      paragraphs: [
        `These Terms govern use of the ${APP_NAME} mobile app provided by ${DATA_CONTROLLER.name}.`,
        `Contact: ${DATA_CONTROLLER.email}.`,
        'By using the app you accept these Terms and the Privacy Policy.',
      ],
    },
    {
      title: '2. Eligibility and account',
      paragraphs: [
        'You must be at least 16 years old. You are responsible for your password and account activity.',
        'Sharing accounts, abuse, or impersonation is prohibited.',
      ],
    },
    {
      title: '3. Service scope',
      paragraphs: [
        `${APP_NAME} supports relationship dialogue and conflict resolution. It is not medical, therapeutic, legal, or crisis advice.`,
        'Features may include mediations, live AI chat, Solo Analysis, knowledge center, statistics, PDF export, OCR, and referrals.',
      ],
    },
    {
      title: '4. Acceptable use',
      paragraphs: [
        'You must use the app lawfully. Harassment, threats, illegal content, and abuse are prohibited.',
        'We may suspend or delete accounts for serious violations.',
      ],
    },
    {
      title: '5. Payments',
      paragraphs: [
        'Subscription details are in the Subscription Terms. Android payments use Google Play Billing; RevenueCat syncs subscription status.',
      ],
    },
    {
      title: '6. Liability',
      paragraphs: [
        'The app is provided as is. AI responses may be inaccurate — relationship decisions are yours.',
        'Liability is limited to the extent permitted by law.',
      ],
    },
    {
      title: '7. Termination',
      paragraphs: [
        'You may delete your account by emailing us. We may discontinue the service with notice except for Terms violations.',
      ],
    },
    {
      title: '8. Governing law',
      paragraphs: [
        'Polish law applies unless mandatory local consumer rules provide otherwise.',
      ],
    },
  ],
};

export const subscriptionTermsEn: LegalDocumentContent = {
  title: 'Subscription Terms',
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      title: '1. Plans and pricing',
      paragraphs: [
        `${APP_NAME} offers a free plan, Premium subscriptions (weekly, monthly, yearly), and one-time Solo Analysis.`,
        'Current prices and features are shown in the app before purchase.',
        'Example prices (subject to change): Weekly — PLN 14.99; Monthly — PLN 49.99; Yearly — PLN 399.99; Solo Analysis — PLN 9.99 one-time.',
      ],
    },
    {
      title: '2. Payments',
      paragraphs: [
        'Android payments are processed by Google Play Billing. We do not store card data.',
        'RevenueCat verifies and syncs subscription status. RevenueCat privacy: https://www.revenuecat.com/privacy',
      ],
    },
    {
      title: '3. Auto-renewal',
      paragraphs: [
        'Premium subscriptions renew automatically unless cancelled before the renewal date.',
        'You will be charged within 24 hours before the current period ends.',
        'Solo Analysis is a one-time purchase and does not auto-renew.',
      ],
    },
    {
      title: '4. Cancellation',
      paragraphs: [
        'Cancel in Google Play: Payments & subscriptions → Subscriptions → Most → Cancel.',
        'Premium remains active until the end of the paid period. Uninstalling the app does not cancel the subscription.',
      ],
    },
    {
      title: '5. Restore purchases',
      paragraphs: [
        'Use “Restore purchases” in the subscription screen with the same Google Play and app account.',
      ],
    },
    {
      title: '6. Refunds',
      paragraphs: [
        'Google Play refund policy: https://support.google.com/googleplay/answer/2479637',
        `Payment issues: ${DATA_CONTROLLER.email}.`,
      ],
    },
    {
      title: '7. Price changes',
      paragraphs: [
        'We may change prices or plan features in line with Google Play requirements and applicable law.',
      ],
    },
  ],
};
