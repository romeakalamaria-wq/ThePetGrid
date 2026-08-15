// ===============================================
// THEPETGRID
// upload.js
// Part 1
// ===============================================

const form = document.getElementById("uploadPetForm");

const petName = document.getElementById("petName");
const petType = document.getElementById("petType");
const petBreed = document.getElementById("petBreed");
const petAge = document.getElementById("petAge");
const petCountry = document.getElementById("petCountry");
const petCity = document.getElementById("petCity");
const petLatitude = document.getElementById("petLatitude");
const petLongitude = document.getElementById("petLongitude");
const locationPicker = window.ThePetGridLocationPicker?.init?.();
const petOwner = document.getElementById("petOwner");
const petStatus = document.getElementById("petStatus");
const petBio = document.getElementById("petBio");
const petImage = document.getElementById("petImage");

const previewName = document.getElementById("previewName");
const previewType = document.getElementById("previewType");
const previewLocation = document.getElementById("previewLocation");
const previewOwner = document.getElementById("previewOwner");

const previewImage = document.getElementById("previewImage");
const previewPlaceholder = document.getElementById("previewPlaceholder");

const bioCounter =
    document.getElementById("bioCharacterCount");

// ===============================================
// DEFAULT PREVIEW
// ===============================================

function updatePreview() {

    previewName.textContent =
        petName.value.trim() || "Your Pet";

    const type =
        petType.value || "Pet";

    const breed =
        petBreed.value.trim() || "Breed";

    previewType.textContent =
        `${type} • ${breed}`;

    const city =
        petCity.value.trim();

    const country =
        petCountry.value.trim();

    if (city || country) {

        previewLocation.textContent =
            `📍 ${city}${city && country ? ", " : ""}${country}`;

    } else {

        previewLocation.textContent =
            "📍 City, Country";

    }

    previewOwner.textContent =
        "👤 " +
        (petOwner.value.trim() || "Owner name");

}

// ===============================================
// LIVE PREVIEW
// ===============================================

[
    petName,
    petType,
    petBreed,
    petAge,
    petCountry,
    petCity,
    petOwner,
    petStatus
].forEach(input => {

    input.addEventListener(
        "input",
        updatePreview
    );

    input.addEventListener(
        "change",
        updatePreview
    );

});

// ===============================================
// BIO COUNTER
// ===============================================

petBio.addEventListener("input", () => {

    bioCounter.textContent =
        `${petBio.value.length} / 300`;

});

// ===============================================
// IMAGE PREVIEW
// ===============================================

petImage.addEventListener("change", () => {

    const file =
        petImage.files[0];

    if (!file) {

        previewImage.hidden = true;
        previewPlaceholder.hidden = false;
        previewImage.removeAttribute("src");

        return;

    }

    const reader =
        new FileReader();

    reader.onload = e => {

        previewImage.src =
            e.target.result;

        previewImage.hidden = false;

        previewPlaceholder.hidden = true;

    };

    reader.readAsDataURL(file);

});

// ===============================================
// VALIDATION HELPERS
// ===============================================

function clearErrors() {

    document
        .querySelectorAll(".form-error")
        .forEach(error => {

            error.textContent = "";

        });

}

function showError(id, message) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent = message;

    }

}

function validateForm() {

    clearErrors();

    let valid = true;

    if (!petName.value.trim()) {

        showError(
            "petNameError",
            "Pet name is required."
        );

        valid = false;

    }

    if (!petType.value) {

        showError(
            "petTypeError",
            "Select a pet type."
        );

        valid = false;

    }

    if (!petCountry.value.trim()) {

        showError(
            "petCountryError",
            "Country is required."
        );

        valid = false;

    }

    if (!petOwner.value.trim()) {

        showError(
            "petOwnerError",
            "Owner name is required."
        );

        valid = false;

    }

    if (!petImage.files.length) {

        showError(
            "petImageError",
            "Choose a photo."
        );

        valid = false;

    }

    return valid;

}

updatePreview();

// ===============================================
// MESSAGE HELPERS
// ===============================================

const uploadMessage =
    document.getElementById("uploadMessage");

const submitButton =
    document.getElementById("submitUploadBtn");

