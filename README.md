# Beit El Jabal

This project is a modern, responsive Vite-based website for Beit El Jabal.

## Development

1. Run `npm install` to install dependencies.
2. Run `npm run dev` to start the local development server.

## Production Build

To build the website for production deployment:

```bash
npm run build
npm run preview
```

The compiled production code will be located in the `dist` folder. This is the folder you should upload or deploy to your server (e.g. `https://beit-el-jabal.arzware.net/`).

## Environment Variables

For the booking system and Google Calendar integration to function properly, you need to set up your `.env` file (which should never be committed to Git). Use `.env.example` as a template.

Create a `.env` file in the root folder with the following variables:

- `VITE_GOOGLE_CALENDAR_ID`: The public ID of your Google Calendar where bookings are managed.
- `VITE_GOOGLE_CALENDAR_API_KEY`: Your browser-restricted API key from Google Cloud Console.
- `VITE_WHATSAPP_NUMBER`: The business WhatsApp number (with country code, e.g., 96181801907).
- `VITE_BOOKING_WEBHOOK_URL`: The URL of your deployed Google Apps Script Web App for creating pending bookings.

### Deployment Notes

- **API Key Security**: Ensure your Google Calendar API Key restricts usage to your exact production domain (e.g., `https://beit-el-jabal.arzware.net/*`) and `http://localhost:5173/*` in the Google Cloud Console.
- **Webhook Access**: When deploying the Google Apps Script Web App for your `VITE_BOOKING_WEBHOOK_URL`, it must be deployed with:
  - **Execute as**: Me
  - **Who has access**: Anyone
