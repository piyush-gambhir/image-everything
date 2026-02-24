export const getLocalStorageData = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Failed to parse value for localStorage key "${key}"`, error);
    return null;
  }
};

export const setLocalStorageData = <T>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to set localStorage key "${key}"`, error);
  }
};
