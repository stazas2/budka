# PhotoBooth Application

## Project Structure

```
src/
├── main/
│   ├── services/
│   │   ├── ConfigurationService.js   # Handles all config management
│   │   ├── IpcMainHandlers.js        # Centralizes IPC communication
│   │   └── PrintService.js           # Handles photo printing
│   ├── utils/
│   │   └── FileSystemUtils.js        # File system operations
│   └── main.js                       # Main electron process
├── renderer/
│   ├── components/
│   │   ├── Notification/             # Notification system
│   │   ├── Modal/                    # Modal dialogs
│   │   ├── FilePicker/              # File selection component
│   │   └── GradientEditor/          # Gradient customization
│   ├── services/
│   │   ├── IpcRendererService.js     # Renderer IPC communication
│   │   ├── WebcamService.js          # PC camera handling
│   │   ├── CanonCameraService.js     # Canon camera integration
│   │   └── LocalizationService.js    # Multi-language support
│   ├── assets/
│   │   ├── css/                      # Stylesheets
│   │   ├── fonts/                    # Custom fonts
│   │   └── icons/                    # Images and icons
│   └── utils/
│       ├── datepicker.js             # Date selection utility
│       └── saveUtils.js              # Save/load helpers
├── shared/
│   ├── constants/
│   │   └── IpcChannels.js            # IPC channel definitions
│   └── utils/                        # Shared utilities
└── windows/
    ├── launcher/                     # Event selection window
    ├── configurator/                 # Settings configuration
    └── photobooth/                   # Main photobooth window
```

## Setup Instructions

1. Install Dependencies:

```bash
npm install
```

2. Development Mode:

```bash
npm start
```

3. Build Application:

```bash
npm run build
```

## Configuration

### Global Configuration

- Located at `config.json` in the root directory
- Contains default settings for the application

### Event Configuration

- Each event folder can contain its own `config.json`
- Event config overrides global config
- Supports path interpolation using `{{basePath}}`

## Features

- Multiple camera support (PC webcam and Canon cameras)
- Custom photo styles and effects
- Multi-language support (Russian and Kazakh)
- Configurable themes and branding
- Print capability with custom paper sizes
- QR code generation for photo sharing

## Development Guidelines

1. IPC Communication:

   - Use constants from `IpcChannels.js`
   - Handle all main process IPC in `IpcMainHandlers.js`
   - Use `IpcRendererService.js` in renderer processes

2. Configuration:

   - Use `ConfigurationService.js` for all config operations
   - Support both global and event-specific configs
   - Validate all config values before use

3. UI Components:

   - Use shared components from `renderer/components`
   - Follow the established styling patterns
   - Support both light and dark themes

4. File Organization:
   - Keep window-specific code in respective window folders
   - Share common utilities through `shared/` directory
   - Place all assets in appropriate asset folders

## Building and Distribution

1. Prerequisites:

   - Node.js 16+
   - npm or yarn
   - Windows (for Canon camera support)

2. Build Configuration:

   - Edit `package.json` build settings if needed
   - Configure installer options in `build/installer.nsh`

3. Create Distribution:

```bash
npm run build
```

## Troubleshooting

1. Camera Issues:

   - Check camera mode in configuration
   - Verify Canon SDK installation for Canon cameras
   - Check USB connections and permissions

2. Configuration Issues:

   - Validate JSON syntax in config files
   - Check file paths and permissions
   - Verify basePath interpolation

3. Printing Issues:
   - Verify printer installation and connectivity
   - Check paper size configuration
   - Validate print orientation settings

## License

MIT License - See LICENSE file for details
