# Testing Checklist for Photobooth Electron App

## 1. Application Startup

- [ ] App launches without errors
- [ ] Launcher window appears
- [ ] No console errors in main or renderer

## 2. Event Folder Management

- [ ] Create new event folder via launcher
- [ ] List existing event folders
- [ ] Select event folder updates config
- [ ] Delete event folder removes it from list

## 3. Configuration Management

- [ ] Global config loads correctly
- [ ] Event-specific config overrides global
- [ ] Save event config persists changes
- [ ] Save global config persists changes
- [ ] Config interpolation resolves paths

## 4. IPC Communication

- [ ] Renderer can request current config
- [ ] Renderer can save event config
- [ ] Renderer can trigger print
- [ ] Renderer receives config updates
- [ ] Renderer receives camera status updates

## 5. Window Management

- [ ] Open photobooth window from launcher
- [ ] Open configurator window from launcher
- [ ] Switch between windows
- [ ] Reload windows on event change
- [ ] Close all windows exits app

## 6. Camera Integration

- [ ] PC webcam starts and stops correctly
- [ ] Canon camera connects and disconnects
- [ ] Capture photo from PC webcam
- [ ] Capture photo from Canon camera
- [ ] Live view works for both cameras

## 7. Printing

- [ ] Print photo from photobooth window
- [ ] Select printer from list
- [ ] Print orientation matches config
- [ ] Borders applied if enabled
- [ ] Print completes without errors

## 8. UI Components

- [ ] Notifications display and dismiss
- [ ] Modals open and close
- [ ] File picker works
- [ ] Gradient editor updates preview
- [ ] Countdown timer counts down
- [ ] Tab switcher changes tabs

## 9. Theming & Localization

- [ ] Switch between light and dark themes
- [ ] Change language updates UI text
- [ ] Translations load correctly

## 10. Performance & Monitoring

- [ ] CPU and memory usage within expected range
- [ ] No memory leaks on repeated actions
- [ ] Process monitor logs system info

## 11. Build & Distribution

- [ ] App builds successfully with `npm run build`
- [ ] Installer runs and installs app
- [ ] App runs from installed location
- [ ] All resources included in build

---

## Notes

- Log any errors or unexpected behavior
- Attach screenshots or logs for issues
- Update checklist as new features are added
