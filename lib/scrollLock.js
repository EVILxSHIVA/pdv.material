// lib/scrollLock.js
let scrollY = 0;
let lockCount = 0;

export function lockScroll() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  if (lockCount === 0) {
    scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }
  lockCount++;
}

export function unlockScroll() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollY);
  }
}
