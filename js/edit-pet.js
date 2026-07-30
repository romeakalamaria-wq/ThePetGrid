// ==========================================
// THEPETGRID - EDIT PET (SUPABASE)
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const PET_IMAGE_BUCKET = "pet-images";
    const params = new URLSearchParams(window.location.search);
    const petId = params.get("id");

    const loadingSection = document.getElementById("editPetLoading");
    const errorSection = document.getElementById("editPetError");
    const errorMessage = document.getElementById("editPetErrorMessage");
    const contentSection = document.getElementById("editPetContent");
    const form = document.getElementById("editPetForm");
    const message = document.getElementById("editMessage");
    const saveButton = document.getElementById("savePetButton");
    const defaultButtonText = saveButton?.querySelector(".button-default-text");
    const loadingButtonText = saveButton?.querySelector(".button-loading-text");

    const fields = {
        name: document.getElementById("petName"),
        type: document.getElementById("petType"),
        breed: document.getElementById("petBreed"),
        age: document.getElementById("petAge"),
        country: document.getElementById("petCountry"),
        city: document.getElementById("petCity"),
        latitude: document.getElementById("petLatitude"),
        longitude: document.getElementById("petLongitude"),
        owner: document.getElementById("petOwner"),
        status: document.getElementById("petStatus"),
        bio: document.getElementById("petBio"),
        image: document.getElementById("petImage")
    };

    const locationPicker = window.ThePetGridLocationPicker?.init?.();

    const preview = {
        image: document.getElementById("previewImage"),
        placeholder: document.getElementById("previewPlaceholder"),
        status: document.getElementById("previewStatus"),
        name: document.getElementById("previewName"),
        type: document.getElementById("previewType"),
        location: document.getElementById("previewLocation"),
        owner: document.getElementById("previewOwner"),
        likes: document.getElementById("previewLikes"),
        followers: document.getElementById("previewFollowers"),
        gifts: document.getElementById("previewGifts")
    };

    const bioCounter = document.getElementById("bioCharacterCount");
    let currentPet = null;
    let currentUser = null;
    let selectedImageObjectUrl = "";

    function showErrorState(text) {
        loadingSection.hidden = true;
        contentSection.hidden = true;
        errorSection.hidden = false;
        if (errorMessage) errorMessage.textContent = text;
    }

    function showContentState() {
        loadingSection.hidden = true;
        errorSection.hidden = true;
        contentSection.hidden = false;
    }

    function showMessage(type, text) {
        message.hidden = false;
        message.className = `edit-message is-${type}`;
        message.textContent = text;
        message.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function hideMessage() {
        message.hidden = true;
        message.className = "edit-message";
        message.textContent = "";
    }

    function setSaving(value) {
        saveButton.disabled = value;
        if (defaultButtonText) defaultButtonText.hidden = value;
        if (loadingButtonText) loadingButtonText.hidden = !value;
    }

    function clearErrors() {
        document.querySelectorAll(".form-error").forEach(el => { el.textContent = ""; });
    }

    function setFieldError(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    }

    function parseAge(value) {
        const normalized = String(value || "").trim().replace(",", ".");
        if (!normalized) return null;
        const match = normalized.match(/\d+(?:\.\d+)?/);
        return match ? Number(match[0]) : null;
    }

    function validateImage(file) {
        if (!file) return true;
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (!allowed.includes(file.type)) {
            setFieldError("petImageError", "Only JPG, PNG or WebP images are allowed.");
            return false;
        }
        if (file.size > 5 * 1024 * 1024) {
            setFieldError("petImageError", "The image must be smaller than 5 MB.");
            return false;
        }
        return true;
    }

    function validateForm() {
        clearErrors();
        let valid = true;
        if (!fields.name.value.trim()) {
            setFieldError("petNameError", "Pet name is required.");
            valid = false;
        }
        if (!fields.type.value) {
            setFieldError("petTypeError", "Select a pet type.");
            valid = false;
        }
        if (!fields.country.value.trim()) {
            setFieldError("petCountryError", "Country is required.");
            valid = false;
        }
        if (!validateImage(fields.image.files?.[0])) valid = false;
        return valid;
    }

    function getExtension(file) {
        const fromName = file.name.split(".").pop()?.toLowerCase();
        if (["jpg", "jpeg", "png", "webp"].includes(fromName)) {
            return fromName === "jpeg" ? "jpg" : fromName;
        }
        return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type] || "jpg";
    }

    function getStoragePathFromUrl(url) {
        if (!url) return null;
        const marker = `/storage/v1/object/public/${PET_IMAGE_BUCKET}/`;
        const index = url.indexOf(marker);
        if (index === -1) return null;
        return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
    }

    async function uploadNewImage(client, file) {
        const uniqueId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const path = `${currentUser.id}/${uniqueId}.${getExtension(file)}`;
        const { error } = await client.storage.from(PET_IMAGE_BUCKET).upload(path, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false
        });
        if (error) throw new Error(`Photo upload failed: ${error.message}`);
        const { data } = client.storage.from(PET_IMAGE_BUCKET).getPublicUrl(path);
        if (!data?.publicUrl) {
            await client.storage.from(PET_IMAGE_BUCKET).remove([path]);
            throw new Error("The public URL for the new photo could not be created.");
        }
        return { path, publicUrl: data.publicUrl };
    }

    function statusLabel(value) {
        const labels = {
            new: "New", featured: "Featured", adoption: "For Adoption",
            adopted: "Adopted", lost: "Lost", memorial: "Memorial"
        };
        return labels[value] || "New";
    }

    function updatePreview() {
        preview.name.textContent = fields.name.value.trim() || "Your Pet";
        preview.type.textContent = `${fields.type.value || "Pet"} • ${fields.breed.value.trim() || "Breed"}`;
        const city = fields.city.value.trim();
        const country = fields.country.value.trim();
        preview.location.textContent = `📍 ${[city, country].filter(Boolean).join(", ") || "City, Country"}`;
        preview.owner.textContent = `👤 ${fields.owner.value.trim() || "Owner name"}`;
        preview.status.textContent = statusLabel(fields.status.value);
        bioCounter.textContent = `${fields.bio.value.length} / 300`;
    }

    function populateForm(pet, ownerName, likeCount) {
        fields.name.value = pet.name || "";
        fields.type.value = pet.type || "Other";
        fields.breed.value = pet.breed || "";
        fields.age.value = pet.age ?? "";
        fields.country.value = pet.country || "";
        fields.city.value = pet.city || "";
        fields.latitude.value = pet.latitude ?? "";
        fields.longitude.value = pet.longitude ?? "";
        locationPicker?.setValue?.({
            country: pet.country,
            city: pet.city,
            latitude: pet.latitude,
            longitude: pet.longitude
        });
        fields.owner.value = ownerName || currentUser.email?.split("@")[0] || "Member";
        fields.status.value = pet.is_memorial ? "memorial" : "new";
        fields.bio.value = pet.bio || "";
        preview.likes.textContent = Number(likeCount || 0);
        preview.followers.textContent = "0";
        preview.gifts.textContent = "0";
        if (pet.image_url) {
            preview.image.src = pet.image_url;
            preview.image.hidden = false;
            preview.placeholder.hidden = true;
        }
        updatePreview();
    }

    Object.values(fields).forEach(field => {
        if (!field || field === fields.image) return;
        field.addEventListener("input", updatePreview);
        field.addEventListener("change", updatePreview);
    });

    fields.image.addEventListener("change", () => {
        clearErrors();
        const file = fields.image.files?.[0];
        if (!file) {
            if (selectedImageObjectUrl) URL.revokeObjectURL(selectedImageObjectUrl);
            selectedImageObjectUrl = "";
            preview.image.src = currentPet?.image_url || "";
            preview.image.hidden = !currentPet?.image_url;
            preview.placeholder.hidden = Boolean(currentPet?.image_url);
            return;
        }
        if (!validateImage(file)) {
            fields.image.value = "";
            return;
        }
        if (selectedImageObjectUrl) URL.revokeObjectURL(selectedImageObjectUrl);
        selectedImageObjectUrl = URL.createObjectURL(file);
        preview.image.src = selectedImageObjectUrl;
        preview.image.hidden = false;
        preview.placeholder.hidden = true;
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        hideMessage();
        if (!validateForm()) {
            showMessage("error", "Please correct the highlighted fields.");
            return;
        }

        const client = window.ThePetGridSupabase?.client;
        if (!client || !currentUser || !currentPet) return;

        setSaving(true);
        let uploaded = null;
        try {
            const newFile = fields.image.files?.[0] || null;
            let imageUrl = currentPet.image_url || null;
            if (newFile) {
                uploaded = await uploadNewImage(client, newFile);
                imageUrl = uploaded.publicUrl;
            }

            const updates = {
                name: fields.name.value.trim(),
                type: fields.type.value,
                breed: fields.breed.value.trim() || null,
                age: parseAge(fields.age.value),
                country: fields.country.value.trim(),
                city: fields.city.value.trim() || null,
                latitude: fields.latitude.value ? Number(fields.latitude.value) : null,
                longitude: fields.longitude.value ? Number(fields.longitude.value) : null,
                bio: fields.bio.value.trim(),
                image_url: imageUrl,
                is_memorial: fields.status.value === "memorial"
            };

            const { data, error } = await client
                .from("pets")
                .update(updates)
                .eq("id", currentPet.id)
                .eq("owner_id", currentUser.id)
                .select()
                .single();

            if (error) throw error;

            if (uploaded) {
                const oldPath = getStoragePathFromUrl(currentPet.image_url);
                if (oldPath && oldPath !== uploaded.path) {
                    const { error: removeError } = await client.storage.from(PET_IMAGE_BUCKET).remove([oldPath]);
                    if (removeError) console.warn("Old image could not be removed:", removeError);
                }
            }

            currentPet = data;
            fields.image.value = "";
            showMessage("success", "Pet profile updated successfully.");
            setTimeout(() => {
                window.location.href = `pet.html?id=${encodeURIComponent(currentPet.id)}`;
            }, 700);
        } catch (error) {
            console.error("Edit pet failed:", error);
            if (uploaded?.path) {
                await client.storage.from(PET_IMAGE_BUCKET).remove([uploaded.path]);
            }
            showMessage("error", error.message || "The pet could not be updated.");
        } finally {
            setSaving(false);
        }
    });

    try {
        if (!petId) {
            showErrorState("No pet ID was provided.");
            return;
        }
        if (window.ThePetGridAuth?.ready) await window.ThePetGridAuth.ready;
        currentUser = window.ThePetGridAuth?.getCurrentUser?.() || null;
        if (!currentUser?.id) {
            window.location.replace(`login.html?returnTo=${encodeURIComponent(`edit-pet.html?id=${petId}`)}`);
            return;
        }
        const client = window.ThePetGridSupabase?.client;
        if (!client) throw new Error("Supabase client is not available.");

        const { data, error } = await client
            .from("pets")
            .select("*, profiles:owner_id(username), pet_likes(count)")
            .eq("id", petId)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            showErrorState("This pet does not exist or has been removed.");
            return;
        }
        if (data.owner_id !== currentUser.id) {
            showErrorState("You do not have permission to edit this pet.");
            return;
        }

        currentPet = data;
        populateForm(data, data.profiles?.username, data.pet_likes?.[0]?.count);
        showContentState();
    } catch (error) {
        console.error("Could not load edit page:", error);
        showErrorState(error.message || "The pet could not be loaded.");
    }
});
