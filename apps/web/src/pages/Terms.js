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
            <h2 className="text-xl font-semibold mt-6 mb-2">1. Aceptación de los términos</h2>
            <p>
              Al acceder y utilizar Streamer Scheduler (&quot;el Servicio&quot;), aceptas quedar vinculado por los presentes
              Términos y condiciones. Si no estás de acuerdo con cualquiera de sus disposiciones, debes abstenerte de
              utilizar el Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">2. Propiedad intelectual e industrial</h2>
            <p>
              Todos los contenidos, funcionalidades y elementos del Servicio, incluyendo de forma enunciativa y no
              limitativa textos, diseños, código, logotipos, imágenes, bases de datos y software, son titularidad
              exclusiva de Christian David Villar Colodro o de terceros autorizantes, y están protegidos por la normativa
              aplicable en materia de propiedad intelectual e industrial.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">3. Usos prohibidos</h2>
            <p>Queda prohibido, entre otros supuestos:</p>
            <ul className="list-disc pl-6 my-2 space-y-1">
              <li>Copiar, reproducir, distribuir o comunicar públicamente el Servicio sin autorización.</li>
              <li>Modificar, adaptar o crear obras derivadas sin autorización expresa.</li>
              <li>Descompilar, realizar ingeniería inversa o intentar acceder al código fuente.</li>
              <li>Suprimir avisos de propiedad intelectual, marcas o derechos de autor.</li>
              <li>Usar el Servicio para fines ilícitos, fraudulentos o no autorizados.</li>
              <li>Intentar acceder sin autorización a sistemas, cuentas o datos de terceros.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">4. Cuentas de usuario</h2>
            <ul className="list-disc pl-6 my-2 space-y-1">
              <li>Eres responsable de mantener la confidencialidad de tus credenciales de acceso.</li>
              <li>Asumes la responsabilidad por toda actividad realizada desde tu cuenta.</li>
              <li>Debes notificar de inmediato cualquier acceso no autorizado o incidente de seguridad.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">5. Licencias y suscripciones</h2>
            <ul className="list-disc pl-6 my-2 space-y-1">
              <li>Las licencias son personales e intransferibles, salvo pacto expreso en contrario.</li>
              <li>Cada licencia habilita su uso para una única cuenta de usuario.</li>
              <li>Se prohíbe expresamente compartir, ceder o revender licencias sin autorización.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">6. Suspensión y terminación</h2>
            <p>
              Nos reservamos el derecho a suspender o cancelar, temporal o definitivamente, el acceso al Servicio cuando
              se detecte incumplimiento de estos términos, uso abusivo o conductas que puedan perjudicar a otros usuarios,
              al titular o a terceros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">7. Exclusión de garantías</h2>
            <p>
              El Servicio se presta &quot;tal cual&quot; y &quot;según disponibilidad&quot;, sin garantías de ningún tipo, expresas o
              implícitas, incluyendo disponibilidad continua, adecuación a un fin concreto o ausencia total de errores.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">8. Limitación de responsabilidad</h2>
            <p>
              En la máxima medida permitida por la ley, Christian David Villar Colodro no será responsable por daños
              indirectos, incidentales, especiales, consecuenciales, lucro cesante o pérdida de datos derivados del uso o
              imposibilidad de uso del Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">9. Modificaciones y contacto</h2>
            <p>
              Nos reservamos el derecho a actualizar estos Términos y condiciones en cualquier momento. Para consultas
              legales o contractuales, puedes contactar en:{' '}
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
      <AppFooter className="mt-12 py-6 px-4 border-t border-accent-light dark:border-gray-700 bg-accent-subtle dark:bg-gray-900 text-center text-gray-500 dark:text-gray-400 text-sm" />
    </div>
  );
}
