let orientationGranted = false;

export async function requestOrientationPermission(): Promise<boolean> {
  if (typeof DeviceOrientationEvent === 'undefined') return false;

  const orientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<PermissionState>;
  };

  if (typeof orientationEvent.requestPermission === 'function') {
    const permission = await orientationEvent.requestPermission();
    orientationGranted = permission === 'granted';
    return orientationGranted;
  }

  orientationGranted = true;
  return true;
}

export function hasOrientationPermission(): boolean {
  return orientationGranted;
}
