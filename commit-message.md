refactor: implement new project structure and core services

This commit implements Phase 1 of the application refactoring plan and begins Phase 2:

Phase 1 Completed:

- Create new src/ directory structure with main/, renderer/, shared/, windows/
- Move all files to their new locations with updated paths
- Implement core services (ConfigurationService, PrintService, FileSystemUtils)
- Set up documentation and component structure
- Update package.json with new paths and build configuration

Phase 2 Started:

- Create IpcChannels constants
- Implement IpcMainHandlers service
- Create IpcRendererService skeleton

Breaking Changes:

- Main entry point moved to src/main/main.js
- Configuration loading now handled by ConfigurationService
- IPC communication centralized through services
- All asset paths updated to new structure

Testing Required:

1. Application startup and window creation
2. Configuration loading and saving
3. Event folder selection and management
4. Photo capture and printing
5. Canon camera integration

Migration Notes:

- Update any direct requires to use new file paths
- Replace direct IPC calls with service methods
- Update asset references in HTML files
- Test all file operations with new utilities
