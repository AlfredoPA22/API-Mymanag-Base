# api-my-manag
Proyecto de administracion con seriales

## Configuración de Correo Electrónico

Este proyecto soporta dos métodos para enviar correos electrónicos:

### Opción 1: Resend (Recomendado para producción/serverless)

Resend es ideal para entornos serverless como Render, Vercel o Fly.io ya que no requiere conexiones SMTP.

**Pasos para configurar:**

1. Crea una cuenta en [Resend](https://resend.com) (gratis hasta 3,000 correos/mes)
2. Obtén tu API Key desde el dashboard
3. Configura un dominio (o usa el dominio de prueba)
4. Agrega las siguientes variables de entorno:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=Inventasys <noreply@tudominio.com>  # Opcional, usa el dominio configurado
```

**Nota:** El sistema detectará automáticamente si estás en un entorno serverless (Render/Vercel/Fly) y usará Resend si `RESEND_API_KEY` está configurada.

### Opción 2: Gmail SMTP (Para desarrollo local)

Para desarrollo local, puedes usar Gmail con SMTP:

1. Habilita la verificación en 2 pasos en tu cuenta de Google
2. Genera una "Contraseña de aplicación" desde [Google Account Security](https://myaccount.google.com/apppasswords)
3. Agrega las siguientes variables de entorno:

```env
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-contraseña-de-aplicación
```

**Importante:** Render bloquea los puertos SMTP en su plan gratuito, por lo que Gmail SMTP no funcionará en producción en Render. Usa Resend para producción.
