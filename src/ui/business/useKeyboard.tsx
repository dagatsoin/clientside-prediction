import React from "react";

export function useKeyboard(handlers: { [key: string]: () => void; }) {
  const handler: (e: KeyboardEvent) => void = function (e) {
    handlers[e.key]?.();
  };
  React.useEffect(function () {
    document.addEventListener("keydown", handler);
    return function () {
      document.removeEventListener("keydown", handler);
    };
  }, []);
}
