# Student OS - TODO List

## Sync & Connectivity
- [ ] **Verification Needed:** Test the "Sync Queue" functionality. 
    - *Scenario:* Turn off VPN -> Create/Edit a note -> Wait 10s -> Turn on VPN -> Verify change appears on the Trailbase server and doesn't get overwritten by remote data.
- [ ] Improve reconnection responsiveness (currently set to 2s polling).

## Mobile Support (Android)
- [ ] **Research:** Verify if `std::fs` with `directories` crate works reliably on Android internal storage or if `tauri-plugin-fs` / `tauri-plugin-store` is required.
- [ ] Implement Android-specific permissions if needed for local storage.
- [ ] Test UI on small screen/touch interface.

## UI/UX Enhancements
- [ ] Add "Edit" and "Delete" actions to the Data Explorer cards.
- [ ] Improve search filtering (currently searches title, content, and type).
- [ ] Implement "Add" forms for all data types (Notes, Tasks, etc.).
