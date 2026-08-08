(() => {
    "use strict";

    const STORAGE_KEY = "thePetGridCommunityPosts";
    const DEFAULT_AVATAR = "../assets/avatar.png";

    const elements = {
        form: document.getElementById("createPostForm"),
        postText: document.getElementById("postText"),
        postImageInput: document.getElementById("postImageInput"),
        taggedPet: document.getElementById("taggedPet"),
        postCategory: document.getElementById("postCategory"),
        categoryFilters: document.getElementById("communityCategoryFilters"),
        imagePreviewBox: document.getElementById("imagePreviewBox"),
        imagePreview: document.getElementById("imagePreview"),
        removeImageButton: document.getElementById("removeImageButton"),
        publishPostButton: document.getElementById("publishPostButton"),
        postCharCount: document.getElementById("postCharCount"),
        composerMessage: document.getElementById("composerMessage"),
        composerAvatar: document.getElementById("composerAvatar"),
        composerIdentity: document.getElementById("composerIdentity"),
        feed: document.getElementById("communityFeed"),
        emptyFeed: document.getElementById("emptyFeed"),
        postCount: document.getElementById("communityPostCount"),
        clearPostsButton: document.getElementById("clearPostsButton"),
        userArea: document.getElementById("userArea"),
        trendingTopics: document.getElementById("communityTrendingTopics"),
        lostNearby: document.getElementById("communityLostNearby"),
        topHelpers: document.getElementById("communityTopHelpers"),
        homeAgain: document.getElementById("communityHomeAgain"),
        useMyArea: document.getElementById("communityUseMyArea")
    };

    let selectedImage = "";
    let posts = [];
    let currentCategory = "all";

    const CATEGORY_META = Object.freeze({
        "daily-life": { label: "Daily Life", icon: "📸" },
        "lost-found": { label: "Lost & Found", icon: "🆘" },
        adoption: { label: "Adoption", icon: "❤️" },
        health: { label: "Health", icon: "🏥" },
        success: { label: "Success Stories", icon: "🎉" },
        questions: { label: "Questions", icon: "💬" },
        funny: { label: "Funny", icon: "🐾" },
        local: { label: "Local Community", icon: "🌍" }
    });

    const LOST_REPORTS_KEY = "thepetgrid_lost_found_reports";
    const SIGHTINGS_KEY = "thepetgrid_lost_pet_sightings";

    let communityUserLocation = null;

    const openCommentPostIds = new Set();
    const currentUser = getLoggedUser();

    async function hydrateCurrentUserProfile() {
        try {
            if (window.ThePetGridAuth?.ready) {
                await window.ThePetGridAuth.ready;
            }

            const authUser = window.ThePetGridAuth?.getCurrentUser?.() || null;
            const client = window.ThePetGridSupabase?.client;
            const userId = authUser?.id || currentUser.id || currentUser.userId;
            if (!client || !userId) return;

            const { data, error } = await client
                .from("profiles")
                .select("username, display_name, avatar_url")
                .eq("id", userId)
                .maybeSingle();
            if (error || !data) return;

            const oldUsername = String(currentUser.username || "").toLowerCase();
            currentUser.username = data.username || currentUser.username;
            currentUser.displayName = data.display_name || data.username || currentUser.displayName;
            currentUser.avatar = data.avatar_url || currentUser.avatar || DEFAULT_AVATAR;

            let changed = false;
            posts.forEach(post => {
                if (String(post.authorUsername || "").toLowerCase() === oldUsername) {
                    post.authorName = currentUser.displayName;
                    post.authorAvatar = currentUser.avatar;
                    changed = true;
                }
                (post.comments || []).forEach(comment => {
                    if (String(comment.authorUsername || "").toLowerCase() === oldUsername) {
                        comment.authorName = currentUser.displayName;
                        comment.authorAvatar = currentUser.avatar;
                        changed = true;
                    }
                });
            });
            if (changed) savePosts();
        } catch (error) {
            console.warn("Community profile name could not be refreshed.", error);
        }
    }

    function safeJsonParse(value, fallback) {
        try {
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.warn("Could not parse stored JSON:", error);
            return fallback;
        }
    }

    function getLoggedUser() {
        const user = safeJsonParse(
            localStorage.getItem("loggedUser"),
            null
        );

        if (!user || typeof user !== "object") {
            return {
                username: "guest",
                displayName: "Guest Pet Lover",
                avatar: DEFAULT_AVATAR
            };
        }

        return {
            ...user,

            username: String(
                user.username ||
                user.name ||
                user.email ||
                "guest"
            ),

            displayName: String(
                user.displayName ||
                user.name ||
                user.username ||
                user.email ||
                "Pet Lover"
            ),

            avatar: String(
                user.avatar ||
                user.photo ||
                user.image ||
                DEFAULT_AVATAR
            )
        };
    }

    function normalizeComment(comment) {
        if (!comment || typeof comment !== "object") {
            return null;
        }

        return {
            id:
                comment.id ||
                `${Date.now()}-${Math.random()
                    .toString(16)
                    .slice(2)}`,

            authorUsername: String(
                comment.authorUsername ||
                comment.username ||
                "guest"
            ),

            authorName: String(
                comment.authorName ||
                comment.displayName ||
                comment.authorUsername ||
                "Pet Lover"
            ),

            authorAvatar: String(
                comment.authorAvatar ||
                comment.avatar ||
                DEFAULT_AVATAR
            ),

            text: String(comment.text || "").trim(),

            createdAt:
                comment.createdAt ||
                new Date().toISOString()
        };
    }

    function normalizeCategory(value) {
        const key = String(value || "").trim().toLowerCase();

        return Object.prototype.hasOwnProperty.call(CATEGORY_META, key)
            ? key
            : "daily-life";
    }

    function normalizePost(post) {
        const storedComments = Array.isArray(post.comments)
            ? post.comments
                  .map(normalizeComment)
                  .filter(Boolean)
                  .filter((comment) => comment.text)
            : [];

        const legacyCommentCount =
            Array.isArray(post.comments)
                ? Number(post.legacyCommentCount || 0)
                : Number(post.comments || 0);

        return {
            ...post,

            id:
                post.id ||
                `${Date.now()}-${Math.random()
                    .toString(16)
                    .slice(2)}`,

            authorUsername: String(
                post.authorUsername ||
                post.username ||
                "guest"
            ),

            authorName: String(
                post.authorName ||
                post.displayName ||
                post.authorUsername ||
                "Pet Lover"
            ),

            authorAvatar: String(
                post.authorAvatar ||
                post.avatar ||
                DEFAULT_AVATAR
            ),

            text: String(post.text || ""),

            image: String(post.image || ""),

            taggedPet: String(post.taggedPet || ""),

            category: normalizeCategory(post.category),

            createdAt:
                post.createdAt ||
                new Date().toISOString(),

            likes: Math.max(
                0,
                Number(post.likes || 0)
            ),

            likedByCurrentUser:
                Boolean(post.likedByCurrentUser),

            comments: storedComments,

            legacyCommentCount: Math.max(
                0,
                legacyCommentCount
            )
        };
    }

    function loadPosts() {
        const stored = safeJsonParse(
            localStorage.getItem(STORAGE_KEY),
            []
        );

        posts = Array.isArray(stored)
            ? stored
                  .filter(Boolean)
                  .map(normalizePost)
            : [];

        if (posts.length === 0) {
            posts = createDemoPosts();
        }

        savePosts();
    }

    function savePosts() {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(posts)
        );
    }

    function createDemoPosts() {
        const now = Date.now();

        return [
            normalizePost({
                id: now - 2000,
                authorUsername: "maria",
                authorName: "Maria Pet Lover",
                authorAvatar: DEFAULT_AVATAR,

                text:
                    "Our rescued puppy finally feels safe at home. Small steps, huge progress. 💛",

                image: "",
                taggedPet: "Milo",
                category: "success",

                createdAt: new Date(
                    now - 1000 * 60 * 42
                ).toISOString(),

                likes: 18,
                likedByCurrentUser: false,

                comments: [
                    {
                        id: `${now}-demo-comment-1`,
                        authorUsername: "anna",
                        authorName: "Anna",
                        authorAvatar: DEFAULT_AVATAR,
                        text:
                            "This is wonderful news! Milo is very lucky. ❤️",
                        createdAt: new Date(
                            now - 1000 * 60 * 30
                        ).toISOString()
                    },

                    {
                        id: `${now}-demo-comment-2`,
                        authorUsername: "george",
                        authorName: "George",
                        authorAvatar: DEFAULT_AVATAR,
                        text:
                            "Small steps really make a huge difference.",
                        createdAt: new Date(
                            now - 1000 * 60 * 18
                        ).toISOString()
                    }
                ]
            }),

            normalizePost({
                id: now - 1000,
                authorUsername: "nikos",
                authorName: "Nikos",
                authorAvatar: DEFAULT_AVATAR,

                text:
                    "What is your pet's favorite way to spend a sunny afternoon?",

                image: "",
                taggedPet: "",
                category: "questions",

                createdAt: new Date(
                    now - 1000 * 60 * 130
                ).toISOString(),

                likes: 9,
                likedByCurrentUser: false,

                comments: [
                    {
                        id: `${now}-demo-comment-3`,
                        authorUsername: "maria",
                        authorName: "Maria Pet Lover",
                        authorAvatar: DEFAULT_AVATAR,
                        text:
                            "Long walks and then a very long nap! 🐾",
                        createdAt: new Date(
                            now - 1000 * 60 * 95
                        ).toISOString()
                    }
                ]
            })
        ];
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatRelativeTime(dateValue) {
        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Just now";
        }

        const seconds = Math.max(
            0,
            Math.floor(
                (Date.now() - date.getTime()) / 1000
            )
        );

        if (seconds < 60) {
            return "Just now";
        }

        if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);

            return `${minutes} ${
                minutes === 1 ? "min" : "mins"
            } ago`;
        }

        if (seconds < 86400) {
            const hours = Math.floor(seconds / 3600);

            return `${hours} ${
                hours === 1 ? "hr" : "hrs"
            } ago`;
        }

        if (seconds < 172800) {
            return "Yesterday";
        }

        if (seconds < 604800) {
            const days = Math.floor(seconds / 86400);

            return `${days} days ago`;
        }

        return new Intl.DateTimeFormat("en", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(date);
    }

    function getAllPets() {
        if (
            window.PetStore &&
            typeof window.PetStore.getAll === "function"
        ) {
            const result = window.PetStore.getAll();

            return Array.isArray(result)
                ? result
                : [];
        }

        return [];
    }

    function getPetOwner(pet) {
        return String(
            pet?.owner ||
            pet?.username ||
            pet?.createdBy ||
            pet?.user ||
            ""
        )
            .trim()
            .toLowerCase();
    }

    function populatePetOptions() {
        if (!elements.taggedPet) {
            return;
        }

        const username =
            currentUser.username.toLowerCase();

        const userPets = getAllPets().filter(
            (pet) =>
                getPetOwner(pet) === username
        );

        elements.taggedPet.innerHTML =
            '<option value="">No pet tagged</option>';

        userPets.forEach((pet) => {
            const option =
                document.createElement("option");

            option.value = String(
                pet.name || "Pet"
            );

            option.textContent =
                `🐾 ${pet.name || "Pet"}`;

            elements.taggedPet.appendChild(option);
        });
    }

    function renderHeaderUser() {
        if (!elements.userArea) {
            return;
        }

        if (currentUser.username === "guest") {
            elements.userArea.innerHTML =
                '<a href="login.html" class="login-btn">Log In</a>';

            return;
        }

        const profileUrl =
            `user-profile.html?username=${encodeURIComponent(
                currentUser.username
            )}`;

        elements.userArea.innerHTML = `
            <a href="${profileUrl}" class="login-btn">
                👤 ${escapeHtml(currentUser.displayName)}
            </a>
        `;
    }

    function renderComposerIdentity() {
        elements.composerAvatar.src =
            currentUser.avatar;

        elements.composerAvatar.onerror = () => {
            elements.composerAvatar.src =
                DEFAULT_AVATAR;
        };

        elements.composerIdentity.textContent =
            `Posting as ${currentUser.displayName}`;
    }

    function getCommentCount(post) {
        const actualComments =
            Array.isArray(post.comments)
                ? post.comments.length
                : 0;

        const legacyCount = Math.max(
            0,
            Number(post.legacyCommentCount || 0)
        );

        return actualComments + legacyCount;
    }

    function canDeletePost(post) {
        return (
            post.authorUsername === currentUser.username ||
            (
                currentUser.username === "guest" &&
                post.authorUsername === "guest"
            )
        );
    }

    function canDeleteComment(comment) {
        return (
            comment.authorUsername ===
                currentUser.username ||
            (
                currentUser.username === "guest" &&
                comment.authorUsername === "guest"
            )
        );
    }

    function getStoredArray(key) {
        try {
            const value = JSON.parse(
                localStorage.getItem(key) || "[]"
            );

            return Array.isArray(value)
                ? value
                : [];
        } catch (_) {
            return [];
        }
    }

    function calculateDistanceKm(lat1, lng1, lat2, lng2) {
        const values = [lat1, lng1, lat2, lng2]
            .map(Number);

        if (!values.every(Number.isFinite)) {
            return null;
        }

        const [aLat, aLng, bLat, bLng] = values;
        const toRadians = value =>
            value * Math.PI / 180;
        const earthRadius = 6371;

        const deltaLat =
            toRadians(bLat - aLat);

        const deltaLng =
            toRadians(bLng - aLng);

        const part =
            Math.sin(deltaLat / 2) ** 2 +
            Math.cos(toRadians(aLat)) *
            Math.cos(toRadians(bLat)) *
            Math.sin(deltaLng / 2) ** 2;

        return (
            earthRadius *
            2 *
            Math.atan2(
                Math.sqrt(part),
                Math.sqrt(1 - part)
            )
        );
    }

    function categoryActivity() {
        const activity = new Map();

        posts.forEach(post => {
            const category =
                normalizeCategory(post.category);

            const ageHours = Math.max(
                0,
                (
                    Date.now() -
                    new Date(post.createdAt).getTime()
                ) / 3600000
            );

            const recencyBoost =
                Math.max(0, 36 - ageHours) / 9;

            const score =
                Number(post.likes || 0) * 2 +
                getCommentCount(post) * 3 +
                recencyBoost;

            const current =
                activity.get(category) || {
                    category,
                    score: 0,
                    posts: 0
                };

            current.score += score;
            current.posts += 1;

            activity.set(category, current);
        });

        return [...activity.values()]
            .sort(
                (a, b) =>
                    b.score - a.score ||
                    b.posts - a.posts
            );
    }

    function renderTrendingTopics() {
        if (!elements.trendingTopics) {
            return;
        }

        const items =
            categoryActivity().slice(0, 4);

        if (!items.length) {
            elements.trendingTopics.innerHTML =
                '<p class="community-sidebar-empty">Trending topics will appear here.</p>';
            return;
        }

        elements.trendingTopics.innerHTML =
            items.map(item => {
                const meta =
                    CATEGORY_META[item.category];

                return `
                    <button
                        class="community-live-item"
                        type="button"
                        data-sidebar-category="${escapeHtml(item.category)}"
                    >
                        <span class="community-live-item__icon">
                            ${escapeHtml(meta?.icon || "🐾")}
                        </span>

                        <span class="community-live-item__body">
                            <strong>
                                ${escapeHtml(meta?.label || "Community")}
                            </strong>
                            <small>
                                ${item.posts} post${item.posts === 1 ? "" : "s"} · trending now
                            </small>
                        </span>

                        <span class="community-live-item__arrow">
                            →
                        </span>
                    </button>
                `;
            }).join("");
    }

    function activeLostReports() {
        return getStoredArray(LOST_REPORTS_KEY)
            .filter(
                report =>
                    report?.status === "lost" &&
                    !report?.resolved
            )
            .sort(
                (a, b) =>
                    Date.parse(
                        b.createdAt ||
                        b.date ||
                        0
                    ) -
                    Date.parse(
                        a.createdAt ||
                        a.date ||
                        0
                    )
            );
    }

    function formatSidebarDistance(value) {
        if (!Number.isFinite(value)) {
            return "";
        }

        if (value < 1) {
            return `${Math.max(
                1,
                Math.round(value * 1000)
            )} m away`;
        }

        if (value < 10) {
            return `${value.toFixed(1)} km away`;
        }

        return `${Math.round(value)} km away`;
    }

    function renderLostNearby() {
        if (!elements.lostNearby) {
            return;
        }

        let reports =
            activeLostReports().map(report => ({
                ...report,
                distance: communityUserLocation
                    ? calculateDistanceKm(
                        communityUserLocation.latitude,
                        communityUserLocation.longitude,
                        report.latitude,
                        report.longitude
                    )
                    : null
            }));

        if (communityUserLocation) {
            reports.sort((a, b) => {
                const aValid =
                    Number.isFinite(a.distance);

                const bValid =
                    Number.isFinite(b.distance);

                if (aValid && bValid) {
                    return a.distance - b.distance;
                }

                if (aValid) return -1;
                if (bValid) return 1;

                return 0;
            });
        }

        reports = reports.slice(0, 4);

        if (!reports.length) {
            elements.lostNearby.innerHTML =
                '<p class="community-sidebar-empty">No active lost alerts right now.</p>';
            return;
        }

        elements.lostNearby.innerHTML =
            reports.map(report => {
                const detail =
                    formatSidebarDistance(
                        report.distance
                    ) ||
                    report.area ||
                    report.city ||
                    report.country ||
                    "Active lost alert";

                return `
                    <a
                        class="community-live-item community-live-item--lost"
                        href="lost-found.html?reportId=${encodeURIComponent(report.id)}#reports"
                    >
                        <span class="community-live-item__icon">
                            🆘
                        </span>

                        <span class="community-live-item__body">
                            <strong>
                                ${escapeHtml(
                                    report.name ||
                                    report.pet_name ||
                                    "Lost pet"
                                )}
                            </strong>
                            <small>
                                ${escapeHtml(detail)}
                            </small>
                        </span>

                        <span class="community-live-item__arrow">
                            →
                        </span>
                    </a>
                `;
            }).join("");
    }

    function buildHelperRanking() {
        const helpers = new Map();

        const addPoints = (
            username,
            name,
            avatar,
            points
        ) => {
            const key =
                String(username || "")
                    .trim()
                    .toLowerCase();

            if (!key || key === "guest") {
                return;
            }

            const current =
                helpers.get(key) || {
                    username: key,
                    name:
                        name ||
                        username ||
                        "Pet Lover",
                    avatar:
                        avatar ||
                        DEFAULT_AVATAR,
                    points: 0
                };

            current.points += points;

            if (name) {
                current.name = name;
            }

            if (avatar) {
                current.avatar = avatar;
            }

            helpers.set(key, current);
        };

        posts.forEach(post => {
            addPoints(
                post.authorUsername,
                post.authorName,
                post.authorAvatar,
                2
            );

            (post.comments || [])
                .forEach(comment => {
                    addPoints(
                        comment.authorUsername,
                        comment.authorName,
                        comment.authorAvatar,
                        1
                    );
                });
        });

        getStoredArray(SIGHTINGS_KEY)
            .forEach(sighting => {
                addPoints(
                    sighting.authorUsername ||
                    sighting.username,
                    sighting.authorName ||
                    sighting.username,
                    sighting.authorAvatar,
                    4
                );
            });

        return [...helpers.values()]
            .sort(
                (a, b) =>
                    b.points - a.points ||
                    a.name.localeCompare(b.name)
            )
            .slice(0, 4);
    }

    function renderTopHelpers() {
        if (!elements.topHelpers) {
            return;
        }

        const ranking =
            buildHelperRanking();

        if (!ranking.length) {
            elements.topHelpers.innerHTML =
                '<p class="community-sidebar-empty">Community helpers will appear here.</p>';
            return;
        }

        const medals =
            ["🥇", "🥈", "🥉", "⭐"];

        elements.topHelpers.innerHTML =
            ranking.map((helper, index) => `
                <a
                    class="community-live-item"
                    href="user-profile.html?username=${encodeURIComponent(helper.username)}"
                >
                    <span class="community-helper-rank">
                        ${medals[index] || "⭐"}
                    </span>

                    <span class="community-live-item__body">
                        <strong>
                            ${escapeHtml(helper.name)}
                        </strong>
                        <small>
                            ${helper.points} help point${helper.points === 1 ? "" : "s"}
                        </small>
                    </span>

                    <span class="community-live-item__arrow">
                        →
                    </span>
                </a>
            `).join("");
    }

    function recentHomeAgainReports() {
        return getStoredArray(LOST_REPORTS_KEY)
            .filter(
                report =>
                    Boolean(report?.resolved) &&
                    (
                        report?.homeAgain ||
                        report?.status === "lost"
                    )
            )
            .sort(
                (a, b) =>
                    Date.parse(
                        b.resolvedAt ||
                        b.createdAt ||
                        b.date ||
                        0
                    ) -
                    Date.parse(
                        a.resolvedAt ||
                        a.createdAt ||
                        a.date ||
                        0
                    )
            )
            .slice(0, 3);
    }

    function renderHomeAgain() {
        if (!elements.homeAgain) {
            return;
        }

        const reports =
            recentHomeAgainReports();

        if (!reports.length) {
            elements.homeAgain.innerHTML =
                '<p class="community-sidebar-empty">Home Again stories will appear here.</p>';
            return;
        }

        elements.homeAgain.innerHTML =
            reports.map(report => `
                <a
                    class="community-live-item community-live-item--home"
                    href="lost-found.html?reportId=${encodeURIComponent(report.id)}#reports"
                >
                    <span class="community-live-item__icon">
                        🏡
                    </span>

                    <span class="community-live-item__body">
                        <strong>
                            ${escapeHtml(
                                report.name ||
                                report.pet_name ||
                                "Pet"
                            )}
                        </strong>
                        <small>
                            Safely back home
                        </small>
                    </span>

                    <span class="community-live-item__arrow">
                        →
                    </span>
                </a>
            `).join("");
    }

    function renderLiveSidebar() {
        renderTrendingTopics();
        renderLostNearby();
        renderTopHelpers();
        renderHomeAgain();
    }

    function useCommunityLocation() {
        if (!navigator.geolocation) {
            window.alert(
                "Location is not available on this device."
            );
            return;
        }

        if (elements.useMyArea) {
            elements.useMyArea.disabled = true;
            elements.useMyArea.textContent =
                "📍 Finding you…";
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                communityUserLocation = {
                    latitude:
                        position.coords.latitude,
                    longitude:
                        position.coords.longitude
                };

                if (elements.useMyArea) {
                    elements.useMyArea.disabled = false;
                    elements.useMyArea.textContent =
                        "📍 My area active";
                }

                renderLostNearby();
            },
            () => {
                communityUserLocation = null;

                if (elements.useMyArea) {
                    elements.useMyArea.disabled = false;
                    elements.useMyArea.textContent =
                        "📍 Use my area";
                }

                window.alert(
                    "Location permission was not granted."
                );
            },
            {
                enableHighAccuracy: false,
                timeout: 9000,
                maximumAge: 300000
            }
        );
    }

    function handleSidebarCategory(event) {
        const button =
            event.target.closest(
                "[data-sidebar-category]"
            );

        if (!button) {
            return;
        }

        const category =
            normalizeCategory(
                button.dataset.sidebarCategory
            );

        currentCategory = category;

        elements.categoryFilters
            ?.querySelectorAll(
                "[data-community-category]"
            )
            .forEach(item => {
                const active =
                    item.dataset.communityCategory ===
                    category;

                item.classList.toggle(
                    "is-active",
                    active
                );

                item.setAttribute(
                    "aria-pressed",
                    String(active)
                );
            });

        renderPosts();

        document.querySelector(
            ".community-categories"
        )?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    function renderPosts() {
        elements.feed.innerHTML = "";

        elements.postCount.textContent =
            String(posts.length);

        const blocked =
            window.ThePetGridSafety?.blockedUsernames?.() ||
            new Set();

        const visiblePosts = posts
            .filter(
                post =>
                    !blocked.has(
                        String(
                            post.authorUsername || ""
                        ).toLowerCase()
                    )
            )
            .filter(
                post =>
                    currentCategory === "all" ||
                    normalizeCategory(post.category) ===
                        currentCategory
            )
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.createdAt) -
                    new Date(a.createdAt)
            );

        elements.emptyFeed.hidden =
            visiblePosts.length !== 0;

        if (
            !visiblePosts.length &&
            elements.emptyFeed
        ) {
            const title =
                elements.emptyFeed.querySelector("h3");
            const copy =
                elements.emptyFeed.querySelector("p");

            if (currentCategory === "all") {
                if (title) title.textContent =
                    "No posts yet";
                if (copy) copy.textContent =
                    "Be the first person to share a moment with the community.";
            } else {
                const meta =
                    CATEGORY_META[currentCategory];

                if (title) title.textContent =
                    `No ${meta?.label || "category"} posts yet`;

                if (copy) copy.textContent =
                    "Be the first person to post in this category.";
            }
        }

        visiblePosts.forEach(post => {
            elements.feed.appendChild(
                createPostElement(post)
            );
        });

        renderLiveSidebar();
    }

    function createPostElement(post) {
        const article =
            document.createElement("article");

        article.className = "community-post";
        article.dataset.postId = String(post.id);
        article.id = `post-${post.id}`;

        const profileUrl =
            `user-profile.html?username=${encodeURIComponent(
                post.authorUsername || "user"
            )}`;

        const commentsOpen =
            openCommentPostIds.has(String(post.id));

        article.innerHTML = `
            <div class="post-header">

                <div class="post-author">

                    <a href="${profileUrl}">
                        <img
                            class="community-avatar"
                            src="${escapeHtml(
                                post.authorAvatar ||
                                DEFAULT_AVATAR
                            )}"
                            alt="${escapeHtml(
                                post.authorName
                            )} avatar"
                        >
                    </a>

                    <div class="post-author-info">

                        <a
                            class="post-author-name"
                            href="${profileUrl}"
                        >
                            ${escapeHtml(post.authorName)}
                        </a>

                        <div class="post-meta">
                            @${escapeHtml(
                                post.authorUsername
                            )}
                            ·
                            ${escapeHtml(
                                formatRelativeTime(
                                    post.createdAt
                                )
                            )}
                        </div>

                    </div>

                </div>

                ${
                    canDeletePost(post)
                        ? `
                            <button
                                type="button"
                                class="post-delete-button"
                                data-action="delete"
                                aria-label="Delete post"
                            >
                                🗑️
                            </button>
                        `
                        : ""
                }

            </div>

            <div class="post-content">

                ${
                    post.text
                        ? `
                            <p class="post-text">
                                ${escapeHtml(post.text)}
                            </p>
                        `
                        : ""
                }

                <span class="post-category post-category--${escapeHtml(normalizeCategory(post.category))}">
                    ${escapeHtml(CATEGORY_META[normalizeCategory(post.category)]?.icon || "📸")}
                    ${escapeHtml(CATEGORY_META[normalizeCategory(post.category)]?.label || "Daily Life")}
                </span>

                ${
                    post.taggedPet
                        ? `
                            <span class="post-tag">
                                🐾 With ${escapeHtml(
                                    post.taggedPet
                                )}
                            </span>
                        `
                        : ""
                }

            </div>

            ${
                post.image
                    ? `
                        <img
                            class="post-image"
                            src="${escapeHtml(post.image)}"
                            alt="Community post image"
                        >
                    `
                    : ""
            }

            <div class="post-stats">

                <span>
                    ${Number(post.likes) || 0}
                    ${
                        Number(post.likes) === 1
                            ? "like"
                            : "likes"
                    }
                </span>

                <button
                    type="button"
                    class="comments-count-button"
                    data-action="comment"
                >
                    ${getCommentCount(post)}
                    ${
                        getCommentCount(post) === 1
                            ? "comment"
                            : "comments"
                    }
                </button>

            </div>

            <div class="post-actions">

                <button
                    type="button"
                    class="post-action ${
                        post.likedByCurrentUser
                            ? "is-liked"
                            : ""
                    }"
                    data-action="like"
                >
                    ❤️ Like
                </button>

                <button
                    type="button"
                    class="post-action ${
                        commentsOpen
                            ? "is-comment-active"
                            : ""
                    }"
                    data-action="comment"
                >
                    💬 Comment
                </button>

                <button
                    type="button"
                    class="post-action"
                    data-action="share"
                >
                    🔗 Share
                </button>

                <button
                    type="button"
                    class="post-action"
                    data-action="report"
                >
                    ⚑ Report
                </button>

            </div>

            ${createCommentsMarkup(post, commentsOpen)}
        `;

        article
            .querySelectorAll(
                ".community-avatar, .comment-avatar"
            )
            .forEach((avatar) => {
                avatar.addEventListener(
                    "error",
                    () => {
                        avatar.src = DEFAULT_AVATAR;
                    },
                    { once: true }
                );
            });

        return article;
    }

    function createCommentsMarkup(post, commentsOpen) {
        const comments = Array.isArray(post.comments)
            ? post.comments
            : [];

        return `
            <section
                class="comments-section"
                ${commentsOpen ? "" : "hidden"}
            >

                <div class="comments-section-header">

                    <div>
                        <span class="comments-eyebrow">
                            COMMUNITY DISCUSSION
                        </span>

                        <h3>Comments</h3>
                    </div>

                    <button
                        type="button"
                        class="close-comments-button"
                        data-action="close-comments"
                        aria-label="Close comments"
                    >
                        ×
                    </button>

                </div>

                <div class="comments-list">

                    ${
                        comments.length
                            ? comments
                                  .map(
                                      (comment) =>
                                          createCommentMarkup(
                                              comment
                                          )
                                  )
                                  .join("")
                            : `
                                <div class="no-comments-message">
                                    <span>💬</span>

                                    <div>
                                        <strong>
                                            No comments yet
                                        </strong>

                                        <p>
                                            Start the conversation.
                                        </p>
                                    </div>
                                </div>
                            `
                    }

                </div>

                <form
                    class="comment-form"
                    data-post-id="${escapeHtml(post.id)}"
                >

                    <img
                        class="comment-composer-avatar"
                        src="${escapeHtml(
                            currentUser.avatar ||
                            DEFAULT_AVATAR
                        )}"
                        alt="${escapeHtml(
                            currentUser.displayName
                        )} avatar"
                    >

                    <div class="comment-input-wrapper">

                        <label class="sr-only">
                            Write a comment
                        </label>

                        <textarea
                            class="comment-input"
                            maxlength="300"
                            rows="1"
                            placeholder="Write a comment..."
                            required
                        ></textarea>

                        <div class="comment-form-footer">

                            <span class="comment-character-count">
                                0 / 300
                            </span>

                            <button
                                type="submit"
                                class="send-comment-button"
                            >
                                Send
                            </button>

                        </div>

                    </div>

                </form>

            </section>
        `;
    }

    function createCommentMarkup(comment) {
        const profileUrl =
            `user-profile.html?username=${encodeURIComponent(
                comment.authorUsername || "user"
            )}`;

        return `
            <article
                class="community-comment"
                data-comment-id="${escapeHtml(comment.id)}"
            >

                <a
                    href="${profileUrl}"
                    class="comment-avatar-link"
                >
                    <img
                        class="comment-avatar"
                        src="${escapeHtml(
                            comment.authorAvatar ||
                            DEFAULT_AVATAR
                        )}"
                        alt="${escapeHtml(
                            comment.authorName
                        )} avatar"
                    >
                </a>

                <div class="comment-main">

                    <div class="comment-bubble">

                        <div class="comment-header">

                            <a
                                href="${profileUrl}"
                                class="comment-author-name"
                            >
                                ${escapeHtml(
                                    comment.authorName
                                )}
                            </a>

                            ${
                                canDeleteComment(comment)
                                    ? `
                                        <button
                                            type="button"
                                            class="delete-comment-button"
                                            data-action="delete-comment"
                                            data-comment-id="${escapeHtml(
                                                comment.id
                                            )}"
                                            aria-label="Delete comment"
                                        >
                                            🗑️
                                        </button>
                                    `
                                    : ""
                            }

                        </div>

                        <p>${escapeHtml(comment.text)}</p>

                    </div>

                    <time
                        class="comment-time"
                        datetime="${escapeHtml(
                            comment.createdAt
                        )}"
                    >
                        ${escapeHtml(
                            formatRelativeTime(
                                comment.createdAt
                            )
                        )}
                    </time>

                </div>

            </article>
        `;
    }

    function setComposerMessage(
        message,
        isError = false
    ) {
        elements.composerMessage.textContent =
            message;

        elements.composerMessage.style.color =
            isError
                ? "#be123c"
                : "#15803d";
    }

    function resetComposer() {
        elements.form.reset();

        selectedImage = "";

        elements.imagePreview.removeAttribute("src");
        elements.imagePreviewBox.hidden = true;

        if (elements.postCategory) {
            elements.postCategory.value =
                "daily-life";
        }

        updateCharacterCount();
    }

    function updateCharacterCount() {
        elements.postCharCount.textContent =
            `${elements.postText.value.length} / 600`;
    }

    function readImage(file) {
        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            setComposerMessage(
                "Please choose a valid image file.",
                true
            );

            elements.postImageInput.value = "";

            return;
        }

        if (file.size > 4 * 1024 * 1024) {
            setComposerMessage(
                "The image must be smaller than 4 MB.",
                true
            );

            elements.postImageInput.value = "";

            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            selectedImage = String(
                reader.result || ""
            );

            elements.imagePreview.src =
                selectedImage;

            elements.imagePreviewBox.hidden =
                false;

            setComposerMessage("");
        };

        reader.onerror = () => {
            setComposerMessage(
                "The image could not be read.",
                true
            );
        };

        reader.readAsDataURL(file);
    }

    function publishPost(event) {
        event.preventDefault();

        const text =
            elements.postText.value.trim();

        const taggedPet =
            elements.taggedPet.value.trim();

        const category =
            normalizeCategory(
                elements.postCategory?.value
            );

        if (!text && !selectedImage) {
            setComposerMessage(
                "Write something or add a photo before publishing.",
                true
            );

            elements.postText.focus();

            return;
        }

        elements.publishPostButton.disabled = true;

        const post = normalizePost({
            id: Date.now(),

            authorUsername:
                currentUser.username,

            authorName:
                currentUser.displayName,

            authorAvatar:
                currentUser.avatar,

            text,
            image: selectedImage,
            taggedPet,
            category,

            createdAt:
                new Date().toISOString(),

            likes: 0,

            likedByCurrentUser: false,

            comments: []
        });

        posts.push(post);

        try {
            savePosts();
            resetComposer();
            renderPosts();

            setComposerMessage(
                "Your post was published successfully."
            );
        } catch (error) {
            posts = posts.filter(
                (item) => item.id !== post.id
            );

            console.error(error);

            setComposerMessage(
                "The post could not be saved. Try a smaller image.",
                true
            );
        } finally {
            elements.publishPostButton.disabled =
                false;
        }
    }

    function findPostFromTarget(target) {
        const article =
            target.closest(".community-post");

        if (!article) {
            return null;
        }

        const postId =
            String(article.dataset.postId);

        return (
            posts.find(
                (post) =>
                    String(post.id) === postId
            ) || null
        );
    }

    function toggleComments(post, forceOpen = null) {
        const postId = String(post.id);

        const shouldOpen =
            forceOpen === null
                ? !openCommentPostIds.has(postId)
                : Boolean(forceOpen);

        if (shouldOpen) {
            openCommentPostIds.add(postId);
        } else {
            openCommentPostIds.delete(postId);
        }

        renderPosts();

        if (shouldOpen) {
            requestAnimationFrame(() => {
                const article =
                    document.querySelector(
                        `.community-post[data-post-id="${CSS.escape(
                            postId
                        )}"]`
                    );

                const input =
                    article?.querySelector(
                        ".comment-input"
                    );

                input?.focus();
            });
        }
    }

    function publishComment(form) {
        const postId =
            String(form.dataset.postId);

        const post = posts.find(
            (item) =>
                String(item.id) === postId
        );

        if (!post) {
            return;
        }

        const input =
            form.querySelector(".comment-input");

        const text =
            input?.value.trim() || "";

        if (!text) {
            input?.focus();
            return;
        }

        if (text.length > 300) {
            window.alert(
                "A comment can contain up to 300 characters."
            );

            return;
        }

        const newComment = normalizeComment({
            id:
                `${Date.now()}-${Math.random()
                    .toString(16)
                    .slice(2)}`,

            authorUsername:
                currentUser.username,

            authorName:
                currentUser.displayName,

            authorAvatar:
                currentUser.avatar,

            text,

            createdAt:
                new Date().toISOString()
        });

        if (!Array.isArray(post.comments)) {
            post.comments = [];
        }

        post.comments.push(newComment);

        openCommentPostIds.add(postId);

        savePosts();
        renderPosts();

        requestAnimationFrame(() => {
            const article =
                document.querySelector(
                    `.community-post[data-post-id="${CSS.escape(
                        postId
                    )}"]`
                );

            const commentsSection =
                article?.querySelector(
                    ".comments-section"
                );

            commentsSection?.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });

            article
                ?.querySelector(".comment-input")
                ?.focus();
        });
    }

    function deleteComment(post, commentId) {
        const comment = post.comments.find(
            (item) =>
                String(item.id) ===
                String(commentId)
        );

        if (
            !comment ||
            !canDeleteComment(comment)
        ) {
            return;
        }

        if (
            !window.confirm(
                "Delete this comment?"
            )
        ) {
            return;
        }

        post.comments =
            post.comments.filter(
                (item) =>
                    String(item.id) !==
                    String(commentId)
            );

        openCommentPostIds.add(
            String(post.id)
        );

        savePosts();
        renderPosts();
    }

    async function handleFeedAction(event) {
        const button =
            event.target.closest("[data-action]");

        if (!button) {
            return;
        }

        const post =
            findPostFromTarget(button);

        if (!post) {
            return;
        }

        const action =
            button.dataset.action;

        if (action === "like") {
            post.likedByCurrentUser =
                !post.likedByCurrentUser;

            post.likes = Math.max(
                0,
                Number(post.likes || 0) +
                    (
                        post.likedByCurrentUser
                            ? 1
                            : -1
                    )
            );

            savePosts();
            renderPosts();

            return;
        }

        if (action === "report") {
            try {
                await window.ThePetGridSafety?.reportPost?.(post.id, post.authorUsername);
            } catch (error) {
                window.alert(error.message || "The report could not be submitted.");
            }
            return;
        }

        if (action === "delete") {
            if (
                !window.confirm(
                    "Delete this post?"
                )
            ) {
                return;
            }

            posts = posts.filter(
                (item) =>
                    String(item.id) !==
                    String(post.id)
            );

            openCommentPostIds.delete(
                String(post.id)
            );

            savePosts();
            renderPosts();

            return;
        }

        if (action === "comment") {
            toggleComments(post);
            return;
        }

        if (action === "close-comments") {
            toggleComments(post, false);
            return;
        }

        if (action === "delete-comment") {
            deleteComment(
                post,
                button.dataset.commentId
            );

            return;
        }

        if (action === "share") {
            const shareUrl =
                `${window.location.origin}` +
                `${window.location.pathname}` +
                `#post-${post.id}`;

            try {
                if (navigator.share) {
                    await navigator.share({
                        title:
                            "ThePetGrid Community",

                        text:
                            post.text ||
                            "Community post",

                        url: shareUrl
                    });
                } else if (
                    navigator.clipboard
                ) {
                    await navigator.clipboard.writeText(
                        shareUrl
                    );

                    window.alert(
                        "Post link copied."
                    );
                } else {
                    window.prompt(
                        "Copy this post link:",
                        shareUrl
                    );
                }
            } catch (error) {
                if (
                    error?.name !== "AbortError"
                ) {
                    console.warn(
                        "Share failed:",
                        error
                    );
                }
            }
        }
    }

    function handleFeedSubmit(event) {
        const form =
            event.target.closest(
                ".comment-form"
            );

        if (!form) {
            return;
        }

        event.preventDefault();
        publishComment(form);
    }

    function handleFeedInput(event) {
        const input =
            event.target.closest(
                ".comment-input"
            );

        if (!input) {
            return;
        }

        const form =
            input.closest(".comment-form");

        const counter =
            form?.querySelector(
                ".comment-character-count"
            );

        if (counter) {
            counter.textContent =
                `${input.value.length} / 300`;
        }

        input.style.height = "auto";

        input.style.height =
            `${Math.min(
                input.scrollHeight,
                150
            )}px`;
    }

    function clearDemoFeed() {
        if (
            !window.confirm(
                "Reset the community feed to the demo posts?"
            )
        ) {
            return;
        }

        posts = createDemoPosts();
        openCommentPostIds.clear();

        savePosts();
        renderPosts();
    }

    function handleCategoryFilter(event) {
        const button =
            event.target.closest(
                "[data-community-category]"
            );

        if (!button) {
            return;
        }

        const requested =
            String(
                button.dataset.communityCategory ||
                "all"
            );

        currentCategory =
            requested === "all"
                ? "all"
                : normalizeCategory(requested);

        elements.categoryFilters
            ?.querySelectorAll(
                "[data-community-category]"
            )
            .forEach(item => {
                const active =
                    item === button;

                item.classList.toggle(
                    "is-active",
                    active
                );

                item.setAttribute(
                    "aria-pressed",
                    String(active)
                );
            });

        renderPosts();
    }

    function bindEvents() {
        elements.form.addEventListener(
            "submit",
            publishPost
        );

        elements.postText.addEventListener(
            "input",
            updateCharacterCount
        );

        elements.postImageInput.addEventListener(
            "change",
            (event) => {
                readImage(
                    event.target.files?.[0]
                );
            }
        );

        elements.removeImageButton.addEventListener(
            "click",
            () => {
                selectedImage = "";

                elements.postImageInput.value = "";

                elements.imagePreview.removeAttribute(
                    "src"
                );

                elements.imagePreviewBox.hidden =
                    true;
            }
        );

        elements.feed.addEventListener(
            "click",
            handleFeedAction
        );

        elements.feed.addEventListener(
            "submit",
            handleFeedSubmit
        );

        elements.feed.addEventListener(
            "input",
            handleFeedInput
        );

        elements.clearPostsButton.addEventListener(
            "click",
            clearDemoFeed
        );

        elements.categoryFilters?.addEventListener(
            "click",
            handleCategoryFilter
        );

        elements.trendingTopics?.addEventListener(
            "click",
            handleSidebarCategory
        );

        elements.useMyArea?.addEventListener(
            "click",
            useCommunityLocation
        );

        window.addEventListener(
            "thepetgrid:lost-reports-changed",
            renderLiveSidebar
        );

        window.addEventListener(
            "thepetgrid:sightings-changed",
            renderLiveSidebar
        );

        window.addEventListener(
            "thepetgrid:home-again",
            renderLiveSidebar
        );

        window.addEventListener(
            "storage",
            event => {
                if (
                    [
                        STORAGE_KEY,
                        LOST_REPORTS_KEY,
                        SIGHTINGS_KEY
                    ].includes(event.key)
                ) {
                    if (event.key === STORAGE_KEY) {
                        loadPosts();
                        renderPosts();
                    } else {
                        renderLiveSidebar();
                    }
                }
            }
        );
    }

    async function init() {
        if (
            !elements.form ||
            !elements.feed
        ) {
            console.error(
                "Community page markup is incomplete."
            );

            return;
        }

        loadPosts();
        await window.ThePetGridSafety?.ready;
        await hydrateCurrentUserProfile();
        renderHeaderUser();
        renderComposerIdentity();
        populatePetOptions();
        updateCharacterCount();

        elements.categoryFilters
            ?.querySelectorAll(
                "[data-community-category]"
            )
            .forEach(button => {
                button.setAttribute(
                    "aria-pressed",
                    String(
                        button.dataset.communityCategory ===
                        "all"
                    )
                );
            });

        renderPosts();
        bindEvents();

        console.log(
            "ThePetGrid Community v2 with comments loaded."
        );
    }

    init();
})();
