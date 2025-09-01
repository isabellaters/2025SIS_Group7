# Live Lecture Desktop App

A modern desktop application built with React frontend and Node.js backend, featuring real-time communication, AI integration, and subtitle synchronization.

## Tech Stack

### Frontend
- **React.js** - Modern UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.io Client** - Real-time communication
- **Apollo Client** - GraphQL client

### Backend
- **Node.js** - Runtime environment
- **TypeScript** - Type safety
- **Express.js** - Web framework
- **GraphQL** - API query language
- **Socket.io** - WebSocket implementation
- **Firebase Admin SDK** - Database and authentication
- **Google AI Studio** - AI integration

### Infrastructure
- **Firebase** - Database and authentication
- **AWS/GCP/Azure** - Cloud hosting and managed services
- **WebVTT/SRT** - Subtitle format support

### Desktop Application
- **Electron** - Cross-platform desktop app framework
- **electron-builder** - Application packaging and distribution
- **Native Menus** - Platform-specific application menus
- **Secure IPC** - Inter-process communication with context isolation

## Project Structure

```
LiveLecture/
├── frontend/          # React application
├── backend/           # Node.js API server
├── electron/          # Electron desktop app configuration
├── shared/            # Shared types and utilities
├── docs/              # Documentation
└── deployment/        # Deployment configurations
```

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project setup
- Google AI Studio API key

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Environment Setup:**
   ```bash
   # Copy environment templates
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Configure environment variables:**
   - Add Firebase configuration
   - Add Google AI Studio API key
   - Configure database URLs

4. **Start development servers:**
   ```bash
   npm run dev
   ```

## Development

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend Development
```bash
cd backend
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript
npm run start        # Start production server
```

### Desktop Application Development
```bash
# Start all services including Electron
npm run dev

# Build for production
npm run build

# Create distributable packages
npm run dist         # All platforms
npm run dist:win     # Windows only
npm run dist:mac     # macOS only
npm run dist:linux   # Linux only
```

For detailed Electron setup and usage, see [electron/README.md](electron/README.md).

## Features

- **Real-time Communication** - WebSocket-based live updates
- **AI Integration** - Google AI Studio for intelligent features
- **Subtitle Synchronization** - WebVTT/SRT support with real-time sync
- **GraphQL API** - Efficient data fetching and mutations
- **Firebase Integration** - Authentication and real-time database
- **TypeScript** - Full type safety across the stack
- **Modern UI** - Responsive design with Tailwind CSS
- **Desktop Application** - Cross-platform Electron app with native menus
- **Secure Architecture** - Context isolation and secure IPC communication

## Deployment

### Frontend Deployment
- Build optimized production bundle
- Deploy to AWS S3, GCP Cloud Storage, or Azure Blob Storage
- Configure CDN for global distribution

### Backend Deployment
- Containerize with Docker
- Deploy to AWS ECS, GCP Cloud Run, or Azure Container Instances
- Configure auto-scaling and load balancing

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3001
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
GOOGLE_AI_API_KEY=your-google-ai-key
DATABASE_URL=your-database-url
JWT_SECRET=your-jwt-secret
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
