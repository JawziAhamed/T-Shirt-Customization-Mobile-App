import * as FileSystem from 'expo-file-system';

export const uriToDataUrl = async (uri, mimeType = 'image/jpeg') => {
  if (!uri) return '';

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return `data:${mimeType};base64,${base64}`;
};
