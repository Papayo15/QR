# QR Access Backend (Render Ready)

## Deploy en Render
1. Entra a https://render.com y crea un nuevo **Web Service**.
2. Conecta este repo de GitHub con Render.
3. Añade estas variables de entorno en "Environment":
   - PORT=10000
   - JWT_SECRET=una_clave_segura
   - GOOGLE_SHEET_ID=1QL2qJDxIjjhmzVglokjFN1wl15OC0oIVis9KcxdRqeo
   - GOOGLE_CREDS_BASE64=(contenido de tu credentials.json convertido a base64)
4. Guarda → Render redeploya.
5. Prueba tu API en la URL pública que Render te dé.
