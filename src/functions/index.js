export function areEqual(arrA, arrB) {
  if (!arrA || !arrB || !arrA.length || !arrB.length) return false
  return arrA.length === arrB.length && arrA.every((value, index) => value === arrB[index]);
}


export function getSessionCookie() {
  const cookieString = document.cookie;
  const cookies = cookieString.split('; ');
  const sessionCookie = cookies.find(cookie => cookie.startsWith('session='));
  return sessionCookie ? sessionCookie.split('=')[1] : null;
}


export function isColorTooLight(hexColor) {
  if (!hexColor.startsWith('#')) {
    return false;
  }

  hexColor = hexColor.replace('#', '');

  if (hexColor.length === 3) {
    hexColor = hexColor.split('').map(c => c + c).join('');
  }

  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);

  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.8;
}
