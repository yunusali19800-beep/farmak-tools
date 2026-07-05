(function () {
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "d-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  function getDevice() {
    try {
      var d = localStorage.getItem("farmak_device_id");
      if (!d) {
        d = uuid();
        localStorage.setItem("farmak_device_id", d);
      }
      return d;
    } catch (e) {
      return "nostorage";
    }
  }
  function getSrc() {
    try {
      var p = new URLSearchParams(location.search);
      var s = p.get("src");
      if (s) {
        localStorage.setItem("farmak_src", s);
        return s;
      }
      return localStorage.getItem("farmak_src") || "";
    } catch (e) {
      return "";
    }
  }
  window.FarmakTrack = {
    log: function (tool, screen) {
      try {
        var body = new URLSearchParams({
          "form-name": "scan-log",
          tool: tool || "",
          screen: screen || "",
          src: getSrc(),
          device: getDevice(),
          ts: String(Date.now()),
          page: location.pathname
        }).toString();
        fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body
        }).catch(function () {});
      } catch (e) {}
    }
  };
})();
