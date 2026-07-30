/* =========================================================
   ThePetGrid — Messaging Center
   File: js/messages.js
   Sprint 3.2
========================================================= */

(() => {
    "use strict";

    /* =====================================================
       CONSTANTS
    ===================================================== */

    const STORAGE_KEYS = {
        conversations: "thepetgrid_messages_conversations",
        users: "thepetgrid_messages_users",
        currentUser: "loggedUser",
        following: "thepetgrid_following",
        gifts: "thepetgrid_virtual_gifts"
    };

    const DEFAULT_AVATAR = "../assets/avatar.png";
    const MAX_MESSAGE_LENGTH = 1500;
    const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

    const GIFT_CATALOG = [
        { id: "bone", emoji: "🦴", name: "Golden Bone", price: 1.99 },
        { id: "food", emoji: "🥫", name: "Premium Food", price: 2.99 },
        { id: "treats", emoji: "🍪", name: "Tasty Treats", price: 1.49 },
        { id: "toy", emoji: "🎾", name: "Playful Toy", price: 3.49 },
        { id: "flower", emoji: "🌸", name: "Love Flower", price: 2.49 },
        { id: "crown", emoji: "👑", name: "Pet Star Crown", price: 4.99 }
    ];

    /* =====================================================
       DOM HELPERS
    ===================================================== */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];

    const elements = {
        conversationList: $("#conversationList"),
        conversationsEmptyState: $("#conversationsEmptyState"),
        conversationSearchInput: $("#conversationSearchInput"),
        clearConversationSearch: $("#clearConversationSearch"),
        filterButtons: $$(".conversation-filter-btn"),

        chatEmptyState: $("#chatEmptyState"),
        activeChat: $("#activeChat"),
        chatUserButton: $("#chatUserButton"),
        chatUserAvatar: $("#chatUserAvatar"),
        chatUserPresence: $("#chatUserPresence"),
        chatUserName: $("#chatUserName"),
        chatUserStatus: $("#chatUserStatus"),

        messagesViewport: $("#messagesViewport"),
        messagesList: $("#messagesList"),
        scrollToLatestButton: $("#scrollToLatestButton"),

        messageComposerForm: $("#messageComposerForm"),
        messageInput: $("#messageInput"),
        sendMessageButton: $("#sendMessageButton"),
        messageInputCounter: $("#messageInputCounter"),

        emojiButton: $("#emojiButton"),
        emojiPicker: $("#emojiPicker"),
        closeEmojiPicker: $("#closeEmojiPicker"),
        emojiGrid: $("#emojiGrid"),

        attachmentButton: $("#attachmentButton"),
        attachmentInput: $("#attachmentInput"),
        attachmentPreview: $("#attachmentPreview"),
        attachmentPreviewImage: $("#attachmentPreviewImage"),
        attachmentPreviewName: $("#attachmentPreviewName"),
        attachmentPreviewSize: $("#attachmentPreviewSize"),
        removeAttachmentButton: $("#removeAttachmentButton"),

        typingIndicator: $("#typingIndicator"),
        typingIndicatorAvatar: $("#typingIndicatorAvatar"),
        typingUserName: $("#typingUserName"),

        searchMessagesButton: $("#searchMessagesButton"),
        messageSearchBar: $("#messageSearchBar"),
        messageSearchInput: $("#messageSearchInput"),
        messageSearchResultCount: $("#messageSearchResultCount"),
        closeMessageSearch: $("#closeMessageSearch"),

        conversationOptionsButton: $("#conversationOptionsButton"),
        conversationOptionsMenu: $("#conversationOptionsMenu"),

        newConversationButton: $("#newConversationButton"),
        emptyStateNewMessageButton: $("#emptyStateNewMessageButton"),
        newConversationModal: $("#newConversationModal"),
        closeNewConversationModal: $("#closeNewConversationModal"),
        newConversationSearchInput: $("#newConversationSearchInput"),
        clearNewConversationSearch: $("#clearNewConversationSearch"),
        newConversationUsersList: $("#newConversationUsersList"),
        newConversationEmptyState: $("#newConversationEmptyState"),

        detailsEmptyState: $("#detailsEmptyState"),
        detailsContent: $("#detailsContent"),
        detailsUserAvatar: $("#detailsUserAvatar"),
        detailsUserPresence: $("#detailsUserPresence"),
        detailsUserName: $("#detailsUserName"),
        detailsUsername: $("#detailsUsername"),
        detailsUserStatus: $("#detailsUserStatus"),
        detailsUserLocation: $("#detailsUserLocation"),
        viewProfileLink: $("#viewProfileLink"),
        detailsFollowButton: $("#detailsFollowButton"),

        conversationNotificationsToggle:
            $("#conversationNotificationsToggle"),

        pinConversationButton: $("#pinConversationButton"),
        archiveConversationButton: $("#archiveConversationButton"),

        sharedPhotosGrid: $("#sharedPhotosGrid"),
        sharedPhotosEmpty: $("#sharedPhotosEmpty"),
        sharedPhotosCount: $("#sharedPhotosCount"),

        sharedFilesList: $("#sharedFilesList"),
        sharedFilesEmpty: $("#sharedFilesEmpty"),
        sharedFilesCount: $("#sharedFilesCount"),

        blockUserButton: $("#blockUserButton"),
        deleteConversationButton: $("#deleteConversationButton"),

        detailsSectionToggles: $$(".details-section-toggle"),

        confirmationModal: $("#confirmationModal"),
        confirmationModalIcon: $("#confirmationModalIcon"),
        confirmationModalTitle: $("#confirmationModalTitle"),
        confirmationModalText: $("#confirmationModalText"),
        cancelConfirmationButton: $("#cancelConfirmationButton"),
        confirmActionButton: $("#confirmActionButton"),

        imageViewerModal: $("#imageViewerModal"),
        imageViewerImage: $("#imageViewerImage"),
        closeImageViewer: $("#closeImageViewer"),

        messagesToast: $("#messagesToast"),
        messagesToastIcon: $("#messagesToastIcon"),
        messagesToastText: $("#messagesToastText"),

        conversationsSidebar: $("#conversationsSidebar"),
        conversationDetailsPanel: $("#conversationDetailsPanel"),

        mobileOpenConversations: $("#mobileOpenConversations"),
        mobileCloseConversations: $("#mobileCloseConversations"),

        mobileOpenDetails: $("#mobileOpenDetails"),
        mobileCloseDetails: $("#mobileCloseDetails"),

        mobileMessagesOverlay: $("#mobileMessagesOverlay")
    };

    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        currentUser: null,
        users: [],
        conversations: [],
        activeConversationId: null,

        conversationFilter: "all",
        conversationSearch: "",
        messageSearch: "",

        pendingAttachment: null,

        toastTimer: null,
        confirmationAction: null,
        typingTimer: null,
        selectedGiftId: null
    };

    /* =====================================================
       UTILITIES
    ===================================================== */

    function safeParse(value, fallback) {
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }

    function readStorage(key, fallback) {
        const parsedValue = safeParse(
            localStorage.getItem(key),
            fallback
        );

        // A stored JSON value of null must behave like a missing value.
        return parsedValue ?? fallback;
    }

    function readStorageArray(key) {
        const value = readStorage(key, []);
        return Array.isArray(value) ? value : [];
    }

    function writeStorage(key, value) {
        localStorage.setItem(
            key,
            JSON.stringify(value)
        );
    }

    function createId(prefix = "id") {
        return `${prefix}_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 9)}`;
    }

    function escapeHTML(value = "") {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function normalize(value = "") {
        return String(value)
            .toLocaleLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);

        return new Intl.DateTimeFormat("el-GR", {
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function formatConversationTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();

        const sameDay =
            date.toDateString() === now.toDateString();

        if (sameDay) {
            return formatTime(timestamp);
        }

        return new Intl.DateTimeFormat("el-GR", {
            day: "2-digit",
            month: "2-digit"
        }).format(date);
    }

    function formatDateSeparator(timestamp) {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();

        yesterday.setDate(
            today.getDate() - 1
        );

        if (
            date.toDateString() ===
            today.toDateString()
        ) {
            return "Today";
        }

        if (
            date.toDateString() ===
            yesterday.toDateString()
        ) {
            return "Yesterday";
        }

        return new Intl.DateTimeFormat("el-GR", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(date);
    }

    function formatFileSize(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) {
            return "0 KB";
        }

        if (bytes < 1024) {
            return `${bytes} B`;
        }

        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }

        return `${(
            bytes /
            (1024 * 1024)
        ).toFixed(1)} MB`;
    }

    function getCurrentUserId() {
        return String(
            state.currentUser?.id ??
            state.currentUser?.userId ??
            state.currentUser?.username ??
            "current_user"
        );
    }

    function getUserById(userId) {
        return (
            state.users.find(
                user =>
                    String(user.id) ===
                    String(userId)
            ) || null
        );
    }

    function getActiveConversation() {
        return (
            state.conversations.find(
                conversation =>
                    conversation.id ===
                    state.activeConversationId
            ) || null
        );
    }

    function getOtherUser(conversation) {
        if (!conversation) {
            return null;
        }

        const currentUserId =
            getCurrentUserId();

        const otherUserId =
            conversation.participants.find(
                participantId =>
                    String(participantId) !==
                    currentUserId
            );

        return getUserById(otherUserId);
    }

    function getLastMessage(conversation) {
        return (
            conversation.messages[
                conversation.messages.length - 1
            ] || null
        );
    }

    function getUnreadCount(conversation) {
        const currentUserId =
            getCurrentUserId();

        return conversation.messages.filter(
            message => {
                return (
                    String(message.senderId) !==
                        currentUserId &&
                    !message.read
                );
            }
        ).length;
    }

    function isConversationOnline(conversation) {
        return Boolean(
            getOtherUser(conversation)?.online
        );
    }

    function saveConversations() {
        writeStorage(
            STORAGE_KEYS.conversations,
            state.conversations
        );
    }

    function saveUsers() {
        writeStorage(
            STORAGE_KEYS.users,
            state.users
        );
    }

    function scrollMessagesToBottom(
        smooth = false
    ) {
        const viewport = elements.messagesViewport;

        if (!viewport) {
            return;
        }

        const moveToBottom = () => {
            const bottom = Math.max(
                viewport.scrollHeight,
                elements.messagesList?.scrollHeight || 0
            );

            if (typeof viewport.scrollTo === "function") {
                viewport.scrollTo({
                    top: bottom,
                    behavior: smooth ? "smooth" : "auto"
                });
            } else {
                viewport.scrollTop = bottom;
            }

            if (!smooth) {
                viewport.scrollTop = bottom;
            }
        };

        requestAnimationFrame(() => {
            moveToBottom();
            requestAnimationFrame(moveToBottom);
        });

        setTimeout(moveToBottom, 60);
        setTimeout(moveToBottom, 180);
    }

    function autoResizeTextarea() {
        const input = elements.messageInput;

        if (!input) {
            return;
        }

        input.style.height = "auto";

        input.style.height = `${Math.min(
            input.scrollHeight,
            130
        )}px`;
    }

    function showToast(
        text,
        type = "success"
    ) {
        if (!elements.messagesToast) {
            return;
        }

        const icons = {
            success: "✓",
            error: "!",
            info: "i"
        };

        elements.messagesToastIcon.textContent =
            icons[type] || "✓";

        elements.messagesToastText.textContent =
            text;

        elements.messagesToast.hidden = false;

        clearTimeout(state.toastTimer);

        state.toastTimer = setTimeout(() => {
            elements.messagesToast.hidden = true;
        }, 2800);
    }

        /* =====================================================
       DEFAULT DATA
    ===================================================== */

    function getDefaultUsers() {
        return [
            {
                id: "user_anna",
                name: "Anna Petrou",
                username: "annapets",
                avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
                location: "Athens, Greece",
                online: true,
                bio: "Dog lover and rescue volunteer."
            },
            {
                id: "user_nikos",
                name: "Nikos Georgiou",
                username: "nikosandmax",
                avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
                location: "Thessaloniki, Greece",
                online: false,
                bio: "Proud owner of Max."
            },
            {
                id: "user_maria",
                name: "Maria Costa",
                username: "mariacats",
                avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
                location: "Rome, Italy",
                online: true,
                bio: "Cats, travel and animal photography."
            },
            {
                id: "user_david",
                name: "David Miller",
                username: "davidpets",
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
                location: "London, United Kingdom",
                online: false,
                bio: "Animal community member."
            }
        ];
    }

    function getDefaultConversations() {
        const now = Date.now();

        return [
            {
                id: "conversation_anna",

                participants: [
                    getCurrentUserId(),
                    "user_anna"
                ],

                pinned: true,
                archived: false,
                muted: false,
                blocked: false,

                createdAt: now - 86400000,
                updatedAt: now - 180000,

                messages: [
                    {
                        id: createId("message"),
                        senderId: "user_anna",

                        text:
                            "Hi! I saw your pet profile. Your photos are amazing! 🐾",

                        type: "text",

                        createdAt:
                            now - 3600000,

                        read: true
                    },
                    {
                        id: createId("message"),

                        senderId:
                            getCurrentUserId(),

                        text:
                            "Thank you so much! Your rescue work is inspiring.",

                        type: "text",

                        createdAt:
                            now - 3300000,

                        read: true
                    },
                    {
                        id: createId("message"),

                        senderId:
                            "user_anna",

                        text:
                            "Would you like to join our pet walk this weekend?",

                        type: "text",

                        createdAt:
                            now - 180000,

                        read: false
                    }
                ]
            },
            {
                id: "conversation_maria",

                participants: [
                    getCurrentUserId(),
                    "user_maria"
                ],

                pinned: false,
                archived: false,
                muted: false,
                blocked: false,

                createdAt:
                    now - 172800000,

                updatedAt:
                    now - 7200000,

                messages: [
                    {
                        id: createId("message"),

                        senderId:
                            "user_maria",

                        text:
                            "Welcome to ThePetGrid! 😊",

                        type: "text",

                        createdAt:
                            now - 7200000,

                        read: true
                    }
                ]
            },
            {
                id: "conversation_nikos",

                participants: [
                    getCurrentUserId(),
                    "user_nikos"
                ],

                pinned: false,
                archived: false,
                muted: false,
                blocked: false,

                createdAt:
                    now - 259200000,

                updatedAt:
                    now - 90000000,

                messages: [
                    {
                        id: createId("message"),

                        senderId:
                            getCurrentUserId(),

                        text:
                            "How is Max doing?",

                        type: "text",

                        createdAt:
                            now - 92000000,

                        read: true
                    },
                    {
                        id: createId("message"),

                        senderId:
                            "user_nikos",

                        text:
                            "He is doing great, thank you!",

                        type: "text",

                        createdAt:
                            now - 90000000,

                        read: true
                    }
                ]
            }
        ];
    }

    /* =====================================================
       INITIALIZATION
    ===================================================== */

    function loadCurrentUser() {
        const storedUser = readStorage(
            STORAGE_KEYS.currentUser,
            null
        );

        state.currentUser =
            storedUser || {
                id: "current_user",
                username: "you",
                name: "You",
                avatar: DEFAULT_AVATAR
            };

        if (!state.currentUser.id) {
            state.currentUser.id =
                state.currentUser.userId ||
                state.currentUser.username ||
                "current_user";
        }
    }

    function loadUsers() {
        const storedUsers = readStorage(
            STORAGE_KEYS.users,
            []
        );

        state.users =
            Array.isArray(storedUsers) &&
            storedUsers.length
                ? storedUsers
                : getDefaultUsers();

        saveUsers();
    }

    function loadConversations() {
        const storedConversations =
            readStorage(
                STORAGE_KEYS.conversations,
                []
            );

        state.conversations =
            Array.isArray(
                storedConversations
            ) &&
            storedConversations.length
                ? storedConversations
                : getDefaultConversations();

        state.conversations =
            state.conversations.map(
                conversation => ({
                    pinned: false,
                    archived: false,
                    muted: false,
                    blocked: false,
                    messages: [],

                    ...conversation,

                    participants:
                        Array.isArray(
                            conversation.participants
                        )
                            ? conversation.participants.map(
                                  String
                              )
                            : [],

                    messages:
                        Array.isArray(
                            conversation.messages
                        )
                            ? conversation.messages
                            : []
                })
            );

        saveConversations();
    }

    function handleConversationFromURL() {
        const params =
            new URLSearchParams(
                window.location.search
            );

        const userId =
            params.get("user") ||
            params.get("userId") ||
            params.get("recipient");

        if (!userId) {
            return;
        }

        const user =
            getUserById(userId);

        if (!user) {
            return;
        }

        const conversation =
            findConversationWithUser(
                user.id
            ) ||
            createConversationWithUser(
                user.id,
                false
            );

        state.activeConversationId =
            conversation.id;

        const cleanURL =
            new URL(
                window.location.href
            );

        cleanURL.searchParams.delete(
            "user"
        );

        cleanURL.searchParams.delete(
            "userId"
        );

        cleanURL.searchParams.delete(
            "recipient"
        );

        window.history.replaceState(
            {},
            "",
            cleanURL
        );
    }

    function initialize() {
        loadCurrentUser();
        loadUsers();
        loadConversations();
        handleConversationFromURL();
        initializeVirtualGifts();
        bindEvents();
        renderAll();

        if (
            state.activeConversationId
        ) {
            openConversation(
                state.activeConversationId
            );
        }
    }

    /* =====================================================
       CONVERSATIONS
    ===================================================== */

    function findConversationWithUser(
        userId
    ) {
        const currentUserId =
            getCurrentUserId();

        return (
            state.conversations.find(
                conversation => {
                    return (
                        conversation.participants.includes(
                            currentUserId
                        ) &&
                        conversation.participants.includes(
                            String(userId)
                        )
                    );
                }
            ) || null
        );
    }

    function createConversationWithUser(
        userId,
        shouldOpen = true
    ) {
        const existing =
            findConversationWithUser(
                userId
            );

        if (existing) {
            if (shouldOpen) {
                openConversation(
                    existing.id
                );
            }

            return existing;
        }

        const now = Date.now();

        const conversation = {
            id: createId(
                "conversation"
            ),

            participants: [
                getCurrentUserId(),
                String(userId)
            ],

            pinned: false,
            archived: false,
            muted: false,
            blocked: false,

            createdAt: now,
            updatedAt: now,

            messages: []
        };

        state.conversations.unshift(
            conversation
        );

        saveConversations();
        renderConversationList();

        if (shouldOpen) {
            openConversation(
                conversation.id
            );
        }

        return conversation;
    }

    function openConversation(
        conversationId
    ) {
        const conversation =
            state.conversations.find(
                item =>
                    item.id ===
                    conversationId
            );

        if (!conversation) {
            return;
        }

        state.activeConversationId =
            conversation.id;

        conversation.messages.forEach(
            message => {
                if (
                    String(
                        message.senderId
                    ) !==
                    getCurrentUserId()
                ) {
                    message.read = true;
                }
            }
        );

        conversation.updatedAt =
            Date.now();

        saveConversations();

        elements.chatEmptyState.hidden =
            true;

        elements.activeChat.hidden =
            false;

        elements.detailsEmptyState.hidden =
            true;

        elements.detailsContent.hidden =
            false;

        renderConversationList();
        renderActiveChat();
        closeMobilePanels();
        scrollMessagesToBottom();
    }

    function deleteConversation(
        conversationId
    ) {
        state.conversations =
            state.conversations.filter(
                conversation =>
                    conversation.id !==
                    conversationId
            );

        if (
            state.activeConversationId ===
            conversationId
        ) {
            state.activeConversationId =
                null;
        }

        saveConversations();
        renderAll();

        showToast(
            "Conversation deleted.",
            "info"
        );
    }

    function togglePinConversation(
        conversationId
    ) {
        const conversation =
            state.conversations.find(
                item =>
                    item.id ===
                    conversationId
            );

        if (!conversation) {
            return;
        }

        conversation.pinned =
            !conversation.pinned;

        saveConversations();
        renderConversationList();
        renderDetails();

        showToast(
            conversation.pinned
                ? "Conversation pinned."
                : "Conversation unpinned."
        );
    }

    function toggleArchiveConversation(
        conversationId
    ) {
        const conversation =
            state.conversations.find(
                item =>
                    item.id ===
                    conversationId
            );

        if (!conversation) {
            return;
        }

        conversation.archived =
            !conversation.archived;

        saveConversations();

        if (
            conversation.archived &&
            state.activeConversationId ===
                conversationId
        ) {
            state.activeConversationId =
                null;
        }

        renderAll();

        showToast(
            conversation.archived
                ? "Conversation archived."
                : "Conversation restored."
        );
    }

    function markConversationUnread(
        conversationId
    ) {
        const conversation =
            state.conversations.find(
                item =>
                    item.id ===
                    conversationId
            );

        if (!conversation) {
            return;
        }

        const incomingMessages =
            conversation.messages.filter(
                message =>
                    String(
                        message.senderId
                    ) !==
                    getCurrentUserId()
            );

        const lastIncoming =
            incomingMessages[
                incomingMessages.length - 1
            ];

        if (lastIncoming) {
            lastIncoming.read = false;

            saveConversations();
            renderConversationList();

            showToast(
                "Conversation marked as unread."
            );
        }
    }

        /* =====================================================
       RENDER CONVERSATIONS
    ===================================================== */

    function getVisibleConversations() {
        const query = normalize(
            state.conversationSearch
        );

        return state.conversations
            .filter(
                conversation =>
                    !conversation.archived
            )
            .filter(conversation => {
                if (
                    state.conversationFilter ===
                    "unread"
                ) {
                    return (
                        getUnreadCount(
                            conversation
                        ) > 0
                    );
                }

                if (
                    state.conversationFilter ===
                    "online"
                ) {
                    return isConversationOnline(
                        conversation
                    );
                }

                return true;
            })
            .filter(conversation => {
                if (!query) {
                    return true;
                }

                const user =
                    getOtherUser(
                        conversation
                    );

                const lastMessage =
                    getLastMessage(
                        conversation
                    );

                return [
                    user?.name,
                    user?.username,
                    lastMessage?.text
                ].some(value =>
                    normalize(value).includes(
                        query
                    )
                );
            })
            .sort((a, b) => {
                if (
                    a.pinned !== b.pinned
                ) {
                    return (
                        Number(b.pinned) -
                        Number(a.pinned)
                    );
                }

                return (
                    (b.updatedAt || 0) -
                    (a.updatedAt || 0)
                );
            });
    }

    function renderConversationList() {
        if (
            !elements.conversationList
        ) {
            return;
        }

        const conversations =
            getVisibleConversations();

        elements.conversationList.innerHTML =
            "";

        elements.conversationsEmptyState.hidden =
            conversations.length > 0;

        conversations.forEach(
            conversation => {
                const user =
                    getOtherUser(
                        conversation
                    );

                if (!user) {
                    return;
                }

                const lastMessage =
                    getLastMessage(
                        conversation
                    );

                const unreadCount =
                    getUnreadCount(
                        conversation
                    );

                const item =
                    document.createElement(
                        "button"
                    );

                item.type = "button";

                item.className =
                    "conversation-item";

                item.dataset.conversationId =
                    conversation.id;

                if (
                    conversation.id ===
                    state.activeConversationId
                ) {
                    item.classList.add(
                        "active"
                    );
                }

                if (unreadCount > 0) {
                    item.classList.add(
                        "unread"
                    );
                }

                const previewText =
                    lastMessage
                        ? lastMessage.type ===
                          "image"
                            ? "📷 Photo"
                            : lastMessage.type ===
                              "file"
                                ? `📎 ${
                                      lastMessage.fileName ||
                                      "File"
                                  }`
                                : lastMessage.text
                        : "Start a conversation";

                item.innerHTML = `
                    <span class="conversation-avatar-wrapper">

                        <img
                            class="conversation-avatar"

                            src="${
                                escapeHTML(
                                    user.avatar ||
                                    DEFAULT_AVATAR
                                )
                            }"

                            alt="${
                                escapeHTML(
                                    user.name
                                )
                            }"
                        >

                        <span
                            class="presence-dot ${
                                user.online
                                    ? "online"
                                    : ""
                            }"
                        ></span>

                    </span>

                    <span class="conversation-main">

                        <span class="conversation-name-row">

                            <span class="conversation-name">
                                ${
                                    escapeHTML(
                                        user.name
                                    )
                                }
                            </span>

                            <span class="conversation-time">
                                ${
                                    lastMessage
                                        ? formatConversationTime(
                                              lastMessage.createdAt
                                          )
                                        : ""
                                }
                            </span>

                        </span>

                        <span class="conversation-preview-row">

                            <span class="conversation-preview">
                                ${
                                    escapeHTML(
                                        previewText
                                    )
                                }
                            </span>

                        </span>

                    </span>

                    <span class="conversation-side-meta">

                        ${
                            conversation.pinned
                                ? `
                                    <span class="pinned-indicator">
                                        📌
                                    </span>
                                `
                                : ""
                        }

                        ${
                            unreadCount > 0
                                ? `
                                    <span class="unread-badge">
                                        ${unreadCount}
                                    </span>
                                `
                                : ""
                        }

                    </span>
                `;

                item.addEventListener(
                    "click",
                    () => {
                        openConversation(
                            conversation.id
                        );
                    }
                );

                elements.conversationList.appendChild(
                    item
                );
            }
        );
    }

        /* =====================================================
       ACTIVE CHAT
    ===================================================== */

    function renderActiveChat() {

        const conversation =
            getActiveConversation();

        if (!conversation) {

            renderEmptyChatState();
            return;

        }

        const user =
            getOtherUser(conversation);

        if (!user) {

            renderEmptyChatState();
            return;

        }

        elements.chatUserAvatar.src =
            user.avatar || DEFAULT_AVATAR;

        elements.chatUserAvatar.alt =
            user.name;

        elements.chatUserName.textContent =
            user.name;

        elements.chatUserStatus.textContent =
            user.online
                ? "Online now"
                : "Offline";

        elements.chatUserPresence.classList.toggle(
            "online",
            Boolean(user.online)
        );

        elements.chatUserPresence.setAttribute(
            "aria-label",
            user.online
                ? "Online"
                : "Offline"
        );

        renderMessages();
        renderDetails();
        updateComposerState();

    }

    function renderEmptyChatState() {

        elements.chatEmptyState.hidden = false;
        elements.activeChat.hidden = true;

        elements.detailsEmptyState.hidden =
            false;

        elements.detailsContent.hidden =
            true;

    }

    /* =====================================================
       RENDER MESSAGES
    ===================================================== */

    function renderMessages() {

        const conversation =
            getActiveConversation();

        if (
            !conversation ||
            !elements.messagesList
        ) {
            return;
        }

        const query =
            normalize(state.messageSearch);

        elements.messagesList.innerHTML =
            "";

        let lastDateKey = "";
        let resultCount = 0;

        conversation.messages.forEach(
            message => {

                const date =
                    new Date(
                        message.createdAt
                    );

                const dateKey =
                    date.toDateString();

                if (
                    dateKey !==
                    lastDateKey
                ) {

                    const separator =
                        document.createElement(
                            "div"
                        );

                    separator.className =
                        "message-date-separator";

                    separator.textContent =
                        formatDateSeparator(
                            message.createdAt
                        );

                    elements.messagesList.appendChild(
                        separator
                    );

                    lastDateKey =
                        dateKey;

                }

                const isOutgoing =
                    String(
                        message.senderId
                    ) ===
                    getCurrentUserId();

                const sender =
                    isOutgoing
                        ? state.currentUser
                        : getUserById(
                              message.senderId
                          );

                const row =
                    document.createElement(
                        "div"
                    );

                row.className =
                    `message-row ${
                        isOutgoing
                            ? "outgoing"
                            : "incoming"
                    }`;

                row.dataset.messageId =
                    message.id;

                let contentHTML = "";

                if (
                    message.type ===
                    "gift"
                ) {

                    contentHTML = `
                        <div class="message-virtual-gift">
                            <span class="message-virtual-gift__emoji">
                                ${escapeHTML(message.giftEmoji || "🎁")}
                            </span>
                            <span class="message-virtual-gift__copy">
                                <strong>${escapeHTML(message.giftName || "Virtual Gift")}</strong>
                                <span>${escapeHTML(message.giftNote || "A special gift for you and your pet.")}</span>
                            </span>
                        </div>
                    `;

                }

                else if (
                    message.type ===
                    "image"
                ) {

                    contentHTML = `
                        <img
                            class="message-image"

                            src="${
                                escapeHTML(
                                    message.dataUrl ||
                                    message.url ||
                                    ""
                                )
                            }"

                            alt="${
                                escapeHTML(
                                    message.fileName ||
                                    "Shared image"
                                )
                            }"

                            data-image-viewer-src="${
                                escapeHTML(
                                    message.dataUrl ||
                                    message.url ||
                                    ""
                                )
                            }"
                        >
                    `;

                }

                else if (
                    message.type ===
                    "file"
                ) {

                    contentHTML = `
                        <div class="message-file">

                            <span class="message-file-icon">
                                📎
                            </span>

                            <span class="message-file-details">

                                <strong>
                                    ${
                                        escapeHTML(
                                            message.fileName ||
                                            "File"
                                        )
                                    }
                                </strong>

                                <span>
                                    ${
                                        escapeHTML(
                                            formatFileSize(
                                                message.fileSize ||
                                                0
                                            )
                                        )
                                    }
                                </span>

                            </span>

                        </div>
                    `;

                }

                else {

                    let text =
                        escapeHTML(
                            message.text || ""
                        );

                    if (
                        query &&
                        normalize(
                            message.text
                        ).includes(query)
                    ) {

                        resultCount++;

                    }

                    contentHTML = `
                        <p class="message-text">
                            ${text}
                        </p>
                    `;

                }

                row.innerHTML = `
                    ${
                        !isOutgoing
                            ? `
                            <img
                                class="message-avatar"

                                src="${
                                    escapeHTML(
                                        sender?.avatar ||
                                        DEFAULT_AVATAR
                                    )
                                }"

                                alt="${
                                    escapeHTML(
                                        sender?.name ||
                                        "User"
                                    )
                                }"
                            >
                            `
                            : ""
                    }

                    <div class="message-group">

                        <div class="message-bubble">

                            ${contentHTML}

                        </div>

                        <div class="message-meta">

                            <span>
                                ${
                                    formatTime(
                                        message.createdAt
                                    )
                                }
                            </span>

                            ${
                                isOutgoing
                                    ? `
                                    <span
                                        class="message-status ${
                                            message.read
                                                ? "read"
                                                : ""
                                        }"
                                    >
                                        ${
                                            message.read
                                                ? "✓✓"
                                                : "✓"
                                        }
                                    </span>
                                    `
                                    : ""
                            }

                        </div>

                    </div>
                `;

                if (
                    query &&
                    normalize(
                        message.text
                    ).includes(query)
                ) {

                    row.classList.add(
                        "message-search-match"
                    );

                }

                elements.messagesList.appendChild(
                    row
                );

            }
        );

        if (elements.messageSearchResultCount) {
            elements.messageSearchResultCount.textContent =
                `${resultCount} result${
                    resultCount === 1
                        ? ""
                        : "s"
                }`;
        }

        $$(".message-image", elements.messagesList)
            .forEach(image => {

                image.addEventListener(
                    "click",
                    () => {

                        openImageViewer(
                            image.dataset
                                .imageViewerSrc
                        );

                    }
                );

            });

    }

        /* =====================================================
       SEND MESSAGE
    ===================================================== */

    function updateComposerState() {

        const text =
            elements.messageInput?.value.trim() ||
            "";

        const hasAttachment =
            Boolean(
                state.pendingAttachment
            );

        const canSend =
            Boolean(
                state.activeConversationId
            ) &&
            (
                text ||
                hasAttachment
            );

        if (elements.sendMessageButton) {
            elements.sendMessageButton.disabled =
                !canSend;
        }

        if (elements.messageInputCounter) {
            elements.messageInputCounter.textContent =
                `${elements.messageInput?.value.length || 0} / ${MAX_MESSAGE_LENGTH}`;
        }
    }

    function sendMessage() {

        const conversation =
            getActiveConversation();

        const input =
            elements.messageInput;

        if (!conversation || !input) {
            return;
        }

        if (conversation.blocked) {

            showToast(
                "This user is blocked.",
                "error"
            );

            return;
        }

        const text =
            input.value.trim();

        const attachment =
            state.pendingAttachment;

        if (!text && !attachment) {
            return;
        }

        const now =
            Date.now();

        input.value = "";
        state.pendingAttachment = null;

        if (elements.attachmentInput) {
            elements.attachmentInput.value = "";
        }

        if (elements.attachmentPreview) {
            elements.attachmentPreview.hidden = true;
        }

        if (elements.attachmentPreviewImage) {
            elements.attachmentPreviewImage.src = "";
        }

        if (attachment) {

            conversation.messages.push({
                id: createId("message"),
                senderId: getCurrentUserId(),
                text: "",
                type: attachment.type.startsWith("image/")
                    ? "image"
                    : "file",
                fileName: attachment.name,
                fileSize: attachment.size,
                dataUrl: attachment.dataUrl,
                createdAt: now,
                read: false
            });
        }

        if (text) {

            conversation.messages.push({
                id: createId("message"),
                senderId: getCurrentUserId(),
                text,
                type: "text",
                createdAt: now + (attachment ? 1 : 0),
                read: false
            });
        }

        conversation.updatedAt = now;
        conversation.archived = false;

        autoResizeTextarea();
        updateComposerState();
        saveConversations();

        try {
            renderConversationList();
        } catch (error) {
            console.error(
                "Conversation list render failed:",
                error
            );
        }

        try {
            renderMessages();
        } catch (error) {
            console.error(
                "Messages render failed:",
                error
            );
        }

        try {
            renderDetails();
        } catch (error) {
            console.error(
                "Conversation details render failed:",
                error
            );
        }

        updateComposerState();
        scrollMessagesToBottom(false);

        requestAnimationFrame(() => {
            input.focus();
            scrollMessagesToBottom(true);
        });

        simulateReply(conversation);
    }

    function simulateReply(
        conversation
    ) {

        const user =
            getOtherUser(
                conversation
            );

        if (
            !user ||
            !user.online ||
            conversation.blocked
        ) {
            return;
        }

        clearTimeout(
            state.typingTimer
        );

        elements.typingIndicatorAvatar.src =
            user.avatar ||
            DEFAULT_AVATAR;

        elements.typingUserName.textContent =
            user.name;

        elements.typingIndicator.hidden =
            false;

        state.typingTimer =
            setTimeout(() => {

                elements.typingIndicator.hidden =
                    true;

                const replies = [
                    "That sounds great! 🐾",
                    "Thank you for your message!",
                    "I would love that 😊",
                    "Absolutely! Let’s keep in touch.",
                    "That made my day ❤️"
                ];

                const reply =
                    replies[
                        Math.floor(
                            Math.random() *
                            replies.length
                        )
                    ];

                conversation.messages.push({
                    id:
                        createId(
                            "message"
                        ),

                    senderId:
                        user.id,

                    text:
                        reply,

                    type:
                        "text",

                    createdAt:
                        Date.now(),

                    read:
                        state.activeConversationId ===
                        conversation.id
                });

                conversation.updatedAt =
                    Date.now();

                saveConversations();
                renderConversationList();

                if (
                    state.activeConversationId ===
                    conversation.id
                ) {

                    renderMessages();

                    scrollMessagesToBottom(
                        true
                    );
                }

            }, 1400);
    }

    /* =====================================================
       ATTACHMENTS
    ===================================================== */

    function handleAttachmentSelection(
        file
    ) {

        if (!file) {
            return;
        }

        if (
            file.size >
            MAX_IMAGE_SIZE
        ) {

            showToast(
                "The selected file is larger than 3 MB.",
                "error"
            );

            elements.attachmentInput.value =
                "";

            return;
        }

                const reader =
            new FileReader();

        reader.onload = event => {

            state.pendingAttachment = {

                name:
                    file.name,

                size:
                    file.size,

                type:
                    file.type ||
                    "application/octet-stream",

                dataUrl:
                    event.target.result

            };

            elements.attachmentPreviewName.textContent =
                file.name;

            elements.attachmentPreviewSize.textContent =
                formatFileSize(
                    file.size
                );

            if (
                file.type.startsWith(
                    "image/"
                )
            ) {

                elements.attachmentPreviewImage.src =
                    event.target.result;

            } else {

                elements.attachmentPreviewImage.src =
                    DEFAULT_AVATAR;

            }

            elements.attachmentPreview.hidden =
                false;

            updateComposerState();

        };

        reader.onerror =
            () => {

                showToast(
                    "The file could not be loaded.",
                    "error"
                );

            };

        reader.readAsDataURL(
            file
        );

    }

    function removePendingAttachment() {

        state.pendingAttachment =
            null;

        elements.attachmentInput.value =
            "";

        elements.attachmentPreview.hidden =
            true;

        elements.attachmentPreviewImage.src =
            "";

        updateComposerState();

    }

    /* =====================================================
       DETAILS PANEL
    ===================================================== */

    function renderDetails() {

        const conversation =
            getActiveConversation();

        const user =
            getOtherUser(
                conversation
            );

        if (
            !conversation ||
            !user
        ) {

            elements.detailsEmptyState.hidden =
                false;

            elements.detailsContent.hidden =
                true;

            return;

        }

        elements.detailsEmptyState.hidden =
            true;

        elements.detailsContent.hidden =
            false;

        elements.detailsUserAvatar.src =
            user.avatar ||
            DEFAULT_AVATAR;

        elements.detailsUserAvatar.alt =
            user.name;

        elements.detailsUserName.textContent =
            user.name;

        elements.detailsUsername.textContent =
            `@${
                user.username ||
                "member"
            }`;

        elements.detailsUserStatus.textContent =
            user.online
                ? "Online"
                : "Offline";

        elements.detailsUserStatus.classList.toggle(
            "online",
            Boolean(
                user.online
            )
        );

        elements.detailsUserPresence.classList.toggle(
            "online",
            Boolean(
                user.online
            )
        );

        elements.detailsUserLocation.textContent =
            `📍 ${
                user.location ||
                "Location unavailable"
            }`;

        elements.viewProfileLink.href =
            `user-profile.html?id=${encodeURIComponent(
                user.id
            )}`;

                    const following =
            readStorageArray(
                STORAGE_KEYS.following
            );

        const isFollowing =
            following
                .map(String)
                .includes(
                    String(user.id)
                );

        elements.detailsFollowButton.textContent =
            isFollowing
                ? "✓ Following"
                : "+ Follow";

        elements.detailsFollowButton.classList.toggle(
            "following",
            isFollowing
        );

        elements.conversationNotificationsToggle.checked =
            !conversation.muted;

        elements.pinConversationButton.innerHTML =
            conversation.pinned
                ? "<span>📌</span> Unpin conversation"
                : "<span>📌</span> Pin conversation";

        elements.archiveConversationButton.innerHTML =
            conversation.archived
                ? "<span>📂</span> Restore conversation"
                : "<span>📂</span> Archive conversation";

        elements.blockUserButton.textContent =
            conversation.blocked
                ? "✅ Unblock User"
                : "🚫 Block User";

        renderSharedMedia(
            conversation
        );

    }

    function renderSharedMedia(
        conversation
    ) {

        const photoMessages =
            conversation.messages.filter(
                message =>
                    message.type ===
                    "image"
            );

        const fileMessages =
            conversation.messages.filter(
                message =>
                    message.type ===
                    "file"
            );

        elements.sharedPhotosGrid.innerHTML =
            "";

        elements.sharedFilesList.innerHTML =
            "";

        elements.sharedPhotosCount.textContent =
            String(
                photoMessages.length
            );

        elements.sharedFilesCount.textContent =
            String(
                fileMessages.length
            );

        elements.sharedPhotosEmpty.hidden =
            photoMessages.length > 0;

        elements.sharedFilesEmpty.hidden =
            fileMessages.length > 0;

        photoMessages.forEach(
            message => {

                const button =
                    document.createElement(
                        "button"
                    );

                button.type =
                    "button";

                button.className =
                    "shared-photo-button";

                button.innerHTML = `
                    <img
                        src="${
                            escapeHTML(
                                message.dataUrl ||
                                message.url ||
                                ""
                            )
                        }"

                        alt="${
                            escapeHTML(
                                message.fileName ||
                                "Shared photo"
                            )
                        }"
                    >
                `;

                button.addEventListener(
                    "click",
                    () => {

                        openImageViewer(
                            message.dataUrl ||
                            message.url
                        );

                    }
                );

                elements.sharedPhotosGrid.appendChild(
                    button
                );

            }
        );

        fileMessages.forEach(
            message => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "shared-file-item";

                item.innerHTML = `
                    <span class="shared-file-item-icon">
                        📎
                    </span>

                    <div>

                        <strong>
                            ${
                                escapeHTML(
                                    message.fileName ||
                                    "File"
                                )
                            }
                        </strong>

                        <span>
                            ${
                                formatFileSize(
                                    message.fileSize ||
                                    0
                                )
                            }
                        </span>

                    </div>
                `;

                elements.sharedFilesList.appendChild(
                    item
                );

            }
        );

    }

    function toggleFollowActiveUser() {

        const conversation =
            getActiveConversation();

        const user =
            getOtherUser(
                conversation
            );

        if (!user) {
            return;
        }

        let following =
            readStorageArray(
                STORAGE_KEYS.following
            );

        const userId =
            String(user.id);

        const isFollowing =
            following
                .map(String)
                .includes(userId);

        following =
            isFollowing
                ? following.filter(
                      id =>
                          String(id) !==
                          userId
                  )
                : [
                      ...following,
                      userId
                  ];

        writeStorage(
            STORAGE_KEYS.following,
            following
        );

        renderDetails();

        showToast(
            isFollowing
                ? `You unfollowed ${user.name}.`
                : `You are now following ${user.name}.`
        );

    }

    /* =====================================================
       NEW CONVERSATION MODAL
    ===================================================== */

    function openNewConversationModal() {

        elements.newConversationModal.hidden =
            false;

        elements.newConversationSearchInput.value =
            "";

        renderNewConversationUsers();

        setTimeout(
            () => {

                elements.newConversationSearchInput.focus();

            },
            50
        );

    }

    function closeNewConversationModal() {

        elements.newConversationModal.hidden =
            true;

    }

        function renderNewConversationUsers() {

        const query =
            normalize(
                elements.newConversationSearchInput.value
            );

        const currentUserId =
            getCurrentUserId();

        const users =
            state.users.filter(
                user => {

                    if (
                        String(user.id) ===
                        currentUserId
                    ) {
                        return false;
                    }

                    if (!query) {
                        return true;
                    }

                    return [
                        user.name,
                        user.username,
                        user.location
                    ].some(
                        value =>
                            normalize(
                                value
                            ).includes(
                                query
                            )
                    );

                }
            );

        elements.newConversationUsersList.innerHTML =
            "";

        elements.newConversationEmptyState.hidden =
            users.length > 0;

        elements.clearNewConversationSearch.hidden =
            !query;

        users.forEach(
            user => {

                const button =
                    document.createElement(
                        "button"
                    );

                button.type =
                    "button";

                button.className =
                    "new-conversation-user";

                button.innerHTML = `
                    <img
                        src="${
                            escapeHTML(
                                user.avatar ||
                                DEFAULT_AVATAR
                            )
                        }"

                        alt="${
                            escapeHTML(
                                user.name
                            )
                        }"
                    >

                    <span>

                        <strong>
                            ${
                                escapeHTML(
                                    user.name
                                )
                            }
                        </strong>

                        <span>
                            @${
                                escapeHTML(
                                    user.username ||
                                    "member"
                                )
                            }
                        </span>

                    </span>

                    <span class="new-conversation-user-action">
                        Message
                    </span>
                `;

                button.addEventListener(
                    "click",
                    () => {

                        createConversationWithUser(
                            user.id
                        );

                        closeNewConversationModal();

                    }
                );

                elements.newConversationUsersList.appendChild(
                    button
                );

            }
        );

    }

    /* =====================================================
       SEARCH
    ===================================================== */

    function handleConversationSearch() {

        state.conversationSearch =
            elements.conversationSearchInput.value;

        elements.clearConversationSearch.hidden =
            !state.conversationSearch;

        renderConversationList();

    }

    function handleMessageSearch() {

        state.messageSearch =
            elements.messageSearchInput.value;

        renderMessages();

        const firstMatch =
            $(
                ".message-search-match",
                elements.messagesList
            );

        firstMatch?.scrollIntoView({
            behavior:
                "smooth",

            block:
                "center"
        });

    }

    function openMessageSearch() {

        elements.messageSearchBar.hidden =
            false;

        setTimeout(
            () =>
                elements.messageSearchInput.focus(),
            50
        );

    }

    function closeMessageSearch() {

        elements.messageSearchBar.hidden =
            true;

        elements.messageSearchInput.value =
            "";

        state.messageSearch =
            "";

        renderMessages();

    }

    /* =====================================================
       MODALS / CONFIRMATION
    ===================================================== */

    function openConfirmation({
        title,
        text,
        icon = "⚠️",
        confirmText = "Confirm",
        action
    }) {

        state.confirmationAction =
            action;

        elements.confirmationModalIcon.textContent =
            icon;

        elements.confirmationModalTitle.textContent =
            title;

        elements.confirmationModalText.textContent =
            text;

        elements.confirmActionButton.textContent =
            confirmText;

        elements.confirmationModal.hidden =
            false;

    }

    function closeConfirmation() {

        elements.confirmationModal.hidden =
            true;

        state.confirmationAction =
            null;

    }

    function openImageViewer(
        src
    ) {

        if (!src) {
            return;
        }

        elements.imageViewerImage.src =
            src;

        elements.imageViewerModal.hidden =
            false;

    }

    function closeImageViewer() {

        elements.imageViewerModal.hidden =
            true;

        elements.imageViewerImage.src =
            "";

    }

    /* =====================================================
       OPTIONS MENU
    ===================================================== */

    function toggleConversationOptionsMenu() {

        const isHidden =
            elements.conversationOptionsMenu.hidden;

        elements.conversationOptionsMenu.hidden =
            !isHidden;

        elements.conversationOptionsButton.setAttribute(
            "aria-expanded",
            String(isHidden)
        );

    }

    function closeConversationOptionsMenu() {

        elements.conversationOptionsMenu.hidden =
            true;

        elements.conversationOptionsButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }

    function handleConversationAction(
        action
    ) {

        const conversation =
            getActiveConversation();

        if (!conversation) {
            return;
        }

        closeConversationOptionsMenu();

        switch (action) {

            case "pin":

                togglePinConversation(
                    conversation.id
                );

                break;

            case "archive":

                toggleArchiveConversation(
                    conversation.id
                );

                break;

            case "mark-unread":

                markConversationUnread(
                    conversation.id
                );

                break;

            case "delete":

                openConfirmation({
                    title:
                        "Delete Conversation",

                    text:
                        "This will remove the full conversation from this browser.",

                    icon:
                        "🗑️",

                    confirmText:
                        "Delete",

                    action:
                        () =>
                            deleteConversation(
                                conversation.id
                            )
                });

                break;

        }

    }

    /* =====================================================
       MOBILE PANELS
    ===================================================== */

    function openConversationsPanel() {

        elements.conversationsSidebar.classList.add(
            "mobile-open"
        );

        elements.mobileMessagesOverlay.hidden =
            false;

    }

    function openDetailsPanel() {

        elements.conversationDetailsPanel.classList.add(
            "mobile-open"
        );

        elements.mobileMessagesOverlay.hidden =
            false;

    }

    function closeMobilePanels() {

        elements.conversationsSidebar.classList.remove(
            "mobile-open"
        );

        elements.conversationDetailsPanel.classList.remove(
            "mobile-open"
        );

        elements.mobileMessagesOverlay.hidden =
            true;

    }


    /* =====================================================
       VIRTUAL GIFTS
    ===================================================== */

    function formatGiftPrice(value) {
        return new Intl.NumberFormat("el-GR", {
            style: "currency",
            currency: "EUR"
        }).format(Number(value) || 0);
    }

    function getSavedGiftTransactions() {
        const saved = readStorage(STORAGE_KEYS.gifts, []);
        return Array.isArray(saved) ? saved : [];
    }

    function saveGiftTransaction(transaction) {
        const transactions = getSavedGiftTransactions();
        transactions.push(transaction);
        writeStorage(STORAGE_KEYS.gifts, transactions);
    }

    function initializeVirtualGifts() {
        if (!elements.messageComposerForm || document.getElementById("virtualGiftButton")) {
            return;
        }

        const style = document.createElement("style");
        style.textContent = `
            .virtual-gift-trigger{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border:0;border-radius:14px;background:#fff7e5;cursor:pointer;font-size:1.25rem;transition:.2s transform,.2s box-shadow}.virtual-gift-trigger:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(244,159,10,.22)}
            .virtual-gift-modal[hidden]{display:none}.virtual-gift-modal{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px}.virtual-gift-modal__backdrop{position:absolute;inset:0;background:rgba(19,24,38,.62);backdrop-filter:blur(5px)}
            .virtual-gift-modal__card{position:relative;width:min(620px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:24px;padding:24px;box-shadow:0 30px 80px rgba(0,0,0,.28)}.virtual-gift-modal__head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.virtual-gift-modal__head h2{margin:0 0 6px}.virtual-gift-modal__head p{margin:0;color:#667085}.virtual-gift-modal__close{border:0;background:#f2f4f7;width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:1.15rem}
            .virtual-gift-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.virtual-gift-option{border:2px solid transparent;background:#fff8ea;border-radius:18px;padding:16px 10px;cursor:pointer;text-align:center;transition:.2s}.virtual-gift-option:hover{transform:translateY(-2px)}.virtual-gift-option.is-selected{border-color:#f5a623;background:#fff3d2}.virtual-gift-option__emoji{display:block;font-size:2.2rem;margin-bottom:8px}.virtual-gift-option strong,.virtual-gift-option span{display:block}.virtual-gift-option span:last-child{color:#b66a00;margin-top:5px;font-weight:700}
            .virtual-gift-note{width:100%;min-height:86px;margin-top:16px;padding:13px 14px;border:1px solid #d0d5dd;border-radius:14px;resize:vertical;font:inherit}.virtual-gift-send{width:100%;margin-top:14px;border:0;border-radius:14px;padding:14px 18px;background:linear-gradient(135deg,#ffb21c,#ff7a18);color:#fff;font-weight:800;cursor:pointer}.virtual-gift-send:disabled{opacity:.5;cursor:not-allowed}
            .message-virtual-gift{display:flex;align-items:center;gap:12px;min-width:210px}.message-virtual-gift__emoji{display:grid;place-items:center;width:54px;height:54px;border-radius:16px;background:rgba(255,255,255,.35);font-size:2rem}.message-virtual-gift__copy{display:flex;flex-direction:column;gap:3px}.message-virtual-gift__copy span{font-size:.86rem;opacity:.86}
            @media(max-width:560px){.virtual-gift-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.virtual-gift-modal__card{padding:18px;border-radius:20px}}
        `;
        document.head.appendChild(style);

        const button = document.createElement("button");
        button.id = "virtualGiftButton";
        button.className = "virtual-gift-trigger";
        button.type = "button";
        button.title = "Send a virtual gift";
        button.setAttribute("aria-label", "Send a virtual gift");
        button.textContent = "🎁";

        const attachmentButton = elements.attachmentButton;
        if (attachmentButton?.parentElement) {
            attachmentButton.insertAdjacentElement("afterend", button);
        } else {
            elements.messageComposerForm.prepend(button);
        }

        const modal = document.createElement("div");
        modal.id = "virtualGiftModal";
        modal.className = "virtual-gift-modal";
        modal.hidden = true;
        modal.innerHTML = `
            <div class="virtual-gift-modal__backdrop" data-close-gift-modal></div>
            <section class="virtual-gift-modal__card" role="dialog" aria-modal="true" aria-labelledby="virtualGiftTitle">
                <div class="virtual-gift-modal__head">
                    <div><h2 id="virtualGiftTitle">Send a Virtual Gift</h2><p id="virtualGiftRecipient">Choose a gift for this pet lover.</p></div>
                    <button class="virtual-gift-modal__close" type="button" data-close-gift-modal aria-label="Close">×</button>
                </div>
                <div class="virtual-gift-grid">
                    ${GIFT_CATALOG.map(gift => `
                        <button class="virtual-gift-option" type="button" data-gift-id="${gift.id}">
                            <span class="virtual-gift-option__emoji">${gift.emoji}</span>
                            <strong>${escapeHTML(gift.name)}</strong>
                            <span>${formatGiftPrice(gift.price)}</span>
                        </button>
                    `).join("")}
                </div>
                <textarea id="virtualGiftNote" class="virtual-gift-note" maxlength="180" placeholder="Add a friendly message (optional)..."></textarea>
                <button id="sendVirtualGiftButton" class="virtual-gift-send" type="button" disabled>Send Gift</button>
            </section>
        `;
        document.body.appendChild(modal);

        button.addEventListener("click", openVirtualGiftModal);
        modal.addEventListener("click", event => {
            const option = event.target.closest("[data-gift-id]");
            if (option) {
                state.selectedGiftId = option.dataset.giftId;
                modal.querySelectorAll("[data-gift-id]").forEach(item => item.classList.toggle("is-selected", item === option));
                modal.querySelector("#sendVirtualGiftButton").disabled = false;
                return;
            }
            if (event.target.closest("[data-close-gift-modal]")) {
                closeVirtualGiftModal();
            }
        });
        modal.querySelector("#sendVirtualGiftButton").addEventListener("click", sendVirtualGift);
    }

    function openVirtualGiftModal() {
        const conversation = getActiveConversation();
        const user = getOtherUser(conversation);
        const modal = document.getElementById("virtualGiftModal");

        if (!conversation || !user || !modal) {
            showToast("Open a conversation before sending a gift.", "info");
            return;
        }
        if (conversation.blocked) {
            showToast("Unblock this user before sending a gift.", "error");
            return;
        }

        state.selectedGiftId = null;
        modal.querySelectorAll("[data-gift-id]").forEach(item => item.classList.remove("is-selected"));
        modal.querySelector("#virtualGiftNote").value = "";
        modal.querySelector("#sendVirtualGiftButton").disabled = true;
        modal.querySelector("#virtualGiftRecipient").textContent = `Choose a gift for ${user.name}.`;
        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeVirtualGiftModal() {
        const modal = document.getElementById("virtualGiftModal");
        if (modal) modal.hidden = true;
        state.selectedGiftId = null;
        document.body.style.overflow = "";
    }

    function sendVirtualGift() {
        const conversation = getActiveConversation();
        const user = getOtherUser(conversation);
        const gift = GIFT_CATALOG.find(item => item.id === state.selectedGiftId);
        const modal = document.getElementById("virtualGiftModal");

        if (!conversation || !user || !gift || !modal) return;

        const now = Date.now();
        const note = modal.querySelector("#virtualGiftNote").value.trim();
        const message = {
            id: createId("message"),
            senderId: getCurrentUserId(),
            recipientId: String(user.id),
            type: "gift",
            text: "",
            giftId: gift.id,
            giftName: gift.name,
            giftEmoji: gift.emoji,
            giftPrice: gift.price,
            giftCurrency: "EUR",
            giftNote: note,
            createdAt: now,
            read: false
        };

        conversation.messages.push(message);
        conversation.updatedAt = now;
        conversation.archived = false;

        saveGiftTransaction({
            id: createId("gift"),
            conversationId: conversation.id,
            messageId: message.id,
            senderId: getCurrentUserId(),
            recipientId: String(user.id),
            giftId: gift.id,
            giftName: gift.name,
            price: gift.price,
            currency: "EUR",
            createdAt: now,
            status: "demo-completed"
        });

        saveConversations();
        closeVirtualGiftModal();
        renderConversationList();
        renderMessages();
        renderDetails();
        scrollMessagesToBottom(true);
        showToast(`${gift.emoji} ${gift.name} sent to ${user.name}.`);
    }

        /* =====================================================
       RENDER ALL
    ===================================================== */

    function renderAll() {

        renderConversationList();

        if (
            state.activeConversationId
        ) {

            const exists =
                state.conversations.some(
                    conversation =>
                        conversation.id ===
                        state.activeConversationId
                );

            if (exists) {

                elements.chatEmptyState.hidden =
                    true;

                elements.activeChat.hidden =
                    false;

                renderActiveChat();

            } else {

                state.activeConversationId =
                    null;

                renderEmptyChatState();

            }

        } else {

            renderEmptyChatState();

        }

    }

    /* =====================================================
       EVENT BINDINGS
    ===================================================== */

    function bindEvents() {

        elements.conversationSearchInput?.addEventListener(
            "input",
            handleConversationSearch
        );

        elements.clearConversationSearch?.addEventListener(
            "click",
            () => {

                elements.conversationSearchInput.value =
                    "";

                state.conversationSearch =
                    "";

                elements.clearConversationSearch.hidden =
                    true;

                renderConversationList();

                elements.conversationSearchInput.focus();

            }
        );

        elements.filterButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        state.conversationFilter =
                            button.dataset
                                .conversationFilter;

                        elements.filterButtons.forEach(
                            item => {

                                item.classList.toggle(
                                    "active",
                                    item === button
                                );

                            }
                        );

                        renderConversationList();

                    }
                );

            }
        );

        elements.messageComposerForm?.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                sendMessage();

            }
        );

        elements.messageInput?.addEventListener(
            "input",
            () => {

                autoResizeTextarea();

                updateComposerState();

            }
        );

        elements.messageInput?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.isComposing
                ) {

                    event.preventDefault();

                    if (
                        !elements.sendMessageButton
                            .disabled
                    ) {

                        sendMessage();

                    }

                }

            }
        );

        elements.emojiButton?.addEventListener(
            "click",
            () => {

                const willOpen =
                    elements.emojiPicker.hidden;

                elements.emojiPicker.hidden =
                    !willOpen;

                elements.emojiButton.setAttribute(
                    "aria-expanded",
                    String(willOpen)
                );

            }
        );

        elements.closeEmojiPicker?.addEventListener(
            "click",
            () => {

                elements.emojiPicker.hidden =
                    true;

                elements.emojiButton.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }
        );

        elements.emojiGrid?.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-emoji]"
                    );

                if (!button) {
                    return;
                }

                const emoji =
                    button.dataset.emoji;

                const input =
                    elements.messageInput;

                const start =
                    input.selectionStart;

                const end =
                    input.selectionEnd;

                input.value =
                    input.value.slice(
                        0,
                        start
                    ) +
                    emoji +
                    input.value.slice(end);

                input.selectionStart =
                    input.selectionEnd =
                        start +
                        emoji.length;

                input.focus();

                autoResizeTextarea();

                updateComposerState();

            }
        );

        elements.attachmentButton?.addEventListener(
            "click",
            () => {

                elements.attachmentInput.click();

            }
        );

        elements.attachmentInput?.addEventListener(
            "change",
            event => {

                handleAttachmentSelection(
                    event.target.files?.[0]
                );

            }
        );

        elements.removeAttachmentButton?.addEventListener(
            "click",
            removePendingAttachment
        );

        elements.searchMessagesButton?.addEventListener(
            "click",
            openMessageSearch
        );

        elements.messageSearchInput?.addEventListener(
            "input",
            handleMessageSearch
        );

        elements.closeMessageSearch?.addEventListener(
            "click",
            closeMessageSearch
        );

                elements.detailsFollowButton?.addEventListener(
            "click",
            toggleFollowActiveUser
        );

        elements.newConversationButton?.addEventListener(
            "click",
            openNewConversationModal
        );

        elements.closeNewConversationModal?.addEventListener(
            "click",
            closeNewConversationModal
        );

        elements.newConversationSearchInput?.addEventListener(
            "input",
            renderNewConversationUsers
        );

        elements.clearNewConversationSearch?.addEventListener(
            "click",
            () => {

                elements.newConversationSearchInput.value =
                    "";

                renderNewConversationUsers();

                elements.newConversationSearchInput.focus();

            }
        );

        elements.conversationOptionsButton?.addEventListener(
            "click",
            toggleConversationOptionsMenu
        );

        elements.conversationOptionsMenu?.addEventListener(
            "click",
            event => {

                const action =
                    event.target
                        .closest("[data-action]")
                        ?.dataset.action;

                if (!action) {
                    return;
                }

                handleConversationAction(
                    action
                );

            }
        );

        document.addEventListener(
            "click",
            event => {

                if (
                    !elements.conversationOptionsMenu.hidden &&
                    !elements.conversationOptionsMenu.contains(
                        event.target
                    ) &&
                    !elements.conversationOptionsButton.contains(
                        event.target
                    )
                ) {

                    closeConversationOptionsMenu();

                }

            }
        );

        elements.cancelConfirmationButton?.addEventListener(
            "click",
            closeConfirmation
        );

        elements.confirmActionButton?.addEventListener(
            "click",
            () => {

                const action =
                    state.confirmationAction;

                closeConfirmation();

                action?.();

            }
        );

        elements.closeImageViewer?.addEventListener(
            "click",
            closeImageViewer
        );

        elements.imageViewerModal?.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    elements.imageViewerModal
                ) {

                    closeImageViewer();

                }

            }
        );

        elements.mobileOpenConversations?.addEventListener(
            "click",
            openConversationsPanel
        );

        elements.mobileOpenDetails?.addEventListener(
            "click",
            openDetailsPanel
        );

        elements.mobileMessagesOverlay?.addEventListener(
            "click",
            closeMobilePanels
        );

        window.addEventListener(
            "resize",
            () => {

                if (
                    window.innerWidth >
                    1024
                ) {

                    closeMobilePanels();

                }

            }
        );

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeConversationOptionsMenu();

                    closeImageViewer();

                    closeConfirmation();

                    elements.emojiPicker.hidden =
                        true;

                }

            }
        );

    }

    initialize();

})();