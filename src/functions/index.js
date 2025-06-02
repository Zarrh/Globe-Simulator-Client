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

