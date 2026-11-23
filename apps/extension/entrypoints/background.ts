import { openOrFocusLibrary } from '@/src/lib/open-library';

export default defineBackground(() => {
  browser.action.onClicked.addListener(() => {
    void openOrFocusLibrary();
  });
});
