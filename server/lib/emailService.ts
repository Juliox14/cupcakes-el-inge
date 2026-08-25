import nodemailer from 'nodemailer'
import * as fs from 'fs'
import * as path from 'path'

// Función para garantizar la lectura de .env en Vite dev server y Node
function getEnvConfig() {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  try {
    const envPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8')
      content.split('\n').forEach((line: string) => {
        const clean = line.trim()
        if (clean && !clean.startsWith('#') && clean.includes('=')) {
          const idx = clean.indexOf('=')
          const key = clean.slice(0, idx).trim()
          const val = clean.slice(idx + 1).trim()
          if (!env[key]) env[key] = val
        }
      })
    }
  } catch (err) {
    console.error('Error cargando .env en emailService:', err)
  }
  return env
}

function getMailTransporter() {
  const env = getEnvConfig()
  const gmailUser = env.GMAIL_USER || process.env.GMAIL_USER || ''
  const gmailPass = env.GMAIL_PASSWORD || env.GMAIL_APP_PASS || env.GMAIL_PASS || process.env.GMAIL_PASSWORD || process.env.GMAIL_APP_PASS || ''

  if (!gmailUser || !gmailPass) {
    console.error('Configuración de Gmail faltante en variables de entorno (GMAIL_USER / GMAIL_PASSWORD).')
    throw new Error('El servicio de envío de correos no está configurado en el servidor.')
  }

  return {
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    }),
    gmailUser
  }
}

/**
 * Enviar correo de recuperación de contraseña con código de 6 dígitos
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  code: string,
  userName: string = 'Cliente'
): Promise<boolean> {
  const { transporter, gmailUser } = getMailTransporter()

  const firstName = userName.split(' ')[0] || 'Cliente'

  const logoPath = path.resolve(process.cwd(), 'public/letras.png')
  const hasLogo = fs.existsSync(logoPath)

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperación de Contraseña - Cupcakes El Inge</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #FFF9F2; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1E1E24;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #FFF9F2; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #FFFFFF; border-radius: 28px; overflow: hidden; box-shadow: 0 10px 30px rgba(245, 107, 42, 0.08); border: 1px solid #FFE4D0;">
              <!-- ENCABEZADO CON BRANDING Y LOGO -->
              <tr>
                <td align="center" style="padding: 35px 30px 20px 30px; background: linear-gradient(180deg, #FFF5EB 0%, #FFFFFF 100%);">
                  ${
                    hasLogo
                      ? `<div style="margin-bottom: 12px;">
                           <img src="cid:cupcakes_logo_letras" alt="Cupcakes El Inge" style="max-width: 220px; height: auto; display: inline-block; object-fit: contain;" />
                         </div>`
                      : `<div style="width: 64px; height: 64px; background-color: #FFF0E6; border-radius: 20px; display: inline-block; line-height: 64px; text-align: center; font-size: 32px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); border: 2px solid #FED7AA; margin-bottom: 8px;">
                           🧁
                         </div>`
                  }
                  <h1 style="margin: 8px 0 4px 0; color: #0A2540; font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">
                    Cupcakes de Zanahoria El Inge
                  </h1>
                  <p style="margin: 0; color: #F56B2A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    Club de Lealtad & Recompensas
                  </p>
                </td>
              </tr>

              <!-- CONTENIDO PRINCIPAL -->
              <tr>
                <td style="padding: 10px 35px 30px 35px; text-align: center;">
                  <h2 style="margin: 0 0 12px 0; color: #1E1E24; font-size: 18px; font-weight: 800;">
                    Recuperación de Contraseña 🔐
                  </h2>
                  <p style="margin: 0 0 25px 0; color: #64748B; font-size: 13px; line-height: 1.6;">
                    Hola <strong>${firstName}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente código de verificación de 6 dígitos:
                  </p>

                  <!-- RECUADRO DEL CÓDIGO -->
                  <div style="background-color: #FFF5EB; border: 2px dashed #F56B2A; border-radius: 18px; padding: 20px 15px; margin: 0 auto 25px auto; max-width: 320px;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #F56B2A; display: block;">
                      ${code}
                    </span>
                    <span style="display: block; margin-top: 6px; font-size: 11px; font-weight: 700; color: #9A3412;">
                      ⏳ Válido durante los próximos 10 minutos
                    </span>
                  </div>

                  <p style="margin: 0 0 20px 0; color: #64748B; font-size: 12px; line-height: 1.5;">
                    Ingresa este código en la aplicación junto con tu nueva contraseña para recuperar el acceso a tu tarjeta de sellos y cupones.
                  </p>

                  <!-- AVISO DE SEGURIDAD -->
                  <div style="background-color: #F8FAFC; border-radius: 12px; padding: 12px; border: 1px solid #E2E8F0; text-align: left;">
                    <p style="margin: 0; color: #94A3B8; font-size: 11px; line-height: 1.4;">
                      🛡️ <strong>¿No solicitaste este cambio?</strong> Puedes ignorar este correo de forma segura. Tu contraseña actual seguirá protegida.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- PIE DE PÁGINA -->
              <tr>
                <td style="padding: 20px 30px; background-color: #FAF5F0; border-top: 1px solid #F1E5D8; text-align: center;">
                  <p style="margin: 0; color: #94A3B8; font-size: 11px;">
                    Tuxtla Gutiérrez, Chiapas • Cupcakes de Zanahoria Artesanales
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  const attachments: Array<{ filename: string; path: string; cid: string }> = []
  if (hasLogo) {
    attachments.push({
      filename: 'letras.png',
      path: logoPath,
      cid: 'cupcakes_logo_letras',
    })
  }

  await transporter.sendMail({
    from: `"Cupcakes El Inge" <${gmailUser}>`,
    to: toEmail,
    subject: `Tu código de verificación: ${code} - Cupcakes El Inge`,
    text: `Hola ${firstName},\n\nTu código de verificación para restablecer tu contraseña en Cupcakes El Inge es: ${code}\n\nEste código tiene una vigencia de 10 minutos.\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.\n\nCupcakes de Zanahoria El Inge`,
    html: htmlContent,
    attachments,
  })

  return true
}

/**
 * Enviar correo de bienvenida a nuevos usuarios registrados
 */
