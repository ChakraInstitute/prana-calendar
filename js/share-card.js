/*
 * share-card.js — builds a small, branded PNG "social card" image (via the
 * Canvas API) for the app's three Share buttons (Color/Planet/Mantra,
 * Nostril result, Chakra Assessment result), instead of sharing plain text
 * alone.
 *
 * The Chakra Institute logo is loaded once from images/ (see the LOGO_SRC
 * constant and images/README.md) and drawn prominently at the top of the
 * card. If that file hasn't been added yet, the card quietly falls back to
 * a small drawn "sun" mark next to the wordmark instead of a broken image
 * — same "hide gracefully" pattern the rest of the app uses for optional
 * images.
 *
 * The card's height is computed from its actual content on a first,
 * throwaway "measuring" pass (same layout code, run on a tall scratch
 * canvas) and then redrawn at that height — this keeps the card free of
 * dead space for a short mantra while guaranteeing a longer one (or a
 * longer localized planet name, or the two-line tagline) never overflows
 * past the footer.
 *
 * Exposes two globals used by js/app.js:
 *   pcBuildShareCardCanvas(type, data) -> Promise<HTMLCanvasElement>
 *   pcCanvasToPngBlob(canvas)          -> Promise<Blob>
 */
(function () {
  'use strict';

  var CARD_WIDTH = 1080;
  var MIN_CARD_HEIGHT = 860;
  var PAD = 64;
  var BRAND_GREEN = '#2D6A2D';
  var LOGO_SRC = 'images/chakra-institute-logo.jpg';
  var FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  function font(weight, size, style) {
    return (style ? style + ' ' : '') + weight + ' ' + size + 'px ' + FONT_STACK;
  }

  function hexToRgb(hex) {
    var h = String(hex || BRAND_GREEN).replace('#', '');
    if (h.length === 3) {
      h = h
        .split('')
        .map(function (c) {
          return c + c;
        })
        .join('');
    }
    var num = parseInt(h, 16) || 0;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgba(hex, alpha) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Wraps `text` to fit maxWidth, drawing each line at the given lineHeight
  // starting from (x, y) treated as the first line's baseline. Returns the
  // baseline just below the last line, so callers can keep stacking
  // content underneath. Also doubles as the measuring pass (the caller
  // just reads the returned y), so wrapping is always computed the same
  // way it's drawn.
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = String(text || '')
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return y;
    var line = '';
    var lines = [];
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.forEach(function (l, i) {
      ctx.fillText(l, x, y + i * lineHeight);
    });
    return y + lines.length * lineHeight;
  }

  // Small concentric/petal "sun" mark — used only as a graceful fallback
  // brand glyph when the real Chakra Institute logo image (LOGO_SRC) isn't
  // available yet.
  function drawFallbackMark(ctx, cx, cy, radius, colorHex) {
    var petals = 8;
    ctx.save();
    ctx.translate(cx, cy);
    for (var i = 0; i < petals; i++) {
      ctx.rotate((Math.PI * 2) / petals);
      ctx.beginPath();
      ctx.ellipse(0, -radius * 0.62, radius * 0.34, radius * 0.62, 0, 0, Math.PI * 2);
      ctx.fillStyle = rgba(colorHex, 0.18);
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = colorHex;
    ctx.fill();
  }

  // Loads the Chakra Institute logo once and caches the result (including
  // the "not available" case) for the lifetime of the page — every Share
  // tap reuses this same promise instead of re-requesting the image.
  var logoImagePromise = null;
  function getLogoImage() {
    if (!logoImagePromise) {
      logoImagePromise = new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () {
          resolve(img);
        };
        img.onerror = function () {
          resolve(null); // quietly fall back — see drawFallbackMark
        };
        img.src = LOGO_SRC;
      });
    }
    return logoImagePromise;
  }

  // Header: the Chakra Institute logo, prominently sized, on its own —
  // with the "InnerTuning — Prana Calendar" wordmark on its own line
  // underneath (not beside the logo, so it doesn't compete with it or
  // imply the logo is a small icon). Falls back to the old small drawn
  // mark + inline wordmark if the logo image hasn't been added to
  // images/ yet.
  function drawHeader(ctx, innerX, innerW, logoImg) {
    var y = PAD + 40;

    if (logoImg) {
      var maxLogoH = 140;
      var maxLogoW = innerW * 0.62;
      var scale = Math.min(maxLogoH / logoImg.naturalHeight, maxLogoW / logoImg.naturalWidth);
      var drawnW = logoImg.naturalWidth * scale;
      var drawnH = logoImg.naturalHeight * scale;
      ctx.drawImage(logoImg, innerX, y, drawnW, drawnH);
      y += drawnH + 58;

      ctx.fillStyle = BRAND_GREEN;
      ctx.font = font(700, 32);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('InnerTuning — Prana Calendar', innerX, y);
      return y + 40;
    }

    // Fallback: no logo file present yet — keep the old compact mark +
    // inline wordmark so the header is never empty.
    y = PAD + 84;
    drawFallbackMark(ctx, innerX + 24, y - 10, 32, BRAND_GREEN);
    ctx.fillStyle = '#23201c';
    ctx.font = font(700, 32);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('InnerTuning — Prana Calendar', innerX + 70, y);
    return y + 40;
  }

  function drawDivider(ctx, x, w, y) {
    ctx.strokeStyle = 'rgba(35,32,28,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
  }

  // Draws everything below the date/title lines that's specific to `type`.
  // Used for both the measuring pass (on a tall scratch canvas) and the
  // real render, so the two are guaranteed to agree on layout.
  function layoutBody(ctx, type, data, innerX, innerW, y, accentHex) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    if (type === 'daylord') {
      var swatchColors = data.colors && data.colors.length ? data.colors : [accentHex];
      var swatchSize = 84;
      ctx.save();
      roundRect(ctx, innerX, y, swatchSize, swatchSize, 20);
      ctx.clip();
      if (swatchColors.length === 1) {
        ctx.fillStyle = swatchColors[0];
        ctx.fillRect(innerX, y, swatchSize, swatchSize);
      } else {
        var stepW = swatchSize / swatchColors.length;
        swatchColors.forEach(function (c, i) {
          ctx.fillStyle = c;
          ctx.fillRect(innerX + i * stepW, y, stepW + 1, swatchSize);
        });
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(35,32,28,0.14)';
      ctx.lineWidth = 2;
      roundRect(ctx, innerX, y, swatchSize, swatchSize, 20);
      ctx.stroke();

      ctx.fillStyle = '#23201c';
      ctx.font = font(700, 44);
      ctx.fillText(data.colorLabel || '', innerX + swatchSize + 32, y + 56);
      y += swatchSize + 54;

      ctx.fillStyle = '#3d3830';
      ctx.font = font(400, 30);
      y = wrapText(ctx, data.planetLine || '', innerX, y, innerW, 40);
      y += 28;

      drawDivider(ctx, innerX, innerW, y);
      y += 46;

      ctx.fillStyle = accentHex;
      ctx.font = font(600, 24);
      ctx.fillText((data.mantraLabel || 'Mantra') + ':', innerX, y);
      y += 42;
      ctx.fillStyle = '#23201c';
      ctx.font = font(400, 34, 'italic');
      y = wrapText(ctx, data.mantra || '', innerX, y, innerW, 44);
      return y;
    }

    if (type === 'nostril') {
      y += 36;
      var circleR = 76;
      var cx = innerX + circleR;
      var cy = y + circleR;
      ctx.beginPath();
      ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
      ctx.fillStyle = rgba(accentHex, 0.14);
      ctx.fill();
      ctx.fillStyle = accentHex;
      ctx.font = font(700, 60);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.isLeft ? 'L' : 'R', cx, cy + 4);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      ctx.fillStyle = '#23201c';
      ctx.font = font(700, 46);
      var labelY = wrapText(ctx, data.sideLabel || '', cx + circleR + 36, cy - 16, innerW - circleR * 2 - 36, 52);
      y = Math.max(labelY, cy + circleR) + 46;

      drawDivider(ctx, innerX, innerW, y);
      y += 46;

      ctx.fillStyle = '#3d3830';
      ctx.font = font(400, 28);
      y = wrapText(ctx, data.subLine || '', innerX, y, innerW, 38);
      return y;
    }

    if (type === 'quiz') {
      y += 12;
      ctx.fillStyle = '#23201c';
      ctx.font = font(700, 40);
      y = wrapText(ctx, data.chakraLine || '', innerX, y, innerW, 50);
      y += 28;

      drawDivider(ctx, innerX, innerW, y);
      y += 46;

      ctx.fillStyle = accentHex;
      ctx.font = font(600, 24);
      ctx.fillText((data.mantraLabel || 'Mantra') + ':', innerX, y);
      y += 42;
      ctx.fillStyle = '#23201c';
      ctx.font = font(400, 36, 'italic');
      y = wrapText(ctx, data.mantraName || '', innerX, y, innerW, 46);
      return y;
    }

    return y;
  }

  // Two-line tagline (matching the app header's own subtitle) plus the
  // chakrainstitute.com line — all in the brand green. `y` is the baseline
  // for line 1; returns the baseline just below the url line, so it can be
  // used both to measure and to draw.
  function drawFooterBlock(ctx, x, y, innerW, line1, line2) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = BRAND_GREEN;
    ctx.font = font(700, 25);
    y = wrapText(ctx, line1, x, y, innerW, 31);
    y += 10;
    ctx.fillStyle = '#6b6558';
    ctx.font = font(400, 23);
    y = wrapText(ctx, line2, x, y, innerW, 29);
    y += 14;
    ctx.fillStyle = BRAND_GREEN;
    ctx.font = font(600, 24);
    ctx.fillText('chakrainstitute.com', x, y);
    return y;
  }

  // Runs the full header -> date/title -> body -> footer sequence and
  // returns the final y. Used once (on a scratch canvas) to measure the
  // content, then again (on the real, correctly-sized canvas) to actually
  // draw it — both passes are driven by this one function, so they can
  // never disagree on layout.
  function runLayout(ctx, type, data, accentHex, logoImg) {
    var innerX = PAD + 56;
    var innerW = CARD_WIDTH - PAD * 2 - 112;
    var y = drawHeader(ctx, innerX, innerW, logoImg);

    y += 44;
    ctx.textAlign = 'left';
    if (data.dateLabel) {
      ctx.fillStyle = '#6b6558';
      ctx.font = font(600, 26);
      ctx.fillText(data.dateLabel, innerX, y);
      y += 54;
    }

    ctx.fillStyle = accentHex;
    ctx.font = font(600, 28);
    ctx.fillText(data.title || '', innerX, y);
    y += 54;

    y = layoutBody(ctx, type, data, innerX, innerW, y, accentHex);
    y += 46;
    y = drawFooterBlock(ctx, innerX, y, innerW, data.taglineLine1 || '', data.taglineLine2 || '');
    return y;
  }

  function paintBackground(ctx, height, accentHex) {
    var bgGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, height);
    bgGrad.addColorStop(0, '#faf9f6');
    bgGrad.addColorStop(1, '#f1eee7');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CARD_WIDTH, height);

    var glowTR = ctx.createRadialGradient(
      CARD_WIDTH * 0.86, height * 0.08, 10,
      CARD_WIDTH * 0.86, height * 0.08, Math.max(CARD_WIDTH, height) * 0.55
    );
    glowTR.addColorStop(0, rgba(accentHex, 0.28));
    glowTR.addColorStop(1, rgba(accentHex, 0));
    ctx.fillStyle = glowTR;
    ctx.fillRect(0, 0, CARD_WIDTH, height);

    var glowBL = ctx.createRadialGradient(
      CARD_WIDTH * 0.08, height * 0.96, 10,
      CARD_WIDTH * 0.08, height * 0.96, Math.max(CARD_WIDTH, height) * 0.5
    );
    glowBL.addColorStop(0, rgba(accentHex, 0.18));
    glowBL.addColorStop(1, rgba(accentHex, 0));
    ctx.fillStyle = glowBL;
    ctx.fillRect(0, 0, CARD_WIDTH, height);

    ctx.save();
    ctx.shadowColor = 'rgba(35, 32, 28, 0.14)';
    ctx.shadowBlur = 44;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, PAD, PAD, CARD_WIDTH - PAD * 2, height - PAD * 2, 40);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Builds a branded, PNG-ready canvas for one of the app's three share
   * buttons. Width is fixed at 1080; height is sized to the actual content
   * (with a sensible minimum) so neither a short nor an unusually long
   * mantra — or tagline — ever looks sparse or gets clipped.
   *
   * @param {'daylord'|'nostril'|'quiz'} type
   * @param {object} data - see layoutBody()'s branches, plus dateLabel,
   *   title, accentHex, taglineLine1, taglineLine2.
   * @returns {Promise<HTMLCanvasElement>}
   */
  function pcBuildShareCardCanvas(type, data) {
    data = data || {};
    var accentHex = data.accentHex || BRAND_GREEN;

    return getLogoImage().then(function (logoImg) {
      // Measuring pass: run the exact same layout on a tall scratch canvas
      // and see where the content actually ends.
      var scratch = document.createElement('canvas');
      scratch.width = CARD_WIDTH;
      scratch.height = 4000;
      var scratchCtx = scratch.getContext('2d');
      var contentBottom = runLayout(scratchCtx, type, data, accentHex, logoImg);

      // A little extra beyond PAD so the url line's descenders (the tails
      // on "g" in "chakrainstitute.com") always clear the bottom of the
      // white panel comfortably, instead of nearly touching its edge.
      var height = Math.max(MIN_CARD_HEIGHT, Math.ceil(contentBottom + PAD + 16));

      var canvas = document.createElement('canvas');
      canvas.width = CARD_WIDTH;
      canvas.height = height;
      var ctx = canvas.getContext('2d');

      paintBackground(ctx, height, accentHex);
      runLayout(ctx, type, data, accentHex, logoImg);

      return canvas;
    });
  }

  /** Converts a canvas to a PNG Blob, with a data-URL fallback for the rare
   *  browser without HTMLCanvasElement#toBlob. */
  function pcCanvasToPngBlob(canvas) {
    return new Promise(function (resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('canvas.toBlob produced no blob'));
        }, 'image/png');
        return;
      }
      try {
        var dataUrl = canvas.toDataURL('image/png');
        var parts = dataUrl.split(',');
        var mimeMatch = parts[0].match(/:(.*?);/);
        var mime = mimeMatch ? mimeMatch[1] : 'image/png';
        var bstr = atob(parts[1]);
        var n = bstr.length;
        var u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        resolve(new Blob([u8arr], { type: mime }));
      } catch (e) {
        reject(e);
      }
    });
  }

  window.pcBuildShareCardCanvas = pcBuildShareCardCanvas;
  window.pcCanvasToPngBlob = pcCanvasToPngBlob;
})();
