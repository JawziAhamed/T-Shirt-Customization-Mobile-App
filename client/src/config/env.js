import { getExpoGoProjectConfig } from 'expo';
import { Platform } from 'react-native';

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const getExpoGoHost = () => {
  const config = getExpoGoProjectConfig?.();
  const rawHost = config?.debuggerHost || config?.hostUri || '';

  if (!rawHost) {
    return '';
  }

  try {
    const normalized = rawHost.includes('://') ? rawHost : `http://${rawHost}`;
    return new URL(normalized).hostname;
  } catch (error) {
    return String(rawHost).split(':')[0].split('/')[0];
  }
};

const isLocalhostApiUrl = (value) =>
  /^https?:\/\/(?:localhost|127\.0\.0\.1|10\.0\.2\.2)(?::\d+)?(?:\/|$)/i.test(String(value || ''));

const rewriteLocalApiUrl = (value) => {
  const input = trimTrailingSlash(value);
  if (!input || !isLocalhostApiUrl(input)) {
    return input;
  }

  const expoHost = getExpoGoHost();
  if (!expoHost) {
    return input;
  }

  try {
    const url = new URL(input);
    url.hostname = expoHost;
    return trimTrailingSlash(url.toString());
  } catch (error) {
    return input.replace(/^(https?:\/\/)(?:localhost|127\.0\.0\.1|10\.0\.2\.2)(?::\d+)?/i, `$1${expoHost}`);
  }
};

const expoGoHost = getExpoGoHost();

const defaultApiBaseUrl = Platform.select({
  android: expoGoHost ? `http://${expoGoHost}:8080/api` : 'http://10.0.2.2:8080/api',
  ios: expoGoHost ? `http://${expoGoHost}:8080/api` : 'http://localhost:8080/api',
  default: expoGoHost ? `http://${expoGoHost}:8080/api` : 'http://localhost:8080/api',
});

const defaultAssetBaseUrl = trimTrailingSlash(defaultApiBaseUrl).replace(/\/api$/, '');

export const API_URL = trimTrailingSlash(
  rewriteLocalApiUrl(process.env.EXPO_PUBLIC_API_URL) || defaultApiBaseUrl
);

export const ASSET_URL = trimTrailingSlash(
  rewriteLocalApiUrl(process.env.EXPO_PUBLIC_ASSET_URL) || defaultAssetBaseUrl
);

export const APP_NAME = 'Custom T-Shirt Studio';
