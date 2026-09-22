# PRANASAKHA Mobile

This is the additive Expo/React Native scanner and virtual-ID app planned for the PRANASAKHA lifetime QR architecture.

## Current screens

- Existing PRANASAKHA `/api/login` credentials are used.
- Doctor/healthcare-volunteer accounts see a virtual ID with their lifetime QR and service history.
- Operational staff accounts see the QR scanner, checkpoint selector and manual code fallback.
- Authentication tokens are stored with `expo-secure-store`; non-sensitive offline queue state uses AsyncStorage.
- Scans are sent to `/api/passes/resolve` when online and queued locally when offline.

## Backend URL

Set `EXPO_PUBLIC_API_BASE_URL`, for example:

```text
EXPO_PUBLIC_API_BASE_URL=https://api.pranasakha.codeex.space/api
```

## Run

```bash
npx expo install
npx expo start
```

For an installable Android APK using EAS Build:

```bash
npx eas login
npm run eas:apk
```

The scanner uses `expo-camera`'s `CameraView` barcode scanner for QR codes. EAS Build provides cloud Android/iOS builds; the preview profile in this repository is configured as an APK for internal distribution.
