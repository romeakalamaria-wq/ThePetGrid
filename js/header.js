document.addEventListener("DOMContentLoaded", () => {

    const toggle = document.querySelector(".nav-toggle");
    const navigation = document.querySelector(".main-nav");

    if (!navigation) return;

    // ==========================================
    // ADD MEMORIALS LINK
    // ==========================================

    if (!navigation.querySelector('[href$="memorials.html"]')) {

        const memorialLink = document.createElement("a");

        memorialLink.href = location.pathname.includes("/pages/")
            ? "memorials.html"
            : "pages/memorials.html";

        memorialLink.textContent = "Memorials";
        memorialLink.className = "memorials-nav-link";

        const messagesLink = [...navigation.querySelectorAll("a")]
            .find(link =>
                (link.getAttribute("href") || "")
                .endsWith("messages.html")
            );

        if (messagesLink) {
            messagesLink.insertAdjacentElement(
                "afterend",
                memorialLink
            );
        } else {
            navigation.appendChild(memorialLink);
        }
    }

    // ==========================================
    // MENU FUNCTIONS
    // ==========================================

    function closeMenu() {

        navigation.classList.remove("is-open");

        if (toggle) {
            toggle.setAttribute(
                "aria-expanded",
                "false"
            );
        }

    }

    function openMenu() {

        navigation.classList.add("is-open");

        if (toggle) {
            toggle.setAttribute(
                "aria-expanded",
                "true"
            );
        }

    }

    function toggleMenu() {

        if (navigation.classList.contains("is-open")) {

            closeMenu();

        } else {

            openMenu();

        }

    }

    // ==========================================
    // HAMBURGER
    // ==========================================

    if (toggle) {

        toggle.setAttribute(
            "aria-expanded",
            navigation.classList.contains("is-open")
                ? "true"
                : "false"
        );

        toggle.addEventListener("click", function (e) {

            e.stopPropagation();

            toggleMenu();

        });

    }

    // ==========================================
    // CLOSE AFTER CLICKING PAGE
    // ==========================================

    navigation.addEventListener("click", function (e) {

        if (e.target.closest("a")) {

            closeMenu();

        }

    });

    // ==========================================
    // CLICK OUTSIDE
    // ==========================================

    document.addEventListener("click", function (e) {

        if (!navigation.classList.contains("is-open"))
            return;

        if (
            navigation.contains(e.target) ||
            (toggle && toggle.contains(e.target))
        ) {
            return;
        }

        closeMenu();

    });

    // ==========================================
    // ESC KEY
    // ==========================================

    document.addEventListener("keydown", function (e) {

        if (
            e.key === "Escape" &&
            navigation.classList.contains("is-open")
        ) {

            closeMenu();

        }

    });

    // ==========================================
    // DESKTOP
    // ==========================================

    window.addEventListener("resize", function () {

        if (window.innerWidth > 1240) {

            closeMenu();

        }

    });

    // ==========================================
    // BACK BUTTON
    // ==========================================

    window.addEventListener(
        "pageshow",
        closeMenu
    );

    // ==========================================
    // ACTIVE LINK
    // ==========================================

    const current =
        location.pathname.split("/").pop() ||
        "index.html";

    navigation
        .querySelectorAll("a")
        .forEach(link => {

            const target =
                (link.getAttribute("href") || "")
                .split("/")
                .pop();

            link.classList.toggle(
                "active",
                target === current
            );

        });

});