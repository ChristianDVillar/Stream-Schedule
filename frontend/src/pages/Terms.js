/**
 * Public Terms of Service page.
 * Content aligned with TERMS_OF_SERVICE.md.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import AppFooter from '../components/AppFooter';

export default function Terms() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('terms.backToApp') || 'Back to app'}
        </Link>

        <h1 className="text-3xl font-bold mb-2">{t('terms.title') || 'Terms of Service'}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">{t('terms.lastUpdated') || 'Last updated: January 2026'}</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Streamer Scheduler (&quot;the Service&quot;), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">2. Intellectual Property Rights</h2>
            <p>
              All content, features, and functionality of the Service, including but not limited to text, graphics, logos, icons, images, audio clips, digital downloads, data compilations, and software, are the exclusive property of Christian David Villar Colodro and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">3. Prohibited Uses</h2>
            <p>You may not:</p>
            <ul className="list-disc pl-6 my-2 space-y-1">
              <li>Copy, reproduce, or duplicate any part of the Service</li>
              <li>Modify, adapt, or create derivative works</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Remove any copyright, trademark, or other proprietary notices</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Attempt to gain unauthorized access to any portion of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">4. User Accounts</h2>
            <ul className="list-disc pl-6 my-2 space-y-1">
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must immediately notify us of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">5. License Usage</h2>
            <ul className="list-disc pl-6 my-2 space-y-1">
              <li>Licenses are non-transferable and non-refundable</li>
              <li>Each license is valid for one user account only</li>
              <li>Sharing or reselling licenses is strictly prohibited</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">6. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">7. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">8. Limitation of Liability</h2>
            <p>
              IN NO EVENT SHALL CHRISTIAN DAVID VILLAR COLODRO BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">9. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact:{' '}
              <a href="mailto:christiandvillar@gmail.com" className="text-primary-600 dark:text-primary-400 underline">christiandvillar@gmail.com</a>
            </p>
          </section>
        </div>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 mt-10 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('terms.backToApp') || 'Back to app'}
        </Link>
      </div>
      <AppFooter className="mt-12 py-6 px-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-center text-gray-500 dark:text-gray-400 text-sm" />
    </div>
  );
}
