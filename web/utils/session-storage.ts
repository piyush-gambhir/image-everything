export const getSessionStorageData = <T>(key: string): T | null => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  const data = sessionStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Failed to parse value for sessionStorage key "${key}"`, error);
    return null;
  }
};

export const setSessionStorageData = <T>(key: string, data: T) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to set sessionStorage key "${key}"`, error);
  }
};
