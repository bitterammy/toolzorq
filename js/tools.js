
      "use strict";
      var $ = function (id) { return document.getElementById(id); };
      var toastTimer = null;
      function toast(msg) {
        var t = $("toast");
        t.textContent = msg;
        t.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
      }
      function copyText(text, okMsg) {
        if (!text) { toast("Nothing to copy yet"); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, function () { toast("Copy failed — select the text manually"); });
        } else { toast("Copy isn’t available in this browser"); }
      }
      function fmtNum(n) { return Math.round(n).toLocaleString("en-US"); }
      function fmtMoney(n) { return "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
      function downloadBlob(blob, filename) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
      }

      /* ============ tool switching / search / filter ============ */
      var cards = Array.prototype.slice.call(document.querySelectorAll(".tool-card"));
      var activeCat = "all";
      function openTool(key, scroll) {
        document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("open"); });
        cards.forEach(function (c) { c.classList.toggle("active", c.getAttribute("data-open") === key); });
        var panel = $("panel-" + key);
        if (panel) {
          panel.classList.add("open");
          if (scroll !== false) panel.scrollIntoView({ behavior: "smooth", block: "start" });
          if (key === "thumbnail") { var inp = $("yt-url"); if (inp) setTimeout(function () { inp.focus(); }, 450); }
        }
      }
      cards.forEach(function (card) {
        card.addEventListener("click", function () { openTool(card.getAttribute("data-open")); });
      });
      document.querySelectorAll("[data-close]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          btn.closest(".panel").classList.remove("open");
          cards.forEach(function (c) { c.classList.remove("active"); });
          $("tools").scrollIntoView({ behavior: "smooth" });
        });
      });
      function applyFilter() {
        var q = ($("tool-search").value || "").trim().toLowerCase();
        var shown = 0;
        cards.forEach(function (card) {
          var cats = (card.getAttribute("data-cat") || "").split(" ");
          var hay = (card.getAttribute("data-name") + " " + card.textContent).toLowerCase();
          var okCat = activeCat === "all" || cats.indexOf(activeCat) !== -1;
          var okQ = !q || hay.indexOf(q) !== -1;
          var show = okCat && okQ;
          card.style.display = show ? "" : "none";
          if (show) shown++;
        });
        $("no-results").style.display = shown ? "none" : "block";
      }
      document.querySelectorAll(".chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
          document.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
          chip.setAttribute("aria-pressed", "true");
          activeCat = chip.getAttribute("data-cat");
          applyFilter();
        });
      });
      $("tool-search").addEventListener("input", applyFilter);

      /* ============ 1. Thumbnail downloader ============ */
      function extractVideoId(raw) {
        if (!raw) return null;
        raw = raw.trim();
        if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
        var m = raw.match(/[?&]v=([A-Za-z0-9_-]{11})/);
        if (m) return m[1];
        m = raw.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
        if (m) return m[1];
        m = raw.match(/\/(shorts|live|embed|v)\/([A-Za-z0-9_-]{11})/);
        if (m) return m[2];
        return null;
      }
      var THUMB_SIZES = [
        { key: "maxresdefault", label: "Full HD", dims: "1280 × 720" },
        { key: "sddefault", label: "SD", dims: "640 × 480" },
        { key: "hqdefault", label: "HQ", dims: "480 × 360" },
        { key: "mqdefault", label: "Medium", dims: "320 × 180" },
        { key: "default", label: "Small", dims: "120 × 90" }
      ];
      function downloadThumb(url, filename) {
        fetch(url).then(function (r) {
          if (!r.ok) throw new Error("bad");
          return r.blob();
        }).then(function (blob) {
          downloadBlob(blob, filename);
          toast("Thumbnail downloading");
        }).catch(function () {
          window.open(url, "_blank");
          toast("Opened the image in a new tab — save it from there");
        });
      }
      function runThumbnail() {
        var msg = $("yt-msg"), box = $("yt-results");
        var id = extractVideoId($("yt-url").value);
        box.innerHTML = "";
        if (!id) {
          msg.textContent = "That doesn’t look like a YouTube link. Paste a full video or Shorts link, or the 11-character video ID.";
          msg.className = "tool-msg err";
          return;
        }
        msg.textContent = "Loading every size YouTube has for this video…";
        msg.className = "tool-msg";
        var found = 0, checked = 0;
        THUMB_SIZES.forEach(function (size) {
          var url = "https://i.ytimg.com/vi/" + id + "/" + size.key + ".jpg";
          var probe = new Image();
          probe.onload = function () {
            checked++;
            // YouTube serves a 120x90 placeholder when a size doesn't exist.
            var exists = !(size.key !== "default" && probe.naturalWidth <= 120);
            if (exists) {
              found++;
              var item = document.createElement("div");
              item.className = "thumb-item";
              var img = document.createElement("img");
              img.src = url; img.alt = "YouTube thumbnail — " + size.label + " (" + size.dims + ")";
              var meta = document.createElement("div"); meta.className = "meta";
              var b = document.createElement("b"); b.textContent = size.label;
              var s = document.createElement("span"); s.textContent = size.dims + " · JPG";
              var sp = document.createElement("span"); sp.className = "spacer";
              var btn = document.createElement("button");
              btn.className = "btn small"; btn.type = "button"; btn.textContent = "Download";
              btn.addEventListener("click", function () { downloadThumb(url, "thumbnail-" + id + "-" + size.key + ".jpg"); });
              meta.appendChild(b); meta.appendChild(s); meta.appendChild(sp); meta.appendChild(btn);
              item.appendChild(img); item.appendChild(meta);
              box.appendChild(item);
            }
            if (checked === THUMB_SIZES.length) {
              msg.textContent = found ? "Found " + found + " size" + (found > 1 ? "s" : "") + ". Sizes YouTube doesn’t have for this video are hidden, not faked." : "";
              msg.className = "tool-msg";
              if (!found) { msg.textContent = "No thumbnail could be loaded for that link — check the video ID and your connection."; msg.className = "tool-msg err"; }
            }
          };
          probe.onerror = function () {
            checked++;
            if (checked === THUMB_SIZES.length && !found) {
              msg.textContent = "Couldn’t reach YouTube’s image server — check your connection and try again.";
              msg.className = "tool-msg err";
            }
          };
          probe.src = url;
        });
      }
      $("yt-go").addEventListener("click", runThumbnail);
      $("yt-url").addEventListener("keydown", function (e) { if (e.key === "Enter") runThumbnail(); });

      /* ============ 2. YouTube money calculator ============ */
      $("ym-niche").addEventListener("change", function () {
        var v = this.value;
        if (!v) return;
        var parts = v.split(",");
        $("ym-rpm-low").value = parts[0];
        $("ym-rpm-high").value = parts[1];
      });
      $("ym-go").addEventListener("click", function () {
        var views = parseFloat($("ym-views").value) || 0;
        var low = parseFloat($("ym-rpm-low").value) || 0;
        var high = parseFloat($("ym-rpm-high").value) || 0;
        if (high < low) { var t = low; low = high; high = t; }
        var mLow = views / 1000 * low, mHigh = views / 1000 * high;
        $("ym-out").innerHTML =
          '<div class="stat-row">' +
          '<div class="stat"><b>' + fmtMoney(mLow) + " – " + fmtMoney(mHigh) + '</b><span>Estimated per month</span></div>' +
          '<div class="stat"><b>' + fmtMoney(mLow * 12) + " – " + fmtMoney(mHigh * 12) + '</b><span>Estimated per year</span></div>' +
          '<div class="stat"><b>' + fmtMoney(mLow / 30) + " – " + fmtMoney(mHigh / 30) + '</b><span>Estimated per day</span></div>' +
          "</div>" +
          '<p class="note" style="margin-bottom:0">Based on ' + fmtNum(views) + " monthly views at $" + low + "–$" + high + " RPM. An estimate for planning only — actual revenue varies and is only exact inside YouTube Studio.</p>";
      });

      /* ============ 3. Title & description checker ============ */
      function wireLimit(inputId, barId, countId, limit, labelFn) {
        var input = $(inputId), bar = $(barId), count = $(countId);
        function update() {
          var len = input.value.length;
          var pct = Math.min(100, len / limit * 100);
          bar.style.width = pct + "%";
          bar.className = len > limit ? "bad" : (pct > 85 ? "ok" : "good");
          count.innerHTML = labelFn(len) + (len > limit ? ' — <span class="over">' + fmtNum(len - limit) + " over the limit</span>" : "");
        }
        input.addEventListener("input", update);
        update();
      }
      wireLimit("yc-title", "yc-title-bar", "yc-title-count", 100, function (n) { return n + " characters"; });
      wireLimit("yc-desc", "yc-desc-bar", "yc-desc-count", 5000, function (n) { return fmtNum(n) + " characters"; });
      (function () {
        var input = $("yc-tags"), bar = $("yc-tags-bar"), count = $("yc-tags-count");
        function update() {
          var raw = input.value;
          var tags = raw.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
          var total = raw.replace(/\s*,\s*/g, ",").length;
          var pct = Math.min(100, total / 500 * 100);
          bar.style.width = pct + "%";
          bar.className = total > 500 ? "bad" : (pct > 85 ? "ok" : "good");
          count.innerHTML = total + " characters · " + tags.length + " tag" + (tags.length === 1 ? "" : "s") + (total > 500 ? ' — <span class="over">over the limit</span>' : "");
        }
        input.addEventListener("input", update);
        update();
      })();

      /* ============ 4. Image compressor ============ */
      var icFile = null, icBlob = null, icExt = "jpg";
      function fmtBytes(b) {
        if (b < 1024) return b + " B";
        if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
        return (b / 1024 / 1024).toFixed(2) + " MB";
      }
      function icProcess() {
        if (!icFile) return;
        var format = $("ic-format").value;
        icExt = format === "image/png" ? "png" : (format === "image/webp" ? "webp" : "jpg");
        var quality = parseInt($("ic-quality").value, 10) / 100;
        var maxDim = parseInt($("ic-maxdim").value, 10);
        var img = new Image();
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight;
          if (maxDim > 0 && (w > maxDim || h > maxDim)) {
            var scale = maxDim / Math.max(w, h);
            w = Math.round(w * scale); h = Math.round(h * scale);
          }
          var canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext("2d");
          if (format === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(img.src);
          canvas.toBlob(function (blob) {
            if (!blob) { toast("This browser couldn’t produce that format — try JPG"); return; }
            icBlob = blob;
            $("ic-after-img").src = URL.createObjectURL(blob);
            var saved = icFile.size ? Math.max(0, Math.round((1 - blob.size / icFile.size) * 100)) : 0;
            $("ic-after-cap").textContent = "Compressed — " + fmtBytes(blob.size) + " · " + w + "×" + h + (saved > 0 ? " · " + saved + "% smaller" : "");
          }, format, quality);
        };
        img.src = URL.createObjectURL(icFile);
      }
      function icLoad(file) {
        if (!file || !/^image\//.test(file.type)) { toast("Please choose an image file"); return; }
        icFile = file;
        $("ic-before-img").src = URL.createObjectURL(file);
        $("ic-before-cap").textContent = "Original — " + fmtBytes(file.size) + " · " + file.name;
        $("ic-controls").style.display = "block";
        icProcess();
      }
      $("ic-pick").addEventListener("click", function () { $("ic-file").click(); });
      $("ic-file").addEventListener("change", function () { if (this.files[0]) icLoad(this.files[0]); });
      var icDrop = $("ic-drop");
      ["dragenter", "dragover"].forEach(function (ev) { icDrop.addEventListener(ev, function (e) { e.preventDefault(); icDrop.classList.add("drag"); }); });
      ["dragleave", "drop"].forEach(function (ev) { icDrop.addEventListener(ev, function (e) { e.preventDefault(); icDrop.classList.remove("drag"); }); });
      icDrop.addEventListener("drop", function (e) { var f = e.dataTransfer.files[0]; if (f) icLoad(f); });
      ["ic-quality", "ic-maxdim", "ic-format"].forEach(function (id) {
        $(id).addEventListener("input", function () {
          $("ic-quality-val").textContent = $("ic-quality").value;
          icProcess();
        });
      });
      $("ic-download").addEventListener("click", function () {
        if (!icBlob) { toast("Compress an image first"); return; }
        var base = (icFile.name || "image").replace(/\.[^.]+$/, "");
        downloadBlob(icBlob, base + "-compressed." + icExt);
        toast("Compressed image downloading");
      });
      $("ic-reset").addEventListener("click", function () {
        icFile = null; icBlob = null;
        $("ic-controls").style.display = "none";
        $("ic-file").value = "";
      });

      /* ============ 5. QR generator ============ */
      $("qr-go").addEventListener("click", function () {
        var text = $("qr-text").value.trim();
        var msg = $("qr-msg"), out = $("qr-out");
        if (!text) { msg.textContent = "Type a link or some text first."; return; }
        if (typeof QRCode === "undefined") {
          msg.textContent = "The QR library couldn’t load — check your connection and reload the page.";
          return;
        }
        var size = parseInt($("qr-size").value, 10);
        out.innerHTML = "";
        out.style.display = "inline-block";
        new QRCode(out, { text: text, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
        msg.textContent = "Scan it with any phone camera to test it.";
        $("qr-download").disabled = false;
      });
      $("qr-download").addEventListener("click", function () {
        var canvas = $("qr-out").querySelector("canvas");
        if (!canvas) { toast("Generate a QR code first"); return; }
        canvas.toBlob(function (blob) { if (blob) { downloadBlob(blob, "qr-code.png"); toast("QR code downloading"); } });
      });

      /* ============ 6. Password generator ============ */
      function genPassword() {
        var sets = "";
        var lower = "abcdefghijkmnpqrstuvwxyz", upper = "ABCDEFGHJKLMNPQRSTUVWXYZ", digits = "23456789", symbols = "!@#$%^&*()-_=+?";
        if ($("pw-lower").checked) sets += lower;
        if ($("pw-upper").checked) sets += upper;
        if ($("pw-digits").checked) sets += digits;
        if ($("pw-symbols").checked) sets += symbols;
        var len = parseInt($("pw-length").value, 10);
        if (!sets) { $("pw-out").textContent = "Tick at least one character type"; $("pw-strength").textContent = "Strength: —"; $("pw-entropy").textContent = ""; $("pw-bar").style.width = "0"; return; }
        var arr = new Uint32Array(len);
        crypto.getRandomValues(arr);
        var pw = "";
        for (var i = 0; i < len; i++) pw += sets[arr[i] % sets.length];
        $("pw-out").textContent = pw;
        var bits = Math.round(len * Math.log2(sets.length));
        $("pw-entropy").textContent = "≈ " + bits + " bits of entropy";
        var bar = $("pw-bar");
        var label = bits < 45 ? "Weak" : bits < 65 ? "Fair" : bits < 90 ? "Strong" : "Excellent";
        bar.style.width = Math.min(100, bits / 1.2) + "%";
        bar.className = bits < 45 ? "bad" : bits < 65 ? "ok" : "good";
        $("pw-strength").textContent = "Strength: " + label;
      }
      $("pw-length").addEventListener("input", function () { $("pw-length-val").textContent = this.value; genPassword(); });
      ["pw-upper", "pw-lower", "pw-digits", "pw-symbols"].forEach(function (id) { $(id).addEventListener("change", genPassword); });
      $("pw-go").addEventListener("click", genPassword);
      $("pw-copy").addEventListener("click", function () {
        var t = $("pw-out").textContent;
        if (t && t.indexOf("appear") === -1 && t.indexOf("Tick") === -1) copyText(t, "Password copied");
        else toast("Generate a password first");
      });
      genPassword();

      /* ============ 7. Word counter ============ */
      function wcUpdate() {
        var text = $("wc-text").value;
        var words = text.trim() ? text.trim().split(/\s+/).length : 0;
        var sentences = text.split(/[.!?…]+/).filter(function (s) { return s.trim().length > 0; }).length;
        var paras = text.split(/\n\s*\n/).filter(function (s) { return s.trim().length > 0; }).length;
        if (text.trim() && paras === 0) paras = text.split(/\n/).filter(function (s) { return s.trim(); }).length;
        $("wc-words").textContent = fmtNum(words);
        $("wc-chars").textContent = fmtNum(text.length);
        $("wc-nospace").textContent = fmtNum(text.replace(/\s/g, "").length);
        $("wc-sent").textContent = fmtNum(text.trim() ? sentences : 0);
        $("wc-para").textContent = fmtNum(text.trim() ? paras : 0);
        var mins = words / 200;
        $("wc-read").textContent = words === 0 ? "0 min" : (mins < 1 ? "<1 min" : Math.round(mins) + " min");
      }
      $("wc-text").addEventListener("input", wcUpdate);
      $("wc-clear").addEventListener("click", function () { $("wc-text").value = ""; wcUpdate(); $("wc-text").focus(); });

      /* ============ 8. Case converter ============ */
      document.querySelectorAll("[data-case]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var ta = $("cc-text"), t = ta.value;
          if (!t) { toast("Type some text first"); return; }
          var mode = btn.getAttribute("data-case");
          if (mode === "upper") t = t.toUpperCase();
          else if (mode === "lower") t = t.toLowerCase();
          else if (mode === "title") t = t.toLowerCase().replace(/(^|\s|[("])\S/g, function (c) { return c.toUpperCase(); });
          else if (mode === "sentence") t = t.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, function (c) { return c.toUpperCase(); });
          else if (mode === "camel") t = t.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, function (m, c) { return c.toUpperCase(); }).replace(/^[A-Z]/, function (c) { return c.toLowerCase(); });
          else if (mode === "snake") t = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
          else if (mode === "kebab") t = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
          ta.value = t;
        });
      });
      $("cc-copy").addEventListener("click", function () { copyText($("cc-text").value, "Text copied"); });

      /* ============ 9. Age calculator ============ */
      $("age-go").addEventListener("click", function () {
        var out = $("age-out");
        var dobVal = $("age-dob").value;
        if (!dobVal) { out.innerHTML = '<p style="margin:0;font-weight:700">Please pick a date of birth first.</p>'; return; }
        var dob = new Date(dobVal + "T00:00:00");
        var at = $("age-at").value ? new Date($("age-at").value + "T00:00:00") : new Date();
        at.setHours(0, 0, 0, 0);
        if (dob > at) { out.innerHTML = '<p style="margin:0;font-weight:700">That birth date is in the future — check the dates.</p>'; return; }
        var y = at.getFullYear() - dob.getFullYear();
        var m = at.getMonth() - dob.getMonth();
        var d = at.getDate() - dob.getDate();
        if (d < 0) { m--; var prev = new Date(at.getFullYear(), at.getMonth(), 0); d += prev.getDate(); }
        if (m < 0) { y--; m += 12; }
        var totalDays = Math.floor((at - dob) / 86400000);
        var next = new Date(at.getFullYear(), dob.getMonth(), dob.getDate());
        if (next < at) next.setFullYear(at.getFullYear() + 1);
        var toNext = Math.round((next - at) / 86400000);
        out.innerHTML =
          '<div class="stat-row">' +
          '<div class="stat"><b>' + y + "y " + m + "m " + d + 'd</b><span>Exact age</span></div>' +
          '<div class="stat"><b>' + fmtNum(totalDays) + '</b><span>Total days</span></div>' +
          '<div class="stat"><b>' + fmtNum(totalDays * 24) + '</b><span>Total hours</span></div>' +
          '<div class="stat"><b>' + (toNext === 0 ? "Today!" : toNext + " days") + '</b><span>Until next birthday</span></div>' +
          "</div>";
      });

      /* ============ 10. EMI calculator ============ */
      $("emi-go").addEventListener("click", function () {
        var out = $("emi-out");
        var P = parseFloat($("emi-amount").value) || 0;
        var annual = parseFloat($("emi-rate").value) || 0;
        var years = parseFloat($("emi-years").value) || 0;
        var n = Math.round(years * 12);
        if (P <= 0 || n <= 0) { out.innerHTML = '<p style="margin:0;font-weight:700">Enter a loan amount and a term above zero.</p>'; return; }
        var r = annual / 1200;
        var emi = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
        var total = emi * n;
        var interest = total - P;
        out.innerHTML =
          '<div class="stat-row">' +
          '<div class="stat"><b>' + fmtNum(emi) + '</b><span>Monthly EMI</span></div>' +
          '<div class="stat"><b>' + fmtNum(interest) + '</b><span>Total interest</span></div>' +
          '<div class="stat"><b>' + fmtNum(total) + '</b><span>Total repayment</span></div>' +
          '<div class="stat"><b>' + n + '</b><span>Monthly payments</span></div>' +
          "</div>" +
          '<p class="note" style="margin-bottom:0">Interest is ' + (total ? (interest / total * 100).toFixed(1) : 0) + '% of everything you repay. Bank fees and insurance are not included — check your loan offer for those.</p>';
      });

      /* ============ 11. Percentage calculator ============ */
      function pcUpdate() {
        var a = parseFloat($("pc-a").value), b = parseFloat($("pc-b").value);
        $("pc-out-1").innerHTML = (isNaN(a) || isNaN(b)) ? "<b>—</b>" : "<b>" + fmtNum(a / 100 * b) + "</b>";
        var c = parseFloat($("pc-c").value), d = parseFloat($("pc-d").value);
        if (isNaN(c) || isNaN(d) || c === 0) $("pc-out-2").innerHTML = "<b>—</b>";
        else {
          var chg = (d - c) / Math.abs(c) * 100;
          $("pc-out-2").innerHTML = "<b>" + (chg > 0 ? "▲ +" : chg < 0 ? "▼ " : "") + chg.toFixed(2) + "%</b>" + (chg > 0 ? " increase" : chg < 0 ? " decrease" : " no change");
        }
        var e = parseFloat($("pc-e").value), f = parseFloat($("pc-f").value);
        $("pc-out-3").innerHTML = (isNaN(e) || isNaN(f) || f === 0) ? "<b>—</b>" : "<b>" + (e / f * 100).toFixed(2) + "%</b>";
      }
      ["pc-a", "pc-b", "pc-c", "pc-d", "pc-e", "pc-f"].forEach(function (id) { $(id).addEventListener("input", pcUpdate); });
      pcUpdate();

      /* ============ shared helpers for new tools ============ */
      function fmtVal(n) {
        if (typeof n !== "number" || !isFinite(n)) return "—";
        if (n === 0) return "0";
        var a = Math.abs(n);
        if (a >= 1e15 || a < 0.000001) return n.toExponential(4);
        return parseFloat(n.toPrecision(8)).toLocaleString("en-US", { maximumFractionDigits: 8 });
      }
      var audioCtx = null;
      function beep(times) {
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          audioCtx = audioCtx || new AC();
          if (audioCtx.state === "suspended") audioCtx.resume();
          var n = times || 2;
          for (var i = 0; i < n; i++) {
            var o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.type = "sine"; o.frequency.value = 880;
            var t0 = audioCtx.currentTime + i * 0.35;
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
            o.connect(g); g.connect(audioCtx.destination);
            o.start(t0); o.stop(t0 + 0.32);
          }
        } catch (e) { /* sound is a bonus, never an error */ }
      }
      function pad2(n) { return (n < 10 ? "0" : "") + n; }

      /* ============ 12. BMI calculator ============ */
      $("bmi-sys").addEventListener("change", function () {
        var imp = this.value === "imperial";
        $("bmi-metric").style.display = imp ? "none" : "";
        $("bmi-imperial").style.display = imp ? "" : "none";
      });
      function bmiCalc() {
        var out = $("bmi-out");
        var imperial = $("bmi-sys").value === "imperial";
        var hM, kg, ok = true;
        if (imperial) {
          var ft = parseFloat($("bmi-ft").value) || 0, inch = parseFloat($("bmi-in").value) || 0, lb = parseFloat($("bmi-lb").value) || 0;
          hM = (ft * 12 + inch) * 0.0254; kg = lb * 0.45359237;
          if (hM <= 0 || lb <= 0) ok = false;
        } else {
          var cm = parseFloat($("bmi-cm").value) || 0; kg = parseFloat($("bmi-kg").value) || 0;
          hM = cm / 100;
          if (cm <= 0 || kg <= 0) ok = false;
        }
        if (!ok) { out.innerHTML = '<p style="margin:0;font-weight:700">Enter a height and weight above zero.</p>'; return; }
        var bmi = kg / (hM * hM);
        var cat, cls;
        if (bmi < 18.5) { cat = "Underweight"; cls = "ok"; }
        else if (bmi < 25) { cat = "Healthy weight"; cls = "good"; }
        else if (bmi < 30) { cat = "Overweight"; cls = "ok"; }
        else { cat = "Obese"; cls = "bad"; }
        var lo = 18.5 * hM * hM, hi = 24.9 * hM * hM;
        var range = imperial ? (lo / 0.45359237).toFixed(1) + " – " + (hi / 0.45359237).toFixed(1) + " lb" : lo.toFixed(1) + " – " + hi.toFixed(1) + " kg";
        var pct = Math.max(0, Math.min(100, (bmi - 14) / (40 - 14) * 100));
        out.innerHTML =
          '<div class="stat-row">' +
          '<div class="stat"><b>' + bmi.toFixed(1) + '</b><span>Your BMI</span></div>' +
          '<div class="stat"><b>' + cat + '</b><span>WHO category</span></div>' +
          '<div class="stat"><b>' + range + '</b><span>Healthy weight for your height</span></div>' +
          "</div>" +
          '<div class="meter"><i class="' + cls + '" style="width:' + pct + '%"></i></div>' +
          '<div class="limit-row"><span>14</span><span>18.5 healthy starts</span><span>25</span><span>30</span><span>40</span></div>' +
          '<p class="note" style="margin-bottom:0">WHO categories: under 18.5 underweight · 18.5–24.9 healthy · 25–29.9 overweight · 30+ obese. BMI is a general guide — it does not account for muscle, age or body composition, and it is not a diagnosis.</p>';
      }
      $("bmi-go").addEventListener("click", bmiCalc);
      ["bmi-cm", "bmi-kg", "bmi-ft", "bmi-in", "bmi-lb"].forEach(function (id) { $(id).addEventListener("input", bmiCalc); });
      bmiCalc();

      /* ============ 13. Unit converter ============ */
      var UC = {
        length: { units: { mm: ["Millimetres", 0.001], cm: ["Centimetres", 0.01], m: ["Metres", 1], km: ["Kilometres", 1000], "in": ["Inches", 0.0254], ft: ["Feet", 0.3048], yd: ["Yards", 0.9144], mi: ["Miles", 1609.344] } },
        weight: { units: { g: ["Grams", 0.001], kg: ["Kilograms", 1], t: ["Tonnes", 1000], oz: ["Ounces", 0.028349523125], lb: ["Pounds", 0.45359237], st: ["Stone", 6.35029318] } },
        volume: { units: { ml: ["Millilitres", 0.001], l: ["Litres", 1], m3: ["Cubic metres", 1000], tsp: ["Teaspoons (US)", 0.00492892159], tbsp: ["Tablespoons (US)", 0.0147867648], cup: ["Cups (US)", 0.236588237], pt: ["Pints (US)", 0.473176473], qt: ["Quarts (US)", 0.946352946], gal: ["Gallons (US)", 3.785411784] } },
        speed: { units: { ms: ["Metres / second", 1], kmh: ["Kilometres / hour", 0.277777778], mph: ["Miles / hour", 0.44704], kn: ["Knots", 0.514444444], fts: ["Feet / second", 0.3048] } },
        area: { units: { cm2: ["Square centimetres", 0.0001], m2: ["Square metres", 1], ha: ["Hectares", 10000], km2: ["Square kilometres", 1000000], in2: ["Square inches", 0.00064516], ft2: ["Square feet", 0.09290304], yd2: ["Square yards", 0.83612736], ac: ["Acres", 4046.8564224], mi2: ["Square miles", 2589988.11] } },
        data: { units: { bit: ["Bits", 0.125], B: ["Bytes", 1], KB: ["Kilobytes (KB)", 1000], MB: ["Megabytes (MB)", 1000000], GB: ["Gigabytes (GB)", 1000000000], TB: ["Terabytes (TB)", 1000000000000], KiB: ["Kibibytes (KiB)", 1024], MiB: ["Mebibytes (MiB)", 1048576], GiB: ["Gibibytes (GiB)", 1073741824] } },
        temperature: { units: { C: ["Celsius (°C)"], F: ["Fahrenheit (°F)"], K: ["Kelvin (K)"] } }
      };
      function ucTempToC(v, from) { return from === "C" ? v : from === "F" ? (v - 32) * 5 / 9 : v - 273.15; }
      function ucTempFromC(c, to) { return to === "C" ? c : to === "F" ? c * 9 / 5 + 32 : c + 273.15; }
      function ucBuildUnits(keep) {
        var cat = $("uc-cat").value, sel = $("uc-from"), prev = sel.value;
        sel.innerHTML = "";
        Object.keys(UC[cat].units).forEach(function (k) {
          var o = document.createElement("option");
          o.value = k; o.textContent = UC[cat].units[k][0];
          sel.appendChild(o);
        });
        if (keep && UC[cat].units[prev]) sel.value = prev;
      }
      var ucLastUnit = null;
      function ucUpdate() {
        var cat = $("uc-cat").value, from = $("uc-from").value, v = parseFloat($("uc-value").value);
        var out = $("uc-out");
        if (isNaN(v)) { out.innerHTML = '<p style="margin:0;font-weight:700">Type a number to convert.</p>'; return; }
        var rows = "", firstKey = null;
        Object.keys(UC[cat].units).forEach(function (k) {
          var res;
          if (cat === "temperature") res = ucTempFromC(ucTempToC(v, from), k);
          else res = v * UC[cat].units[from][1] / UC[cat].units[k][1];
          if (k === from) { firstKey = k; }
          rows += "<tr" + (k === from ? ' style="background:var(--gold-soft)"' : "") + "><td>" + UC[cat].units[k][0] + "</td><td>" + fmtVal(res) + "</td></tr>";
        });
        ucLastUnit = Object.keys(UC[cat].units)[0];
        out.innerHTML = '<p style="margin:0 0 4px"><b>' + fmtVal(v) + " " + UC[cat].units[from][0] + '</b> equals:</p><table class="mini-table">' + rows + "</table>";
      }
      $("uc-cat").addEventListener("change", function () { ucBuildUnits(false); ucUpdate(); });
      $("uc-from").addEventListener("change", ucUpdate);
      $("uc-value").addEventListener("input", ucUpdate);
      $("uc-swap").addEventListener("click", function () {
        var cur = $("uc-from").value;
        var keys = Object.keys(UC[$("uc-cat").value].units);
        var other = keys.filter(function (k) { return k !== cur; })[0];
        if (other && ucLastUnit) { /* convert current value into the first other unit, then make it the input */
          var v = parseFloat($("uc-value").value);
          if (!isNaN(v)) {
            var cat = $("uc-cat").value, res;
            if (cat === "temperature") res = ucTempFromC(ucTempToC(v, cur), other);
            else res = v * UC[cat].units[cur][1] / UC[cat].units[other][1];
            $("uc-value").value = parseFloat(res.toPrecision(8));
          }
          $("uc-from").value = other;
          ucUpdate();
        }
      });
      ucBuildUnits(false);
      ucUpdate();

      /* ============ 14. Currency converter ============ */
      var CUR = {
        USD: ["US Dollar", 1], EUR: ["Euro", 0.891529], GBP: ["British Pound", 0.746661], PKR: ["Pakistani Rupee", 276.98617],
        INR: ["Indian Rupee", 94.901331], AED: ["UAE Dirham", 3.6725], SAR: ["Saudi Riyal", 3.75], QAR: ["Qatari Riyal", 3.64],
        KWD: ["Kuwaiti Dinar", 0.31006], CAD: ["Canadian Dollar", 1.401351], AUD: ["Australian Dollar", 1.425307], JPY: ["Japanese Yen", 156.920637],
        CNY: ["Chinese Yuan", 6.688225], CHF: ["Swiss Franc", 0.821251], TRY: ["Turkish Lira", 49.680228], BDT: ["Bangladeshi Taka", 123.709857],
        LKR: ["Sri Lankan Rupee", 332.005986], NPR: ["Nepalese Rupee", 151.833398], MYR: ["Malaysian Ringgit", 4.08304], SGD: ["Singapore Dollar", 1.277306],
        HKD: ["Hong Kong Dollar", 7.837197], ZAR: ["South African Rand", 16.495348], NGN: ["Nigerian Naira", 1324.6032], PHP: ["Philippine Peso", 63.526643],
        IDR: ["Indonesian Rupiah", 18082.47746], KRW: ["South Korean Won", 1324.953768], THB: ["Thai Baht", 33.729084], EGP: ["Egyptian Pound", 55.215592],
        NZD: ["New Zealand Dollar", 1.759591]
      };
      var curDateLabel = "23 Oct 2026", curLive = false;
      function curNote() {
        $("cur-note").textContent = curLive
          ? "Rates: ExchangeRate-API (open.er-api.com), refreshed live just now — last update " + curDateLabel + ". Mid-market reference rates; your bank’s rate will differ slightly."
          : "Rates: ExchangeRate-API (open.er-api.com) snapshot dated " + curDateLabel + " (live refresh was not reachable just now — the converter still works with these rates). Mid-market reference rates; your bank’s rate will differ slightly.";
      }
      function curFill() {
        ["cur-from", "cur-to"].forEach(function (id) {
          var sel = $(id);
          sel.innerHTML = "";
          Object.keys(CUR).forEach(function (code) {
            var o = document.createElement("option");
            o.value = code; o.textContent = code + " — " + CUR[code][0];
            sel.appendChild(o);
          });
        });
        $("cur-from").value = "USD";
        $("cur-to").value = "PKR";
      }
      function curConvert(amt, from, to) { return amt / CUR[from][1] * CUR[to][1]; }
      function curUpdate() {
        var amt = parseFloat($("cur-amount").value);
        var from = $("cur-from").value, to = $("cur-to").value, out = $("cur-out");
        if (isNaN(amt) || amt < 0) { out.innerHTML = '<p style="margin:0;font-weight:700">Enter an amount to convert.</p>'; return; }
        var res = curConvert(amt, from, to);
        var rate = curConvert(1, from, to);
        var popular = ["USD", "EUR", "GBP", "PKR", "INR", "AED"];
        var rows = "";
        popular.forEach(function (code) {
          if (code === to) return;
          rows += "<tr><td>" + code + " — " + CUR[code][0] + "</td><td>" + fmtVal(curConvert(amt, from, code)) + "</td></tr>";
        });
        out.innerHTML =
          '<div class="stat-row">' +
          '<div class="stat"><b>' + fmtVal(res) + " " + to + '</b><span>' + fmtVal(amt) + " " + from + " converted</span></div>" +
          '<div class="stat"><b>1 ' + from + " = " + fmtVal(rate) + " " + to + '</b><span>Reference rate</span></div>' +
          "</div>" +
          (rows ? '<table class="mini-table">' + rows + "</table>" : "");
      }
      $("cur-go").addEventListener("click", curUpdate);
      ["cur-amount", "cur-from", "cur-to"].forEach(function (id) { $(id).addEventListener("input", curUpdate); $(id).addEventListener("change", curUpdate); });
      $("cur-swap").addEventListener("click", function () {
        var f = $("cur-from").value;
        $("cur-from").value = $("cur-to").value;
        $("cur-to").value = f;
        curUpdate();
      });
      curFill(); curNote(); curUpdate();
      fetch("https://open.er-api.com/v6/latest/USD").then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.result === "success" && d.rates) {
          Object.keys(CUR).forEach(function (code) { if (d.rates[code]) CUR[code][1] = d.rates[code]; });
          if (d.time_last_update_unix) {
            var dt = new Date(d.time_last_update_unix * 1000);
            curDateLabel = dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
          }
          curLive = true; curNote(); curUpdate();
        }
      }).catch(function () { /* snapshot stays — note already explains */ });

      /* ============ 15. Stopwatch & timer ============ */
      var swElapsed = 0, swStartAt = 0, swTimerId = null, swLapCount = 0, swLastLap = 0;
      function fmtClock(ms, cs) {
        var totalSec = Math.floor(ms / 1000);
        var m = Math.floor(totalSec / 60), s = totalSec % 60;
        var base = pad2(m) + ":" + pad2(s);
        if (!cs) return base;
        return base + "." + pad2(Math.floor((ms % 1000) / 10));
      }
      function swShow() { $("sw-display").textContent = fmtClock(swElapsed + (swTimerId ? performance.now() - swStartAt : 0), true); }
      $("sw-toggle").addEventListener("click", function () {
        if (swTimerId) {
          swElapsed += performance.now() - swStartAt;
          clearInterval(swTimerId); swTimerId = null;
          this.textContent = "Start";
        } else {
          swStartAt = performance.now();
          swTimerId = setInterval(swShow, 31);
          this.textContent = "Pause";
        }
        swShow();
      });
      $("sw-lap").addEventListener("click", function () {
        var now = swElapsed + (swTimerId ? performance.now() - swStartAt : 0);
        if (now <= 0) { toast("Start the stopwatch first"); return; }
        swLapCount++;
        var row = document.createElement("div");
        row.className = "lap-row";
        row.innerHTML = "<span>Lap " + swLapCount + "</span><b>" + fmtClock(now - swLastLap, true) + '</b><span>total ' + fmtClock(now, true) + "</span>";
        var box = $("sw-laps");
        box.insertBefore(row, box.firstChild);
        swLastLap = now;
      });
      $("sw-reset").addEventListener("click", function () {
        if (swTimerId) { clearInterval(swTimerId); swTimerId = null; }
        swElapsed = 0; swLapCount = 0; swLastLap = 0;
        $("sw-toggle").textContent = "Start";
        $("sw-laps").innerHTML = "";
        swShow();
      });
      swShow();
      // timer mode
      var tmRemain = null, tmEndAt = 0, tmTimerId = null;
      function tmReadInputs() {
        var h = Math.max(0, parseInt($("tm-h").value, 10) || 0), m = Math.max(0, parseInt($("tm-m").value, 10) || 0), s = Math.max(0, parseInt($("tm-s").value, 10) || 0);
        return (h * 3600 + m * 60 + s) * 1000;
      }
      function tmShow() {
        var ms = tmRemain !== null ? tmRemain : tmReadInputs();
        if (tmTimerId) ms = Math.max(0, tmEndAt - Date.now());
        var totalSec = Math.ceil(ms / 1000);
        var h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
        $("tm-display").textContent = (h > 0 ? pad2(h) + ":" : "") + pad2(m) + ":" + pad2(s);
      }
      function tmStop(msg) {
        if (tmTimerId) { clearInterval(tmTimerId); tmTimerId = null; }
        $("tm-toggle").textContent = "Start timer";
        if (msg) { tmRemain = 0; tmShow(); beep(3); toast("⏰ Time’s up!"); }
      }
      $("tm-toggle").addEventListener("click", function () {
        if (tmTimerId) {
          tmRemain = Math.max(0, tmEndAt - Date.now());
          clearInterval(tmTimerId); tmTimerId = null;
          this.textContent = "Resume";
          tmShow();
          return;
        }
        if (tmRemain === null || tmRemain <= 0) tmRemain = tmReadInputs();
        if (tmRemain <= 0) { toast("Set a time above zero first"); return; }
        tmEndAt = Date.now() + tmRemain;
        tmTimerId = setInterval(function () {
          if (Date.now() >= tmEndAt) tmStop(true); else tmShow();
        }, 200);
        this.textContent = "Pause";
        tmShow();
      });
      $("tm-reset").addEventListener("click", function () { tmStop(false); tmRemain = null; tmShow(); });
      ["tm-h", "tm-m", "tm-s"].forEach(function (id) { $(id).addEventListener("input", function () { if (!tmTimerId) { tmRemain = null; tmShow(); } }); });
      tmShow();
      $("sw-tab-sw").addEventListener("click", function () {
        this.setAttribute("aria-pressed", "true"); $("sw-tab-tm").setAttribute("aria-pressed", "false");
        $("sw-mode").style.display = ""; $("tm-mode").style.display = "none";
      });
      $("sw-tab-tm").addEventListener("click", function () {
        this.setAttribute("aria-pressed", "true"); $("sw-tab-sw").setAttribute("aria-pressed", "false");
        $("tm-mode").style.display = ""; $("sw-mode").style.display = "none";
      });

      /* ============ 16. Pomodoro timer ============ */
      var pmTotal = 1500, pmRemain = 1500, pmEndAt = 0, pmTimerId = null, pmSessions = 0;
      function pmShow() {
        var sec = pmTimerId ? Math.max(0, Math.round((pmEndAt - Date.now()) / 1000)) : pmRemain;
        $("pm-display").textContent = pad2(Math.floor(sec / 60)) + ":" + pad2(sec % 60);
      }
      function pmSetMode(sec, btn) {
        document.querySelectorAll("[data-pm]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        if (btn) btn.setAttribute("aria-pressed", "true");
        if (pmTimerId) { clearInterval(pmTimerId); pmTimerId = null; }
        pmTotal = sec; pmRemain = sec;
        $("pm-toggle").textContent = sec === 1500 ? "Start focus" : "Start break";
        $("pm-label").textContent = sec === 1500 ? "Focus session " + (pmSessions + 1) : "Break time — step away from the screen";
        pmShow();
      }
      document.querySelectorAll("[data-pm]").forEach(function (btn) {
        btn.addEventListener("click", function () { pmSetMode(parseInt(btn.getAttribute("data-pm"), 10), btn); });
      });
      $("pm-toggle").addEventListener("click", function () {
        if (pmTimerId) {
          pmRemain = Math.max(0, Math.round((pmEndAt - Date.now()) / 1000));
          clearInterval(pmTimerId); pmTimerId = null;
          this.textContent = "Resume";
          pmShow();
          return;
        }
        if (pmRemain <= 0) pmRemain = pmTotal;
        pmEndAt = Date.now() + pmRemain * 1000;
        var wasFocus = pmTotal === 1500;
        pmTimerId = setInterval(function () {
          if (Date.now() >= pmEndAt) {
            clearInterval(pmTimerId); pmTimerId = null;
            pmRemain = 0; pmShow();
            beep(3);
            if (wasFocus) {
              pmSessions++;
              $("pm-sessions").textContent = pmSessions;
              $("pm-minutes").textContent = (pmSessions * 25) + " min";
              toast("Focus block complete — take a break");
              pmSetMode(pmSessions % 4 === 0 ? 900 : 300, document.querySelector('[data-pm="' + (pmSessions % 4 === 0 ? "900" : "300") + '"]'));
            } else {
              toast("Break over — back to focus when you’re ready");
              pmSetMode(1500, document.querySelector('[data-pm="1500"]'));
            }
          } else pmShow();
        }, 250);
        this.textContent = "Pause";
        pmShow();
      });
      $("pm-reset").addEventListener("click", function () {
        if (pmTimerId) { clearInterval(pmTimerId); pmTimerId = null; }
        pmRemain = pmTotal;
        $("pm-toggle").textContent = pmTotal === 1500 ? "Start focus" : "Start break";
        pmShow();
      });
      pmShow();

      /* ============ 17. Color picker ============ */
      function hexToRgb(hex) {
        hex = hex.replace(/^#/, "");
        if (/^[0-9a-fA-F]{3}$/.test(hex)) hex = hex.split("").map(function (c) { return c + c; }).join("");
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
        return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
      }
      function rgbToHex(r, g, b) {
        function h(x) { return ("0" + Math.round(Math.max(0, Math.min(255, x))).toString(16)).slice(-2); }
        return "#" + h(r) + h(g) + h(b);
      }
      function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
        if (max !== min) {
          var d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
          else if (max === g) h = (b - r) / d + 2;
          else h = (r - g) / d + 4;
          h *= 60;
        }
        return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
      }
      function cpApply(rgb) {
        var hex = rgbToHex(rgb.r, rgb.g, rgb.b).toUpperCase();
        var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        $("cp-pick").value = hex;
        $("cp-hex").value = hex;
        $("cp-preview").style.background = hex;
        $("cp-v-hex").textContent = hex;
        $("cp-v-rgb").textContent = "rgb(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ")";
        $("cp-v-hsl").textContent = "hsl(" + hsl.h + ", " + hsl.s + "%, " + hsl.l + "%)";
        var box = $("cp-swatches");
        box.innerHTML = "";
        var steps = [-0.75, -0.55, -0.35, -0.18, 0, 0.2, 0.4, 0.6, 0.78, 0.9];
        steps.forEach(function (f) {
          var c = f < 0
            ? { r: rgb.r * (1 + f), g: rgb.g * (1 + f), b: rgb.b * (1 + f) }
            : { r: rgb.r + (255 - rgb.r) * f, g: rgb.g + (255 - rgb.g) * f, b: rgb.b + (255 - rgb.b) * f };
          var hx = rgbToHex(c.r, c.g, c.b).toUpperCase();
          var b = document.createElement("button");
          b.type = "button"; b.className = "swatch"; b.style.background = hx; b.title = hx;
          b.setAttribute("aria-label", "Copy " + hx);
          b.addEventListener("click", function () { copyText(hx, "Copied " + hx); });
          box.appendChild(b);
        });
      }
      $("cp-pick").addEventListener("input", function () { var rgb = hexToRgb(this.value); if (rgb) cpApply(rgb); });
      $("cp-hex").addEventListener("input", function () { var rgb = hexToRgb(this.value.trim()); if (rgb) cpApply(rgb); });
      document.querySelectorAll("[data-copyval]").forEach(function (btn) {
        btn.addEventListener("click", function () { copyText($(btn.getAttribute("data-copyval")).textContent, "Copied"); });
      });
      cpApply(hexToRgb("#c99612"));

      /* ============ 18. JSON formatter ============ */
      function jfRun(mode) {
        var raw = $("jf-in").value, msg = $("jf-msg");
        if (!raw.trim()) { msg.textContent = "Paste some JSON first."; msg.className = "tool-msg err"; return; }
        try {
          var obj = JSON.parse(raw);
          if (mode === "validate") {
            $("jf-out").value = "";
            msg.textContent = "✓ Valid JSON — " + fmtNum(raw.length) + " characters.";
            msg.className = "tool-msg";
            return;
          }
          var out = mode === "minify" ? JSON.stringify(obj) : JSON.stringify(obj, null, parseInt($("jf-indent").value, 10) === 4 ? 4 : 2);
          $("jf-out").value = out;
          msg.textContent = "✓ Valid JSON — " + (mode === "minify" ? "minified" : "formatted") + ": " + fmtNum(raw.length) + " → " + fmtNum(out.length) + " characters.";
          msg.className = "tool-msg";
        } catch (e) {
          msg.textContent = "✗ Invalid JSON: " + e.message;
          msg.className = "tool-msg err";
        }
      }
      $("jf-format").addEventListener("click", function () { jfRun("format"); });
      $("jf-minify").addEventListener("click", function () { jfRun("minify"); });
      $("jf-validate").addEventListener("click", function () { jfRun("validate"); });
      $("jf-copy").addEventListener("click", function () { copyText($("jf-out").value, "JSON copied"); });
      $("jf-clear").addEventListener("click", function () { $("jf-in").value = ""; $("jf-out").value = ""; $("jf-msg").textContent = ""; });

      /* ============ 19. Base64 ============ */
      function b64EncodeText(str) {
        var bytes = new TextEncoder().encode(str), bin = "", i;
        for (i = 0; i < bytes.length; i += 8192) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
        }
        return btoa(bin);
      }
      function b64DecodeText(b64) {
        var bin = atob(b64.replace(/\s+/g, ""));
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      }
      $("b64-enc").addEventListener("click", function () {
        var v = $("b64-in").value, msg = $("b64-msg");
        if (!v) { msg.textContent = "Type something to encode first."; msg.className = "tool-msg err"; return; }
        $("b64-out").value = b64EncodeText(v);
        msg.textContent = "Encoded — " + fmtNum(v.length) + " characters → " + fmtNum($("b64-out").value.length) + " Base64 characters.";
        msg.className = "tool-msg";
      });
      $("b64-dec").addEventListener("click", function () {
        var v = $("b64-in").value.trim(), msg = $("b64-msg");
        if (!v) { msg.textContent = "Paste some Base64 to decode first."; msg.className = "tool-msg err"; return; }
        try {
          $("b64-out").value = b64DecodeText(v);
          msg.textContent = "Decoded successfully.";
          msg.className = "tool-msg";
        } catch (e) {
          msg.textContent = "That isn’t valid Base64 text — check for missing characters or extra spaces inside the code.";
          msg.className = "tool-msg err";
        }
      });
      $("b64-copy").addEventListener("click", function () { copyText($("b64-out").value, "Result copied"); });
      $("b64-swap").addEventListener("click", function () {
        if ($("b64-out").value) { $("b64-in").value = $("b64-out").value; $("b64-out").value = ""; $("b64-msg").textContent = ""; }
      });
      $("b64-clear").addEventListener("click", function () { $("b64-in").value = ""; $("b64-out").value = ""; $("b64-msg").textContent = ""; });

      /* ============ 20. Tip calculator ============ */
      function tipUpdate() {
        var bill = parseFloat($("tip-bill").value) || 0;
        var pct = parseFloat($("tip-pct").value) || 0;
        var people = Math.max(1, Math.round(parseFloat($("tip-people").value) || 1));
        var tip = bill * pct / 100, total = bill + tip;
        document.querySelectorAll("#tip-presets button").forEach(function (b) {
          b.setAttribute("aria-pressed", parseFloat(b.getAttribute("data-tip")) === pct ? "true" : "false");
        });
        $("tip-out").innerHTML =
          '<div class="stat-row">' +
          '<div class="stat"><b>' + fmtNum(tip) + '</b><span>Tip amount</span></div>' +
          '<div class="stat"><b>' + fmtNum(total) + '</b><span>Total to pay</span></div>' +
          '<div class="stat"><b>' + fmtNum(total / people) + '</b><span>Per person (total)</span></div>' +
          '<div class="stat"><b>' + fmtNum(tip / people) + '</b><span>Per person (tip)</span></div>' +
          "</div>" +
          '<p class="note" style="margin-bottom:0">Amounts are in whatever currency your bill is in. Rounding to a friendly total is always appreciated by staff.</p>';
      }
      ["tip-bill", "tip-pct", "tip-people"].forEach(function (id) { $(id).addEventListener("input", tipUpdate); });
      document.querySelectorAll("#tip-presets button").forEach(function (b) {
        b.addEventListener("click", function () { $("tip-pct").value = b.getAttribute("data-tip"); tipUpdate(); });
      });
      tipUpdate();

      /* ============ 21. Date calculator ============ */
      function dcToday(id) { var d = new Date(); $(id).value = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
      dcToday("dc-from"); dcToday("dc-to"); dcToday("dc-start");
      function dcParse(id) { var v = $(id).value; return v ? new Date(v + "T00:00:00") : null; }
      function fmtDate(d) { return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
      $("dc-diff-go").addEventListener("click", function () {
        var out = $("dc-diff-out"), a = dcParse("dc-from"), b = dcParse("dc-to");
        if (!a || !b) { out.innerHTML = '<p style="margin:0;font-weight:700">Pick both dates first.</p>'; return; }
        var days = Math.round((b - a) / 86400000);
        var abs = Math.abs(days);
        var weeks = Math.floor(abs / 7), rem = abs % 7;
        out.innerHTML =
          '<div class="stat-row">' +
          '<div class="stat"><b>' + fmtNum(abs) + '</b><span>Total days</span></div>' +
          '<div class="stat"><b>' + weeks + "w " + rem + 'd</b><span>Weeks + days</span></div>' +
          '<div class="stat"><b>' + fmtNum(abs * 24) + '</b><span>Total hours</span></div>' +
          "</div>" +
          '<p class="note" style="margin-bottom:0">' + (days === 0 ? "Both dates are the same day." : days > 0 ? "The second date is after the first." : "The second date is before the first — counted backwards.") + "</p>";
      });
      $("dc-add-go").addEventListener("click", function () {
        var out = $("dc-add-out"), start = dcParse("dc-start");
        var n = parseFloat($("dc-days").value);
        if (!start || isNaN(n)) { out.innerHTML = '<p style="margin:0;font-weight:700">Pick a start date and enter a number of days.</p>'; return; }
        var res = new Date(start.getTime());
        res.setDate(res.getDate() + Math.round(n) * parseInt($("dc-dir").value, 10));
        out.innerHTML =
          '<div class="stat-row"><div class="stat"><b>' + fmtDate(res) + '</b><span>Resulting date</span></div></div>' +
          '<p class="note" style="margin-bottom:0">' + Math.abs(Math.round(n)) + " day" + (Math.abs(Math.round(n)) === 1 ? "" : "s") + " " + (parseInt($("dc-dir").value, 10) > 0 ? "after" : "before") + " " + fmtDate(start) + ".</p>";
      });

      /* ============ 22. Random picker ============ */
      function cryptoIndex(max) {
        var arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        return arr[0] % max;
      }
      $("rp-pick").addEventListener("click", function () {
        var out = $("rp-out");
        var lines = $("rp-list").value.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lines.length) { out.innerHTML = '<p style="margin:0;font-weight:700">Add at least one name or item — one per line.</p>'; return; }
        var winner = lines[cryptoIndex(lines.length)];
        out.innerHTML = '<div class="big-pick">' + winner.replace(/[<>&"]/g, "") + '</div><p class="note" style="margin:0;text-align:center">Picked at random from ' + lines.length + " item" + (lines.length === 1 ? "" : "s") + ".</p>";
      });
      var coinH = 0, coinT = 0;
      $("rp-coin").addEventListener("click", function () {
        var heads = cryptoIndex(2) === 0;
        if (heads) coinH++; else coinT++;
        $("rp-fun-out").innerHTML = '<div class="big-pick">' + (heads ? "🪙 Heads" : "🪙 Tails") + '</div><p class="note" style="margin:0;text-align:center">This session: ' + coinH + " heads · " + coinT + " tails.</p>";
      });
      $("rp-dice").addEventListener("click", function () {
        var n = parseInt($("rp-dice-n").value, 10) || 1;
        var faces = "", total = 0;
        for (var i = 0; i < n; i++) { var v = cryptoIndex(6) + 1; total += v; faces += '<span class="die">' + v + "</span>"; }
        $("rp-fun-out").innerHTML = '<div class="dice-row">' + faces + '</div><p class="note" style="margin:0;text-align:center">Total: <b>' + total + "</b> from " + n + (n === 1 ? " die." : " dice.") + "</p>";
      });

      /* ============ 23. Countdown timer ============ */
      var cdTimerId = null;
      function cdTick() {
        var out = $("cd-out");
        var v = $("cd-target").value;
        if (!v) return;
        var target = new Date(v);
        var diff = target - new Date();
        if (diff <= 0) {
          if (cdTimerId) { clearInterval(cdTimerId); cdTimerId = null; }
          out.innerHTML = '<div class="big-pick">🎉 The moment has arrived</div><p class="note" style="margin:0;text-align:center">' + fmtDate(target) + " — the countdown has finished.</p>";
          beep(3);
          return;
        }
        var sec = Math.floor(diff / 1000);
        var d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
        out.innerHTML =
          '<div class="stat-row">' +
          '<div class="stat"><b>' + d + '</b><span>Days</span></div>' +
          '<div class="stat"><b>' + pad2(h) + '</b><span>Hours</span></div>' +
          '<div class="stat"><b>' + pad2(m) + '</b><span>Minutes</span></div>' +
          '<div class="stat"><b>' + pad2(s) + '</b><span>Seconds</span></div>' +
          "</div>" +
          '<p class="note" style="margin-bottom:0">Counting down to ' + fmtDate(target) + " at " + target.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + ".</p>";
      }
      function cdSetInput(date) {
        $("cd-target").value = date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate()) + "T" + pad2(date.getHours()) + ":" + pad2(date.getMinutes());
      }
      document.querySelectorAll("[data-cd]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          cdSetInput(new Date(Date.now() + parseInt(btn.getAttribute("data-cd"), 10) * 1000));
          $("cd-go").click();
        });
      });
      $("cd-go").addEventListener("click", function () {
        var v = $("cd-target").value;
        if (!v) { $("cd-out").innerHTML = '<p style="margin:0;font-weight:700">Pick a target date and time first — or use a quick-set button.</p>'; return; }
        if (new Date(v) <= new Date()) { $("cd-out").innerHTML = '<p style="margin:0;font-weight:700">That moment is already in the past — pick a future time.</p>'; return; }
        if (cdTimerId) clearInterval(cdTimerId);
        cdTick();
        cdTimerId = setInterval(cdTick, 500);
        toast("Countdown running");
      });

      /* ============ 24. AI Image Generator (Pollinations, advanced) ============ */
      var AI_STYLES = {
        photorealistic: ", photorealistic, ultra detailed, professional photography, sharp focus, natural light",
        anime: ", anime style, vibrant colours, detailed anime illustration",
        "3d": ", 3D render, octane render, soft studio lighting, highly detailed",
        oil: ", oil painting, classical art, visible brushstrokes, rich canvas texture",
        cyberpunk: ", cyberpunk style, neon lights, futuristic city mood, night, rain reflections",
        watercolor: ", watercolor painting, soft washes, delicate, paper texture",
        pixel: ", pixel art, 16-bit retro game style, crisp pixels"
      };
      var AI_IDEAS = [
        "A golden castle floating above the clouds at sunset, digital painting",
        "A cute robot drinking tea in a garden full of flowers, storybook illustration",
        "A busy night market with neon signs and crowds of people, photograph",
        "A majestic lion with a glowing mane under a starry sky",
        "A cozy wooden cabin in snowy mountains, smoke rising from the chimney, warm light in the windows",
        "A futuristic city with flying cars and tall glass towers at dusk",
        "An ancient library with towering shelves and a shaft of golden sunlight",
        "A red sports car driving along a coastal road at golden hour, photograph",
        "A dragon made of flowers flying over a spring valley",
        "A tiny treehouse village inside a glowing mushroom forest at night",
        "A hot air balloon festival over green hills at sunrise, photograph",
        "A waterfall of liquid gold pouring into a crystal lake, fantasy art"
      ];
      var aiBusy = false;
      var aiHistory = [];
      try {
        aiHistory = JSON.parse(localStorage.getItem("tzq-ai-history") || "[]");
        if (!Array.isArray(aiHistory)) aiHistory = [];
      } catch (e) { aiHistory = []; }
      var aiLb = null;

      function aiStyled(base, styleKey) { return base + (AI_STYLES[styleKey] || ""); }
      function aiSizeWH() {
        if ($("ai-size").value === "custom") {
          var w = Math.min(2048, Math.max(256, parseInt($("ai-w").value, 10) || 1024));
          var h = Math.min(2048, Math.max(256, parseInt($("ai-h").value, 10) || 1024));
          return [w, h];
        }
        var p = $("ai-size").value.split("x");
        return [parseInt(p[0], 10), parseInt(p[1], 10)];
      }
      function aiUrlFor(item) {
        var u = "https://image.pollinations.ai/prompt/" + encodeURIComponent(aiStyled(item.prompt, item.style)) +
          "?width=" + item.w + "&height=" + item.h + "&seed=" + item.seed + "&model=" + item.model;
        if ($("ai-enhance").checked) u += "&enhance=true";
        if ($("ai-private").checked) u += "&private=true";
        if ($("ai-nologo").checked) u += "&nologo=true";
        return u;
      }
      function aiSaveHistory() {
        try { localStorage.setItem("tzq-ai-history", JSON.stringify(aiHistory.slice(0, 24))); } catch (e) {}
      }
      function aiOpenLightbox(item) {
        aiLb = item;
        $("ai-lb-img").src = item.url;
        $("ai-lb-cap").textContent = "“" + item.prompt + "” · seed " + item.seed + " · " + item.model + " · " + item.w + "×" + item.h;
        $("ai-lightbox").classList.add("open");
      }
      function aiCloseLightbox() { $("ai-lightbox").classList.remove("open"); }
      function aiRenderHistory() {
        var wrap = $("ai-history-wrap"), box = $("ai-history");
        box.innerHTML = "";
        wrap.style.display = aiHistory.length ? "block" : "none";
        aiHistory.forEach(function (item) {
          var d = document.createElement("div");
          d.className = "hist-item";
          var im = document.createElement("img");
          im.src = item.url; im.alt = "Earlier picture: " + item.prompt; im.loading = "lazy";
          im.addEventListener("click", function () { aiOpenLightbox(item); });
          var b = document.createElement("button");
          b.type = "button"; b.className = "btn ghost small hist-seed";
          b.textContent = "Use seed " + item.seed;
          b.addEventListener("click", function () {
            $("ai-prompt").value = item.prompt;
            $("ai-style").value = item.style || "";
            $("ai-model").value = item.model || "flux";
            $("ai-seed").value = item.seed;
            var preset = item.w + "x" + item.h;
            var hasPreset = false;
            Array.prototype.forEach.call($("ai-size").options, function (o) { if (o.value === preset) hasPreset = true; });
            if (hasPreset) { $("ai-size").value = preset; $("ai-custom-size").style.display = "none"; }
            else { $("ai-size").value = "custom"; $("ai-w").value = item.w; $("ai-h").value = item.h; $("ai-custom-size").style.display = "grid"; }
            $("ai-adv").open = true;
            var m = $("ai-msg");
            m.textContent = "Loaded that picture’s words, style and seed — press “Generate image” to remake it.";
            m.className = "tool-msg";
            $("panel-aiimage").scrollIntoView({ behavior: "smooth", block: "start" });
          });
          d.appendChild(im); d.appendChild(b);
          box.appendChild(d);
        });
      }
      function aiConvertAndDownload(item) {
        var fmt = $("ai-format").value;
        var ext = fmt === "image/png" ? "png" : fmt === "image/webp" ? "webp" : "jpg";
        fetch(item.url).then(function (r) {
          if (!r.ok) throw new Error("bad");
          return r.blob();
        }).then(function (blob) {
          var objUrl = URL.createObjectURL(blob);
          var im = new Image();
          im.onload = function () {
            var c = document.createElement("canvas");
            c.width = im.naturalWidth; c.height = im.naturalHeight;
            var cx = c.getContext("2d");
            if (fmt === "image/jpeg") { cx.fillStyle = "#ffffff"; cx.fillRect(0, 0, c.width, c.height); }
            cx.drawImage(im, 0, 0);
            URL.revokeObjectURL(objUrl);
            if (c.toBlob) {
              c.toBlob(function (b) {
                if (b) { downloadBlob(b, "ai-image-" + item.seed + "." + ext); toast("Image downloading (" + ext.toUpperCase() + ")"); }
                else downloadBlob(blob, "ai-image-" + item.seed + ".jpg");
              }, fmt, 0.92);
            } else downloadBlob(blob, "ai-image-" + item.seed + ".jpg");
          };
          im.onerror = function () { URL.revokeObjectURL(objUrl); window.open(item.url, "_blank"); };
          im.src = objUrl;
        }).catch(function () {
          window.open(item.url, "_blank");
          toast("Opened the image in a new tab — save it from there");
        });
      }
      function aiCopyImage(item) {
        if (!(navigator.clipboard && window.ClipboardItem)) { toast("Copying images isn’t supported in this browser — use Download instead"); return; }
        fetch(item.url).then(function (r) {
          if (!r.ok) throw new Error("bad");
          return r.blob();
        }).then(function (blob) {
          var objUrl = URL.createObjectURL(blob);
          var im = new Image();
          im.onload = function () {
            var c = document.createElement("canvas");
            c.width = im.naturalWidth; c.height = im.naturalHeight;
            c.getContext("2d").drawImage(im, 0, 0);
            URL.revokeObjectURL(objUrl);
            c.toBlob(function (png) {
              if (!png) { toast("Copy failed — use Download instead"); return; }
              var data = {}; data["image/png"] = png;
              navigator.clipboard.write([new ClipboardItem(data)]).then(
                function () { toast("Image copied — paste it anywhere"); },
                function () { toast("Copy was blocked by the browser — use Download instead"); }
              );
            }, "image/png");
          };
          im.onerror = function () { URL.revokeObjectURL(objUrl); toast("Copy failed — use Download instead"); };
          im.src = objUrl;
        }).catch(function () { toast("Copy failed — use Download instead"); });
      }
      function aiGenerate() {
        var base = $("ai-prompt").value.trim();
        var msg = $("ai-msg");
        if (!base) {
          msg.textContent = "Describe the picture first — a sentence works best. Or tap one of the ideas above.";
          msg.className = "tool-msg err";
          $("ai-prompt").focus();
          return;
        }
        if (aiBusy) return;
        aiBusy = true;
        $("ai-go").textContent = "Generating…";
        var wh = aiSizeWH(), w = wh[0], h = wh[1];
        var count = parseInt($("ai-count").value, 10) || 1;
        var seedVal = $("ai-seed").value.trim();
        var baseSeed = seedVal === "" ? Math.floor(Math.random() * 999999) : Math.max(0, parseInt(seedVal, 10) || 0);
        var model = $("ai-model").value;
        var styleKey = $("ai-style").value;
        var grid = $("ai-results");
        grid.innerHTML = "";
        msg.textContent = count > 1 ? "Making " + count + " pictures for you — this can take up to a minute…" : "Making your picture — this usually takes 5–20 seconds…";
        msg.className = "tool-msg";
        var doneCount = 0, okCount = 0;
        function finishOne() {
          doneCount++;
          if (doneCount !== count) return;
          aiBusy = false;
          $("ai-go").textContent = "Generate image";
          if (okCount) {
            msg.textContent = okCount === 1 ? "Done — your picture is ready below. Tap it to see it big." : "Done — " + okCount + " of " + count + " pictures ready below. Tap any picture to see it big.";
            msg.className = "tool-msg";
          } else {
            msg.textContent = "The AI image service couldn’t be reached (image.pollinations.ai). Check your connection and try again — nothing was generated.";
            msg.className = "tool-msg err";
          }
        }
        for (var i = 0; i < count; i++) {
          (function (seed) {
            var item = { prompt: base, style: styleKey, seed: seed, model: model, w: w, h: h };
            item.url = aiUrlFor(item);
            var card = document.createElement("div");
            card.className = "ai-card";
            var load = document.createElement("div");
            load.className = "ai-loading";
            load.textContent = "Generating…";
            card.appendChild(load);
            grid.appendChild(card);
            var probe = new Image();
            var settled = false;
            var to = setTimeout(function () {
              if (settled) return;
              settled = true;
              load.textContent = "This one timed out — the free service may be busy. Try again in a moment.";
              finishOne();
            }, 90000);
            probe.onload = function () {
              if (settled) return;
              settled = true;
              clearTimeout(to);
              card.innerHTML = "";
              var pic = document.createElement("img");
              pic.src = item.url;
              pic.alt = "AI-generated image: " + base;
              pic.addEventListener("click", function () { aiOpenLightbox(item); });
              var body = document.createElement("div");
              body.className = "ai-card-body";
              var meta = document.createElement("div");
              meta.className = "ai-meta";
              meta.textContent = "Seed " + seed + " · " + model + " · " + w + "×" + h;
              var row = document.createElement("div");
              row.className = "btn-row";
              var dl = document.createElement("button");
              dl.type = "button"; dl.className = "btn small"; dl.textContent = "Download";
              dl.addEventListener("click", function () { aiConvertAndDownload(item); });
              var ci = document.createElement("button");
              ci.type = "button"; ci.className = "btn ghost small"; ci.textContent = "Copy image";
              ci.addEventListener("click", function () { aiCopyImage(item); });
              var cp = document.createElement("button");
              cp.type = "button"; cp.className = "btn ghost small"; cp.textContent = "Copy prompt";
              cp.addEventListener("click", function () { copyText(aiStyled(item.prompt, item.style), "Prompt copied"); });
              row.appendChild(dl); row.appendChild(ci); row.appendChild(cp);
              body.appendChild(meta); body.appendChild(row);
              card.appendChild(pic); card.appendChild(body);
              okCount++;
              aiHistory.unshift(item);
              aiSaveHistory();
              aiRenderHistory();
              finishOne();
            };
            probe.onerror = function () {
              if (settled) return;
              settled = true;
              clearTimeout(to);
              load.textContent = "The service didn’t answer for this one — nothing was generated. Try again in a few seconds.";
              finishOne();
            };
            probe.src = item.url;
          })(baseSeed + i);
        }
      }
      $("ai-go").addEventListener("click", aiGenerate);
      $("ai-prompt").addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); aiGenerate(); }
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-ai-idea]"), function (b) {
        b.addEventListener("click", function () {
          $("ai-prompt").value = b.getAttribute("data-ai-idea");
          $("ai-prompt").focus();
        });
      });
      $("ai-surprise").addEventListener("click", function () {
        $("ai-prompt").value = AI_IDEAS[Math.floor(Math.random() * AI_IDEAS.length)];
        aiGenerate();
      });
      $("ai-size").addEventListener("change", function () {
        $("ai-custom-size").style.display = this.value === "custom" ? "grid" : "none";
      });
      $("ai-seed-random").addEventListener("click", function () {
        $("ai-seed").value = Math.floor(Math.random() * 999999);
        toast("Random seed set");
      });
      $("ai-clear-history").addEventListener("click", function () {
        aiHistory = [];
        aiSaveHistory();
        aiRenderHistory();
        toast("History cleared");
      });
      $("ai-lb-close").addEventListener("click", aiCloseLightbox);
      $("ai-lightbox").addEventListener("click", function (e) { if (e.target === this) aiCloseLightbox(); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") aiCloseLightbox(); });
      $("ai-lb-download").addEventListener("click", function () { if (aiLb) aiConvertAndDownload(aiLb); });
      $("ai-lb-copyimg").addEventListener("click", function () { if (aiLb) aiCopyImage(aiLb); });
      $("ai-lb-copyprompt").addEventListener("click", function () { if (aiLb) copyText(aiStyled(aiLb.prompt, aiLb.style), "Prompt copied"); });
      aiRenderHistory();

      /* ============ 25. Video Maker (canvas + MediaRecorder) ============ */
      function pickVideoMime() {
        var mime = "";
        ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].forEach(function (m) {
          if (!mime && window.MediaRecorder && MediaRecorder.isTypeSupported(m)) mime = m;
        });
        return mime;
      }
      /* Records a canvas in real time for totalSec seconds, calling draw(tSec) every frame.
         Optionally mixes an uploaded music file into the recording. Fully on-device.
         If a format claims support but produces an empty file (some browsers do this
         with MP4), it automatically retries with the next format — WebM after MP4. */
      function recordCanvasVideo(canvas, totalSec, draw, opts) {
        if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
          opts.onError("This browser can’t record canvas video (MediaRecorder is missing). Try Chrome, Edge, Safari or Firefox on a recent device.");
          return;
        }
        var mimes = [];
        ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].forEach(function (m) {
          if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) mimes.push(m);
        });
        if (!mimes.length) mimes.push("");
        attempt(0);
        function attempt(mi) {
          var mime = mimes[mi];
          var stream = canvas.captureStream(30);
          var audioCtx = null, audioDest = null, musicNote = "";
          function startRec() {
            var rec;
            try {
              var recOpts = { videoBitsPerSecond: opts.highQuality ? 12000000 : 5000000 };
              if (mime) recOpts.mimeType = mime;
              if (audioDest) recOpts.audioBitsPerSecond = 128000;
              rec = new MediaRecorder(stream, recOpts);
            } catch (e) {
              if (mi < mimes.length - 1) { attempt(mi + 1); return; }
              opts.onError("Video recording isn’t supported in this browser. Try a recent Chrome, Edge, Safari or Firefox.");
              return;
            }
            var chunks = [];
            rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
            rec.onstop = function () {
              if (audioCtx) { try { audioCtx.close(); } catch (e) {} }
              var type = rec.mimeType || mime || "video/webm";
              var blob = new Blob(chunks, { type: type.split(";")[0] });
              blob._ext = type.indexOf("mp4") !== -1 ? "mp4" : "webm";
              if (!blob.size) {
                if (mi < mimes.length - 1) { attempt(mi + 1); return; }
                opts.onError("The recording came out empty in this browser — nothing was saved. Try Chrome, Edge, Safari or Firefox on a recent device.");
                return;
              }
              opts.onDone(blob, blob._ext, musicNote);
            };
            rec.start(250);
            var t0 = performance.now();
            var totalMs = totalSec * 1000;
            (function frame(now) {
              var el = now - t0;
              if (el >= totalMs) {
                draw(totalSec);
                setTimeout(function () { try { rec.stop(); } catch (e) {} }, 120);
                return;
              }
              draw(el / 1000);
              if (opts.onProgress) opts.onProgress(Math.min(100, Math.round(el / totalMs * 100)), Math.ceil((totalMs - el) / 1000));
              requestAnimationFrame(frame);
            })(t0);
          }
          if (opts.musicFile) {
            try {
              var AC = window.AudioContext || window.webkitAudioContext;
              audioCtx = new AC();
              if (audioCtx.state === "suspended" && audioCtx.resume) audioCtx.resume();
              audioDest = audioCtx.createMediaStreamDestination();
              opts.musicFile.arrayBuffer().then(function (buf) {
                return audioCtx.decodeAudioData(buf);
              }).then(function (decoded) {
                var src = audioCtx.createBufferSource();
                src.buffer = decoded;
                src.loop = true;
                var gain = audioCtx.createGain();
                var t = audioCtx.currentTime;
                var v = opts.musicVol;
                var fadeLen = Math.min(2, totalSec / 4);
                if (opts.fadeIn) {
                  gain.gain.setValueAtTime(0.0001, t);
                  gain.gain.exponentialRampToValueAtTime(Math.max(v, 0.0001), t + fadeLen);
                } else {
                  gain.gain.setValueAtTime(v, t);
                }
                if (opts.fadeOut) {
                  var outStart = Math.max(t + fadeLen, t + totalSec - Math.min(2.5, totalSec / 4));
                  gain.gain.setValueAtTime(Math.max(v, 0.0001), outStart);
                  gain.gain.exponentialRampToValueAtTime(0.0001, t + totalSec);
                }
                src.connect(gain);
                gain.connect(audioDest);
                stream.addTrack(audioDest.stream.getAudioTracks()[0]);
                src.start(0);
                try { src.stop(t + totalSec + 0.3); } catch (e) {}
                musicNote = "with your music mixed in";
                startRec();
              }).catch(function () {
                musicNote = "the music file couldn’t be read, so the video is silent";
                try { audioCtx.close(); } catch (e) {}
                audioCtx = null; audioDest = null;
                startRec();
              });
            } catch (e) {
              musicNote = "music mixing isn’t supported in this browser, so the video is silent";
              audioCtx = null; audioDest = null;
              startRec();
            }
          } else {
            startRec();
          }
        }
      }

      /* Fast export: draws frames to the canvas and encodes them with WebCodecs
         (VideoEncoder) as fast as the device allows — no real-time wait. Output is
         MP4 (H.264 + AAC) where the browser supports it, otherwise WebM (VP9/VP8 +
         Opus). Music, when added, is decoded and encoded into the file with the
         same volume/fade settings as the real-time recorder. If anything needed
         for fast export is unavailable (no WebCodecs, muxer failed to load, no
         supported codec, or music can't be encoded), opts.onUnsupported(reason)
         fires and callers fall back to the real-time recording — honestly. */
      function fastExportVideo(canvas, totalSec, draw, opts) {
        var FPS = 30;
        var W = canvas.width, H = canvas.height;
        var bitrate = opts.highQuality ? 12000000 : 5000000;
        var failed = false;
        function unsupported(reason) { if (!failed) { failed = true; opts.onUnsupported(reason); } }
        function fail(e) {
          if (failed) return;
          unsupported(e && e.message ? e.message : "fast export failed");
        }
        if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") {
          unsupported("this browser has no WebCodecs video encoder");
          return;
        }
        (async function () {
          var musicBuf = null, actx = null;
          try {
            /* Decode the music first (if any) so the audio plan uses its real rate/channels. */
            if (opts.musicFile) {
              var AC = window.AudioContext || window.webkitAudioContext;
              if (!AC || typeof AudioEncoder === "undefined" || typeof AudioData === "undefined") {
                unsupported("music can't be encoded for fast export in this browser");
                return;
              }
              actx = new AC();
              var raw = await opts.musicFile.arrayBuffer();
              musicBuf = await actx.decodeAudioData(raw);
            }
            /* ---- plan: MP4 (H.264/AAC) preferred, WebM (VP9/VP8/Opus) fallback ---- */
            var plan = null;
            var avcCodecs = ["avc1.640033", "avc1.640028", "avc1.4d0028", "avc1.42001f"];
            if (window.Mp4Muxer) {
              for (var ci = 0; ci < avcCodecs.length && !plan; ci++) {
                var vc = { codec: avcCodecs[ci], width: W, height: H, bitrate: bitrate, framerate: FPS };
                var vs = await VideoEncoder.isConfigSupported(vc).catch(function () { return null; });
                if (vs && vs.supported) {
                  plan = { format: "mp4", videoConfig: vs.config || vc, audioCodec: null, audioConfig: null };
                  if (musicBuf) {
                    var ac = { codec: "mp4a.40.2", sampleRate: musicBuf.sampleRate, numberOfChannels: Math.min(2, musicBuf.numberOfChannels), bitrate: 128000 };
                    var as = await AudioEncoder.isConfigSupported(ac).catch(function () { return null; });
                    if (as && as.supported) { plan.audioConfig = as.config || ac; plan.audioCodec = "aac"; }
                    else plan = null; /* music must be included — try the WebM plan instead */
                  }
                }
              }
            }
            if (!plan && window.WebMMuxer) {
              var webmCodecs = ["vp09.00.10.08", "vp8"];
              for (var wi = 0; wi < webmCodecs.length && !plan; wi++) {
                var wvc = { codec: webmCodecs[wi], width: W, height: H, bitrate: bitrate, framerate: FPS };
                var wvs = await VideoEncoder.isConfigSupported(wvc).catch(function () { return null; });
                if (wvs && wvs.supported) {
                  plan = { format: "webm", videoConfig: wvs.config || wvc, audioCodec: null, audioConfig: null };
                  if (musicBuf) {
                    var oac = { codec: "opus", sampleRate: musicBuf.sampleRate, numberOfChannels: Math.min(2, musicBuf.numberOfChannels), bitrate: 128000 };
                    var oas = await AudioEncoder.isConfigSupported(oac).catch(function () { return null; });
                    if (oas && oas.supported) { plan.audioConfig = oas.config || oac; plan.audioCodec = "opus"; }
                    else plan = null;
                  }
                }
              }
            }
            if (!plan) {
              if (actx) { try { actx.close(); } catch (e) {} }
              unsupported(musicBuf ? "no fast codec here can include your music" : "no supported fast video codec in this browser");
              return;
            }
            /* ---- muxer ---- */
            var muxer, target;
            if (plan.format === "mp4") {
              target = new Mp4Muxer.ArrayBufferTarget();
              var mopts = {
                target: target,
                video: { codec: "avc", width: W, height: H },
                fastStart: "in-memory",
                firstTimestampBehavior: "offset"
              };
              if (plan.audioConfig) mopts.audio = { codec: "aac", sampleRate: plan.audioConfig.sampleRate, numberOfChannels: plan.audioConfig.numberOfChannels };
              muxer = new Mp4Muxer.Muxer(mopts);
            } else {
              target = new WebMMuxer.ArrayBufferTarget();
              var wopts = {
                target: target,
                video: { codec: plan.videoConfig.codec.indexOf("vp09") === 0 ? "V_VP9" : "V_VP8", width: W, height: H },
                firstTimestampBehavior: "offset"
              };
              if (plan.audioConfig) wopts.audio = { codec: "A_OPUS", sampleRate: plan.audioConfig.sampleRate, numberOfChannels: plan.audioConfig.numberOfChannels };
              muxer = new WebMMuxer.Muxer(wopts);
            }
            var encErr = null;
            var encoder = new VideoEncoder({
              output: function (chunk, meta) { try { muxer.addVideoChunk(chunk, meta); } catch (e) { encErr = encErr || e; } },
              error: function (e) { encErr = encErr || e; }
            });
            encoder.configure(plan.videoConfig);
            var audioEncoder = null;
            if (plan.audioConfig) {
              audioEncoder = new AudioEncoder({
                output: function (chunk, meta) { try { muxer.addAudioChunk(chunk, meta); } catch (e) { encErr = encErr || e; } },
                error: function (e) { encErr = encErr || e; }
              });
              audioEncoder.configure(plan.audioConfig);
            }
            /* ---- encode music (looped to the full length, volume + fades baked in) ---- */
            var musicNote = "";
            if (musicBuf && audioEncoder) {
              var sr = musicBuf.sampleRate;
              var ch = Math.min(2, musicBuf.numberOfChannels);
              var chanData = [];
              for (var c = 0; c < ch; c++) chanData.push(musicBuf.getChannelData(c));
              var totalSamples = Math.max(1, Math.round(totalSec * sr));
              var block = 1024;
              var gainAt = function (t) {
                var v = opts.musicVol, g = v;
                var fadeLen = Math.min(2, totalSec / 4);
                if (opts.fadeIn && t < fadeLen) g = 0.0001 * Math.pow(Math.max(v, 0.0001) / 0.0001, t / fadeLen); /* same exponential ramp as the real-time recorder */
                if (opts.fadeOut) {
                  var outLen = Math.min(2.5, totalSec / 4);
                  var outStart = Math.max(opts.fadeIn ? fadeLen : 0, totalSec - outLen);
                  if (t >= outStart) g = Math.max(v, 0.0001) * Math.pow(0.0001 / Math.max(v, 0.0001), (t - outStart) / Math.max(0.01, totalSec - outStart));
                }
                return g;
              };
              for (var off = 0; off < totalSamples; off += block) {
                if (encErr) throw encErr;
                var n = Math.min(block, totalSamples - off);
                var buf = new Float32Array(n * ch);
                for (var cc = 0; cc < ch; cc++) {
                  var src = chanData[Math.min(cc, musicBuf.numberOfChannels - 1)];
                  var base = cc * n;
                  for (var s = 0; s < n; s++) {
                    var idx = off + s;
                    buf[base + s] = src[idx % musicBuf.length] * gainAt(idx / sr);
                  }
                }
                var ad = new AudioData({
                  format: "f32-planar",
                  sampleRate: sr,
                  numberOfFrames: n,
                  numberOfChannels: ch,
                  timestamp: Math.round(off * 1000000 / sr),
                  data: buf.buffer
                });
                audioEncoder.encode(ad);
                ad.close();
                if (audioEncoder.encodeQueueSize > 16) await new Promise(function (r) { setTimeout(r, 0); });
              }
              await audioEncoder.flush();
              audioEncoder.close();
              musicNote = "with your music mixed in";
            }
            /* ---- encode video frames as fast as the device allows ---- */
            var totalFrames = Math.max(1, Math.round(totalSec * FPS));
            var frameDurUs = Math.round(1000000 / FPS);
            for (var i = 0; i < totalFrames; i++) {
              if (encErr) throw encErr;
              draw(i / FPS);
              var frame = new VideoFrame(canvas, { timestamp: i * frameDurUs, duration: frameDurUs });
              encoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
              frame.close();
              if (opts.onProgress) opts.onProgress(Math.round((i + 1) / totalFrames * 100), i + 1, totalFrames);
              if (encoder.encodeQueueSize > 10 || i % 12 === 11) await new Promise(function (r) { setTimeout(r, 0); });
            }
            await encoder.flush();
            encoder.close();
            if (encErr) throw encErr;
            muxer.finalize();
            if (actx) { try { actx.close(); } catch (e) {} }
            var blob = new Blob([target.buffer], { type: plan.format === "mp4" ? "video/mp4" : "video/webm" });
            blob._ext = plan.format;
            if (!blob.size) { unsupported("the fast export came out empty"); return; }
            opts.onDone(blob, plan.format, musicNote);
          } catch (err) {
            if (actx) { try { actx.close(); } catch (e) {} }
            fail(err);
          }
        })();
      }

      /* ---------- 25a. Slideshow mode (Images se) ---------- */
      var VM_FILTERS = { none: "", gray: "grayscale(1)", sepia: "sepia(0.85)", bright: "brightness(1.3) saturate(1.15)" };
      var vmScenes = []; // { img, url, dataUrl, caption, dur, filter, filterCss }
      var vmBlob = null, vmBuilding = false;
      var vmMusicFile = null, vmMusicUrl = null;
      var vmLogoImg = null, vmLogoDataUrl = null;
      var vmPreviewing = false, vmPreviewT = 0, vmPreviewLast = 0, vmPreviewRaf = 0;

      function vmSettings() {
        return {
          trans: $("vm-trans").value,
          textPos: $("vm-text-pos").value,
          textSize: parseInt($("vm-text-size").value, 10) / 100,
          textColor: $("vm-text-color").value,
          textAnim: $("vm-text-anim").value
        };
      }
      function vmTotalSec() { return vmScenes.reduce(function (a, s) { return a + s.dur; }, 0); }
      function vmUpdateTotal() {
        var t = vmTotalSec();
        $("vm-total").textContent = "Total length: about " + (t % 1 ? t.toFixed(1) : t) + " seconds · " + vmScenes.length + " scene" + (vmScenes.length === 1 ? "" : "s");
      }
      function vmDrawImage(ctx, W, H, sc, o) {
        ctx.save();
        ctx.globalAlpha = o.alpha;
        if (sc.filterCss) { try { ctx.filter = sc.filterCss; } catch (e) {} }
        var iw = sc.img.naturalWidth, ih = sc.img.naturalHeight;
        var scale = Math.max(W / iw, H / ih) * (o.scale || 1);
        var dw = iw * scale, dh = ih * scale;
        ctx.drawImage(sc.img, (W - dw) / 2 + (o.dx || 0), (H - dh) / 2, dw, dh);
        ctx.restore();
      }
      function vmDrawCaption(ctx, W, H, sc, st, sceneT, alpha) {
        var cap = (sc.caption || "").trim();
        if (!cap) return;
        var a = alpha, yOff = 0;
        if (st.textAnim === "fade") a *= Math.min(1, sceneT / 0.5);
        else if (st.textAnim === "slide") { var p = Math.min(1, sceneT / 0.5); yOff = (1 - p) * H * 0.05; }
        if (a <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = a;
        var fs = Math.round(W * 0.045 * st.textSize);
        ctx.font = "800 " + fs + "px Manrope, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        var maxW = W * 0.88;
        var words = cap.split(/\s+/), lines = [], line = "";
        words.forEach(function (w) {
          var test = line ? line + " " + w : w;
          if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
        });
        if (line) lines.push(line);
        var lh = fs * 1.3, blockH = lines.length * lh + fs * 0.7;
        var y0;
        if (st.textPos === "top") y0 = Math.round(H * 0.045) + yOff;
        else if (st.textPos === "center") y0 = (H - blockH) / 2 + yOff;
        else y0 = H - blockH - Math.round(H * 0.045) + yOff;
        var widest = 0;
        lines.forEach(function (l) { widest = Math.max(widest, ctx.measureText(l).width); });
        var bw = Math.min(W * 0.94, widest + fs * 1.1);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect((W - bw) / 2, y0, bw, blockH, 14); else ctx.rect((W - bw) / 2, y0, bw, blockH);
        ctx.fill();
        ctx.fillStyle = st.textColor;
        lines.forEach(function (l, i) { ctx.fillText(l, W / 2, y0 + fs * 0.35 + lh * (i + 0.5)); });
        ctx.restore();
      }
      function vmDrawFrame(ctx, W, H, t) {
        var st = vmSettings();
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        if (!vmScenes.length) return;
        var trans = st.trans;
        var transDur = trans === "cut" ? 0 : 0.6;
        var acc = 0, idx = vmScenes.length - 1, sceneT = vmScenes[idx].dur;
        for (var i = 0; i < vmScenes.length; i++) {
          if (t < acc + vmScenes[i].dur || i === vmScenes.length - 1) { idx = i; sceneT = t - acc; break; }
          acc += vmScenes[i].dur;
        }
        var sc = vmScenes[idx];
        var inTrans = transDur > 0 && idx < vmScenes.length - 1 && sceneT > sc.dur - transDur;
        var p = inTrans ? (sceneT - (sc.dur - transDur)) / transDur : 0;
        if (trans === "slide" && inTrans) {
          vmDrawImage(ctx, W, H, sc, { alpha: 1, dx: -p * W });
          vmDrawImage(ctx, W, H, vmScenes[idx + 1], { alpha: 1, dx: (1 - p) * W });
        } else if (trans === "zoom") {
          vmDrawImage(ctx, W, H, sc, { alpha: 1, scale: 1 + 0.12 * Math.min(1, Math.max(0, sceneT / sc.dur)) });
          if (inTrans) vmDrawImage(ctx, W, H, vmScenes[idx + 1], { alpha: p, scale: 1 });
        } else {
          vmDrawImage(ctx, W, H, sc, { alpha: 1 });
          if (inTrans) vmDrawImage(ctx, W, H, vmScenes[idx + 1], { alpha: p });
        }
        if (inTrans) {
          vmDrawCaption(ctx, W, H, sc, st, sceneT, 1 - p);
          vmDrawCaption(ctx, W, H, vmScenes[idx + 1], st, 0, p);
        } else {
          vmDrawCaption(ctx, W, H, sc, st, sceneT, 1);
        }
        if (vmLogoImg) {
          var lw = W * 0.14, lh2 = lw * vmLogoImg.naturalHeight / Math.max(1, vmLogoImg.naturalWidth);
          var m = Math.round(W * 0.03), pos = $("vm-logo-pos").value;
          var lx = (pos === "tl" || pos === "bl") ? m : W - lw - m;
          var ly = (pos === "tl" || pos === "tr") ? m : H - lh2 - m;
          ctx.save();
          ctx.globalAlpha = 0.92;
          ctx.drawImage(vmLogoImg, lx, ly, lw, lh2);
          ctx.restore();
        }
      }
      function vmSyncStageSize() {
        var parts = $("vm-size").value.split("x");
        var c = $("vm-stage");
        c.width = parseInt(parts[0], 10);
        c.height = parseInt(parts[1], 10);
      }
      function vmDrawPreviewStill() {
        if (!vmScenes.length) return;
        vmSyncStageSize();
        var c = $("vm-stage");
        vmDrawFrame(c.getContext("2d"), c.width, c.height, Math.min(vmPreviewT, Math.max(0, vmTotalSec() - 0.01)));
      }
      function vmStopPreview() {
        vmPreviewing = false;
        cancelAnimationFrame(vmPreviewRaf);
        $("vm-preview").textContent = "Play preview";
        var a = $("vm-music-audio");
        if (a) a.pause();
      }
      function vmRenderScenes() {
        var box = $("vm-scenes");
        box.innerHTML = "";
        vmScenes.forEach(function (sc, i) {
          var row = document.createElement("div");
          row.className = "scene-row";
          var im = document.createElement("img");
          im.src = sc.url; im.alt = "Scene " + (i + 1) + " photo";
          var right = document.createElement("div");
          var lab = document.createElement("label");
          lab.textContent = "Scene " + (i + 1) + " — words on this photo (optional)";
          lab.style.cssText = "display:block;font-weight:700;font-size:.9rem;margin-bottom:7px";
          var inp = document.createElement("input");
          inp.type = "text"; inp.className = "scene-cap"; inp.value = sc.caption;
          inp.placeholder = "Text shown on this scene…";
          inp.addEventListener("input", function () { sc.caption = inp.value; vmDrawPreviewStill(); });
          var ctrls = document.createElement("div");
          ctrls.className = "btn-row";
          var up = document.createElement("button");
          up.type = "button"; up.className = "btn ghost small"; up.textContent = "↑ Move up"; up.disabled = i === 0;
          up.addEventListener("click", function () { var t = vmScenes[i - 1]; vmScenes[i - 1] = vmScenes[i]; vmScenes[i] = t; vmRenderScenes(); vmDrawPreviewStill(); });
          var dn = document.createElement("button");
          dn.type = "button"; dn.className = "btn ghost small"; dn.textContent = "↓ Move down"; dn.disabled = i === vmScenes.length - 1;
          dn.addEventListener("click", function () { var t = vmScenes[i + 1]; vmScenes[i + 1] = vmScenes[i]; vmScenes[i] = t; vmRenderScenes(); vmDrawPreviewStill(); });
          var rm = document.createElement("button");
          rm.type = "button"; rm.className = "btn ghost small"; rm.textContent = "Remove";
          rm.addEventListener("click", function () {
            if (vmScenes[i].url && vmScenes[i].url.indexOf("blob:") === 0) URL.revokeObjectURL(vmScenes[i].url);
            vmScenes.splice(i, 1);
            if (!vmScenes.length) { $("vm-editor").style.display = "none"; vmStopPreview(); }
            vmRenderScenes(); vmDrawPreviewStill();
          });
          ctrls.appendChild(up); ctrls.appendChild(dn); ctrls.appendChild(rm);
          var det = document.createElement("details");
          det.className = "mini-adv";
          var sum = document.createElement("summary");
          sum.textContent = "Scene settings — time on screen & filter";
          var body = document.createElement("div");
          body.className = "adv-body";
          var dLab = document.createElement("label");
          dLab.style.cssText = "display:block;font-weight:700;font-size:.88rem;margin:10px 0 6px";
          dLab.textContent = "Stays on screen — " + sc.dur + "s";
          var dRange = document.createElement("input");
          dRange.type = "range"; dRange.min = "1"; dRange.max = "10"; dRange.step = "0.5"; dRange.value = sc.dur;
          dRange.addEventListener("input", function () {
            sc.dur = parseFloat(dRange.value);
            dLab.textContent = "Stays on screen — " + sc.dur + "s";
            vmUpdateTotal();
          });
          var fLab = document.createElement("label");
          fLab.style.cssText = "display:block;font-weight:700;font-size:.88rem;margin:12px 0 6px";
          fLab.textContent = "Photo filter";
          var fSel = document.createElement("select");
          [["none", "No filter"], ["gray", "Black & white"], ["sepia", "Sepia — warm old-photo look"], ["bright", "Brighter & richer"]].forEach(function (o) {
            var op = document.createElement("option");
            op.value = o[0]; op.textContent = o[1];
            fSel.appendChild(op);
          });
          fSel.value = sc.filter;
          fSel.addEventListener("change", function () {
            sc.filter = fSel.value;
            sc.filterCss = VM_FILTERS[sc.filter] || "";
            vmDrawPreviewStill();
          });
          body.appendChild(dLab); body.appendChild(dRange); body.appendChild(fLab); body.appendChild(fSel);
          det.appendChild(sum); det.appendChild(body);
          right.appendChild(lab); right.appendChild(inp); right.appendChild(ctrls); right.appendChild(det);
          row.appendChild(im); row.appendChild(right);
          box.appendChild(row);
        });
        vmUpdateTotal();
      }
      function vmLoadFiles(files) {
        var imgs = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
        if (!imgs.length) { toast("Choose image files (JPG, PNG, WebP)"); return; }
        var loaded = 0;
        imgs.forEach(function (f) {
          var url = URL.createObjectURL(f);
          var im = new Image();
          im.onload = function () {
            var sc = { img: im, url: url, dataUrl: null, caption: "", dur: 3, filter: "none", filterCss: "" };
            vmScenes.push(sc);
            var reader = new FileReader();
            reader.onload = function () { sc.dataUrl = reader.result; };
            reader.readAsDataURL(f);
            loaded++;
            if (loaded === imgs.length) {
              $("vm-editor").style.display = "block";
              vmRenderScenes();
              vmSyncStageSize();
              vmDrawPreviewStill();
              toast(vmScenes.length + " image" + (vmScenes.length === 1 ? "" : "s") + " ready — add captions, then Make my video");
            }
          };
          im.onerror = function () { URL.revokeObjectURL(url); loaded++; toast("One image couldn’t be read and was skipped"); };
          im.src = url;
        });
      }
      $("vm-pick").addEventListener("click", function () { $("vm-files").click(); });
      $("vm-files").addEventListener("change", function () { if (this.files.length) vmLoadFiles(this.files); this.value = ""; });
      var vmDrop = $("vm-drop");
      ["dragenter", "dragover"].forEach(function (ev) { vmDrop.addEventListener(ev, function (e) { e.preventDefault(); vmDrop.classList.add("drag"); }); });
      ["dragleave", "drop"].forEach(function (ev) { vmDrop.addEventListener(ev, function (e) { e.preventDefault(); vmDrop.classList.remove("drag"); }); });
      vmDrop.addEventListener("drop", function (e) { if (e.dataTransfer.files.length) vmLoadFiles(e.dataTransfer.files); });
      /* Shared wiring for the small drop zones (music, logo): dropping a file
         runs the same loader as picking it; tapping the zone opens the picker. */
      function wireMiniDrop(zoneId, inputId, onFile) {
        var zone = $(zoneId), input = $(inputId);
        if (!zone || !input) return;
        ["dragenter", "dragover"].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add("drag"); }); });
        ["dragleave", "drop"].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove("drag"); }); });
        zone.addEventListener("drop", function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) onFile(f); });
        zone.addEventListener("click", function (e) { if (e.target !== input) input.click(); });
        zone.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
      }
      function isAudioFile(f) {
        return /^audio\//.test(f.type || "") || /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|webm)$/i.test(f.name || "");
      }
      $("vm-text-size").addEventListener("input", function () { $("vm-text-size-val").textContent = this.value; vmDrawPreviewStill(); });
      $("vm-music-vol").addEventListener("input", function () {
        $("vm-music-vol-val").textContent = this.value;
        var a = $("vm-music-audio");
        if (a) a.volume = parseInt(this.value, 10) / 100;
      });
      ["vm-trans", "vm-text-pos", "vm-text-color", "vm-text-anim", "vm-size"].forEach(function (id) {
        $(id).addEventListener("change", function () { vmDrawPreviewStill(); });
      });
      function vmSetMusic(f) {
        if (vmMusicUrl) URL.revokeObjectURL(vmMusicUrl);
        vmMusicFile = f || null;
        vmMusicUrl = f ? URL.createObjectURL(f) : null;
        $("vm-music-name").textContent = f ? "Music added: " + f.name : "No music added — the video will be silent";
      }
      $("vm-music").addEventListener("change", function () {
        var f = this.files && this.files[0];
        vmSetMusic(f);
        this.value = "";
      });
      wireMiniDrop("vm-music-drop", "vm-music", function (f) {
        if (!isAudioFile(f)) { toast("That isn’t a music file — drop an MP3, WAV or other audio file"); return; }
        vmSetMusic(f);
      });
      function vmSetLogo(f) {
        var url = URL.createObjectURL(f);
        var im = new Image();
        im.onload = function () {
          vmLogoImg = im;
          var reader = new FileReader();
          reader.onload = function () { vmLogoDataUrl = reader.result; };
          reader.readAsDataURL(f);
          $("vm-logo-name").textContent = "Logo added: " + f.name;
          vmDrawPreviewStill();
        };
        im.onerror = function () { URL.revokeObjectURL(url); toast("That logo file couldn’t be read"); };
        im.src = url;
      }
      $("vm-logo").addEventListener("change", function () {
        var f = this.files && this.files[0];
        this.value = "";
        if (f) vmSetLogo(f);
      });
      wireMiniDrop("vm-logo-drop", "vm-logo", function (f) {
        if (!/^image\//.test(f.type || "")) { toast("That isn’t an image — drop a PNG or JPG logo"); return; }
        vmSetLogo(f);
      });
      $("vm-logo-pos").addEventListener("change", function () { vmDrawPreviewStill(); });
      $("vm-preview").addEventListener("click", function () {
        if (vmBuilding) return;
        if (vmPreviewing) { vmStopPreview(); return; }
        if (!vmScenes.length) { toast("Add photos first"); return; }
        vmSyncStageSize();
        vmPreviewing = true;
        $("vm-preview").textContent = "Pause preview";
        vmPreviewT = 0;
        vmPreviewLast = performance.now();
        var a = $("vm-music-audio");
        if (vmMusicUrl) {
          a.src = vmMusicUrl;
          a.volume = parseInt($("vm-music-vol").value, 10) / 100;
          a.currentTime = 0;
          a.play().catch(function () {});
        }
        var c = $("vm-stage"), ctx = c.getContext("2d");
        (function step(now) {
          if (!vmPreviewing) return;
          var dt = (now - vmPreviewLast) / 1000;
          vmPreviewLast = now;
          vmPreviewT += dt;
          if (vmPreviewT >= vmTotalSec()) {
            vmPreviewT = 0;
            if (vmMusicUrl) { try { a.currentTime = 0; } catch (e) {} }
          }
          vmDrawFrame(ctx, c.width, c.height, vmPreviewT);
          vmPreviewRaf = requestAnimationFrame(step);
        })(performance.now());
      });
      $("vm-build").addEventListener("click", function () {
        var msg = $("vm-msg");
        if (vmBuilding) return;
        if (vmScenes.length < 2) { msg.textContent = "Add at least 2 photos to make a video."; msg.className = "tool-msg err"; return; }
        vmStopPreview();
        vmSyncStageSize();
        var stage = $("vm-stage"), ctx = stage.getContext("2d");
        var W = stage.width, H = stage.height, total = vmTotalSec();
        vmBuilding = true;
        $("vm-build").textContent = "Making your video…";
        $("vm-result").style.display = "none";
        $("vm-meter").style.display = "block";
        $("vm-bar").style.width = "0%";
        msg.className = "tool-msg";
        var vmDraw = function (t) { vmDrawFrame(ctx, W, H, t); };
        var vmCommon = {
          musicFile: vmMusicFile,
          musicVol: parseInt($("vm-music-vol").value, 10) / 100,
          fadeIn: $("vm-fade-in").checked,
          fadeOut: $("vm-fade-out").checked,
          highQuality: $("vm-quality").value === "high",
          onError: function (m) {
            vmBuilding = false;
            $("vm-build").textContent = "Make my video";
            $("vm-meter").style.display = "none";
            msg.textContent = m;
            msg.className = "tool-msg err";
          }
        };
        var vmFallbackNote = "";
        function vmDone(how) {
          return function (blob, ext, musicNote) {
            vmBuilding = false;
            $("vm-build").textContent = "Make my video";
            $("vm-meter").style.display = "none";
            vmBlob = blob;
            $("vm-video").src = URL.createObjectURL(blob);
            $("vm-result").style.display = "block";
            $("vm-note").textContent = "Your video: " + vmScenes.length + " scenes · about " + Math.round(total) + " seconds · " + W + "×" + H + " · " + fmtBytes(blob.size) + " · " + ext.toUpperCase() + " format · made with " + how + (vmFallbackNote ? " — " + vmFallbackNote : "") + (musicNote ? " · " + musicNote : "") + ". Made entirely on your device.";
            msg.textContent = "Video ready — preview it below, then download.";
            msg.className = "tool-msg";
            $("vm-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
          };
        }
        function vmRealtime(how) {
          var o = Object.assign({}, vmCommon, {
            onProgress: function (pct, remain) {
              $("vm-bar").style.width = pct + "%";
              msg.textContent = "Recording your video… " + pct + "% — about " + remain + "s left. Keep this tab visible.";
            },
            onDone: vmDone(how)
          });
          recordCanvasVideo(stage, total, vmDraw, o);
        }
        if ($("vm-speed").value === "fast") {
          msg.textContent = "Fast export — rendering frames…";
          var fo = Object.assign({}, vmCommon, {
            onProgress: function (pct, done, totalFrames) {
              $("vm-bar").style.width = pct + "%";
              msg.textContent = "Fast export — frame " + done + " of " + totalFrames + " (" + pct + "%)…";
            },
            onDone: vmDone("fast export"),
            onUnsupported: function (reason) {
              vmFallbackNote = "fast export wasn't available here (" + reason + "), so standard real-time recording was used";
              msg.textContent = "Fast export isn't available on this device — recording in real time instead…";
              vmRealtime("standard real-time recording");
            }
          });
          fastExportVideo(stage, total, vmDraw, fo);
        } else {
          vmRealtime("standard real-time recording");
        }
      });
      $("vm-download").addEventListener("click", function () {
        if (!vmBlob) { toast("Make the video first"); return; }
        downloadBlob(vmBlob, "toolzorq-video." + (vmBlob._ext || "webm"));
        toast("Video downloading");
      });
      $("vm-reset").addEventListener("click", function () {
        vmStopPreview();
        vmScenes.forEach(function (sc) { if (sc.url && sc.url.indexOf("blob:") === 0) URL.revokeObjectURL(sc.url); });
        vmScenes = [];
        vmBlob = null;
        vmMusicFile = null;
        if (vmMusicUrl) URL.revokeObjectURL(vmMusicUrl);
        vmMusicUrl = null;
        vmLogoImg = null; vmLogoDataUrl = null;
        $("vm-music-name").textContent = "No music added — the video will be silent";
        $("vm-logo-name").textContent = "No logo added";
        $("vm-editor").style.display = "none";
        $("vm-result").style.display = "none";
        $("vm-msg").textContent = "";
        var c = $("vm-stage"), ctx = c.getContext("2d");
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, c.width, c.height);
      });
      $("vm-save").addEventListener("click", function () {
        if (!vmScenes.length) { toast("Add photos first"); return; }
        var missing = vmScenes.some(function (s) { return !s.dataUrl; });
        if (missing) { toast("Photos are still loading — wait a second, then save again"); return; }
        var proj = {
          app: "toolzorq-video-project",
          version: 1,
          settings: {
            trans: $("vm-trans").value, size: $("vm-size").value, quality: $("vm-quality").value,
            textPos: $("vm-text-pos").value, textSize: $("vm-text-size").value, textColor: $("vm-text-color").value,
            textAnim: $("vm-text-anim").value, musicVol: $("vm-music-vol").value,
            fadeIn: $("vm-fade-in").checked, fadeOut: $("vm-fade-out").checked, logoPos: $("vm-logo-pos").value
          },
          logo: vmLogoDataUrl,
          scenes: vmScenes.map(function (s) { return { caption: s.caption, dur: s.dur, filter: s.filter, dataUrl: s.dataUrl }; })
        };
        downloadBlob(new Blob([JSON.stringify(proj)], { type: "application/json" }), "toolzorq-video-project.json");
        toast("Project file downloading — keep it to carry on later");
      });
      $("vm-load-btn").addEventListener("click", function () { $("vm-load").click(); });
      $("vm-load").addEventListener("change", function () {
        var f = this.files && this.files[0];
        this.value = "";
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          var proj;
          try { proj = JSON.parse(reader.result); } catch (e) { toast("That file isn’t a Toolzorq project"); return; }
          if (!proj || proj.app !== "toolzorq-video-project" || !Array.isArray(proj.scenes) || !proj.scenes.length) {
            toast("That project file looks empty or damaged");
            return;
          }
          vmStopPreview();
          vmScenes.forEach(function (s) { if (s.url && s.url.indexOf("blob:") === 0) URL.revokeObjectURL(s.url); });
          vmScenes = [];
          var st = proj.settings || {};
          function setVal(id, v) { if (v !== undefined && $(id)) $(id).value = v; }
          setVal("vm-trans", st.trans); setVal("vm-size", st.size); setVal("vm-quality", st.quality);
          setVal("vm-text-pos", st.textPos); setVal("vm-text-size", st.textSize); setVal("vm-text-color", st.textColor);
          setVal("vm-text-anim", st.textAnim); setVal("vm-music-vol", st.musicVol); setVal("vm-logo-pos", st.logoPos);
          if (st.fadeIn !== undefined) $("vm-fade-in").checked = !!st.fadeIn;
          if (st.fadeOut !== undefined) $("vm-fade-out").checked = !!st.fadeOut;
          $("vm-text-size-val").textContent = $("vm-text-size").value;
          $("vm-music-vol-val").textContent = $("vm-music-vol").value;
          vmLogoImg = null; vmLogoDataUrl = null;
          $("vm-logo-name").textContent = "No logo added";
          if (proj.logo) {
            var li = new Image();
            li.onload = function () {
              vmLogoImg = li; vmLogoDataUrl = proj.logo;
              $("vm-logo-name").textContent = "Logo loaded from the project";
              vmDrawPreviewStill();
            };
            li.src = proj.logo;
          }
          var loadedScenes = new Array(proj.scenes.length);
          var pending = proj.scenes.length;
          proj.scenes.forEach(function (ps, idx) {
            var im = new Image();
            im.onload = function () {
              loadedScenes[idx] = {
                img: im, url: ps.dataUrl, dataUrl: ps.dataUrl,
                caption: ps.caption || "",
                dur: Math.min(10, Math.max(1, parseFloat(ps.dur) || 3)),
                filter: ps.filter || "none",
                filterCss: VM_FILTERS[ps.filter || "none"] || ""
              };
              if (--pending === 0) finishLoad();
            };
            im.onerror = function () { if (--pending === 0) finishLoad(); };
            im.src = ps.dataUrl;
          });
          function finishLoad() {
            vmScenes = loadedScenes.filter(function (s) { return !!s; });
            if (!vmScenes.length) { toast("None of the project’s photos could be loaded"); return; }
            $("vm-editor").style.display = "block";
            vmRenderScenes();
            vmSyncStageSize();
            vmPreviewT = 0;
            vmDrawPreviewStill();
            toast("Project loaded — " + vmScenes.length + " scenes");
          }
        };
        reader.readAsText(f);
      });

      /* ---------- 25b. Text-to-Video mode (Text se Video — Animated) ---------- */
      var TV_THEMES = {
        sunset: ["#ff9966", "#ff5e62", "#2b1055"],
        ocean: ["#2193b0", "#6dd5ed", "#0b486b"],
        forest: ["#71b280", "#134e5e", "#0f2027"],
        gold: ["#f5d76e", "#b98a1c", "#191204"],
        midnight: ["#414345", "#232526", "#000000"]
      };
      var tvBlob = null, tvBuilding = false;
      var tvMusicFile = null, tvMusicUrl = null;
      var tvPreviewing = false, tvPreviewT = 0, tvPreviewLast = 0, tvPreviewRaf = 0;
      var tvParticles = [], tvShapes = [];
      (function () {
        var seed = 1234567;
        function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
        for (var i = 0; i < 70; i++) tvParticles.push({ x: rnd(), y: rnd(), r: 0.0015 + rnd() * 0.0035, speed: 0.008 + rnd() * 0.03, a: 0.25 + rnd() * 0.55, phase: rnd() * 6.28 });
        for (var j = 0; j < 8; j++) tvShapes.push({ x: rnd(), y: rnd(), r: 0.06 + rnd() * 0.16, speed: 0.006 + rnd() * 0.018, phase: rnd() * 6.28 });
      })();
      function tvScenes() {
        var out = [];
        var title = $("tv-title").value.trim();
        if (title) out.push({ text: title, title: true });
        $("tv-lines").value.split("\n").forEach(function (l) {
          var s = l.trim();
          if (s) out.push({ text: s, title: false });
        });
        return out;
      }
      function tvDur() { return parseFloat($("tv-dur").value) || 3; }
      function tvTotalSec() { return tvScenes().length * tvDur(); }
      function tvDrawBg(ctx, W, H, t) {
        var theme = TV_THEMES[$("tv-theme").value] || TV_THEMES.sunset;
        var kind = $("tv-bg").value;
        var gx = W * (0.5 + 0.5 * Math.sin(t * 0.15));
        var g = ctx.createLinearGradient(0, 0, gx, H);
        g.addColorStop(0, theme[0]);
        g.addColorStop(0.55, theme[1]);
        g.addColorStop(1, theme[2]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        if (kind === "particles") {
          ctx.save();
          ctx.fillStyle = "#ffffff";
          tvParticles.forEach(function (pt) {
            var y = (((pt.y - t * pt.speed) % 1) + 1) % 1;
            var x = pt.x + 0.02 * Math.sin(t * 0.7 + pt.phase);
            ctx.globalAlpha = pt.a;
            ctx.beginPath();
            ctx.arc(x * W, y * H, Math.max(1, pt.r * W), 0, 6.2832);
            ctx.fill();
          });
          ctx.restore();
        } else if (kind === "shapes") {
          ctx.save();
          tvShapes.forEach(function (sh, i) {
            var x = (((sh.x + t * sh.speed) % 1.2) - 0.1) * W;
            var y = sh.y * H + Math.sin(t * 0.5 + sh.phase) * H * 0.03;
            ctx.globalAlpha = 0.16;
            ctx.fillStyle = i % 2 ? theme[0] : "#ffffff";
            ctx.beginPath();
            ctx.arc(x, y, sh.r * W, 0, 6.2832);
            ctx.fill();
          });
          ctx.restore();
        }
      }
      function tvDrawScene(ctx, W, H, sc, sceneT, alpha, xOff) {
        var anim = $("tv-anim").value;
        var a = alpha, scale = 1, yOff = 0;
        var p = Math.min(1, Math.max(0, sceneT) / 0.6);
        if (anim === "fade") a *= p;
        else if (anim === "slide") { a *= Math.min(1, p * 1.4); yOff = (1 - p) * H * 0.06; }
        else if (anim === "zoom") { scale = 0.82 + 0.18 * p; a *= Math.min(1, p * 1.6); }
        if (a <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = a;
        var fs = Math.round(W * (sc.title ? 0.088 : 0.062) * (parseInt($("tv-text-size").value, 10) / 100) * scale);
        ctx.font = "800 " + fs + "px 'Bricolage Grotesque', Manrope, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        var maxW = W * 0.86;
        var words = sc.text.split(/\s+/), lines = [], line = "";
        words.forEach(function (w) {
          var test = line ? line + " " + w : w;
          if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
        });
        if (line) lines.push(line);
        var lh = fs * 1.25;
        var y0 = H / 2 - (lines.length - 1) * lh / 2 + yOff;
        var cx = W / 2 + (xOff || 0);
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = Math.round(W * 0.012);
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = "#ffffff";
        lines.forEach(function (l, i) { ctx.fillText(l, cx, y0 + i * lh); });
        ctx.restore();
      }
      function tvDrawFrame(ctx, W, H, t) {
        var scenes = tvScenes();
        tvDrawBg(ctx, W, H, t);
        if (!scenes.length) {
          ctx.save();
          ctx.fillStyle = "rgba(255,255,255,0.88)";
          ctx.font = "700 " + Math.round(W * 0.03) + "px Manrope, sans-serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("Write some lines above — your video preview appears here", W / 2, H / 2);
          ctx.restore();
          return;
        }
        var dur = tvDur();
        var trans = $("tv-trans").value;
        var transDur = trans === "cut" ? 0 : 0.5;
        var idx = Math.min(scenes.length - 1, Math.floor(t / dur));
        var sceneT = t - idx * dur;
        if (transDur && idx < scenes.length - 1 && sceneT > dur - transDur) {
          var p = (sceneT - (dur - transDur)) / transDur;
          if (trans === "slide") {
            tvDrawScene(ctx, W, H, scenes[idx], sceneT, 1, -p * W);
            tvDrawScene(ctx, W, H, scenes[idx + 1], sceneT - (dur - transDur), 1, (1 - p) * W);
          } else {
            tvDrawScene(ctx, W, H, scenes[idx], sceneT, 1, 0);
            tvDrawScene(ctx, W, H, scenes[idx + 1], sceneT - (dur - transDur), p, 0);
          }
        } else {
          tvDrawScene(ctx, W, H, scenes[idx], sceneT, 1, 0);
        }
      }
      function tvSyncStageSize() {
        var parts = $("tv-size").value.split("x");
        var c = $("tv-stage");
        c.width = parseInt(parts[0], 10);
        c.height = parseInt(parts[1], 10);
      }
      function tvDrawStill() {
        if (tvPreviewing || tvBuilding) return;
        tvSyncStageSize();
        var c = $("tv-stage");
        tvDrawFrame(c.getContext("2d"), c.width, c.height, 0.8);
      }
      function tvStopPreview() {
        tvPreviewing = false;
        cancelAnimationFrame(tvPreviewRaf);
        $("tv-preview").textContent = "Play preview";
        var a = $("tv-music-audio");
        if (a) a.pause();
      }
      ["tv-title", "tv-lines"].forEach(function (id) { $(id).addEventListener("input", tvDrawStill); });
      ["tv-bg", "tv-theme", "tv-size", "tv-anim", "tv-trans"].forEach(function (id) { $(id).addEventListener("change", tvDrawStill); });
      $("tv-dur").addEventListener("input", function () { $("tv-dur-val").textContent = this.value; });
      $("tv-text-size").addEventListener("input", function () { $("tv-text-size-val").textContent = this.value; tvDrawStill(); });
      $("tv-music-vol").addEventListener("input", function () {
        $("tv-music-vol-val").textContent = this.value;
        var a = $("tv-music-audio");
        if (a) a.volume = parseInt(this.value, 10) / 100;
      });
      function tvSetMusic(f) {
        if (tvMusicUrl) URL.revokeObjectURL(tvMusicUrl);
        tvMusicFile = f || null;
        tvMusicUrl = f ? URL.createObjectURL(f) : null;
        $("tv-music-name").textContent = f ? "Music added: " + f.name : "No music added — the video will be silent";
      }
      $("tv-music").addEventListener("change", function () {
        var f = this.files && this.files[0];
        tvSetMusic(f);
        this.value = "";
      });
      wireMiniDrop("tv-music-drop", "tv-music", function (f) {
        if (!isAudioFile(f)) { toast("That isn’t a music file — drop an MP3, WAV or other audio file"); return; }
        tvSetMusic(f);
      });
      $("tv-preview").addEventListener("click", function () {
        if (tvBuilding) return;
        if (tvPreviewing) { tvStopPreview(); return; }
        if (!tvScenes().length) { toast("Write at least one line first"); return; }
        tvSyncStageSize();
        tvPreviewing = true;
        $("tv-preview").textContent = "Pause preview";
        tvPreviewT = 0;
        tvPreviewLast = performance.now();
        var a = $("tv-music-audio");
        if (tvMusicUrl) {
          a.src = tvMusicUrl;
          a.volume = parseInt($("tv-music-vol").value, 10) / 100;
          a.currentTime = 0;
          a.play().catch(function () {});
        }
        var c = $("tv-stage"), ctx = c.getContext("2d");
        (function step(now) {
          if (!tvPreviewing) return;
          var dt = (now - tvPreviewLast) / 1000;
          tvPreviewLast = now;
          tvPreviewT += dt;
          if (tvPreviewT >= tvTotalSec()) {
            tvPreviewT = 0;
            if (tvMusicUrl) { try { a.currentTime = 0; } catch (e) {} }
          }
          tvDrawFrame(ctx, c.width, c.height, tvPreviewT);
          tvPreviewRaf = requestAnimationFrame(step);
        })(performance.now());
      });
      $("tv-build").addEventListener("click", function () {
        var msg = $("tv-msg");
        if (tvBuilding) return;
        var scenes = tvScenes();
        if (!scenes.length) {
          msg.textContent = "Write at least one line first — each line becomes a scene.";
          msg.className = "tool-msg err";
          $("tv-lines").focus();
          return;
        }
        tvStopPreview();
        tvSyncStageSize();
        var stage = $("tv-stage"), ctx = stage.getContext("2d");
        var W = stage.width, H = stage.height, total = tvTotalSec();
        tvBuilding = true;
        $("tv-build").textContent = "Making your video…";
        $("tv-result").style.display = "none";
        $("tv-meter").style.display = "block";
        $("tv-bar").style.width = "0%";
        msg.className = "tool-msg";
        var tvDraw = function (t) { tvDrawFrame(ctx, W, H, t); };
        var tvCommon = {
          musicFile: tvMusicFile,
          musicVol: parseInt($("tv-music-vol").value, 10) / 100,
          fadeIn: false,
          fadeOut: true,
          highQuality: $("tv-quality").value === "high",
          onError: function (m) {
            tvBuilding = false;
            $("tv-build").textContent = "Make my video";
            $("tv-meter").style.display = "none";
            msg.textContent = m;
            msg.className = "tool-msg err";
          }
        };
        var tvFallbackNote = "";
        function tvDone(how) {
          return function (blob, ext, musicNote) {
            tvBuilding = false;
            $("tv-build").textContent = "Make my video";
            $("tv-meter").style.display = "none";
            tvBlob = blob;
            $("tv-video").src = URL.createObjectURL(blob);
            $("tv-result").style.display = "block";
            $("tv-note").textContent = "Your video: " + scenes.length + " text scene" + (scenes.length === 1 ? "" : "s") + " · about " + Math.round(total) + " seconds · " + W + "×" + H + " · " + fmtBytes(blob.size) + " · " + ext.toUpperCase() + " format · made with " + how + (tvFallbackNote ? " — " + tvFallbackNote : "") + (musicNote ? " · " + musicNote : "") + ". Made entirely on your device.";
            msg.textContent = "Video ready — preview it below, then download.";
            msg.className = "tool-msg";
            $("tv-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
          };
        }
        function tvRealtime(how) {
          var o = Object.assign({}, tvCommon, {
            onProgress: function (pct, remain) {
              $("tv-bar").style.width = pct + "%";
              msg.textContent = "Recording your video… " + pct + "% — about " + remain + "s left. Keep this tab visible.";
            },
            onDone: tvDone(how)
          });
          recordCanvasVideo(stage, total, tvDraw, o);
        }
        if ($("tv-speed").value === "fast") {
          msg.textContent = "Fast export — rendering frames…";
          var fo = Object.assign({}, tvCommon, {
            onProgress: function (pct, done, totalFrames) {
              $("tv-bar").style.width = pct + "%";
              msg.textContent = "Fast export — frame " + done + " of " + totalFrames + " (" + pct + "%)…";
            },
            onDone: tvDone("fast export"),
            onUnsupported: function (reason) {
              tvFallbackNote = "fast export wasn't available here (" + reason + "), so standard real-time recording was used";
              msg.textContent = "Fast export isn't available on this device — recording in real time instead…";
              tvRealtime("standard real-time recording");
            }
          });
          fastExportVideo(stage, total, tvDraw, fo);
        } else {
          tvRealtime("standard real-time recording");
        }
      });
      $("tv-download").addEventListener("click", function () {
        if (!tvBlob) { toast("Make the video first"); return; }
        downloadBlob(tvBlob, "toolzorq-text-video." + (tvBlob._ext || "webm"));
        toast("Video downloading");
      });

      /* ---------- mode switch ---------- */
      function vmSetMode(textMode) {
        $("vm-mode-images").style.display = textMode ? "none" : "block";
        $("vm-mode-text").style.display = textMode ? "block" : "none";
        $("vm-mode-img-btn").setAttribute("aria-pressed", textMode ? "false" : "true");
        $("vm-mode-text-btn").setAttribute("aria-pressed", textMode ? "true" : "false");
        vmStopPreview();
        tvStopPreview();
        if (textMode) tvDrawStill();
        else vmDrawPreviewStill();
      }
      $("vm-mode-img-btn").addEventListener("click", function () { vmSetMode(false); });
      $("vm-mode-text-btn").addEventListener("click", function () { vmSetMode(true); });

    