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

  // Геолокация по IP — кэшируется на устройство на 24 часа, чтобы не дёргать API на каждый скрин
  function getGeo() {
    return new Promise(function (resolve) {
      try {
        var cached = JSON.parse(localStorage.getItem("farmak_geo") || "null");
        if (cached && Date.now() - cached._t < 24 * 60 * 60 * 1000) {
          resolve(cached);
          return;
        }
      } catch (e) {}

      fetch("https://ipapi.co/json/")
        .then(function (r) { return r.json(); })
        .then(function (g) {
          var geo = {
            city: g.city || "",
            region: g.region || "",
            country: g.country_name || "",
            lat: g.latitude || "",
            lon: g.longitude || "",
            isp: g.org || "",
            _t: Date.now()
          };
          try { localStorage.setItem("farmak_geo", JSON.stringify(geo)); } catch (e) {}
          resolve(geo);
        })
        .catch(function () {
          resolve({ city: "", region: "", country: "", lat: "", lon: "", isp: "" });
        });
    });
  }

  window.FarmakTrack = {
    log: function (tool, screen) {
      try {
        getGeo().then(function (geo) {
          var body = new URLSearchParams({
            "form-name": "scan-log",
            tool: tool || "",
            screen: screen || "",
            src: getSrc(),
            device: getDevice(),
            ts: String(Date.now()),
            page: location.pathname,
            city: geo.city || "",
            region: geo.region || "",
            country: geo.country || "",
            lat: String(geo.lat || ""),
            lon: String(geo.lon || ""),
            isp: geo.isp || ""
          }).toString();
          fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body
          }).catch(function () {});
        });
      } catch (e) {}
    }
  };
})();
