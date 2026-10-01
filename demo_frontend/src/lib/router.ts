import { useEffect, useState } from "react";

// Мінімальний hash-роутер: нуль залежностей, працює на будь-якому статичному хостингу.
export function useRoute() {
  const read = () => window.location.hash.slice(1) || "/";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export const go = (path: string) => {
  window.location.hash = path;
};
