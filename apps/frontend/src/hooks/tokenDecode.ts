
export function tokenDecode() {
  if (typeof window === "undefined") return null;  // SSR guard

  const token = localStorage.getItem("token");
  if (!token) return null;

  const payload = token.split(".")[1];
  return JSON.parse(atob(payload));
}

