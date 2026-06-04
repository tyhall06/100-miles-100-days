import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'

export default function Privacy() {
  const { lang } = useI18n()
  const es = lang === 'es'

  if (es) {
    return (
      <div className="bg-gray-50 min-h-screen py-12 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
          <div className="text-center mb-8">
            <span className="inline-block bg-[#F1B82D] text-black text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-4">
              Privacidad
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#000000]">
              Aviso de Privacidad
            </h1>
            <p className="text-gray-500 text-sm mt-2">Última actualización: junio 2026</p>
          </div>

          <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 space-y-6">
            <p className="text-lg text-[#000000] font-semibold">
              Este sitio está diseñado deliberadamente para recopilar la cantidad
              mínima posible de información. <strong>La base de datos del sitio web no
              almacena identificadores personales directos</strong> — ni nombres, ni
              correos electrónicos, ni datos de contacto.
            </p>

            <h2 className="text-xl font-bold text-[#000000] pt-4">Lo que almacena este sitio web</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Un código de 4 dígitos</strong> — asignado por el personal de MU Extension durante la inscripción. El código es lo que identifica tu actividad en este sitio; tu nombre y correo no se almacenan aquí.</li>
              <li><strong>Un nombre para mostrar elegido por ti</strong> — sin nombres reales, máximo 20 caracteres. Aparece en la clasificación.</li>
              <li><strong>Tu condado de Misuri</strong> — para estadísticas a nivel estatal.</li>
              <li><strong>Registros de actividad</strong> — fecha, tipo de actividad, millas y notas opcionales (máximo 200 caracteres) que tú ingresas.</li>
              <li><strong>Análisis agregados de recursos</strong> — cuántas veces se hace clic en cada artículo o podcast. Sin identificadores adjuntos.</li>
            </ul>

            <h2 className="text-xl font-bold text-[#000000] pt-4">Vínculo con tu inscripción</h2>
            <p>
              Tu código de 4 dígitos se asignó cuando te inscribiste a través del sistema de
              inscripción de MU Extension (PEARS). MU Extension conserva tus datos de
              inscripción — incluido el correo electrónico con el que te registraste — en ese
              sistema seguro e independiente, no en este sitio web. El personal autorizado de
              MU Extension puede asociar tu código con tu registro allí (por ejemplo, para
              enviarte recordatorios del desafío). Este sitio web nunca almacena ni muestra esa
              información, y cualquier dato exportado para investigación contiene solo tu
              código, nombre para mostrar, condado y actividad — sin identificadores directos.
            </p>

            <h2 className="text-xl font-bold text-[#000000] pt-4">Lo que NO almacena este sitio web</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>❌ Nombres reales</li>
              <li>❌ Direcciones de correo electrónico</li>
              <li>❌ Números de teléfono</li>
              <li>❌ Direcciones físicas</li>
              <li>❌ Fechas de nacimiento o edades</li>
              <li>❌ Direcciones IP o ubicación geográfica</li>
              <li>❌ Información médica o de salud más allá de la actividad registrada</li>
              <li>❌ Datos de tarjetas de crédito o pago — este sitio es completamente gratuito</li>
              <li>❌ Cookies de seguimiento o píxeles de redes sociales</li>
            </ul>

            <h2 className="text-xl font-bold text-[#000000] pt-4">Cómo usamos los datos</h2>
            <p>
              Los datos se usan únicamente para:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Mostrar tu progreso personal en la página Mi Progreso</li>
              <li>Construir la clasificación estatal y por condado</li>
              <li>Generar reportes agregados para MU Extension (totales, condados más activos)</li>
              <li>Moderar contenido enviado por la comunidad (fotos e historias)</li>
            </ul>
            <p>
              <strong>Nunca vendemos, compartimos ni transferimos tus datos</strong> a terceros.
            </p>

            <h2 className="text-xl font-bold text-[#000000] pt-4">Dónde se almacenan los datos</h2>
            <p>
              Los datos se almacenan en Supabase (una base de datos PostgreSQL alojada en
              servidores de EE. UU.). Todo el tráfico está cifrado mediante HTTPS.
            </p>

            <h2 className="text-xl font-bold text-[#000000] pt-4">Envíos de la comunidad</h2>
            <p>
              Las fotos e historias que envíes son revisadas por el personal de MU Extension
              antes de aparecer públicamente. Tu nombre para mostrar y condado <strong>NO se
              muestran</strong> en el muro público — las publicaciones aprobadas son completamente
              anónimas para otros usuarios.
            </p>

            <h2 className="text-xl font-bold text-[#000000] pt-4">Cookies y rastreo</h2>
            <p>
              No usamos cookies de rastreo, píxeles de Facebook, Google Analytics u otras
              herramientas de seguimiento. Usamos almacenamiento local del navegador
              (localStorage) solo para recordar tu código de 4 dígitos y preferencia de
              idioma en tu propio dispositivo.
            </p>

            <h2 className="text-xl font-bold text-[#000000] pt-4">Tus derechos</h2>
            <p>
              Puedes pedir que se elimine tu cuenta y todos los datos asociados en cualquier
              momento contactando a tu oficina local de MU Extension.
            </p>

            <h2 className="text-xl font-bold text-[#000000] pt-4">Contacto</h2>
            <p>
              Si tienes preguntas sobre privacidad o quieres ejercer tus derechos, contacta:{' '}
              <a href="mailto:extension@missouri.edu" className="text-[#1C5E90] font-semibold underline">
                extension@missouri.edu
              </a>
            </p>

            <div className="mt-10 pt-6 border-t border-gray-200 text-center">
              <Link to="/" className="text-[#1C5E90] font-semibold hover:underline">
                ← Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // English
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <div className="text-center mb-8">
          <span className="inline-block bg-[#F1B82D] text-black text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-4">
            Privacy
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#000000]">
            Privacy Statement
          </h1>
          <p className="text-gray-500 text-sm mt-2">Last updated: June 2026</p>
        </div>

        <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 space-y-6">
          <p className="text-lg text-[#000000] font-semibold">
            This site was deliberately designed to collect the minimum information
            possible. <strong>The website&rsquo;s database stores no direct personal
            identifiers</strong> — no names, email addresses, or contact details.
          </p>

          <h2 className="text-xl font-bold text-[#000000] pt-4">What this website stores</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>A 4-digit code</strong> — assigned to you by MU Extension staff during registration. The code is what identifies your activity on this site; your name and email are not stored here.</li>
            <li><strong>A display name you choose</strong> — no real names; max 20 characters. Shown on the leaderboard.</li>
            <li><strong>Your Missouri county</strong> — for statewide statistics.</li>
            <li><strong>Activity logs</strong> — date, activity type, miles, and optional notes (max 200 characters) that you enter yourself.</li>
            <li><strong>Aggregate resource analytics</strong> — how many times each article or podcast is clicked. No identifiers attached.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#000000] pt-4">Linking back to your registration</h2>
          <p>
            Your 4-digit code was assigned when you registered through MU Extension&rsquo;s
            registration system (PEARS). MU Extension keeps your registration details —
            including the email you signed up with — in that separate, secure system, not on
            this website. Authorized MU Extension staff can match your code to your
            registration record there (for example, to send you challenge reminders).
            This website never stores or displays that information, and any data exported for
            research contains only your code, display name, county, and activity — no direct
            identifiers.
          </p>

          <h2 className="text-xl font-bold text-[#000000] pt-4">What this website does NOT store</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>❌ Real names</li>
            <li>❌ Email addresses</li>
            <li>❌ Phone numbers</li>
            <li>❌ Physical addresses</li>
            <li>❌ Date of birth or age</li>
            <li>❌ IP addresses or geolocation</li>
            <li>❌ Medical or health information beyond logged activity</li>
            <li>❌ Credit card or payment information — the site is completely free</li>
            <li>❌ Tracking cookies or social media pixels</li>
          </ul>

          <h2 className="text-xl font-bold text-[#000000] pt-4">How we use the data</h2>
          <p>
            Data is used only to:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Display your personal progress on the My Progress page</li>
            <li>Build the statewide and county leaderboards</li>
            <li>Generate aggregate reports for MU Extension (totals, most active counties)</li>
            <li>Moderate community-submitted content (photos and stories)</li>
          </ul>
          <p>
            <strong>We never sell, share, or transfer your data</strong> to third parties.
          </p>

          <h2 className="text-xl font-bold text-[#000000] pt-4">Where data is stored</h2>
          <p>
            Data is stored in Supabase (a PostgreSQL database hosted on US-based servers).
            All traffic is encrypted via HTTPS.
          </p>

          <h2 className="text-xl font-bold text-[#000000] pt-4">Community submissions</h2>
          <p>
            Photos and stories you submit are reviewed by MU Extension staff before
            appearing publicly. Your display name and county are <strong>NOT shown</strong>{' '}
            on the public wall — approved submissions are completely anonymous to other
            users.
          </p>

          <h2 className="text-xl font-bold text-[#000000] pt-4">Cookies and tracking</h2>
          <p>
            We do not use tracking cookies, Facebook pixels, Google Analytics, or any
            other tracking tools. We use browser localStorage only to remember your
            4-digit code and language preference on your own device.
          </p>

          <h2 className="text-xl font-bold text-[#000000] pt-4">Your rights</h2>
          <p>
            You can request that your account and all associated data be deleted at any
            time by contacting your local MU Extension office.
          </p>

          <h2 className="text-xl font-bold text-[#000000] pt-4">Contact</h2>
          <p>
            For privacy questions or to exercise your rights, contact:{' '}
            <a href="mailto:extension@missouri.edu" className="text-[#1C5E90] font-semibold underline">
              extension@missouri.edu
            </a>
          </p>

          <div className="mt-10 pt-6 border-t border-gray-200 text-center">
            <Link to="/" className="text-[#1C5E90] font-semibold hover:underline">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
