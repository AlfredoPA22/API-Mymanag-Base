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

   **Opcional (para personalizar el remitente):**
   ```env
   EMAIL_FROM=Inventasys <noreply@tudominio.com>
   ```
   
   Si no configuras `EMAIL_FROM`, se usará el dominio de prueba de Resend: `onboarding@resend.dev`

4. **Configura un dominio (opcional pero recomendado)**
   - En el dashboard de Resend, puedes configurar tu propio dominio
   - Esto mejora la deliverability de los correos
   - Una vez configurado, actualiza `EMAIL_FROM` con tu dominio

### Notas importantes:

- **Render/Vercel/Fly.io**: Resend funciona perfectamente en estos entornos sin problemas de puertos bloqueados
- **Desarrollo local**: Resend también funciona en local, solo necesitas la API Key
- **Dominio de prueba**: Puedes usar `onboarding@resend.dev` para pruebas sin configurar un dominio propio
