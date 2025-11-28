export default defineNuxtPlugin(() => {
  const router = useRouter();

  const sendPageView = (path: string) => {
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;

    if (typeof gtag !== 'function') {
      return;
    }

    gtag('event', 'page_view', {
      page_path: path
    });
  };

  router.afterEach((to) => {
    sendPageView(to.fullPath);
  });

  if (router.currentRoute.value.fullPath) {
    sendPageView(router.currentRoute.value.fullPath);
  }
});
