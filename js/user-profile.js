// ==========================================
// THEPETGRID - PUBLIC USER PROFILE
// PART 1 / 4
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    // ==========================================
    // STORAGE KEYS
    // ==========================================

    const LOGGED_USER_KEY =
        "loggedUser";

    const SAVED_USERS_KEY =
        "thepetgrid_users";

    const SAVED_PROFILES_KEY =
        "thepetgrid_user_profiles";

    const FOLLOWERS_KEY =
        "thepetgrid_profile_followers";

    const MESSAGES_KEY =
        "thepetgrid_profile_messages";

    const COMMUNITY_POSTS_KEY =
        "thePetGridCommunityPosts";

    const DEFAULT_AVATAR =
        "../assets/avatar.png";


    // ==========================================
    // PAGE ELEMENTS
    // ==========================================

    const profileLoading =
        document.getElementById(
            "profileLoading"
        );

    const profileError =
        document.getElementById(
            "profileError"
        );

    const profileContent =
        document.getElementById(
            "profileContent"
        );


    const profileAvatar =
        document.getElementById(
            "profileAvatar"
        );

    const profileDisplayName =
        document.getElementById(
            "profileDisplayName"
        );

    const profileUsername =
        document.getElementById(
            "profileUsername"
        );

    const profileLocation =
        document.getElementById(
            "profileLocation"
        );

    const profileBio =
        document.getElementById(
            "profileBio"
        );

    const profileVerifiedBadge =
        document.getElementById(
            "profileVerifiedBadge"
        );


    const profilePetsCount =
        document.getElementById(
            "profilePetsCount"
        );

    const profileFollowersCount =
        document.getElementById(
            "profileFollowersCount"
        );

    const profileFollowingCount =
        document.getElementById(
            "profileFollowingCount"
        );

    const profileLikesCount =
        document.getElementById(
            "profileLikesCount"
        );


    const profilePetsTitle =
        document.getElementById(
            "profilePetsTitle"
        );

    const profilePetsGrid =
        document.getElementById(
            "profilePetsGrid"
        );

    const profilePetsEmpty =
        document.getElementById(
            "profilePetsEmpty"
        );


    const followButton =
        document.getElementById(
            "followButton"
        );

    const messageButton =
        document.getElementById(
            "messageButton"
        );

    const shareProfileButton =
        document.getElementById(
            "shareProfileButton"
        );

    const profileActivityList =
        document.getElementById(
            "profileActivityList"
        );

    const editProfileButton =
        document.getElementById(
            "editProfileButton"
        );


    // ==========================================
    // FOLLOWERS / FOLLOWING MODAL ELEMENTS
    // ==========================================

    const openFollowersButton =
        document.getElementById(
            "openFollowersButton"
        );

    const openFollowingButton =
        document.getElementById(
            "openFollowingButton"
        );

    const connectionsModal =
        document.getElementById(
            "connectionsModal"
        );

    const connectionsModalTitle =
        document.getElementById(
            "connectionsModalTitle"
        );

    const connectionsModalSubtitle =
        document.getElementById(
            "connectionsModalSubtitle"
        );

    const connectionsModalIcon =
        document.getElementById(
            "connectionsModalIcon"
        );

    const closeConnectionsModalButton =
        document.getElementById(
            "closeConnectionsModal"
        );

    const connectionsSearchInput =
        document.getElementById(
            "connectionsSearchInput"
        );

    const clearConnectionsSearchButton =
        document.getElementById(
            "clearConnectionsSearch"
        );

    const connectionsList =
        document.getElementById(
            "connectionsList"
        );

    const connectionsEmptyState =
        document.getElementById(
            "connectionsEmptyState"
        );

    const connectionsEmptyTitle =
        document.getElementById(
            "connectionsEmptyTitle"
        );

    const connectionsEmptyText =
        document.getElementById(
            "connectionsEmptyText"
        );


    const messageModal =
        document.getElementById(
            "messageModal"
        );

    const messageForm =
        document.getElementById(
            "messageForm"
        );

    const messageText =
        document.getElementById(
            "messageText"
        );

    const messageRecipient =
        document.getElementById(
            "messageRecipient"
        );

    const closeMessageModalButton =
        document.getElementById(
            "closeMessageModal"
        );

    const cancelMessageButton =
        document.getElementById(
            "cancelMessageButton"
        );


    // ==========================================
    // REQUIRED ELEMENT CHECK
    // ==========================================

    const requiredElements = [

        profileAvatar,
        profileDisplayName,
        profileUsername,
        profileLocation,
        profileBio,
        profilePetsCount,
        profileFollowersCount,
        profileFollowingCount,
        profileLikesCount,
        profilePetsGrid

    ];


    const hasMissingRequiredElements =
        requiredElements.some(
            element => !element
        );


    if (hasMissingRequiredElements) {

        console.error(
            "User Profile: Missing required HTML elements."
        );

        return;
    }


    // ==========================================
    // PAGE STATE
    // ==========================================

    let currentProfileUsername =
        "";

    let currentProfile =
        null;

    let currentProfilePets =
        [];

    let currentCloudProfile =
        null;

    let currentCloudPets =
        null;

    let loggedUser =
        null;

    let activeConnectionsType =
        "followers";

    let activeConnectionsUsers =
        [];

    let lastConnectionsTrigger =
        null;


    // ==========================================
    // BASIC HELPERS
    // ==========================================

    function normalizeText(value) {

        return String(value ?? "")
            .trim()
            .toLowerCase();
    }


    function safeText(value) {

        return String(value ?? "")
            .trim();
    }


    function safeNumber(value) {

        const number =
            Number(value);

        return Number.isFinite(number)
            ? number
            : 0;
    }


    function formatNumber(value) {

        return safeNumber(value)
            .toLocaleString();
    }


    function escapeHtml(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function parseJson(value, fallback) {

        if (!value) {
            return fallback;
        }

        try {

            const parsed =
                JSON.parse(value);

            return parsed ?? fallback;

        } catch (error) {

            console.error(
                "User Profile: Invalid saved JSON.",
                error
            );

            return fallback;
        }
    }


    function createLocationText(
        city,
        country
    ) {

        const locationParts = [

            safeText(city),
            safeText(country)

        ].filter(Boolean);


        if (!locationParts.length) {

            return "Location not added";
        }


        return `📍 ${locationParts.join(", ")}`;
    }


    function setElementHidden(
        element,
        hidden
    ) {

        if (!element) {
            return;
        }

        element.hidden =
            Boolean(hidden);
    }


    // ==========================================
    // URL USERNAME
    // ==========================================

    function getUsernameFromUrl() {

        const parameters =
            new URLSearchParams(
                window.location.search
            );

        return safeText(
            parameters.get("username")
        );
    }


    // ==========================================
    // LOGGED USER
    // ==========================================

    function getLoggedUser() {

        const savedUser =
            localStorage.getItem(
                LOGGED_USER_KEY
            );

        const user =
            parseJson(
                savedUser,
                null
            );


        if (
            !user ||
            typeof user !== "object"
        ) {

            return null;
        }


        return user;
    }


    function getUsername(user) {

        if (!user) {
            return "";
        }

        return safeText(

            user.username ||
            user.name ||
            user.email

        );
    }


    function isCurrentUserProfile() {

        const loggedUsername =
            normalizeText(
                getUsername(loggedUser)
            );

        const viewedUsername =
            normalizeText(
                currentProfileUsername
            );


        return Boolean(
            loggedUsername &&
            viewedUsername &&
            loggedUsername ===
                viewedUsername
        );
    }


    // ==========================================
    // SAVED USERS
    // ==========================================

    function getSavedUsers() {

        const possibleKeys = [

            SAVED_USERS_KEY,
            "registeredUsers",
            "users"

        ];


        const users = [];


        possibleKeys.forEach(key => {

            const savedValue =
                localStorage.getItem(key);

            const parsedValue =
                parseJson(
                    savedValue,
                    []
                );


            if (Array.isArray(parsedValue)) {

                parsedValue.forEach(user => {

                    if (
                        user &&
                        typeof user === "object"
                    ) {

                        users.push(user);
                    }
                });
            }
        });


        if (loggedUser) {

            users.push(loggedUser);
        }


        return users;
    }


    function findSavedUser(username) {

        const normalizedUsername =
            normalizeText(username);


        if (!normalizedUsername) {
            return null;
        }


        const savedUsers =
            getSavedUsers();


        const matchingUser =
            savedUsers.find(user => {

                const userNames = [

                    user.username,
                    user.name,
                    user.displayName,
                    user.email

                ].map(normalizeText);


                return userNames.includes(
                    normalizedUsername
                );
            });


        return matchingUser || null;
    }


    // ==========================================
    // SAVED PROFILE DATA
    // ==========================================

    function getSavedProfiles() {

        const savedProfiles =
            parseJson(
                localStorage.getItem(
                    SAVED_PROFILES_KEY
                ),
                {}
            );


        if (
            !savedProfiles ||
            typeof savedProfiles !== "object" ||
            Array.isArray(savedProfiles)
        ) {

            return {};
        }


        return savedProfiles;
    }


    function getSavedProfile(username) {

        const normalizedUsername =
            normalizeText(username);

        const savedProfiles =
            getSavedProfiles();


        const matchingKey =
            Object.keys(
                savedProfiles
            ).find(key =>

                normalizeText(key) ===
                normalizedUsername

            );


        if (!matchingKey) {
            return null;
        }


        const profile =
            savedProfiles[matchingKey];


        return (
            profile &&
            typeof profile === "object"
        )
            ? profile
            : null;
    }


    // ==========================================
    // SUPABASE PROFILE / PETS
    // ==========================================

    function getSupabaseClient() {

        return (
            window.ThePetGridSupabase?.client ||
            null
        );
    }


    function normalizeCloudPet(row) {

        return {

            id:
                row.id,

            ownerId:
                row.owner_id || null,

            ownerUsername:
                currentCloudProfile?.username ||
                "",

            owner:
                currentCloudProfile?.display_name ||
                currentCloudProfile?.username ||
                "ThePetGrid Member",

            name:
                row.name ||
                "Unnamed Pet",

            type:
                row.type ||
                "Other",

            breed:
                row.breed ||
                "Breed not added",

            age:
                row.age === null ||
                row.age === undefined ||
                row.age === ""
                    ? "Age not added"
                    : String(row.age),

            gender:
                row.gender || "",

            country:
                row.country || "",

            city:
                row.city || "",

            bio:
                row.bio || "",

            image:
                row.image_url || "",

            verified:
                Boolean(row.verified),

            status:
                row.is_memorial
                    ? "memorial"
                    : row.is_lost
                        ? "lost"
                        : "new",

            likes:
                safeNumber(
                    row.pet_likes?.[0]?.count ||
                    row.likes
                ),

            followers:
                safeNumber(
                    row.followers
                ),

            gifts:
                safeNumber(
                    row.gifts
                ),

            createdAt:
                row.created_at || ""

        };
    }


    async function loadCloudProfileAndPets(username) {

        currentCloudProfile =
            null;

        currentCloudPets =
            null;


        const client =
            getSupabaseClient();

        if (!client || !username) {
            return;
        }


        try {

            const {
                data: profile,
                error: profileError
            } = await client
                .from("profiles")
                .select("*")
                .eq("username", username)
                .maybeSingle();


            if (profileError) {
                throw profileError;
            }


            if (!profile) {

                currentCloudPets =
                    [];

                return;
            }


            currentCloudProfile =
                profile;


            const {
                data: petRows,
                error: petsError
            } = await client
                .from("pets")
                .select("*, pet_likes(count)")
                .eq(
                    "owner_id",
                    profile.id
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


            if (petsError) {
                throw petsError;
            }


            currentCloudPets =
                Array.isArray(petRows)
                    ? petRows.map(
                        normalizeCloudPet
                    )
                    : [];

        } catch (error) {

            console.error(
                "User Profile: Could not load Supabase profile pets.",
                error
            );


            currentCloudProfile =
                null;

            currentCloudPets =
                null;
        }
    }


    // ==========================================
    // PETSTORE
    // ==========================================

    function getAllPets() {

        if (
            !window.PetStore ||
            typeof window.PetStore.getAll !==
                "function"
        ) {

            console.error(
                "User Profile: PetStore.getAll() is unavailable."
            );

            return [];
        }


        try {

            const pets =
                window.PetStore.getAll();


            return Array.isArray(pets)
                ? pets
                : [];

        } catch (error) {

            console.error(
                "User Profile: Could not load pets.",
                error
            );

            return [];
        }
    }


    function getPetsByOwner(username) {

        const normalizedUsername =
            normalizeText(username);


        if (!normalizedUsername) {
            return [];
        }


        if (
            Array.isArray(
                currentCloudPets
            ) &&
            normalizeText(
                currentCloudProfile?.username
            ) === normalizedUsername
        ) {

            return [
                ...currentCloudPets
            ];
        }


        const sourceUser =
            findSavedUser(username);

        const savedProfile =
            getSavedProfile(username);


        const ownerAliases =
            new Set(
                [
                    username,
                    sourceUser?.username,
                    sourceUser?.displayName,
                    sourceUser?.fullName,
                    sourceUser?.name,
                    sourceUser?.email,
                    savedProfile?.username,
                    savedProfile?.displayName,
                    savedProfile?.fullName,
                    savedProfile?.name,
                    savedProfile?.email
                ]
                    .map(normalizeText)
                    .filter(Boolean)
            );


        return getAllPets().filter(pet => {

            const stableOwnerUsername =
                normalizeText(
                    pet.ownerUsername ||
                    pet.owner_username
                );


            if (
                stableOwnerUsername &&
                stableOwnerUsername ===
                    normalizedUsername
            ) {
                return true;
            }


            const possibleOwners = [

                pet.owner,
                pet.username,
                pet.createdBy,
                pet.user,
                pet.userName

            ]
                .map(normalizeText)
                .filter(Boolean);


            return possibleOwners.some(
                owner =>
                    ownerAliases.has(owner)
            );
        });
    }


    function getDisplayedPetLikes(pet) {

        if (pet?.ownerId) {

            return safeNumber(
                pet.likes
            );
        }


        if (
            window.PetStore &&
            typeof window.PetStore
                .getDisplayedLikes ===
                "function"
        ) {

            try {

                return safeNumber(
                    window.PetStore
                        .getDisplayedLikes(
                            pet.id
                        )
                );

            } catch (error) {

                console.error(
                    "User Profile: Could not load pet likes.",
                    error
                );
            }
        }


        return safeNumber(
            pet.likes
        );
    }


    function calculateTotalLikes(pets) {

        return pets.reduce(

            (total, pet) =>
                total +
                getDisplayedPetLikes(pet),

            0
        );
    }


    function calculateTotalFollowers(pets) {

        return pets.reduce(

            (total, pet) =>
                total +
                safeNumber(
                    pet.followers
                ),

            0
        );
    }


    // ==========================================
    // BUILD PROFILE OBJECT
    // ==========================================

    function buildProfile(username) {

        const sourceUser =
            findSavedUser(username);

        const savedProfile =
            getSavedProfile(username);

        const pets =
            getPetsByOwner(username);


        const profileSource = {

            ...(sourceUser || {}),
            ...(savedProfile || {}),
            ...(currentCloudProfile || {})

        };


        const displayName =
            safeText(

                profileSource.displayName ||
                profileSource.name ||
                profileSource.username ||
                username

            ) || username;


        const profileUsername =
            safeText(

                profileSource.username ||
                username

            );


        const avatar =
            safeText(

                profileSource.avatar ||
                profileSource.avatar_url ||
                profileSource.photo ||
                profileSource.image

            );


        const totalPetLikes =
            calculateTotalLikes(pets);

        const totalPetFollowers =
            calculateTotalFollowers(pets);


        return {

            id:
                profileSource.id || null,

            username:
                profileUsername,

            displayName:
                displayName,

            email:
                safeText(
                    profileSource.email
                ),

            avatar:
                avatar ||
                DEFAULT_AVATAR,

            country:
                safeText(
                    profileSource.country
                ),

            city:
                safeText(
                    profileSource.city
                ),

            bio:
                safeText(
                    profileSource.bio ||
                    profileSource.about
                ),

            verified:
                Boolean(
                    profileSource.verified
                ),

            joined:
                profileSource.joined ||
                profileSource.memberSince ||
                profileSource.created_at ||
                null,

            following:
                safeNumber(
                    profileSource.following
                ),

            petsCount:
                pets.length,

            likesCount:
                totalPetLikes,

            petFollowers:
                totalPetFollowers,

            pets:
                pets
        };
    }

        // ==========================================
    // FOLLOW SYSTEM
    // ==========================================

    function getFollowersData() {

        const savedFollowers =
            parseJson(
                localStorage.getItem(
                    FOLLOWERS_KEY
                ),
                {}
            );


        if (
            !savedFollowers ||
            typeof savedFollowers !== "object" ||
            Array.isArray(savedFollowers)
        ) {

            return {};
        }


        return savedFollowers;
    }


    function saveFollowersData(data) {

        localStorage.setItem(
            FOLLOWERS_KEY,
            JSON.stringify(data)
        );
    }


    function getProfileFollowers(username) {

        const normalizedUsername =
            normalizeText(username);

        const followersData =
            getFollowersData();


        const matchingKey =
            Object.keys(
                followersData
            ).find(key =>

                normalizeText(key) ===
                normalizedUsername

            );


        if (!matchingKey) {
            return [];
        }


        const followers =
            followersData[matchingKey];


        return Array.isArray(followers)
            ? followers
            : [];
    }


    function isFollowingProfile() {

        if (
            !loggedUser ||
            isCurrentUserProfile()
        ) {

            return false;
        }


        const loggedUsername =
            normalizeText(
                getUsername(loggedUser)
            );


        if (!loggedUsername) {
            return false;
        }


        const followers =
            getProfileFollowers(
                currentProfileUsername
            );


        return followers.some(
            follower =>

                normalizeText(follower) ===
                loggedUsername

        );
    }


    function toggleFollow() {

        if (!loggedUser) {

            window.location.href =
                "login.html";

            return;
        }


        if (isCurrentUserProfile()) {
            return;
        }


        const loggedUsername =
            getUsername(loggedUser);

        const normalizedLoggedUsername =
            normalizeText(loggedUsername);

        const profileUsername =
            currentProfileUsername;

        const normalizedProfileUsername =
            normalizeText(profileUsername);


        if (
            !normalizedLoggedUsername ||
            !normalizedProfileUsername
        ) {

            return;
        }


        const followersData =
            getFollowersData();


        const matchingKey =
            Object.keys(
                followersData
            ).find(key =>

                normalizeText(key) ===
                normalizedProfileUsername

            );


        const storageKey =
            matchingKey ||
            profileUsername;


        const currentFollowers =
            Array.isArray(
                followersData[storageKey]
            )
                ? followersData[storageKey]
                : [];


        const existingFollowerIndex =
            currentFollowers.findIndex(
                follower =>

                    normalizeText(follower) ===
                    normalizedLoggedUsername

            );


        if (existingFollowerIndex >= 0) {

            currentFollowers.splice(
                existingFollowerIndex,
                1
            );

        } else {

            currentFollowers.push(
                loggedUsername
            );
        }


        followersData[storageKey] =
            currentFollowers;


        saveFollowersData(
            followersData
        );


        renderProfileStats();

        renderProfileDetails();

        renderProfileActions();

        if (
            connectionsModal &&
            !connectionsModal.hidden
        ) {
            refreshConnectionsModal();
        }
    }


    // ==========================================
    // FOLLOWERS / FOLLOWING LISTS
    // ==========================================

    function getProfileFollowing(username) {

        const normalizedUsername =
            normalizeText(username);

        if (!normalizedUsername) {
            return [];
        }

        const followersData =
            getFollowersData();

        return Object.keys(followersData)
            .filter(targetUsername => {

                const followers =
                    Array.isArray(
                        followersData[targetUsername]
                    )
                        ? followersData[targetUsername]
                        : [];

                return followers.some(
                    follower =>
                        normalizeText(follower) ===
                        normalizedUsername
                );
            })
            .map(safeText)
            .filter(Boolean);
    }


    function getConnectionProfile(username) {

        const profile =
            buildProfile(username);

        return {
            username:
                safeText(
                    profile.username ||
                    username
                ) || safeText(username),

            displayName:
                safeText(
                    profile.displayName ||
                    profile.username ||
                    username
                ) || "ThePetGrid User",

            avatar:
                safeText(profile.avatar) ||
                DEFAULT_AVATAR,

            country:
                safeText(profile.country),

            city:
                safeText(profile.city),

            verified:
                Boolean(profile.verified)
        };
    }


    function getConnectionsUsernames(type) {

        if (type === "following") {

            return getProfileFollowing(
                currentProfileUsername
            );
        }

        return getProfileFollowers(
            currentProfileUsername
        );
    }


    function getConnectionsUsers(type) {

        const usernames =
            getConnectionsUsernames(type);

        const seen =
            new Set();

        return usernames
            .map(getConnectionProfile)
            .filter(user => {

                const normalizedUsername =
                    normalizeText(user.username);

                if (
                    !normalizedUsername ||
                    seen.has(normalizedUsername)
                ) {
                    return false;
                }

                seen.add(normalizedUsername);

                return true;
            });
    }


    function isLoggedUserFollowing(username) {

        if (!loggedUser) {
            return false;
        }

        const loggedUsername =
            normalizeText(
                getUsername(loggedUser)
            );

        const targetUsername =
            normalizeText(username);

        if (
            !loggedUsername ||
            !targetUsername ||
            loggedUsername === targetUsername
        ) {
            return false;
        }

        return getProfileFollowers(username)
            .some(
                follower =>
                    normalizeText(follower) ===
                    loggedUsername
            );
    }


    function toggleFollowForUsername(username) {

        if (!loggedUser) {

            window.location.href =
                "login.html";

            return;
        }

        const loggedUsername =
            getUsername(loggedUser);

        const normalizedLoggedUsername =
            normalizeText(loggedUsername);

        const targetUsername =
            safeText(username);

        const normalizedTargetUsername =
            normalizeText(targetUsername);

        if (
            !normalizedLoggedUsername ||
            !normalizedTargetUsername ||
            normalizedLoggedUsername ===
                normalizedTargetUsername
        ) {
            return;
        }

        const followersData =
            getFollowersData();

        const matchingKey =
            Object.keys(followersData)
                .find(
                    key =>
                        normalizeText(key) ===
                        normalizedTargetUsername
                );

        const storageKey =
            matchingKey ||
            targetUsername;

        const currentFollowers =
            Array.isArray(
                followersData[storageKey]
            )
                ? [...followersData[storageKey]]
                : [];

        const existingFollowerIndex =
            currentFollowers.findIndex(
                follower =>
                    normalizeText(follower) ===
                    normalizedLoggedUsername
            );

        if (existingFollowerIndex >= 0) {

            currentFollowers.splice(
                existingFollowerIndex,
                1
            );

        } else {

            currentFollowers.push(
                loggedUsername
            );
        }

        followersData[storageKey] =
            currentFollowers;

        saveFollowersData(
            followersData
        );

        renderProfileStats();
        renderProfileDetails();
        renderProfileActions();
        refreshConnectionsModal();
    }


    function getConnectionLocation(user) {

        return [
            safeText(user.city),
            safeText(user.country)
        ]
            .filter(Boolean)
            .join(", ");
    }


    function renderConnectionsList() {

        if (
            !connectionsList ||
            !connectionsEmptyState
        ) {
            return;
        }

        const searchTerm =
            normalizeText(
                connectionsSearchInput
                    ? connectionsSearchInput.value
                    : ""
            );

        const filteredUsers =
            activeConnectionsUsers.filter(user => {

                if (!searchTerm) {
                    return true;
                }

                const searchableText =
                    normalizeText([
                        user.displayName,
                        user.username,
                        user.city,
                        user.country
                    ].join(" "));

                return searchableText.includes(
                    searchTerm
                );
            });

        connectionsList.innerHTML =
            "";

        const hasUsers =
            filteredUsers.length > 0;

        connectionsList.hidden =
            !hasUsers;

        connectionsEmptyState.hidden =
            hasUsers;

        if (!hasUsers) {

            if (connectionsEmptyTitle) {

                connectionsEmptyTitle.textContent =
                    searchTerm
                        ? "No matching users"
                        : activeConnectionsType ===
                            "following"
                            ? "Not following anyone yet"
                            : "No followers yet";
            }

            if (connectionsEmptyText) {

                connectionsEmptyText.textContent =
                    searchTerm
                        ? "Try a different name, username or country."
                        : activeConnectionsType ===
                            "following"
                            ? "Profiles followed by this member will appear here."
                            : "New community connections will appear here.";
            }

            return;
        }

        const loggedUsername =
            normalizeText(
                getUsername(loggedUser)
            );

        connectionsList.innerHTML =
            filteredUsers
                .map(user => {

                    const normalizedUsername =
                        normalizeText(user.username);

                    const ownUser =
                        Boolean(
                            loggedUsername &&
                            normalizedUsername ===
                                loggedUsername
                        );

                    const following =
                        isLoggedUserFollowing(
                            user.username
                        );

                    const location =
                        getConnectionLocation(user);

                    const profileUrl =
                        `user-profile.html?username=${
                            encodeURIComponent(
                                user.username
                            )
                        }`;

                    return `
                        <article
                            class="connection-user-card"
                            data-connection-username="${escapeHtml(user.username)}"
                        >
                            <div class="connection-user-avatar-wrap">

                                <img
                                    class="connection-user-avatar"
                                    src="${escapeHtml(user.avatar)}"
                                    alt="${escapeHtml(user.displayName)}"
                                    loading="lazy"
                                    onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';"
                                >

                                ${
                                    user.verified
                                        ? `
                                            <span
                                                class="connection-user-verified"
                                                title="Verified profile"
                                                aria-label="Verified profile"
                                            >
                                                ✔
                                            </span>
                                        `
                                        : ""
                                }

                            </div>

                            <div class="connection-user-copy">

                                <div class="connection-user-name-row">

                                    <span class="connection-user-name">
                                        ${escapeHtml(user.displayName)}
                                    </span>

                                </div>

                                <span class="connection-user-username">
                                    @${escapeHtml(user.username)}
                                </span>

                                ${
                                    location
                                        ? `
                                            <span class="connection-user-location">
                                                📍 ${escapeHtml(location)}
                                            </span>
                                        `
                                        : ""
                                }

                            </div>

                            <div class="connection-user-actions">

                                <a
                                    class="connection-view-profile"
                                    href="${profileUrl}"
                                >
                                    View Profile
                                </a>

                                ${
                                    ownUser
                                        ? `
                                            <button
                                                class="connection-follow-btn"
                                                type="button"
                                                disabled
                                            >
                                                You
                                            </button>
                                        `
                                        : `
                                            <button
                                                class="connection-follow-btn ${
                                                    following
                                                        ? "is-following"
                                                        : ""
                                                }"
                                                type="button"
                                                data-toggle-connection-follow
                                                data-username="${escapeHtml(user.username)}"
                                                aria-pressed="${String(following)}"
                                            >
                                                ${
                                                    following
                                                        ? "Following"
                                                        : "Follow"
                                                }
                                            </button>
                                        `
                                }

                            </div>

                        </article>
                    `;
                })
                .join("");
    }


    function updateConnectionsModalHeader() {

        const isFollowing =
            activeConnectionsType ===
            "following";

        if (connectionsModalIcon) {

            connectionsModalIcon.textContent =
                isFollowing
                    ? "🐾"
                    : "👥";
        }

        if (connectionsModalTitle) {

            connectionsModalTitle.textContent =
                isFollowing
                    ? "Following"
                    : "Followers";
        }

        if (connectionsModalSubtitle) {

            const count =
                activeConnectionsUsers.length;

            connectionsModalSubtitle.textContent =
                isFollowing
                    ? `${formatNumber(count)} profile${
                        count === 1 ? "" : "s"
                    } followed by this member.`
                    : `${formatNumber(count)} follower${
                        count === 1 ? "" : "s"
                    } connected with this profile.`;
        }
    }


    function refreshConnectionsModal() {

        if (
            !connectionsModal ||
            connectionsModal.hidden
        ) {
            return;
        }

        activeConnectionsUsers =
            getConnectionsUsers(
                activeConnectionsType
            );

        updateConnectionsModalHeader();
        renderConnectionsList();
    }


    function openConnectionsModal(type, trigger) {

        if (
            !connectionsModal ||
            !currentProfile
        ) {
            return;
        }

        activeConnectionsType =
            type === "following"
                ? "following"
                : "followers";

        lastConnectionsTrigger =
            trigger || document.activeElement;

        activeConnectionsUsers =
            getConnectionsUsers(
                activeConnectionsType
            );

        if (connectionsSearchInput) {

            connectionsSearchInput.value =
                "";
        }

        if (clearConnectionsSearchButton) {

            clearConnectionsSearchButton.hidden =
                true;
        }

        updateConnectionsModalHeader();
        renderConnectionsList();

        connectionsModal.hidden =
            false;

        document.body.classList.add(
            "connections-modal-open"
        );

        window.setTimeout(
            () => {

                if (connectionsSearchInput) {
                    connectionsSearchInput.focus();
                }
            },
            40
        );
    }


    function closeConnectionsModal() {

        if (
            !connectionsModal ||
            connectionsModal.hidden
        ) {
            return;
        }

        connectionsModal.hidden =
            true;

        document.body.classList.remove(
            "connections-modal-open"
        );

        if (
            lastConnectionsTrigger &&
            typeof lastConnectionsTrigger.focus ===
                "function"
        ) {

            lastConnectionsTrigger.focus();
        }

        lastConnectionsTrigger =
            null;
    }


    function handleConnectionsSearch() {

        if (clearConnectionsSearchButton) {

            clearConnectionsSearchButton.hidden =
                !safeText(
                    connectionsSearchInput
                        ? connectionsSearchInput.value
                        : ""
                );
        }

        renderConnectionsList();
    }


    function clearConnectionsSearch() {

        if (!connectionsSearchInput) {
            return;
        }

        connectionsSearchInput.value =
            "";

        if (clearConnectionsSearchButton) {

            clearConnectionsSearchButton.hidden =
                true;
        }

        renderConnectionsList();
        connectionsSearchInput.focus();
    }


    // ==========================================
    // MESSAGE SYSTEM
    // ==========================================

    function getSavedMessages() {

        const messages =
            parseJson(
                localStorage.getItem(
                    MESSAGES_KEY
                ),
                []
            );


        return Array.isArray(messages)
            ? messages
            : [];
    }


    function saveMessages(messages) {

        localStorage.setItem(
            MESSAGES_KEY,
            JSON.stringify(messages)
        );
    }


    function openMessageModal() {

        if (!loggedUser) {

            window.location.href =
                "login.html";

            return;
        }


        if (isCurrentUserProfile()) {
            return;
        }


        if (!messageModal) {

            window.alert(
                "Message form is not available."
            );

            return;
        }


        if (messageRecipient) {

            messageRecipient.textContent =
                currentProfile.displayName ||
                currentProfile.username;
        }


        if (messageText) {

            messageText.value =
                "";
        }


        messageModal.hidden =
            false;

        messageModal.classList.add(
            "is-open"
        );


        document.body.classList.add(
            "modal-open"
        );


        if (messageText) {

            window.setTimeout(
                () => messageText.focus(),
                50
            );
        }
    }


    function closeMessageModal() {

        if (!messageModal) {
            return;
        }


        messageModal.hidden =
            true;

        messageModal.classList.remove(
            "is-open"
        );


        document.body.classList.remove(
            "modal-open"
        );
    }


    function sendMessage(event) {

        event.preventDefault();


        if (!loggedUser) {

            window.location.href =
                "login.html";

            return;
        }


        const senderUsername =
            getUsername(loggedUser);

        const recipientUsername =
            currentProfileUsername;

        const text =
            safeText(
                messageText
                    ? messageText.value
                    : ""
            );


        if (!text) {

            window.alert(
                "Please write a message."
            );

            if (messageText) {
                messageText.focus();
            }

            return;
        }


        const messages =
            getSavedMessages();


        messages.push({

            id:
                Date.now(),

            sender:
                senderUsername,

            recipient:
                recipientUsername,

            text:
                text,

            createdAt:
                new Date().toISOString(),

            read:
                false
        });


        saveMessages(
            messages
        );


        closeMessageModal();


        window.alert(
            `Your message was sent to ${
                currentProfile.displayName ||
                currentProfile.username
            }.`
        );
    }


    // ==========================================
    // PROFILE STATE
    // ==========================================

    function showLoadingState() {

        setElementHidden(
            profileLoading,
            false
        );

        setElementHidden(
            profileError,
            true
        );

        setElementHidden(
            profileContent,
            true
        );
    }


    function showErrorState(
        title = "Profile not found",
        message =
            "We could not find this user profile."
    ) {

        setElementHidden(
            profileLoading,
            true
        );

        setElementHidden(
            profileContent,
            true
        );

        setElementHidden(
            profileError,
            false
        );


        if (profileError) {

            const titleElement =
                profileError.querySelector(
                    "[data-error-title], h2"
                );

            const messageElement =
                profileError.querySelector(
                    "[data-error-message], #profileErrorMessage"
                );


            if (titleElement) {

                titleElement.textContent =
                    title;
            }


            if (messageElement) {

                messageElement.textContent =
                    message;
            }
        }
    }


    function showContentState() {

        setElementHidden(
            profileLoading,
            true
        );

        setElementHidden(
            profileError,
            true
        );

        setElementHidden(
            profileContent,
            false
        );
    }


    // ==========================================
    // PROFILE HERO
    // ==========================================

    function renderProfileHero() {

        if (!currentProfile) {
            return;
        }


        const displayName =
            safeText(
                currentProfile.displayName
            ) ||
            safeText(
                currentProfile.username
            ) ||
            "User";


        profileDisplayName.textContent =
            displayName;


        profileUsername.textContent =
            `@${currentProfile.username}`;


        profileLocation.textContent =
            createLocationText(
                currentProfile.city,
                currentProfile.country
            );


        profileBio.textContent =
            currentProfile.bio ||
            "This user has not added a bio yet.";


        const savedAvatar =
            safeText(
                currentProfile.avatar
            );


        const invalidAvatar =
            !savedAvatar ||
            savedAvatar.includes(
                "/images/avatar.png"
            ) ||
            savedAvatar.includes(
                "/images/default-avatar.png"
            );


        profileAvatar.src =
            invalidAvatar
                ? DEFAULT_AVATAR
                : savedAvatar;


        profileAvatar.alt =
            `${displayName} profile photo`;


        profileAvatar.onerror =
            function () {

                this.onerror =
                    null;

                this.src =
                    DEFAULT_AVATAR;
            };


        if (profileVerifiedBadge) {

            profileVerifiedBadge.hidden =
                !currentProfile.verified;
        }


        if (profilePetsTitle) {

            profilePetsTitle.textContent =
                `${displayName}'s Pets`;
        }
    }


    // ==========================================
    // PROFILE STATS
    // ==========================================

    function renderProfileStats() {

        if (!currentProfile) {
            return;
        }


        const profileFollowers =
            getProfileFollowers(
                currentProfileUsername
            );


        const totalFollowers =
            profileFollowers.length;


        profilePetsCount.textContent =
            formatNumber(
                currentProfilePets.length
            );


        profileFollowersCount.textContent =
            formatNumber(
                totalFollowers
            );


        profileFollowingCount.textContent =
            formatNumber(
                getProfileFollowing(
                    currentProfileUsername
                ).length
            );


        profileLikesCount.textContent =
            formatNumber(
                calculateTotalLikes(
                    currentProfilePets
                )
            );
    }


    // ==========================================
    // PROFILE DETAILS / COMMUNITY
    // ==========================================

    function setTextById(id, value) {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }


    function formatMemberSince(value) {

        if (!value) {
            return "Member since " +
                new Date().getFullYear();
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return safeText(value);
        }

        return "Member since " +
            date.getFullYear();
    }


    function renderProfileDetails() {

        if (!currentProfile) {
            return;
        }

        const totalLikes =
            calculateTotalLikes(currentProfilePets);

        const totalGifts =
            currentProfilePets.reduce(
                (sum, pet) =>
                    sum + safeNumber(pet.gifts),
                0
            );

        setTextById(
            "profileAboutName",
            currentProfile.displayName ||
                currentProfile.username ||
                "—"
        );

        setTextById(
            "profileAboutUsername",
            currentProfile.username
                ? `@${currentProfile.username}`
                : "—"
        );

        setTextById(
            "profileCountry",
            currentProfile.country || "—"
        );

        setTextById(
            "profileCity",
            currentProfile.city || "—"
        );

        setTextById(
            "profileMemberSince",
            formatMemberSince(currentProfile.joined)
        );

        setTextById(
            "communityPetsValue",
            formatNumber(currentProfilePets.length)
        );

        setTextById(
            "communityLikesValue",
            formatNumber(totalLikes)
        );

        setTextById(
            "communityGiftsValue",
            formatNumber(totalGifts)
        );
    }


    // ==========================================
    // PROFILE ACTIONS
    // ==========================================

    function renderProfileActions() {

        const ownProfile =
            isCurrentUserProfile();


        if (editProfileButton) {

            editProfileButton.hidden =
                !ownProfile;


            if (ownProfile) {

                editProfileButton.href =
                    "my-profile.html";
            }
        }


        if (followButton) {

            followButton.hidden =
                ownProfile;


            if (!ownProfile) {

                const following =
                    isFollowingProfile();


                followButton.textContent =
                    following
                        ? "Following"
                        : "Follow";


                followButton.classList.toggle(
                    "is-following",
                    following
                );


                followButton.setAttribute(
                    "aria-pressed",
                    String(following)
                );
            }
        }


        if (messageButton) {

            messageButton.hidden =
                ownProfile;
        }
    }


    // ==========================================
    // PET CARD HELPERS
    // ==========================================

    function formatPetStatus(status) {

        const normalizedStatus =
            normalizeText(status);


        const labels = {

            new:
                "New",

            active:
                "Active",

            featured:
                "Featured",

            adoption:
                "Looking for Home",

            available:
                "Available",

            adopted:
                "Adopted",

            lost:
                "Lost",

            missing:
                "Missing",

            memorial:
                "Memorial",

            inactive:
                "Inactive"
        };


        return (
            labels[normalizedStatus] ||
            safeText(status) ||
            "New"
        );
    }


    function getPetProfileUrl(petId) {

        return (
            `pet.html?id=${
                encodeURIComponent(
                    petId
                )
            }`
        );
    }

        // ==========================================
    // CREATE PET CARD
    // ==========================================

    function createPetCard(pet) {

        const card =
            document.createElement(
                "article"
            );


        card.className =
            "profile-pet-card";


        const petId =
            safeText(
                pet.id
            );


        const petName =
            escapeHtml(
                pet.name ||
                "Unnamed Pet"
            );


        const petBreed =
            escapeHtml(
                pet.breed ||
                "Unknown breed"
            );


        const petCountry =
            escapeHtml(
                pet.country ||
                "Unknown country"
            );


        const petCity =
            escapeHtml(
                pet.city ||
                ""
            );


        const petType =
            escapeHtml(
                pet.type ||
                "Pet"
            );


        const petStatus =
            escapeHtml(
                formatPetStatus(
                    pet.status
                )
            );


        const petImage =
            escapeHtml(
                pet.image ||
                ""
            );


        const petLikes =
            getDisplayedPetLikes(
                pet
            );


        const petFollowers =
            safeNumber(
                pet.followers
            );


        const petGifts =
            safeNumber(
                pet.gifts
            );


        const locationText =
            [petCity, petCountry]
                .filter(Boolean)
                .join(", ");


        const petUrl =
            getPetProfileUrl(
                petId
            );


        card.innerHTML = `
            <a
                class="profile-pet-card__image-link"
                href="${petUrl}"
                aria-label="View ${petName}"
            >
                <div class="profile-pet-card__image-wrapper">

                    <img
                        class="profile-pet-card__image"
                        src="${petImage}"
                        alt="${petName}"
                    >

                    ${
                        pet.verified
                            ? `
                                <span
                                    class="profile-pet-card__verified"
                                    title="Verified pet"
                                >
                                    ✔ VERIFIED
                                </span>
                            `
                            : ""
                    }

                    <span
                        class="profile-pet-card__status"
                    >
                        ${petStatus}
                    </span>

                </div>
            </a>

            <div class="profile-pet-card__content">

                <div class="profile-pet-card__top">

                    <div>

                        <p
                            class="profile-pet-card__type"
                        >
                            ${petType}
                        </p>

                        <h3
                            class="profile-pet-card__name"
                        >
                            <a href="${petUrl}">
                                ${petName}
                            </a>
                        </h3>

                    </div>

                </div>

                <p
                    class="profile-pet-card__breed"
                >
                    ${petBreed}
                </p>

                <p
                    class="profile-pet-card__location"
                >
                    📍 ${
                        locationText ||
                        "Location not added"
                    }
                </p>

                <div
                    class="profile-pet-card__stats"
                >

                    <span>
                        ❤️ ${formatNumber(
                            petLikes
                        )}
                    </span>

                    <span>
                        👥 ${formatNumber(
                            petFollowers
                        )}
                    </span>

                    <span>
                        🎁 ${formatNumber(
                            petGifts
                        )}
                    </span>

                </div>

                <a
                    class="profile-pet-card__button"
                    href="${petUrl}"
                >
                    View Pet
                </a>

            </div>
        `;


        const imageElement =
            card.querySelector(
                ".profile-pet-card__image"
            );


        if (imageElement) {

            imageElement.onerror =
                function () {

                    this.onerror =
                        null;

                    this.src =
                        DEFAULT_AVATAR;
                };
        }


        return card;
    }


    // ==========================================
    // PETS EMPTY STATE
    // ==========================================

    function renderPetsEmptyState() {

        profilePetsGrid.innerHTML =
            "";


        if (profilePetsEmpty) {

            profilePetsEmpty.hidden =
                false;

            return;
        }


        profilePetsGrid.innerHTML = `
            <div class="profile-pets-empty">

                <div class="profile-pets-empty__icon">
                    🐾
                </div>

                <h3>
                    No pets yet
                </h3>

                <p>
                    This user has not added any pets yet.
                </p>

            </div>
        `;
    }


    // ==========================================
    // RENDER PETS
    // ==========================================

    function renderProfilePets() {

        profilePetsGrid.innerHTML =
            "";


        if (profilePetsEmpty) {

            profilePetsEmpty.hidden =
                true;
        }


        if (!currentProfilePets.length) {

            renderPetsEmptyState();

            return;
        }


        currentProfilePets.forEach(
            pet => {

                profilePetsGrid.appendChild(
                    createPetCard(pet)
                );
            }
        );
    }


    // ==========================================
    // RECENT ACTIVITY
    // ==========================================

    function getCommunityPostsByUser(username) {

        const normalizedUsername =
            normalizeText(username);

        if (!normalizedUsername) {
            return [];
        }

        const savedPosts =
            parseJson(
                localStorage.getItem(
                    COMMUNITY_POSTS_KEY
                ),
                []
            );

        if (!Array.isArray(savedPosts)) {
            return [];
        }

        return savedPosts
            .filter(post =>
                post &&
                typeof post === "object" &&
                normalizeText(
                    post.authorUsername ||
                    post.username
                ) === normalizedUsername
            )
            .sort((firstPost, secondPost) =>
                new Date(secondPost.createdAt || 0) -
                new Date(firstPost.createdAt || 0)
            );
    }


    function createCommunityActivity(post, displayName) {

        const postText =
            safeText(post.text);

        const shortText = postText.length > 72
            ? `${postText.slice(0, 72)}…`
            : postText;

        const commentCount = Array.isArray(post.comments)
            ? post.comments.length
            : safeNumber(post.comments);

        return {
            icon: post.image ? "📸" : "💬",
            title: shortText
                ? `${displayName} posted: “${shortText}”`
                : `${displayName} shared a community photo`,
            meta: `${formatNumber(post.likes)} likes · ${formatNumber(commentCount)} comments`,
            url: `community.html#post-${encodeURIComponent(post.id)}`
        };
    }


    function renderRecentActivity() {

        if (!profileActivityList || !currentProfile) {
            return;
        }

        const displayName =
            safeText(currentProfile.displayName) ||
            safeText(currentProfile.username) ||
            "This member";

        const recentPosts =
            getCommunityPostsByUser(
                currentProfile.username
            )
                .slice(0, 3)
                .map(post =>
                    createCommunityActivity(
                        post,
                        displayName
                    )
                );

        const recentPets =
            currentProfilePets
                .slice(-3)
                .reverse()
                .map((pet, index) => ({
                    icon: index === 0 ? "🐾" : "📸",
                    title: `${displayName} shared ${
                        safeText(pet.name) || "a pet"
                    }`,
                    meta: safeText(pet.type) || "Pet update",
                    url: getPetProfileUrl(pet.id)
                }));

        const activities = [
            ...recentPosts,
            ...recentPets
        ];

        const totalLikes =
            calculateTotalLikes(currentProfilePets);

        if (totalLikes > 0) {
            activities.push({
                icon: "❤️",
                title: "Their pets are receiving community love",
                meta: `${formatNumber(totalLikes)} total likes`,
                url: ""
            });
        }

        if (!activities.length) {
            profileActivityList.innerHTML = `
                <div class="profile-activity-empty">
                    No public activity has been shared yet.
                </div>
            `;
            return;
        }

        profileActivityList.innerHTML = activities
            .slice(0, 5)
            .map(activity => {

                const content = `
                    <div class="profile-activity-icon">
                        ${activity.icon}
                    </div>

                    <div class="profile-activity-copy">
                        <strong>${escapeHtml(activity.title)}</strong>
                        <span>${escapeHtml(activity.meta)}</span>
                    </div>
                `;

                return activity.url
                    ? `
                        <a
                            class="profile-activity-item"
                            href="${escapeHtml(activity.url)}"
                        >
                            ${content}
                        </a>
                    `
                    : `
                        <div class="profile-activity-item">
                            ${content}
                        </div>
                    `;
            })
            .join("");
    }


    async function shareCurrentProfile() {

        if (!currentProfile) {
            return;
        }

        const shareData = {
            title: `${currentProfile.displayName || currentProfile.username} on ThePetGrid`,
            text: `View @${currentProfile.username}'s public profile on ThePetGrid.`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                return;
            }

            await navigator.clipboard.writeText(window.location.href);
            window.alert("Profile link copied.");
        } catch (error) {
            if (error && error.name === "AbortError") {
                return;
            }

            window.prompt("Copy this profile link:", window.location.href);
        }
    }


    // ==========================================
    // RENDER COMPLETE PROFILE
    // ==========================================

    function renderProfile() {

        if (!currentProfile) {

            showErrorState();

            return;
        }


        renderProfileHero();

        renderProfileStats();

        renderProfileDetails();

        if (
            typeof renderProfileIdentity ===
            "function"
        ) {
            renderProfileIdentity();
        }

        renderProfileActions();

        renderProfilePets();

        renderRecentActivity();

        showContentState();
    }


    // ==========================================
    // FIND PROFILE USERNAME
    // ==========================================

    function resolveProfileUsername() {

        const usernameFromUrl =
            getUsernameFromUrl();


        if (usernameFromUrl) {

            return usernameFromUrl;
        }


        const currentLoggedUsername =
            getUsername(
                loggedUser
            );


        if (currentLoggedUsername) {

            return currentLoggedUsername;
        }


        return "";
    }


    // ==========================================
    // PROFILE EXISTENCE CHECK
    // ==========================================

    function profileCanBeDisplayed(
        username
    ) {

        if (!username) {

            return false;
        }


        const savedUser =
            findSavedUser(
                username
            );


        const savedProfile =
            getSavedProfile(
                username
            );


        const pets =
            getPetsByOwner(
                username
            );


        const loggedUsername =
            normalizeText(
                getUsername(
                    loggedUser
                )
            );


        const requestedUsername =
            normalizeText(
                username
            );


        const isLoggedUser =
            loggedUsername &&
            requestedUsername ===
                loggedUsername;


        return Boolean(

            currentCloudProfile ||
            savedUser ||
            savedProfile ||
            pets.length ||
            isLoggedUser

        );
    }


    // ==========================================
    // LOAD PROFILE PAGE
    // ==========================================

    async function loadProfilePage() {

        showLoadingState();


        loggedUser =
            getLoggedUser();


        currentProfileUsername =
            resolveProfileUsername();


        if (!currentProfileUsername) {

            showErrorState(
                "Profile not available",
                "No username was provided."
            );

            return;
        }


        await loadCloudProfileAndPets(
            currentProfileUsername
        );


        if (
            !profileCanBeDisplayed(
                currentProfileUsername
            )
        ) {

            showErrorState(
                "Profile not found",
                "We could not find this user profile."
            );

            return;
        }


        if (
            window.PetStore &&
            typeof window.PetStore
                .migrateOwnerIdentity ===
                "function"
        ) {

            window.PetStore
                .migrateOwnerIdentity();

        }


        currentProfile =
            buildProfile(
                currentProfileUsername
            );


        currentProfilePets =
            Array.isArray(
                currentProfile.pets
            )
                ? currentProfile.pets
                : [];


        renderProfile();
    }


    // ==========================================
    // BUTTON EVENTS
    // ==========================================

    if (followButton) {

        followButton.addEventListener(
            "click",
            toggleFollow
        );
    }


    if (openFollowersButton) {

        openFollowersButton.addEventListener(
            "click",
            () => openConnectionsModal(
                "followers",
                openFollowersButton
            )
        );
    }


    if (openFollowingButton) {

        openFollowingButton.addEventListener(
            "click",
            () => openConnectionsModal(
                "following",
                openFollowingButton
            )
        );
    }


    if (closeConnectionsModalButton) {

        closeConnectionsModalButton.addEventListener(
            "click",
            closeConnectionsModal
        );
    }


    if (connectionsSearchInput) {

        connectionsSearchInput.addEventListener(
            "input",
            handleConnectionsSearch
        );
    }


    if (clearConnectionsSearchButton) {

        clearConnectionsSearchButton.addEventListener(
            "click",
            clearConnectionsSearch
        );
    }


    if (connectionsList) {

        connectionsList.addEventListener(
            "click",
            event => {

                const followControl =
                    event.target.closest(
                        "[data-toggle-connection-follow]"
                    );

                if (!followControl) {
                    return;
                }

                toggleFollowForUsername(
                    followControl.dataset.username
                );
            }
        );
    }


    document.querySelectorAll(
        "[data-close-connections-modal]"
    ).forEach(element => {

        element.addEventListener(
            "click",
            closeConnectionsModal
        );
    });


    if (messageButton) {

        messageButton.addEventListener(
            "click",
            () => {
                const username = currentProfileUsername || (currentProfile && currentProfile.username);
                if (!username) {
                    return;
                }
                window.location.href = `messages.html?username=${encodeURIComponent(username)}`;
            }
        );
    }


    if (shareProfileButton) {

        shareProfileButton.addEventListener(
            "click",
            shareCurrentProfile
        );
    }


    if (closeMessageModalButton) {

        closeMessageModalButton
            .addEventListener(
                "click",
                closeMessageModal
            );
    }


    if (cancelMessageButton) {

        cancelMessageButton
            .addEventListener(
                "click",
                closeMessageModal
            );
    }


    if (messageForm) {

        messageForm.addEventListener(
            "submit",
            sendMessage
        );
    }


    // ==========================================
    // MODAL BACKDROP
    // ==========================================

    if (messageModal) {

        messageModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    messageModal
                ) {

                    closeMessageModal();
                }
            }
        );
    }


    const messageCharacterCount =
        document.getElementById(
            "messageCharacterCount"
        );


    if (messageText && messageCharacterCount) {

        messageText.addEventListener(
            "input",
            () => {

                messageCharacterCount.textContent =
                    String(messageText.value.length);
            }
        );
    }


    document.querySelectorAll(
        "[data-close-message-modal]"
    ).forEach(element => {

        element.addEventListener(
            "click",
            closeMessageModal
        );
    });


    // ==========================================
    // ESCAPE KEY
    // ==========================================

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeMessageModal();

                closeConnectionsModal();
            }
        }
    );


    // ==========================================
    // PETSTORE UPDATE EVENTS
    // ==========================================

    window.addEventListener(
        "petstore:change",
        () => {

            if (
                !currentProfileUsername
            ) {

                return;
            }


            currentProfile =
                buildProfile(
                    currentProfileUsername
                );


            currentProfilePets =
                Array.isArray(
                    currentProfile.pets
                )
                    ? currentProfile.pets
                    : [];


            renderProfileStats();

            renderProfileDetails();

            renderProfilePets();
        }
    );


    // ==========================================
    // STORAGE UPDATE EVENTS
    // ==========================================

    window.addEventListener(
        "storage",
        event => {

            const relevantKeys = [

                LOGGED_USER_KEY,
                SAVED_USERS_KEY,
                SAVED_PROFILES_KEY,
                FOLLOWERS_KEY

            ];


            if (
                !relevantKeys.includes(
                    event.key
                )
            ) {

                return;
            }


            loadProfilePage();

            refreshConnectionsModal();
        }
    );

        // ==========================================
    // FINAL PAGE SAFETY
    // ==========================================

    function ensureProfileVisibility() {

        if (
            currentProfile &&
            profileContent
        ) {

            profileContent.hidden =
                false;
        }


        if (profileLoading) {

            profileLoading.hidden =
                true;
        }
    }


    // ==========================================
    // WINDOW ERROR SAFETY
    // ==========================================

    window.addEventListener(
        "error",
        event => {

            console.error(
                "User Profile runtime error:",
                event.error || event.message
            );


            if (
                profileLoading &&
                !profileLoading.hidden
            ) {

                showErrorState(
                    "Profile could not load",
                    "An unexpected error occurred while loading this profile."
                );
            }
        }
    );


    // ==========================================
    // UNHANDLED PROMISE SAFETY
    // ==========================================

    window.addEventListener(
        "unhandledrejection",
        event => {

            console.error(
                "User Profile promise error:",
                event.reason
            );


            if (
                profileLoading &&
                !profileLoading.hidden
            ) {

                showErrorState(
                    "Profile could not load",
                    "The profile data could not be loaded."
                );
            }
        }
    );


    // ==========================================
    // INITIALIZE PAGE
    // ==========================================

    loadProfilePage()
        .then(() => {

            ensureProfileVisibility();

        })
        .catch(error => {

            console.error(
                "User Profile initialization failed.",
                error
            );


            showErrorState(
                "Profile could not load",
                "The profile page could not be initialized."
            );
        });

});