import { auth } from "@/lib/firebase";

const DEVICE_KEY_STORAGE = "filmflix_device_key";

function createDeviceKey(): string {
  return `guest-${crypto.randomUUID()}`;
}

export function getDeviceKey(): string {
  const saved = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (saved) {
    return saved;
  }

  const next = createDeviceKey();
  localStorage.setItem(DEVICE_KEY_STORAGE, next);
  return next;
}

export function getAppUserKey(): string {
  const currentUser = auth.currentUser;
  if (currentUser?.uid) {
    return `firebase:${currentUser.uid}`;
  }

  return getDeviceKey();
}
