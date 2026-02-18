import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SettingsBillingTab({
  paymentConfig,
  licenseInfo,
  subscriptionStatus,
  paymentHistory,
  availableLicenses,
  billingLoading,
  loadingSubscription,
  t,
  onPurchase,
  onCancelSubscription,
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Licenses & Billing</h3>

      {paymentConfig && (
        <div className={`p-4 rounded-lg ${
          paymentConfig.paymentEnabled
            ? (paymentConfig.automaticProcessingEnabled ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800')
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-start space-x-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${
              paymentConfig.paymentEnabled ? (paymentConfig.automaticProcessingEnabled ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400') : 'text-red-600 dark:text-red-400'
            }`} />
            <div className="flex-1">
              <h4 className={`text-sm font-medium mb-1 ${
                paymentConfig.paymentEnabled ? (paymentConfig.automaticProcessingEnabled ? 'text-green-900 dark:text-green-100' : 'text-yellow-900 dark:text-yellow-100') : 'text-red-900 dark:text-red-100'
              }`}>
                {t('settings.paymentStatus')}: {paymentConfig.paymentEnabled ? t('settings.paymentEnabled') : t('settings.paymentDisabled')}
              </h4>
              <p className={`text-sm ${
                paymentConfig.paymentEnabled ? (paymentConfig.automaticProcessingEnabled ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200') : 'text-red-800 dark:text-red-200'
              }`}>
                {paymentConfig.message}
                {paymentConfig.stripeMode === 'test' && (
                  <span className="block mt-1 font-medium text-amber-700 dark:text-amber-300">🧪 {t('settings.stripeModeTest')}</span>
                )}
                {paymentConfig.stripeMode === 'live' && (
                  <span className="block mt-1 text-xs text-gray-600 dark:text-gray-400">{t('settings.stripeModeLive')}</span>
                )}
                {paymentConfig.manualVerificationRequired && (
                  <span className="block mt-1 text-xs">⚠️ Los pagos funcionarán pero requieren verificación manual después del pago.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('settings.currentLicense')}</h4>
        {licenseInfo ? (
          <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <p>
              {t('settings.licenseType')}:{' '}
              {licenseInfo.licenseType === 'lifetime' && t('settings.lifetime')}
              {licenseInfo.licenseType === 'monthly' && t('settings.monthly')}
              {licenseInfo.licenseType === 'quarterly' && t('settings.quarterly')}
              {licenseInfo.licenseType === 'trial' && t('settings.trial')}
              {licenseInfo.licenseType === 'temporary' && t('settings.temporary')}
              {!licenseInfo.licenseType && t('settings.noLicense')}
            </p>
            <p>{t('settings.expires')}: {licenseInfo.licenseExpiresAt ? new Date(licenseInfo.licenseExpiresAt).toLocaleDateString() : '—'}</p>
            {licenseInfo.licenseAlert === '7_days' && <p className="text-yellow-700 dark:text-yellow-400 font-medium">{t('settings.licenseAlert7Days')}</p>}
            {licenseInfo.licenseAlert === '3_days' && <p className="text-red-700 dark:text-red-400 font-medium">{t('settings.licenseAlert3Days')}</p>}
            {licenseInfo.licenseAlert === 'expired' && <p className="text-red-700 dark:text-red-400 font-medium">{t('settings.licenseExpired')}</p>}
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.licenseLoadError')}</p>
        )}
      </div>

      {subscriptionStatus?.hasSubscription && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">{t('settings.activeSubscription')}</h4>
              <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <p>{t('settings.status')}: <span className="font-medium capitalize">{subscriptionStatus.subscription.status}</span></p>
                <p>{t('settings.currentPeriod')}: {new Date(subscriptionStatus.subscription.currentPeriodStart).toLocaleDateString()} - {new Date(subscriptionStatus.subscription.currentPeriodEnd).toLocaleDateString()}</p>
                {subscriptionStatus.subscription.cancelAtPeriodEnd && (
                  <p className="text-yellow-700 dark:text-yellow-400 font-medium">⚠️ {t('settings.subscriptionCancelAtEnd')}</p>
                )}
              </div>
            </div>
            {subscriptionStatus.subscription.status === 'active' && !subscriptionStatus.subscription.cancelAtPeriodEnd && (
              <button
                onClick={onCancelSubscription}
                disabled={loadingSubscription}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loadingSubscription ? t('settings.processing') : t('settings.cancelSubscription')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">{t('settings.paymentHistory')}</h4>
        {paymentHistory.length > 0 ? (
          <div className="space-y-3">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{payment.licenseType}</span>
                    {payment.isRecurring && <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded">{t('settings.recurring')}</span>}
                    <span className={`px-2 py-0.5 text-xs rounded capitalize ${
                      payment.status === 'completed' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' :
                      payment.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' :
                      payment.status === 'failed' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {payment.status === 'completed' ? t('settings.statusCompleted') : payment.status === 'pending' ? t('settings.statusPending') : payment.status === 'failed' ? t('settings.statusFailed') : payment.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{payment.currency} ${payment.amount}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.noPaymentHistoryAvailable')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {availableLicenses.monthly && (
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('settings.monthlySubscription')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('settings.recurringMonthlyDescription')}</p>
            <button onClick={() => onPurchase('monthly')} disabled={billingLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full">
              {billingLoading ? t('settings.processing') : t('settings.subscribeMonthly')}
            </button>
          </div>
        )}
        {availableLicenses.quarterly && (
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('settings.quarterlySubscription')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('settings.quarterlyDescription')}</p>
            <button onClick={() => onPurchase('quarterly')} disabled={billingLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 w-full">
              {billingLoading ? t('settings.processing') : t('settings.subscribeQuarterly')}
            </button>
          </div>
        )}
        {availableLicenses.lifetime && (
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('settings.lifetimeLicense')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('settings.oneTimePaymentDescription')}</p>
            <button onClick={() => onPurchase('lifetime')} disabled={billingLoading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 w-full">
              {billingLoading ? t('settings.processing') : t('settings.purchaseLifetime')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
