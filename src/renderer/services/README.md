# Renderer Services

This directory contains services used in the renderer process for managing various application functionalities.

## Services Overview

### IpcRendererService

Manages all IPC communication from renderer processes to the main process.

- Handles message sending and receiving
- Provides promise-based API for requests
- Manages subscription to IPC events

### WebcamService

Manages PC webcam integration.

- Camera initialization and cleanup
- Stream management
- Frame capture
- Error handling

### CanonCameraService

Manages Canon camera integration.

- Camera connection and disconnection
- Live view management
- Photo capture
- Settings control

### LocalizationService

Handles application internationalization.

- Language switching
- Text translation
- RTL/LTR support
- Date/time formatting

### ThemeService

Manages application theming.

- Theme switching
- Dynamic style updates
- CSS variable management
- Custom theme support

## Implementation Guidelines

1. Service Structure:

```javascript
class ServiceName {
  constructor() {
    // Initialize service
  }

  // Public API methods
  async methodName() {
    // Implementation
  }

  // Private helper methods
  #privateMethod() {
    // Implementation
  }

  // Event handlers
  handleEvent() {
    // Event handling
  }
}
```

2. Error Handling:

- Use try/catch blocks
- Provide meaningful error messages
- Include error recovery mechanisms
- Log errors appropriately

3. Event Management:

- Use event emitters for notifications
- Clean up event listeners
- Document event types
- Handle edge cases

4. State Management:

- Keep track of service state
- Provide state change notifications
- Handle initialization/cleanup
- Implement singleton pattern when needed

## Usage Example

```javascript
// Service initialization
const service = new ServiceName()

// Using the service
try {
  await service.methodName()
} catch (error) {
  console.error("Service error:", error)
}

// Event handling
service.on("eventName", (data) => {
  // Handle event
})

// Cleanup
service.dispose()
```

## Adding New Services

1. Create a new service file with class implementation
2. Document the service API and events
3. Add error handling and logging
4. Include usage examples in documentation
5. Update this README with service details

## Testing

Each service should include:

- Unit tests for core functionality
- Integration tests for external dependencies
- Mock implementations for testing
- Error condition testing