export async function sendWelcomeEmail(
  toEmail: string,
  userName: string = 'Cliente'
): Promise<boolean> {
  const { transporter, gmailUser } = getMailTransporter()

  const firstName = userName.split(' ')[0] || 'Cliente'

  const logoPath = path.resolve(process.cwd(), 'public/letras.png')
  const hasLogo = fs.existsSync(logoPath)

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Bienvenido a Cupcakes El Inge!</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #FFF9F2; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1E1E24;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #FFF9F2; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 28px; overflow: hidden; box-shadow: 0 10px 30px rgba(245, 107, 42, 0.08); border: 1px solid #FFE4D0;">
              <!-- ENCABEZADO CON BRANDING Y LOGO -->
              <tr>
                <td align="center" style="padding: 35px 30px 20px 30px; background: linear-gradient(180deg, #FFF5EB 0%, #FFFFFF 100%);">
                  ${
                    hasLogo
                      ? `<div style="margin-bottom: 12px;">
                           <img src="cid:cupcakes_logo_letras" alt="Cupcakes El Inge" style="max-width: 220px; height: auto; display: inline-block; object-fit: contain;" />
                         </div>`
                      : `<div style="width: 64px; height: 64px; background-color: #FFF0E6; border-radius: 20px; display: inline-block; line-height: 64px; text-align: center; font-size: 32px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); border: 2px solid #FED7AA; margin-bottom: 8px;">
                           🧁
                         </div>`
                  }
                  <h1 style="margin: 8px 0 4px 0; color: #0A2540; font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">
                    Cupcakes de Zanahoria El Inge
                  </h1>
                  <p style="margin: 0; color: #F56B2A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    Club de Lealtad & Recompensas
                  </p>
                </td>
              </tr>

              <!-- CONTENIDO PRINCIPAL -->
              <tr>
                <td style="padding: 10px 35px 30px 35px; text-align: center;">
                  <h2 style="margin: 0 0 12px 0; color: #1E1E24; font-size: 20px; font-weight: 900;">
                    ¡Hola ${firstName}, bienvenido a la familia! 🥕✨
                  </h2>
                  <p style="margin: 0 0 22px 0; color: #64748B; font-size: 13px; line-height: 1.6;">
                    Tu cuenta ha sido creada exitosamente. A partir de ahora podrás disfrutar de todos los beneficios exclusivos de nuestro club de lealtad:
                  </p>

                  <!-- TARJETAS DE BENEFICIOS -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px; text-align: left;">
                    <tr>
                      <td style="padding: 14px; background-color: #FFF5EB; border-radius: 16px; border: 1px solid #FED7AA;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td width="40" valign="top" style="font-size: 24px; text-align: center;">
                              🎁
                            </td>
                            <td style="padding-left: 10px;">
                              <strong style="color: #9A3412; font-size: 13px; display: block;">1 Tiro de Bienvenida a la Ruleta</strong>
                              <span style="color: #7C2D12; font-size: 11px; line-height: 1.4; display: block;">
                                En tu primera compra en mostrador se desbloqueará tu tiro de regalo para ganar cupcakes gratis y descuentos.
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr><td height="10"></td></tr>
                    <tr>
                      <td style="padding: 14px; background-color: #F8FAFC; border-radius: 16px; border: 1px solid #E2E8F0;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td width="40" valign="top" style="font-size: 24px; text-align: center;">
                              📱
                            </td>
                            <td style="padding-left: 10px;">
                              <strong style="color: #0A2540; font-size: 13px; display: block;">Tu Código QR de Cliente Único</strong>
                              <span style="color: #64748B; font-size: 11px; line-height: 1.4; display: block;">
                                Muéstralo en caja cada vez que compres para acumular sellos digitales y desbloquear más tiradas en la ruleta.
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr><td height="10"></td></tr>
                    <tr>
                      <td style="padding: 14px; background-color: #F8FAFC; border-radius: 16px; border: 1px solid #E2E8F0;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td width="40" valign="top" style="font-size: 24px; text-align: center;">
                              ⭐
                            </td>
                            <td style="padding-left: 10px;">
                              <strong style="color: #0A2540; font-size: 13px; display: block;">Recompensa Semanal</strong>
                              <span style="color: #64748B; font-size: 11px; line-height: 1.4; display: block;">
                                Reclama 1 tiro extra cada semana en tu Cartera Digital para seguir ganando.
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- BOTÓN DE LLAMADA A LA ACCIÓN -->
                  <div style="margin-bottom: 22px;">
                    <a href="https://cupcakes-el-inge.vercel.app/" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #F56B2A 0%, #EA580C 100%); color: #FFFFFF; text-decoration: none; font-weight: 800; font-size: 13px; padding: 14px 28px; border-radius: 50px; box-shadow: 0 4px 15px rgba(245, 107, 42, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">
                      Ir a mi Cartera Digital 🧁
                    </a>
                  </div>

                  <p style="margin: 0; color: #94A3B8; font-size: 11px; line-height: 1.5;">
                    ¡Esperamos verte pronto en nuestro mostrador para consentirte con los mejores cupcakes de zanahoria!
                  </p>
                </td>
              </tr>

              <!-- PIE DE PÁGINA -->
              <tr>
                <td style="padding: 20px 30px; background-color: #FAF5F0; border-top: 1px solid #F1E5D8; text-align: center;">
                  <p style="margin: 0; color: #94A3B8; font-size: 11px;">
                    Tuxtla Gutiérrez, Chiapas • Cupcakes de Zanahoria Artesanales
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  const attachments: Array<{ filename: string; path: string; cid: string }> = []
  if (hasLogo) {
    attachments.push({
      filename: 'letras.png',
      path: logoPath,
      cid: 'cupcakes_logo_letras',
    })
  }

  await transporter.sendMail({
    from: `"Cupcakes El Inge" <${gmailUser}>`,
    to: toEmail,
    subject: `¡Bienvenido al Club de Lealtad! 🧁✨ - Cupcakes El Inge`,
    text: `¡Hola ${firstName}!\n\nBienvenido a Cupcakes de Zanahoria El Inge.\n\nTu cuenta ha sido creada exitosamente. Recuerda que en tu primera compra en mostrador recibirás 1 tiro de bienvenida a la ruleta para ganar premios deliciosos.\n\nVisítanos en: https://cupcakes-el-inge.vercel.app/\n\nCupcakes de Zanahoria El Inge`,
    html: htmlContent,
    attachments,
  })

  return true
}

