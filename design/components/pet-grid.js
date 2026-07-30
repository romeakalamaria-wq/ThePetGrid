// ==================================================
// THEPETGRID
// COMPONENT: C-008 — SEARCH & FILTERS
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        "use strict";

        if (!window.PetStore) {

            console.error(
                "PetStore was not loaded."
            );

            return;

        }

        const pets =
            window.PetStore.getAll();


        // ==================================================
        // ELEMENTS
        // ==================================================

        const petGrid =
            document.getElementById("petGrid");

        const petSearch =
            document.getElementById("petSearch");

        const clearSearchBtn =
            document.getElementById("clearSearchBtn");

        const typeFilter =
            document.getElementById("typeFilter");

        const countryFilter =
            document.getElementById("countryFilter");

        const sortFilter =
            document.getElementById("sortFilter");

        const resetFiltersBtn =
            document.getElementById("resetFiltersBtn");

        const emptyResetBtn =
            document.getElementById("emptyResetBtn");

        const resultsCount =
            document.getElementById("resultsCount");

        const emptyState =
            document.getElementById("emptyState");

        const quickFilterButtons =
            document.querySelectorAll(
                "[data-quick-filter]"
            );


        // ==================================================
        // VALIDATION
        // ==================================================

        if (
            !petGrid ||
            !petSearch ||
            !typeFilter ||
            !countryFilter ||
            !sortFilter ||
            !resultsCount ||
            !emptyState
        ) {

            console.error(
                "One or more Pet Grid elements were not found."
            );

            return;

        }

        if (
            !window.PetCard ||
            typeof window.PetCard.create !== "function"
        ) {

            console.error(
                "The Pet Card component was not loaded."
            );

            return;

        }


        // ==================================================
        // FILTER STATE
        // ==================================================

        const filterState = {

            search: "",

            type: "all",

            country: "all",

            sort: "default",

            quickFilter: "all"

        };


        // ==================================================
        // HELPERS
        // ==================================================

        function normalizeText(value) {

            return String(value ?? "")
                .trim()
                .toLowerCase();

        }


        function isPetFavorite(petId) {

            return (
                localStorage.getItem(
                    `thepetgrid_pet_${petId}_favorite`
                ) === "true"
            );

        }


        function getDisplayedLikes(pet) {

            const isLiked =
                localStorage.getItem(
                    `thepetgrid_pet_${pet.id}_liked`
                ) === "true";

            return (
                Number(pet.likes) +
                (isLiked ? 1 : 0)
            );

        }


        // ==================================================
        // CREATE SELECT OPTIONS
        // ==================================================

        function populateSelect(
            selectElement,
            values
        ) {

            values.forEach(value => {

                const option =
                    document.createElement("option");

                option.value = value;
                option.textContent = value;

                selectElement.appendChild(option);

            });

        }


        function initializeFilterOptions() {

            const types = [
                ...new Set(
                    pets.map(pet => pet.type)
                )
            ].sort();

            const countries = [
                ...new Set(
                    pets.map(pet => pet.country)
                )
            ].sort();

            populateSelect(
                typeFilter,
                types
            );

            populateSelect(
                countryFilter,
                countries
            );

        }


        // ==================================================
        // FILTER PETS
        // ==================================================

        function filterPets(petList) {

            return petList.filter(pet => {

                const searchableText =
                    normalizeText(
                        [
                            pet.name,
                            pet.type,
                            pet.breed,
                            pet.city,
                            pet.country,
                            pet.owner,
                            pet.status
                        ].join(" ")
                    );

                const matchesSearch =
                    !filterState.search ||
                    searchableText.includes(
                        filterState.search
                    );

                const matchesType =
                    filterState.type === "all" ||
                    pet.type === filterState.type;

                const matchesCountry =
                    filterState.country === "all" ||
                    pet.country === filterState.country;

                const matchesFavorites =
                    filterState.quickFilter !== "favorites" ||
                    isPetFavorite(pet.id);

                return (
                    matchesSearch &&
                    matchesType &&
                    matchesCountry &&
                    matchesFavorites
                );

            });

        }


        // ==================================================
        // SORT PETS
        // ==================================================

        function sortPets(petList) {

            const sortedPets =
                [...petList];

            let activeSort =
                filterState.sort;

            if (
                filterState.quickFilter === "most-liked"
            ) {

                activeSort = "likes-desc";

            }

            if (activeSort === "likes-desc") {

                sortedPets.sort(
                    (firstPet, secondPet) =>
                        getDisplayedLikes(secondPet) -
                        getDisplayedLikes(firstPet)
                );

            }

            if (activeSort === "likes-asc") {

                sortedPets.sort(
                    (firstPet, secondPet) =>
                        getDisplayedLikes(firstPet) -
                        getDisplayedLikes(secondPet)
                );

            }

            if (activeSort === "name-asc") {

                sortedPets.sort(
                    (firstPet, secondPet) =>
                        firstPet.name.localeCompare(
                            secondPet.name
                        )
                );

            }

            if (activeSort === "name-desc") {

                sortedPets.sort(
                    (firstPet, secondPet) =>
                        secondPet.name.localeCompare(
                            firstPet.name
                        )
                );

            }

            return sortedPets;

        }


        // ==================================================
        // UPDATE RESULTS COUNT
        // ==================================================

        function updateResultsCount(
            visibleCount
        ) {

            const petWord =
                visibleCount === 1
                    ? "pet"
                    : "pets";

            resultsCount.textContent =
                `Showing ${visibleCount} ${petWord}`;

        }


        // ==================================================
        // RENDER
        // ==================================================

        function renderPetGrid() {

            const filteredPets =
                filterPets(pets);

            const visiblePets =
                sortPets(filteredPets);

            petGrid.innerHTML =
                visiblePets
                    .map(pet =>
                        window.PetCard.create(pet)
                    )
                    .join("");

            const hasResults =
                visiblePets.length > 0;

            petGrid.hidden =
                !hasResults;

            emptyState.hidden =
                hasResults;

            updateResultsCount(
                visiblePets.length
            );

        }


        // ==================================================
        // QUICK FILTER BUTTONS
        // ==================================================

        function updateQuickFilterButtons() {

            quickFilterButtons.forEach(button => {

                const isActive =
                    button.dataset.quickFilter ===
                    filterState.quickFilter;

                button.classList.toggle(
                    "is-active",
                    isActive
                );

                button.setAttribute(
                    "aria-pressed",
                    String(isActive)
                );

            });

        }


        function setQuickFilter(filterName) {

            filterState.quickFilter =
                filterName;

            updateQuickFilterButtons();

            renderPetGrid();

        }


        // ==================================================
        // RESET
        // ==================================================

        function resetFilters() {

            filterState.search = "";
            filterState.type = "all";
            filterState.country = "all";
            filterState.sort = "default";
            filterState.quickFilter = "all";

            petSearch.value = "";
            typeFilter.value = "all";
            countryFilter.value = "all";
            sortFilter.value = "default";

            clearSearchBtn.hidden = true;

            updateQuickFilterButtons();

            renderPetGrid();

        }


        // ==================================================
        // EVENTS
        // ==================================================

        petSearch.addEventListener(
            "input",
            () => {

                filterState.search =
                    normalizeText(
                        petSearch.value
                    );

                clearSearchBtn.hidden =
                    petSearch.value.length === 0;

                renderPetGrid();

            }
        );


        clearSearchBtn.addEventListener(
            "click",
            () => {

                petSearch.value = "";
                filterState.search = "";

                clearSearchBtn.hidden = true;

                petSearch.focus();

                renderPetGrid();

            }
        );


        typeFilter.addEventListener(
            "change",
            () => {

                filterState.type =
                    typeFilter.value;

                renderPetGrid();

            }
        );


        countryFilter.addEventListener(
            "change",
            () => {

                filterState.country =
                    countryFilter.value;

                renderPetGrid();

            }
        );


        sortFilter.addEventListener(
            "change",
            () => {

                filterState.sort =
                    sortFilter.value;

                if (
                    filterState.quickFilter ===
                    "most-liked"
                ) {

                    filterState.quickFilter =
                        "all";

                    updateQuickFilterButtons();

                }

                renderPetGrid();

            }
        );


        quickFilterButtons.forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const selectedFilter =
                        button.dataset.quickFilter;

                    setQuickFilter(
                        selectedFilter
                    );

                }
            );

        });


        resetFiltersBtn.addEventListener(
            "click",
            resetFilters
        );


        emptyResetBtn.addEventListener(
            "click",
            resetFilters
        );


        // When favorite or like changes,
        // refresh filters and sorting.

        window.addEventListener(
    "petstore:change",
    event => {

        const action =
            event.detail?.action;

        if (
            action === "like" ||
            action === "favorite" ||
            action === "add" ||
            action === "update" ||
            action === "remove" ||
            action === "reset"
        ) {

            renderPetGrid();

        }

    }
);


        // ==================================================
        // INITIALIZE
        // ==================================================

        initializeFilterOptions();

        window.PetCard.initializeActions(
            petGrid
        );

        renderPetGrid();

    }
);