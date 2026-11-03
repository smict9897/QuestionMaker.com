// ছোট service worker: অ্যাপ ইনস্টলের যোগ্যতার জন্য। কোনো ক্যাশ করে না।
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
