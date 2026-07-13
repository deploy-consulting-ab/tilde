export const CLIENT_TYPE_COOKIE = 'tilde-client';

export const CLIENT_TYPE = {
    PWA: 'pwa',
    BROWSER: 'browser',
};

export const BROWSER_SESSION_MAX_AGE = 6 * 60 * 60;
export const PWA_SESSION_MAX_AGE = 10 * 365 * 24 * 60 * 60;
export const SESSION_UPDATE_AGE = 60 * 60;

export function resolveClientType(value) {
    return value === CLIENT_TYPE.PWA ? CLIENT_TYPE.PWA : CLIENT_TYPE.BROWSER;
}

export function getSessionMaxAge(clientType) {
    if (clientType === CLIENT_TYPE.PWA) {
        return PWA_SESSION_MAX_AGE;
    }

    return BROWSER_SESSION_MAX_AGE;
}

export function getAuthClientTypeFromWindow() {
    if (typeof window === 'undefined') {
        return CLIENT_TYPE.BROWSER;
    }

    const isPwa =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

    return isPwa ? CLIENT_TYPE.PWA : CLIENT_TYPE.BROWSER;
}
