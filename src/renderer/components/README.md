# Component Directory Structure

This directory contains reusable UI components used across the application.

## Components

### Notification

Location: `/Notification`

- Displays toast notifications and alerts
- Supports multiple notification types (success, error, warning, info)
- Automatically stacks multiple notifications

### Modal

Location: `/Modal`

- Generic modal dialog component
- Supports custom content and actions
- Handles backdrop clicks and keyboard events

### FilePicker

Location: `/FilePicker`

- File selection dialog wrapper
- Supports single/multiple file selection
- Handles file type filtering and validation

### GradientEditor

Location: `/GradientEditor`

- Interactive gradient customization tool
- Supports multiple color stops
- Provides live preview of gradient changes

### Countdown

Location: `/Countdown`

- Configurable countdown timer
- Supports custom styling and animations
- Emits events for countdown milestones

### TabSwitcher

Location: `/TabSwitcher`

- Tab-based navigation component
- Supports dynamic tab content
- Handles tab state management

## Usage Guidelines

1. Component Structure:

   - Each component should have its own directory
   - Include separate files for JS, CSS, and documentation
   - Use consistent naming conventions

2. File Organization:

   ```
   ComponentName/
   ├── index.js          # Main component file
   ├── styles.css        # Component-specific styles
   ├── README.md         # Component documentation
   └── utils/            # Component-specific utilities
   ```

3. Documentation:

   - Document all props and events
   - Include usage examples
   - List any dependencies
   - Explain customization options

4. Best Practices:
   - Keep components focused and single-purpose
   - Make components configurable via props
   - Handle errors gracefully
   - Include proper TypeScript types (if using TS)
   - Write unit tests for complex logic
