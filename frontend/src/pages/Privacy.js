/**
 * Public Privacy Policy page.
 * Used for OAuth consent screen and general compliance.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Privacy() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('privacy.backToApp') || 'Back to app'}
        </Link>

        <h1 className="text-3xl font-bold mb-2">{t('privacy.title') || 'Privacy Policy'}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">{t('privacy.lastUpdated') || 'Last updated: January 2026'}</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">1. Introduction</h2>
            <p>
              Stream Schedule (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;) is a scheduling and publishing tool for content creators.
              This Privacy Policy describes how we collect, use, and protect your information when you use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">2. Information We Collect</h2>
            <p>We may collect:</p>
            <ul className="list-disc pl-6 my-2 space-y-1">
              <li><strong>Account data:</strong> username, email, and profile information you provide or that we receive when you sign in (e.g. via Google, Twitch, Discord, or X).</li>
              <li><strong>OAuth data:</strong> when you connect platforms (Google, Twitch, Discord, YouTube, X), we store access tokens and related identifiers necessary to publish content on your behalf. We do not use this data for advertising or sell it to third parties.</li>
              <li><strong>Content you create:</strong> scheduled posts, events, and media you upload to schedule or publish.</li>
              <li><strong>Usage data:</strong> how you use the Service (e.g. pages visited, actions taken) to improve the product and fix issues.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 my-2 space-y-1">
              <li>Provide, maintain, and improve the Service.</li>
              <li>Publish or schedule content on the platforms you connect (e.g. Twitch, Discord, YouTube, X) according to your settings.</li>
              <li>Authenticate you and manage your account and licenses.</li>
              <li>Send you important notices (e.g. security or service changes) and, if you have agreed, product-related communications.</li>
              <li>Comply with applicable law and protect our rights and users.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">4. Google User Data</h2>
            <p>
              If you connect Google (e.g. for sign-in or YouTube), we use Google APIs in accordance with the{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 underline">
                Google API Services User Data Policy
              </a>
              . We request only the scopes needed to provide the Service (e.g. profile, email, YouTube upload/read). We do not use Google user data for advertising or share it with third parties for marketing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">5. Data Sharing</h2>
            <p>
              We do not sell your personal data. We may share data with service providers that help us operate the Service (e.g. hosting, databases, authentication) under strict confidentiality. We may disclose data when required by law or to protect our or users&apos; rights and safety.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">6. Security and Retention</h2>
            <p>
              We use industry-standard measures to protect your data. We retain your information for as long as your account is active or as needed to provide the Service and comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">7. Your Rights</h2>
            <p>
              Depending on your location, you may have rights to access, correct, delete, or port your data, or to object to or restrict certain processing. You can manage your account and connected platforms in Settings. For requests or questions, contact us at the email below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">8. Contact</h2>
            <p>
              For questions about this Privacy Policy or your data: <a href="mailto:christiandvillar@gmail.com" className="text-primary-600 dark:text-primary-400 underline">christiandvillar@gmail.com</a>.
            </p>
          </section>
        </div>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 mt-10 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('privacy.backToApp') || 'Back to app'}
        </Link>
      </div>
    </div>
  );
}
