export function isPrivilegedUser(user) {
  return user?.role === 'admin' || user?.role === 'tester';
}