const defaultButtonText =
    submitButton.querySelector(".button__default-text");

const loadingButtonText =
    submitButton.querySelector(".button__loading-text");


function showMessage(type, message) {

    uploadMessage.hidden = false;

    uploadMessage.className =
        `upload-message is-${type}`;

    uploadMessage.textContent =
        message;

}


function hideMessage() {

    uploadMessage.hidden = true;

    uploadMessage.className =
        "upload-message";

    uploadMessage.textContent = "";

}


// ===============================================
// LOADING STATE
// ===============================================

function setLoading(isLoading) {

    submitButton.disabled =
        isLoading;

    defaultButtonText.hidden =
        isLoading;

    loadingButtonText.hidden =
        !isLoading;

}


// ===============================================
// FILE VALIDATION
// ===============================================

function validateImageFile(file) {

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    const maximumSize =
        5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {

        showError(
            "petImageError",
            "Only JPG, PNG or WebP images are allowed."
        );

        return false;

    }

    if (file.size > maximumSize) {

        showError(
            "petImageError",
            "The image must be smaller than 5 MB."
        );

        return false;

    }

    return true;

}


// ===============================================
// SUPABASE HELPERS
// ===============================================

const PET_IMAGE_BUCKET = "pet-images";

function getSupabaseClient() {

    return window.ThePetGridSupabase?.client || null;

}

async function getAuthenticatedUser() {

    if (window.ThePetGridAuth?.ready) {

        await window.ThePetGridAuth.ready;

    }

    const client = getSupabaseClient();

    if (!client) {

        throw new Error(
            "Supabase is not available. Check the project configuration and internet connection."
        );

    }

    const {
        data: { user },
        error
    } = await client.auth.getUser();

    if (error) {

        throw error;

    }

    if (!user) {

        throw new Error(
            "Your session has expired. Please log in again."
        );

    }

    return user;

}

function getImageExtension(file) {

    const extension =
        file.name.split(".").pop()?.toLowerCase();

    if (["jpg", "jpeg", "png", "webp"].includes(extension)) {

        return extension === "jpeg" ? "jpg" : extension;

    }

    const mimeExtensions = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    };

    return mimeExtensions[file.type] || "jpg";

}

function createStoragePath(userId, file) {

    const uniqueId =
        window.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `${userId}/${uniqueId}.${getImageExtension(file)}`;

}

async function uploadPetImage(client, user, file) {

    const storagePath =
        createStoragePath(user.id, file);

    const { error: uploadError } =
        await client.storage
            .from(PET_IMAGE_BUCKET)
            .upload(storagePath, file, {
                cacheControl: "3600",
                contentType: file.type,
                upsert: false
            });

    if (uploadError) {

        throw new Error(
            `Photo upload failed: ${uploadError.message}`
        );

    }

    const { data } =
        client.storage
            .from(PET_IMAGE_BUCKET)
            .getPublicUrl(storagePath);

    if (!data?.publicUrl) {

        await client.storage
            .from(PET_IMAGE_BUCKET)
            .remove([storagePath]);

        throw new Error(
            "The photo was uploaded, but its public URL could not be created."
        );

    }

    return {
        storagePath,
        publicUrl: data.publicUrl
    };

}

function parsePetAge() {

    const rawAge = petAge.value.trim();

    if (!rawAge) {

        return null;

    }

    const normalized =
        rawAge.replace(",", ".");

    const match =
        normalized.match(/\d+(?:\.\d+)?/);

    return match ? Number(match[0]) : null;

}

function createDatabasePet(user, imageUrl) {

    return {
        owner_id: user.id,
        name: petName.value.trim(),
        type: petType.value,
        breed: petBreed.value.trim() || null,
        age: parsePetAge(),
        gender: null,
        country: petCountry.value.trim(),
        city: petCity.value.trim() || null,
        latitude: petLatitude.value ? Number(petLatitude.value) : null,
        longitude: petLongitude.value ? Number(petLongitude.value) : null,
        bio: petBio.value.trim(),
        image_url: imageUrl,
        verified: false,
        is_memorial: false
    };

}

