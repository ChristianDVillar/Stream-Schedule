/**
 * Public legal notice page.
 * Includes ownership, contact, and liability information.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import AppFooter from '../components/AppFooter';

export default function LegalNotice() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('legalNotice.backToApp') || 'Back to app'}
        </Link>

        <h1 className="text-3xl font-bold mb-2">{t('legalNotice.title') || 'Legal notice'}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">{t('legalNotice.lastUpdated') || 'Last updated: April 2026'}</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">1. Titular del sitio</h2>
            <p>
              Este sitio web y la aplicación Streamer Scheduler son propiedad de Christian David Villar Colodro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">2. Objeto</h2>
            <p>
              El presente aviso legal regula el acceso, navegación y uso de la plataforma Streamer Scheduler, así como
              las responsabilidades derivadas del uso de sus contenidos y servicios.
            </p>
            <p>
              La funcionalidad actual del Servicio incluye, entre otras: planificación y programación de contenido,
              publicación en plataformas conectadas, gestión de medios, integraciones mediante OAuth, herramientas para
              stream y paneles de administración/configuración.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">3. Condiciones de uso</h2>
            <p>
              El acceso y uso de esta web implica la aceptación de la normativa vigente y de las condiciones publicadas
              en la plataforma, incluyendo los Términos y condiciones y la Política de privacidad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">4. Propiedad intelectual</h2>
            <p>
              Todo el contenido de la web (textos, diseños, código fuente, logos, imágenes y demás elementos) está
              protegido por la legislación sobre propiedad intelectual e industrial. Queda prohibida su reproducción,
              distribución o modificación sin autorización expresa del titular.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">5. Responsabilidad</h2>
            <p>
              El titular no garantiza la disponibilidad continua del servicio ni la ausencia de errores técnicos, aunque
              se aplican medidas razonables para reducir incidencias y proteger la información. El uso de la plataforma
              se realiza bajo la responsabilidad del usuario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">6. Enlaces externos</h2>
            <p>
              Esta plataforma puede incluir enlaces a servicios de terceros. Streamer Scheduler no se responsabiliza del
              contenido, políticas ni prácticas de dichos sitios externos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">7. Legislación aplicable</h2>
            <p>
              Este aviso legal se rige por la legislación aplicable en materia civil, mercantil y de protección de
              datos. Para cualquier controversia, las partes se someten a los juzgados y tribunales que correspondan
              conforme a la ley.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">8. Contacto</h2>
            <p>
              Para consultas legales o administrativas: {' '}
              <a href="mailto:christiandvillar@gmail.com" className="text-primary-600 dark:text-primary-400 underline">christiandvillar@gmail.com</a>
            </p>
          </section>
        </div>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 mt-10 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('legalNotice.backToApp') || 'Back to app'}
        </Link>
      </div>
      <AppFooter className="mt-12 py-6 px-4 border-t border-accent-light dark:border-gray-700 bg-accent-subtle dark:bg-gray-900 text-center text-gray-500 dark:text-gray-400 text-sm" />
    </div>
  );
}
