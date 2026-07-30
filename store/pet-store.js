// ==================================================
// THEPETGRID
// C-009 — PET STORE
// ==================================================

(() => {

    "use strict";


    // ==================================================
    // STORAGE KEYS
    // ==================================================

    const PETS_STORAGE_KEY =
        "thepetgrid_pets";

    const LIKE_STORAGE_PREFIX =
        "thepetgrid_pet_";

    const FAVORITE_STORAGE_SUFFIX =
        "_favorite";

    const LIKED_STORAGE_SUFFIX =
        "_liked";


    // ==================================================
    // DEFAULT PET DATA
    // ==================================================

    const defaultPets = [

        {
            id: 1,
            name: "Luna",
            type: "Dog",
            breed: "Golden Retriever",
            age: "3 years",
            country: "Greece",
            city: "Athens",
            owner: "Maria",
            likes: 245,
            followers: 812,
            gifts: 38,
            verified: true,
            status: "featured",
            image:
                "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=85"
        },

        {
            id: 2,
            name: "Milo",
            type: "Cat",
            breed: "British Shorthair",
            age: "2 years",
            country: "Italy",
            city: "Rome",
            owner: "Luca",
            likes: 188,
            followers: 540,
            gifts: 24,
            verified: true,
            status: "new",
            image:
                "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=85"
        },

        {
            id: 3,
            name: "Charlie",
            type: "Dog",
            breed: "Beagle",
            age: "4 years",
            country: "France",
            city: "Paris",
            owner: "Sophie",
            likes: 326,
            followers: 970,
            gifts: 61,
            verified: false,
            status: "adoption",
            image:
                "https://images.unsplash.com/photo-1505628346881-b72b27e84530?auto=format&fit=crop&w=900&q=85"
        },

        {
            id: 4,
            name: "Nala",
            type: "Cat",
            breed: "Maine Coon",
            age: "5 years",
            country: "Germany",
            city: "Berlin",
            owner: "Anna",
            likes: 411,
            followers: 1240,
            gifts: 79,
            verified: true,
            status: "adopted",
            image:
                "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&w=900&q=85"
        },

        {
            id: 5,
            name: "Rio",
            type: "Bird",
            breed: "Blue Parrot",
            age: "2 years",
            country: "Spain",
            city: "Barcelona",
            owner: "Carlos",
            likes: 154,
            followers: 388,
            gifts: 19,
            verified: false,
            status: "lost",
            image:
                "https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=900&q=85"
        },

        {
            id: 6,
            name: "Coco",
            type: "Rabbit",
            breed: "Mini Lop",
            age: "1 year",
            country: "Portugal",
            city: "Lisbon",
            owner: "Ines",
            likes: 97,
            followers: 265,
            gifts: 12,
            verified: true,
            status: "new",
            image:
                "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=900&q=85"
        }

    ];


    // ==================================================
    // INTERNAL STATE
    // ==================================================

    let pets = [];


    // ==================================================
    // HELPERS
    // ==================================================

    function clone(value) {

        return JSON.parse(
            JSON.stringify(value)
        );

    }


    function normalizeText(value) {

        return String(value ?? "")
            .trim()
            .toLowerCase();

    }


    function createPetId() {

        return (
            Date.now() +
            Math.floor(Math.random() * 1000)
        );

    }


    function getFavoriteKey(petId) {

        return (
            `${LIKE_STORAGE_PREFIX}${petId}` +
            FAVORITE_STORAGE_SUFFIX
        );

    }


    function getLikedKey(petId) {

        return (
            `${LIKE_STORAGE_PREFIX}${petId}` +
            LIKED_STORAGE_SUFFIX
        );

    }


    function getBooleanState(key) {

        return (
            localStorage.getItem(key) === "true"
        );

    }


    function savePets() {

        localStorage.setItem(
            PETS_STORAGE_KEY,
            JSON.stringify(pets)
        );

    }


    function loadPets() {

        try {

            const storedPets =
                JSON.parse(
                    localStorage.getItem(
                        PETS_STORAGE_KEY
                    )
                );

            if (
                Array.isArray(storedPets) &&
                storedPets.length > 0
            ) {

                pets = storedPets;

                return;

            }

        } catch (error) {

            console.error(
                "PetStore could not read saved pets.",
                error
            );

        }

        pets = clone(defaultPets);

        savePets();

    }


    function notifyChange(
        action,
        pet = null
    ) {

        window.dispatchEvent(
            new CustomEvent(
                "petstore:change",
                {
                    detail: {
                        action,
                        pet: pet
                            ? clone(pet)
                            : null,
                        pets: getAll()
                    }
                }
            )
        );

    }


    // ==================================================
    // READ METHODS
    // ==================================================

    function getAll() {

        return clone(pets);

    }


    function getById(petId) {

        const normalizedId =
            String(petId);

        const pet =
            pets.find(
                currentPet =>
                    String(currentPet.id) ===
                    normalizedId
            );

        return pet
            ? clone(pet)
            : null;

    }


    function search(searchText) {

        const query =
            normalizeText(searchText);

        if (!query) {
            return getAll();
        }

        const results =
            pets.filter(pet => {

                const searchableText =
                    normalizeText(
                        [
                            pet.name,
                            pet.type,
                            pet.breed,
                            pet.age,
                            pet.country,
                            pet.city,
                            pet.owner,
                            pet.status
                        ].join(" ")
                    );

                return searchableText.includes(
                    query
                );

            });

        return clone(results);

    }


    function filter(filters = {}) {

        const results =
            pets.filter(pet => {

                const matchesType =
                    !filters.type ||
                    filters.type === "all" ||
                    pet.type === filters.type;

                const matchesCountry =
                    !filters.country ||
                    filters.country === "all" ||
                    pet.country === filters.country;

                const matchesStatus =
                    !filters.status ||
                    filters.status === "all" ||
                    pet.status === filters.status;

                const matchesVerified =
                    typeof filters.verified !== "boolean" ||
                    pet.verified === filters.verified;

                const matchesFavorite =
                    !filters.favoritesOnly ||
                    isFavorite(pet.id);

                return (
                    matchesType &&
                    matchesCountry &&
                    matchesStatus &&
                    matchesVerified &&
                    matchesFavorite
                );

            });

        return clone(results);

    }


    function getFavorites() {

        return clone(
            pets.filter(
                pet => isFavorite(pet.id)
            )
        );

    }


    function getMostLiked() {

        return clone(
            [...pets].sort(
                (firstPet, secondPet) =>
                    getDisplayedLikes(secondPet) -
                    getDisplayedLikes(firstPet)
            )
        );

    }


    function getDisplayedLikes(petOrId) {

        const pet =
            typeof petOrId === "object"
                ? petOrId
                : pets.find(
                    currentPet =>
                        String(currentPet.id) ===
                        String(petOrId)
                );

        if (!pet) {
            return 0;
        }

        const baseLikes =
            Number(pet.likes) || 0;

        return (
            baseLikes +
            (isLiked(pet.id) ? 1 : 0)
        );

    }


    // ==================================================
    // CREATE
    // ==================================================

    function add(petData) {

        if (
            !petData ||
            typeof petData !== "object"
        ) {

            throw new Error(
                "PetStore.add requires pet data."
            );

        }

        const newPet = {

            id:
                petData.id ??
                createPetId(),

            name:
                String(petData.name ?? "").trim(),

            type:
                String(petData.type ?? "Other").trim(),

            breed:
                String(petData.breed ?? "Unknown").trim(),

            age:
                String(petData.age ?? "Unknown").trim(),

            country:
                String(petData.country ?? "Unknown").trim(),

            city:
                String(petData.city ?? "Unknown").trim(),

            owner:
                String(petData.owner ?? "Unknown").trim(),

            likes:
                Number(petData.likes) || 0,

            followers:
                Number(petData.followers) || 0,

            gifts:
                Number(petData.gifts) || 0,

            verified:
                Boolean(petData.verified),

            status:
                String(petData.status ?? "new").trim(),

            image:
                String(petData.image ?? "").trim()

        };

        if (!newPet.name) {

            throw new Error(
                "Pet name is required."
            );

        }

        pets.push(newPet);

        savePets();

        notifyChange(
            "add",
            newPet
        );

        return clone(newPet);

    }


    // ==================================================
    // UPDATE
    // ==================================================

    function update(
        petId,
        updates
    ) {

        const petIndex =
            pets.findIndex(
                pet =>
                    String(pet.id) ===
                    String(petId)
            );

        if (petIndex === -1) {
            return null;
        }

        const currentPet =
            pets[petIndex];

        const updatedPet = {
            ...currentPet,
            ...updates,
            id: currentPet.id
        };

        pets[petIndex] =
            updatedPet;

        savePets();

        notifyChange(
            "update",
            updatedPet
        );

        return clone(updatedPet);

    }


    // ==================================================
    // DELETE
    // ==================================================

    function remove(petId) {

        const petIndex =
            pets.findIndex(
                pet =>
                    String(pet.id) ===
                    String(petId)
            );

        if (petIndex === -1) {
            return false;
        }

        const [removedPet] =
            pets.splice(
                petIndex,
                1
            );

        localStorage.removeItem(
            getFavoriteKey(petId)
        );

        localStorage.removeItem(
            getLikedKey(petId)
        );

        savePets();

        notifyChange(
            "remove",
            removedPet
        );

        return true;

    }


    // ==================================================
    // FAVORITES
    // ==================================================

    function isFavorite(petId) {

        return getBooleanState(
            getFavoriteKey(petId)
        );

    }


    function toggleFavorite(petId) {

        const pet =
            getById(petId);

        if (!pet) {
            return false;
        }

        const newState =
            !isFavorite(petId);

        localStorage.setItem(
            getFavoriteKey(petId),
            String(newState)
        );

        notifyChange(
            "favorite",
            pet
        );

        return newState;

    }


    // ==================================================
    // LIKES
    // ==================================================

    function isLiked(petId) {

        return getBooleanState(
            getLikedKey(petId)
        );

    }


    function toggleLike(petId) {

        const pet =
            getById(petId);

        if (!pet) {
            return false;
        }

        const newState =
            !isLiked(petId);

        localStorage.setItem(
            getLikedKey(petId),
            String(newState)
        );

        notifyChange(
            "like",
            pet
        );

        return newState;

    }


    // ==================================================
    // RESET
    // ==================================================

    function reset() {

        pets = clone(defaultPets);

        Object.keys(localStorage)
            .filter(key =>
                key.startsWith(
                    LIKE_STORAGE_PREFIX
                )
            )
            .forEach(key =>
                localStorage.removeItem(key)
            );

        savePets();

        notifyChange(
            "reset"
        );

        return getAll();

    }


    // ==================================================
    // INITIALIZE
    // ==================================================

    loadPets();


    // ==================================================
    // PUBLIC API
    // ==================================================

    window.PetStore = {

        getAll,
        get: getById,
        getById,

        search,
        filter,

        getFavorites,
        getMostLiked,
        getDisplayedLikes,

        add,
        update,
        remove,

        isFavorite,
        toggleFavorite,

        isLiked,
        toggleLike,

        reset

    };

})();