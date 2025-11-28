# api-my-manag
Proyecto de administracion con seriales

## Configuración de Correo Electrónico

Este proyecto usa **Resend** para el envío de correos electrónicos. Resend es ideal para entornos serverless como Render, Vercel o Fly.io ya que no requiere conexiones SMTP.

### Pasos para configurar:

1. **Crea una cuenta en [Resend](https://resend.com)**
   - Plan gratuito: 3,000 correos/mes
   - Sin necesidad de configurar SMTP

2. **Obtén tu API Key**
   - Ve al dashboard de Resend
   - Copia tu API Key (empieza con `re_`)

3. **Configura las variables de entorno**

   **Requerido:**
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```

   **IMPORTANTE - Requerido para producción:**
   ```env
   EMAIL_FROM=Inventasys <noreply@tudominio.com>
   ```
   
   ⚠️ **Nota sobre el dominio de prueba:**
   - Si usas `onboarding@resend.dev` (dominio de prueba), solo podrás enviar correos a la dirección de correo asociada con tu cuenta de Resend
   - Para enviar a cualquier destinatario, **debes verificar un dominio** en Resend

4. **Configura un dominio (REQUERIDO para producción)**
   
   **Pasos:**
   1. Ve a [resend.com/domains](https://resend.com/domains)
   2. Agrega y verifica tu dominio (sigue las instrucciones de DNS)
   3. Una vez verificado, configura la variable de entorno:
      ```env
      EMAIL_FROM=Inventasys <noreply@tudominio.com>
      ```
   
   **¿Por qué es necesario?**
   - El dominio de prueba (`onboarding@resend.dev`) solo permite enviar a tu propia dirección
   - Con un dominio verificado puedes enviar a cualquier destinatario
   - Mejora la deliverability y la reputación de tus correos

### Notas importantes:

- **Render/Vercel/Fly.io**: Resend funciona perfectamente en estos entornos sin problemas de puertos bloqueados
- **Desarrollo local**: Resend también funciona en local, solo necesitas la API Key
- **Dominio de prueba**: Puedes usar `onboarding@resend.dev` para pruebas sin configurar un dominio propio
