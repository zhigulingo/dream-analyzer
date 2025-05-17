# Dream Analyzer Web App

A web interface for the Dream Analyzer application with Telegram authentication.

## Features

- Telegram OAuth authentication for web users
- Dream analysis history viewing
- Deep dream analysis functionality
- Subscription management
- User profile management

## Development

This project uses Vue 3 with Vite, Pinia for state management, and Vue Router for navigation.

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_API_BASE_URL=your_api_url_here
```

## Deployment

This project is configured for deployment on Netlify. Connect your GitHub repository to Netlify and set the build settings:

- Build command: `npm run build`
- Publish directory: `dist`

Don't forget to add the environment variables in the Netlify dashboard. 