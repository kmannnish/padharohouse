/* ===========================================================
   Padharo House — reusable local-device media uploader
   Cloudinary unsigned upload + HTML5 canvas WebP compression.

   Usage:
     PHUpload.setConfig({ cloudName, uploadPreset });
     PHUpload.mount(el, { spec:'heroPhoto', onDone:url => ... });

   NOTE on unsigned presets: the cloud name and preset are visible in the
   page source, which is how unsigned upload works. Restrict the preset in
   Cloudinary (allowed formats, max file size, a dedicated folder) so the
   quota cannot be abused. Never use an unsigned preset for private files.
   =========================================================== */
(function (global) {
  'use strict';

  /* ---------- slot specifications ---------- */
  const SPECS = {
    heroPhoto: {
      kind: 'image', label: 'Hero slider photo',
      hint: 'Recommended: 1920×1080px (16:9 Landscape) • WebP/JPG • Max 300KB (auto-compressed)',
      accept: 'image/jpeg,image/png,image/webp',
      maxKB: 300, w: 1920, h: 1080, ratio: 16 / 9, ratioTol: 0.22, compress: true, folder: 'hero'
    },
    heroVideo: {
      kind: 'video', label: 'Hero background video',
      hint: 'Recommended: 1920×1080px (16:9) • 10–15 sec muted loop • MP4/WebM • Max 8MB',
      accept: 'video/mp4,video/webm',
      maxKB: 8 * 1024, ratio: 16 / 9, ratioTol: 0.3, minDur: 4, maxDur: 16, folder: 'hero'
    },
    reel: {
      kind: 'video', label: 'Vertical reel video',
      hint: 'Recommended: 1080×1920px (9:16 Vertical) • MP4 • Max 10MB',
      accept: 'video/mp4,video/webm',
      maxKB: 10 * 1024, ratio: 9 / 16, ratioTol: 0.2, maxDur: 95, folder: 'reels'
    },
    packageCover: {
      kind: 'image', label: 'Package cover photo',
      hint: 'Recommended: 800×600px (4:3) • WebP/JPG • Max 200KB (auto-compressed)',
      accept: 'image/jpeg,image/png,image/webp',
      maxKB: 200, w: 800, h: 600, ratio: 4 / 3, ratioTol: 0.25, compress: true, folder: 'packages'
    }
  };

  let CFG = { cloudName: '', uploadPreset: '' };
  const setConfig = c => { CFG = { cloudName: (c && c.cloudName) || '', uploadPreset: (c && c.uploadPreset) || '' }; };
  const ready = () => !!(CFG.cloudName && CFG.uploadPreset);
  const kb = b => Math.round(b / 1024);

  /* ---------- read intrinsic dimensions / duration ---------- */
  function probe(file) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith('video')) {
        const v = document.createElement('video');
        v.preload = 'metadata'; v.muted = true;
        v.onloadedmetadata = () => {
          resolve({ w: v.videoWidth, h: v.videoHeight, dur: v.duration });
          URL.revokeObjectURL(url);
        };
        v.onerror = () => { resolve({}); URL.revokeObjectURL(url); };
        v.src = url;
      } else {
        const i = new Image();
        i.onload = () => { resolve({ w: i.naturalWidth, h: i.naturalHeight }); URL.revokeObjectURL(url); };
        i.onerror = () => { resolve({}); URL.revokeObjectURL(url); };
        i.src = url;
      }
    });
  }

  /* ---------- canvas compression -> WebP ---------- */
  function compress(file, spec) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxW = spec.w || 1920, maxH = spec.h || 1080;
        let { naturalWidth: w, naturalHeight: h } = img;
        const scale = Math.min(1, maxW / w, maxH / h);
        w = Math.round(w * scale); h = Math.round(h * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        c.toBlob(blob => {
          if (!blob) return reject(new Error('compression failed'));
          // keep the smaller of the two
          if (blob.size >= file.size && file.size <= spec.maxKB * 1024) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' }));
        }, 'image/webp', 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('could not read that image')); };
      img.src = url;
    });
  }

  /* ---------- validation against the slot spec ---------- */
  async function validate(file, spec) {
    const okType = spec.accept.split(',').includes(file.type);
    if (!okType) return { ok: false, msg: 'That file type is not accepted here. Expected ' + spec.accept.replace(/\w+\//g, '').toUpperCase() + '.' };
    const meta = await probe(file);

    if (spec.kind === 'video') {
      if (file.size > spec.maxKB * 1024)
        return { ok: false, msg: 'This video is ' + (file.size / 1048576).toFixed(1) + 'MB — the limit is ' + Math.round(spec.maxKB / 1024) + 'MB. Please compress or trim it.' };
      if (meta.dur && spec.maxDur && meta.dur > spec.maxDur)
        return { ok: false, msg: 'This clip is ' + meta.dur.toFixed(1) + ' seconds. Please trim it to ' + (spec.minDur ? spec.minDur + '–' : 'under ') + spec.maxDur + ' seconds.' };
      if (meta.dur && spec.minDur && meta.dur < spec.minDur)
        return { ok: false, msg: 'This clip is only ' + meta.dur.toFixed(1) + ' seconds — aim for ' + spec.minDur + '–' + spec.maxDur + ' seconds.' };
    }
    const warn = [];
    if (meta.w && meta.h && spec.ratio) {
      const r = meta.w / meta.h;
      if (Math.abs(r - spec.ratio) > spec.ratioTol)
        warn.push('this is ' + meta.w + '×' + meta.h + ', not the recommended ' +
          (spec.ratio > 1 ? '16:9 landscape' : '9:16 vertical') + ' — it may be cropped');
    }
    return { ok: true, meta, warn };
  }

  /* ---------- Cloudinary unsigned upload with progress ---------- */
  function upload(file, opts) {
    opts = opts || {};
    return new Promise((resolve, reject) => {
      if (!ready()) return reject(new Error('Cloudinary is not configured. Add your cloud name and upload preset in Site & Brand.'));
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', CFG.uploadPreset);
      if (opts.folder) fd.append('folder', 'padharo/' + opts.folder);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + CFG.cloudName + '/auto/upload');
      xhr.upload.onprogress = e => {
        if (e.lengthComputable && opts.onProgress) opts.onProgress(Math.round(e.loaded / e.total * 100));
      };
      xhr.onload = () => {
        let r = null;
        try { r = JSON.parse(xhr.responseText); } catch (e) {}
        if (xhr.status >= 200 && xhr.status < 300 && r && r.secure_url) return resolve(r);
        const m = r && r.error && r.error.message;
        reject(new Error(m || ('Upload failed (HTTP ' + xhr.status + ')')));
      };
      xhr.onerror = () => reject(new Error('Network error during upload.'));
      xhr.send(fd);
    });
  }

  /* inject f_auto,q_auto for best PageSpeed delivery */
  function optimize(url) {
    if (!url || url.indexOf('/upload/') === -1) return url;
    if (/\/upload\/[^/]*[fq]_auto/.test(url)) return url;
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  }

  /* ---------- mountable drag & drop component ---------- */
  function mount(host, opts) {
    const spec = SPECS[opts.spec];
    if (!host || !spec) return;
    host.innerHTML =
      '<div class="phu">' +
        '<div class="phu-zone" tabindex="0" role="button" aria-label="Choose or drop a file">' +
          '<div class="phu-ico">⬆</div>' +
          '<div class="phu-cta"><b>Choose a file</b> or drag it here</div>' +
          '<div class="phu-hint">' + spec.hint + '</div>' +
        '</div>' +
        '<input type="file" accept="' + spec.accept + '" hidden />' +
        '<div class="phu-bar" hidden><i></i><span>0%</span></div>' +
        '<div class="phu-msg" hidden></div>' +
        (opts.allowUrl === false ? '' :
          '<div class="phu-or">or paste a direct URL' +
          '<div class="phu-urlrow"><input type="url" placeholder="https://…" /><button type="button">Use</button></div></div>') +
      '</div>';

    const zone = host.querySelector('.phu-zone');
    const input = host.querySelector('input[type=file]');
    const bar = host.querySelector('.phu-bar');
    const fill = host.querySelector('.phu-bar i');
    const pct = host.querySelector('.phu-bar span');
    const msg = host.querySelector('.phu-msg');
    const urlIn = host.querySelector('.phu-urlrow input');
    const urlBtn = host.querySelector('.phu-urlrow button');

    const say = (text, kind) => {
      msg.hidden = !text; msg.textContent = text || '';
      msg.className = 'phu-msg' + (kind ? ' phu-' + kind : '');
    };
    const progress = p => { bar.hidden = false; fill.style.width = p + '%'; pct.textContent = p + '%'; };

    async function handle(file) {
      if (!file) return;
      say('');
      if (!ready()) { say('Add your Cloudinary cloud name and upload preset in Site & Brand first, or paste a URL below.', 'err'); return; }
      const v = await validate(file, spec);
      if (!v.ok) { say(v.msg, 'err'); return; }
      let out = file;
      if (spec.compress && file.size > spec.maxKB * 1024) {
        say('Compressing ' + kb(file.size) + 'KB…', 'info');
        try { out = await compress(file, spec); } catch (e) { say(e.message, 'err'); return; }
      }
      if (out.size > spec.maxKB * 1024 && spec.kind === 'image') {
        say('Still ' + kb(out.size) + 'KB after compression (limit ' + spec.maxKB + 'KB). Please use a smaller image.', 'err'); return;
      }
      progress(0);
      try {
        const r = await upload(out, { folder: spec.folder, onProgress: progress });
        bar.hidden = true;
        const url = optimize(r.secure_url);
        const extra = (v.warn && v.warn.length) ? ' Note: ' + v.warn.join('; ') + '.' : '';
        say('Uploaded ' + kb(out.size) + 'KB' + (out !== file ? ' (compressed from ' + kb(file.size) + 'KB)' : '') + '.' + extra,
            extra ? 'warn' : 'ok');
        if (opts.onDone) opts.onDone(url, { ...r, localMeta: v.meta });
      } catch (e) {
        bar.hidden = true; say(e.message, 'err');
      }
    }

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', e => { handle(e.target.files[0]); input.value = ''; });
    ['dragenter', 'dragover'].forEach(k => zone.addEventListener(k, e => { e.preventDefault(); zone.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(k => zone.addEventListener(k, e => { e.preventDefault(); zone.classList.remove('over'); }));
    zone.addEventListener('drop', e => { if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
    if (urlBtn) urlBtn.addEventListener('click', () => {
      const u = urlIn.value.trim();
      if (!/^https?:\/\//i.test(u)) { say('Please paste a full https:// URL.', 'err'); return; }
      urlIn.value = ''; say('URL added.', 'ok');
      if (opts.onDone) opts.onDone(u, { manual: true });
    });
  }

  global.PHUpload = { SPECS, setConfig, ready, validate, compress, upload, optimize, mount, probe };
})(window);
