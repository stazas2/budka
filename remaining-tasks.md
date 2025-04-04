# Remaining Refactoring Tasks

## Phase 1: File Structure and Path Updates

### HTML Path Updates

1. In `src/windows/photobooth/photobooth.html`:

   - Replace absolute paths (`file:///D:/budka/src/renderer/assets/icons/...`) with relative paths (`../../renderer/assets/icons/...`) for:
     - man.png
     - woman.png
     - boy.png
     - girl.png
     - group.png
     - qr-image.jpg

2. Check and update paths in other HTML files:
   - `src/windows/configurator/configurator.html`
   - `src/windows/launcher/launcher.html`

### JavaScript Path Updates

Verify and update any remaining `require()` paths in:

1. `src/windows/photobooth/photobooth.js`
2. `src/windows/configurator/configurator.js`
3. `src/windows/launcher/launcher.js`

## Phase 2: IPC Integration

1. Update all window scripts to use `IpcRendererService` instead of direct `ipcRenderer` calls:

   - `src/windows/photobooth/photobooth.js`
   - `src/windows/configurator/configurator.js`
   - `src/windows/launcher/launcher.js`

2. Complete implementation of `IpcMainHandlers.js`:
   - Add handlers for file system operations
   - Add handlers for configuration management
   - Add handlers for camera operations
   - Add handlers for image processing

## Phase 3: Configuration Service Integration

1. Remove any remaining direct file system operations for config management
2. Ensure all config access goes through `ConfigurationService`
3. Update all window scripts to use IPC for config operations

## Phase 4: Main Process Services

1. Complete `ImageSaveService.js` implementation for:
   - Saving captured images
   - Processing with sharp
   - Managing file paths
2. Move all remaining `fs` operations from renderer to main process:
   - File system access in launcher
   - Configuration file management
   - Image processing and saving

## Phase 5: Renderer Updates

1. Update component usage:

   - Implement `NotificationManager` for all alerts/notifications
   - Use `ModalManager` for QR code and other modals
   - Integrate `WebcamService` for camera handling
   - Use `CanonCameraService` for DSLR operations
   - Implement `LocalizationService` for translations
   - Use `ThemeService` for theme switching

2. Remove prohibited Node.js APIs from renderer:
   - Remove `fs` requires
   - Remove `path` requires
   - Remove `sharp` requires
   - Replace with appropriate IPC calls

## Recommended Next Steps

1. Switch to Code mode to update HTML file paths
2. Complete IPC handler implementations
3. Move file system operations to main process
4. Update renderer scripts to use new services

## Testing

After each major change:

1. Verify application startup
2. Test window navigation
3. Test photo capture (both webcam and Canon)
4. Verify file saving and processing
5. Test configuration changes
6. Check language switching
7. Verify theme switching
8. Test QR code generation