async function savePetToDatabase(client, petData) {

    const { data, error } =
        await client
            .from("pets")
            .insert(petData)
            .select()
            .single();

    if (error) {

        throw new Error(
            `The pet could not be saved: ${error.message}`
        );

    }

    return data;

}

// ===============================================
// RESET PREVIEW
// ===============================================

function resetPreview() {

    previewName.textContent =
        "Your Pet";

    previewType.textContent =
        "Pet type • Breed";

    previewLocation.textContent =
        "📍 City, Country";

    previewOwner.textContent =
        "👤 Owner name";

    previewImage.hidden = true;

    previewImage.removeAttribute("src");

    previewPlaceholder.hidden = false;

    bioCounter.textContent =
        "0 / 300";

    locationPicker?.reset?.();

}

function getOwnerDisplayName(user) {
    const metadata = user?.user_metadata || {};

    return (
        metadata.display_name ||
        metadata.full_name ||
        metadata.name ||
        metadata.owner_name ||
        metadata.username ||
        user?.email?.split("@")[0] ||
        "Member"
    ).trim();
}


async function fillOwnerFromSession() {

    try {

        const user =
            await getAuthenticatedUser();

        const ownerDisplayName =
            getOwnerDisplayName(user);

        petOwner.value = ownerDisplayName;
        petOwner.readOnly = true;
        updatePreview();

    } catch (error) {

        console.warn(
            "ThePetGrid: owner field could not be filled from the session.",
            error
        );

    }

}

// ===============================================
// FORM SUBMIT — SUPABASE STORAGE + DATABASE
// ===============================================

form.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        hideMessage();

        if (!validateForm()) {

            showMessage(
                "error",
                "Please complete the required fields."
            );

            return;

        }

        const file =
            petImage.files[0];

        if (!validateImageFile(file)) {

            showMessage(
                "error",
                "Please choose a valid pet photo."
            );

            return;

        }

        let uploadedStoragePath = null;

        try {

            setLoading(true);

            const client =
                getSupabaseClient();

            const user =
                await getAuthenticatedUser();

            const uploadedImage =
                await uploadPetImage(client, user, file);

            uploadedStoragePath =
                uploadedImage.storagePath;

            const petData =
                createDatabasePet(
                    user,
                    uploadedImage.publicUrl
                );

            const savedPet =
                await savePetToDatabase(
                    client,
                    petData
                );

            showMessage(
                "success",
                `${savedPet.name} was uploaded successfully and saved to ThePetGrid cloud database.`
            );

            form.reset();
            clearErrors();
            resetPreview();

            const ownerDisplayName =
                getOwnerDisplayName(user);

            petOwner.value = ownerDisplayName;
            petOwner.readOnly = true;
            updatePreview();

            window.scrollTo({
                top: uploadMessage.offsetTop - 140,
                behavior: "smooth"
            });

        } catch (error) {

            console.error(
                "Supabase pet upload error:",
                error
            );

            if (uploadedStoragePath) {

                const client =
                    getSupabaseClient();

                await client?.storage
                    .from(PET_IMAGE_BUCKET)
                    .remove([uploadedStoragePath]);

            }

            showMessage(
                "error",
                error.message ||
                "Something went wrong while uploading your pet."
            );

        } finally {

            setLoading(false);

        }

    }
);

// ===============================================
// FORM RESET
// ===============================================

form.addEventListener(
    "reset",
    () => {

        setTimeout(() => {

            clearErrors();

            hideMessage();

            resetPreview();

        }, 0);

    }
);


// ===============================================
// REMOVE FIELD ERROR WHILE TYPING
// ===============================================

[
    petName,
    petType,
    petCountry,
    petOwner,
    petImage
].forEach(field => {

    const eventName =
        field.type === "file" ||
        field.tagName === "SELECT"
            ? "change"
            : "input";

    field.addEventListener(
        eventName,
        () => {

            field.classList.remove(
                "is-invalid"
            );

            const errorElement =
                document.getElementById(
                    `${field.id}Error`
                );

            if (errorElement) {

                errorElement.textContent = "";

            }

        }
    );

});


// ===============================================
// INITIAL STATE
// ===============================================

resetPreview();
hideMessage();
fillOwnerFromSession();