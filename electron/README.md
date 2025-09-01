# Electron Setup

This directory contains the Electron configuration for the Live Lecture desktop application.

## Files

- `main.js` - Main Electron process that creates the application window and handles app lifecycle
- `preload.js` - Preload script that provides secure APIs for the renderer process
- `README.md` - This documentation file

## Development

### Prerequisites

Make sure you have all dependencies installed:

```bash
npm run install:all
```

### Running in Development Mode

1. Start the development servers:
   ```bash
   npm run dev
   ```

   This will:
   - Start the backend server on port 3001
   - Start the frontend Vite dev server on port 5173
   - Launch the Electron app once the frontend is ready

### Building for Production

1. Build all components:
   ```bash
   npm run build
   ```

   This will:
   - Build the backend
   - Build the frontend
   - Package the Electron app

2. Create distributable packages:
   ```bash
   # For all platforms
   npm run dist
   
   # For specific platforms
   npm run dist:win    # Windows
   npm run dist:mac    # macOS
   npm run dist:linux  # Linux
   ```

## Features

### Menu System

The app includes a native menu with:
- **File**: New Lecture, Exit
- **Edit**: Standard edit operations (cut, copy, paste, etc.)
- **View**: Reload, DevTools, zoom controls, fullscreen
- **Window**: Minimize, close
- **Help**: About dialog

### Security

- Context isolation enabled
- Node integration disabled
- Remote module disabled
- External links open in default browser
- Secure IPC communication

### Cross-Platform Support

- Windows: NSIS installer
- macOS: DMG package
- Linux: AppImage

## API Usage

In your React components, you can use the Electron API:

```typescript
import { useElectron } from '@/hooks/useElectron';

function MyComponent() {
  const { isElectron, getAppVersion, onMenuNewLecture } = useElectron();

  useEffect(() => {
    if (isElectron) {
      // Handle menu events
      onMenuNewLecture(() => {
        console.log('New lecture requested from menu');
      });
    }
  }, [isElectron, onMenuNewLecture]);

  return (
    <div>
      {isElectron && <p>Running in Electron</p>}
    </div>
  );
}
```

## Configuration

The Electron app is configured in the root `package.json` under the `build` section. Key settings:

- `appId`: Unique identifier for the app
- `productName`: Display name of the app
- `directories.output`: Output directory for builds
- `files`: Files to include in the package
- `extraResources`: Additional resources to bundle

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3001 (backend) and 5173 (frontend) are available
2. **Build errors**: Ensure all dependencies are installed with `npm run install:all`
3. **Permission errors**: On macOS/Linux, you may need to grant permissions to the app

### Debug Mode

To run with additional debugging:

```bash
# Enable Electron debugging
DEBUG=electron* npm run dev

# Or set environment variable
set DEBUG=electron* && npm run dev  # Windows
DEBUG=electron* npm run dev         # macOS/Linux
```
