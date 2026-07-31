# Migration from 2.1.x to 3.0.x

This guide provides instructions for migration from **Mobile Token JS SDK** version `2.1.x` to version `3.0.x`.

## Pre-Approval Screen API

The singular `preApprovalScreen` property on `WMTUserOperationUIData` has been replaced by the plural `preApprovalScreens` array to support multi-screen pre-approval flows.

### Reading

```typescript
// Before (2.1.x)
const screen = operation.ui?.preApprovalScreen

// After (3.0.x)
const screens = operation.ui?.preApprovalScreens
const firstScreen = screens?.[0]
```

### Constructing

If you were constructing `WMTUserOperationUIData` manually, use `preApprovalScreens` (an array) instead:

```typescript
// Before (2.1.x)
const ui: WMTUserOperationUIData = {
  preApprovalScreen: myScreen,
}

// After (3.0.x)
const ui: WMTUserOperationUIData = {
  preApprovalScreens: [myScreen],
}
```

### Legacy Server Compatibility

If your server still sends the old singular `preApprovalScreen` payload, the SDK handles this automatically. The `WMTOperations` methods (`getOperations`, `getDetail`, `getHistory`, `claim`) call `normalizeOperation()` internally, which converts the legacy singular format to the new `preApprovalScreens` array.

## Pre-Approval Screen Model

The `WMTPreApprovalScreen` interface has been moved from `WMTUserOperationUIData` to its own module and has a new structure with support for elements and controls. The old `items` and `approvalType` fields are no longer part of the public model — they are converted automatically during legacy normalization.

### Old model (2.1.x)

```typescript
interface WMTPreApprovalScreen {
  type?: "INFO" | "WARNING" | "QR_SCAN" | "UNKNOWN"
  heading: string
  message: string
  items?: string[]
  approvalType?: "SLIDER" | "BUTTON"
}
```

### New model (3.0.x)

```typescript
interface WMTPreApprovalScreen {
  type?: WMTPreApprovalScreenType  // "INFO" | "WARNING" | "QR_SCAN" | "UNKNOWN"
  heading: string
  message: string
  id?: string
  backButton?: boolean
  image?: string
  elements?: WMTPreApprovalElement[]
  controls?: WMTPreApprovalControls
}
```

New supporting types are exported from the package: `WMTPreApprovalElement`, `WMTPreApprovalElementListItem`, `WMTPreApprovalElementAlert`, `WMTPreApprovalElementButton`, `WMTPreApprovalControls`, and related type aliases.

## Import Path

The import path for `WMTPreApprovalScreen` is unchanged — it is still exported from the package root. However, the type's shape has changed (new optional fields like `id`, `backButton`, `image`, `elements`, `controls`). All new supporting types (`WMTPreApprovalElement`, `WMTPreApprovalControls`, etc.) are also exported from the package root.