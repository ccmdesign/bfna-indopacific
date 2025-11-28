import { useRouter, useTrackEvent } from '#imports';

export default defineNuxtPlugin(() => {
  const router = useRouter();

  const trackPageView = (path: string) => {
    if (!path) {
      return;
    }

    useTrackEvent('page_view', {
      page_path: path
    });
  };

  router.afterEach((to, from) => {
    if (to.fullPath === from.fullPath) {
      return;
    }

    trackPageView(to.fullPath);
  });

  router.isReady().then(() => {
    trackPageView(router.currentRoute.value.fullPath);
  });
});
