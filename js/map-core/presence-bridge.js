(() => {
  "use strict";

  class PresenceBridge {
    constructor(onChange) {
      this.onlineUserIds = new Set();
      this.onChange = typeof onChange === "function" ? onChange : () => {};
      this.listener = event => {
        this.onlineUserIds = new Set((event.detail?.onlineUserIds || []).map(String));
        this.onChange(this.onlineUserIds);
      };
      window.addEventListener("thepetgrid:presence", this.listener);
    }

    isOnline(userId) {
      return Boolean(userId) && this.onlineUserIds.has(String(userId));
    }

    destroy() {
      window.removeEventListener("thepetgrid:presence", this.listener);
    }
  }

  window.ThePetGridMapCore = window.ThePetGridMapCore || {};
  window.ThePetGridMapCore.PresenceBridge = PresenceBridge;
})();
