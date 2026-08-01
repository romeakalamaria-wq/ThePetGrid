(() => {
  "use strict";
  const clean = value => String(value || "").trim();
  function shareData(button) {
    const petName = document.querySelector("#petProfileName")?.textContent?.trim();
    return {
      title: clean(button.dataset.shareTitle) || (petName ? `Meet ${petName} on ThePetGrid` : document.title),
      text: clean(button.dataset.shareText) || (petName ? `🐾 Meet ${petName} on ThePetGrid.` : "Discover ThePetGrid."),
      url: clean(button.dataset.shareUrl) || location.href
    };
  }
  function ensureModal() {
    let modal = document.getElementById("tpgShareModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "tpgShareModal";
    modal.className = "tpg-share-modal";
    modal.hidden = true;
    modal.innerHTML = `<div class="tpg-share-modal__backdrop" data-close-share></div><section class="tpg-share-modal__card" role="dialog" aria-modal="true"><button class="tpg-share-modal__close" type="button" data-close-share>×</button><span>📤 Share</span><h2 id="tpgShareTitle">Share ThePetGrid</h2><div class="tpg-share-grid"><a data-share-channel="facebook" target="_blank" rel="noopener">Facebook</a><a data-share-channel="whatsapp" target="_blank" rel="noopener">WhatsApp</a><a data-share-channel="messenger" target="_blank" rel="noopener">Messenger</a><a data-share-channel="x" target="_blank" rel="noopener">X</a><a data-share-channel="email">Email</a><button type="button" data-copy-share>🔗 Copy Link</button></div><img class="tpg-share-qr" alt="QR code for this link"><small>Scan the QR code to open this alert on a phone.</small><p class="tpg-share-status" aria-live="polite"></p></section>`;
    document.body.appendChild(modal);
    const style = document.createElement("style");
    style.textContent = `.tpg-share-modal[hidden]{display:none}.tpg-share-modal{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:18px}.tpg-share-modal__backdrop{position:absolute;inset:0;background:rgba(15,23,42,.62);backdrop-filter:blur(5px)}.tpg-share-modal__card{position:relative;z-index:1;width:min(430px,100%);padding:26px;border-radius:24px;background:#fff;box-shadow:0 30px 90px rgba(15,23,42,.35);text-align:center}.tpg-share-modal__close{position:absolute;top:13px;right:13px;width:36px;height:36px;border:0;border-radius:50%;background:#f1f5f9;font-size:1.35rem;cursor:pointer}.tpg-share-modal__card h2{margin:7px 0 18px}.tpg-share-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.tpg-share-grid a,.tpg-share-grid button{display:flex;align-items:center;justify-content:center;min-height:43px;border:1px solid #dbe3ee;border-radius:11px;background:#fff;color:#334155;font:inherit;font-weight:800;text-decoration:none;cursor:pointer}.tpg-share-grid a:hover,.tpg-share-grid button:hover{background:#fff7e6;border-color:#f4c66e}.tpg-share-qr{display:block;width:170px;height:170px;margin:19px auto 7px;border:8px solid #fff;box-shadow:0 5px 22px rgba(15,23,42,.12)}.tpg-share-modal__card small{color:#64748b}.tpg-share-status{min-height:20px;margin:10px 0 0;color:#15803d;font-weight:750}`;
    document.head.appendChild(style);
    modal.addEventListener("click", event => { if (event.target.closest("[data-close-share]")) modal.hidden = true; });
    return modal;
  }
  function openModal(data) {
    const modal = ensureModal();
    const encodedUrl = encodeURIComponent(data.url), encodedText = encodeURIComponent(`${data.text} ${data.url}`);
    modal.querySelector("#tpgShareTitle").textContent = data.title;
    modal.querySelector('[data-share-channel="facebook"]').href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    modal.querySelector('[data-share-channel="whatsapp"]').href = `https://wa.me/?text=${encodedText}`;
    modal.querySelector('[data-share-channel="messenger"]').href = `fb-messenger://share/?link=${encodedUrl}`;
    modal.querySelector('[data-share-channel="x"]').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(data.text)}&url=${encodedUrl}`;
    modal.querySelector('[data-share-channel="email"]').href = `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodedText}`;
    modal.querySelector(".tpg-share-qr").src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodedUrl}`;
    modal.querySelector("[data-copy-share]").onclick = async () => {
      await navigator.clipboard.writeText(data.url);
      modal.querySelector(".tpg-share-status").textContent = "✅ Link copied";
    };
    modal.hidden = false;
  }
  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-share-url],[data-share-current-page]");
    if (!button) return;
    event.preventDefault();
    const data = shareData(button);
    if (navigator.share && matchMedia("(pointer:coarse)").matches) {
      try { await navigator.share(data); } catch (error) { if (error.name !== "AbortError") openModal(data); }
    } else openModal(data);
  });
})();
