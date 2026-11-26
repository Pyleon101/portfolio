/* Pyleon - app.js
   EAT clock + awake guess, floating scroll nav, hero preview deck,
   thumbnail fallback, cinema video modal, Discord copy + toast, scroll reveals. */

(function () {
  "use strict";

  var $ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* ---------- EAT clock (UTC+3) + awake guess ---------- */
  var clockEls = $$("[data-clock]");
  var awakeEls = $$("[data-awake]");

  if (clockEls.length) {
    var pad = function (n) {
      return (n < 10 ? "0" : "") + n;
    };
    var tick = function () {
      var d = new Date(Date.now() + 3 * 3600000);
      var h = d.getUTCHours();
      var m = d.getUTCMinutes();
      var timeStr = pad(h) + ":" + pad(m);

      clockEls.forEach(function (el) {
        el.textContent = timeStr;
      });

      var note = "(probably awake)";
      if (h === 23 || h < 2) {
        note = "(might still be up)";
      } else if (h >= 2 && h < 8) {
        note = "(probably asleep)";
      }

      awakeEls.forEach(function (el) {
        el.textContent = note;
      });
    };
    tick();
    window.setInterval(tick, 15000);
  }

  /* ---------- footer year ---------- */
  $$("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- floating pill nav + active section ---------- */
  var floatNav = $("#float-nav");
  var navLinks = $$("[data-nav]");
  var sections = ["home", "work", "about", "contact"]
    .map(function (id) {
      return document.getElementById(id);
    })
    .filter(Boolean);

  var updateNav = function () {
    var y = window.scrollY || window.pageYOffset || 0;
    if (floatNav) {
      floatNav.classList.toggle("is-visible", y > 260);
    }

    var current = "home";
    var trigger = y + window.innerHeight * 0.35;
    sections.forEach(function (sec) {
      if (sec.offsetTop <= trigger) {
        current = sec.id;
      }
    });

    navLinks.forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("data-nav") === current);
    });
  };

  window.addEventListener("scroll", updateNav, { passive: true });
  updateNav();

  /* ---------- scroll reveals ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -36px 0px" }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  /* ---------- YouTube thumbnail fallback ---------- */
  var showThumbFallback = function (btn) {
    if (btn.classList.contains("no-thumb")) return;
    btn.classList.add("no-thumb");
    var title = btn.getAttribute("data-clip-title") || "Project clip";
    var box = document.createElement("span");
    box.className = "thumb-fallback";
    box.innerHTML =
      "<strong>" +
      title.replace(/[<>&]/g, "") +
      "</strong><span>preview not loading yet, click to play or open on youtube</span>";
    btn.appendChild(box);
  };

  $$(".media-box[data-open-clip]").forEach(function (btn) {
    var img = $("img", btn);
    if (!img) return;
    var triedFallback = false;

    var handleThumbIssue = function () {
      var fallback = img.getAttribute("data-fallback");
      if (!triedFallback && fallback && img.src !== fallback) {
        triedFallback = true;
        img.src = fallback;
      } else {
        showThumbFallback(btn);
      }
    };

    img.addEventListener("error", handleThumbIssue);
    img.addEventListener("load", function () {
      if (img.naturalWidth && img.naturalWidth <= 120) {
        handleThumbIssue();
      }
    });

    if (img.complete && (!img.naturalWidth || img.naturalWidth <= 120)) {
      handleThumbIssue();
    }
  });

  /* ---------- hero quick-preview deck switcher ---------- */
  var reelTrigger = $("#reel-trigger");
  var reelImg = $("#reel-img");
  var reelLabel = $("#reel-label");
  var reelJump = $("#reel-jump");
  var reelTabs = $$(".deck__tab");

  if (reelTrigger && reelImg && reelTabs.length) {
    reelTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var id = tab.getAttribute("data-reel-id");
        if (!id) return;

        reelTabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
        });

        reelTrigger.classList.remove("no-thumb");
        var oldFallback = $(".thumb-fallback", reelTrigger);
        if (oldFallback) oldFallback.remove();

        reelTrigger.setAttribute("data-open-clip", id);
        reelTrigger.setAttribute("data-clip-title", tab.getAttribute("data-reel-title") || "");
        reelTrigger.setAttribute("data-clip-note", tab.getAttribute("data-reel-note") || "");

        if (reelLabel) reelLabel.textContent = tab.getAttribute("data-reel-label") || "";
        if (reelJump) reelJump.setAttribute("href", tab.getAttribute("data-reel-anchor") || "#work");

        var hdUrl = "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/maxresdefault.jpg";
        var hqUrl = "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg";

        reelImg.setAttribute("data-fallback", hqUrl);
        reelImg.onerror = function () {
          if (reelImg.src !== hqUrl) {
            reelImg.src = hqUrl;
          } else {
            showThumbFallback(reelTrigger);
          }
        };
        reelImg.onload = function () {
          if (reelImg.naturalWidth && reelImg.naturalWidth <= 120 && reelImg.src !== hqUrl) {
            reelImg.src = hqUrl;
          }
        };
        reelImg.src = hdUrl;
      });
    });
  }

  /* ---------- native cinema modal (<dialog>) ---------- */
  var modal = $("#clip-modal");
  var modalTitle = $("#clip-modal-title");
  var modalNote = $("#clip-modal-note");
  var modalYt = $("#clip-modal-yt");
  var modalFrame = $("#clip-modal-frame");

  var closeModal = function () {
    if (!modal) return;
    if (modal.open) modal.close();
    if (modalFrame) modalFrame.innerHTML = "";
  };

  var openClip = function (id, title, note) {
    if (!modal || !modalFrame || !id) return;
    if (modalTitle) modalTitle.textContent = title || "Showcase clip";
    if (modalNote) modalNote.textContent = note || "";
    if (modalYt) modalYt.href = "https://youtu.be/" + encodeURIComponent(id);

    var iframe = document.createElement("iframe");
    iframe.src =
      "https://www.youtube-nocookie.com/embed/" +
      encodeURIComponent(id) +
      "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
    iframe.title = title || "Project clip";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;

    modalFrame.innerHTML = "";
    modalFrame.appendChild(iframe);
    modal.showModal();
  };

  $$("[data-open-clip]").forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      openClip(
        trigger.getAttribute("data-open-clip"),
        trigger.getAttribute("data-clip-title"),
        trigger.getAttribute("data-clip-note")
      );
    });
  });

  if (modal) {
    $$("[data-close-modal]", modal).forEach(function (btn) {
      btn.addEventListener("click", closeModal);
    });

    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });

    modal.addEventListener("close", function () {
      if (modalFrame) modalFrame.innerHTML = "";
    });
  }

  /* ---------- Discord copy + floating toast ---------- */
  var toast = $("#toast");
  var toastTimer = null;

  var showToast = function (msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-shown");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-shown");
    }, 2600);
  };

  $$("[data-copy]").forEach(function (btn) {
    var label = $("[data-copy-label]", btn);
    var handle = btn.getAttribute("data-copy") || "";
    var btnTimer = null;

    var onCopied = function () {
      btn.classList.add("is-copied");
      if (label) label.textContent = "Copied";
      showToast("copied " + handle + ", hit me up on discord");
      window.clearTimeout(btnTimer);
      btnTimer = window.setTimeout(function () {
        btn.classList.remove("is-copied");
        if (label) label.textContent = "Copy";
      }, 2200);
    };

    var fallbackCopy = function () {
      var area = document.createElement("textarea");
      area.value = handle;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(area);
      if (ok) onCopied();
    };

    btn.addEventListener("click", function () {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(handle).then(onCopied, fallbackCopy);
      } else {
        fallbackCopy();
      }
    });
  });
})();
