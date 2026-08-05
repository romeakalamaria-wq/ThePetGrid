(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  const ui = {
    boot: $("#worldBoot"),
    bootProgress: $("#bootProgress"),
    bootStatus: $("#bootStatus"),
    app: $("#worldExperience"),

    stage: $("#globeStage"),
    starCanvas: $("#starCanvas"),
    fallback: $("#globeFallback"),

    petCount: $("#worldPetCount"),
    countryCount: $("#worldCountryCount"),
    cityCount: $("#worldCityCount"),
    activePlace: $("#activePlace"),

    explore: $("#exploreWorld"),
    reset: $("#returnHome"),
    motion: $("#toggleMotion"),
    lite: $("#toggleLite"),
    sound: $("#toggleSound"),

    toast: $("#worldToast"),
    quality: $("#qualityBadge"),
    fps: $("#fpsReadout"),
    clock: $("#worldClock"),

    liveSignal: $("#liveSignal"),
    liveSignalText: $("#liveSignalText"),

    modes: [
      ...document.querySelectorAll(
        "[data-world-mode]"
      )
    ]
  };


  const DEMO_PETS = [
    {
      name: "Luna",
      city: "Athens",
      country: "Greece",
      latitude: 37.9838,
      longitude: 23.7275,
      type: "Dog"
    },
    {
      name: "Milo",
      city: "Rome",
      country: "Italy",
      latitude: 41.9028,
      longitude: 12.4964,
      type: "Cat"
    },
    {
      name: "Yuki",
      city: "Tokyo",
      country: "Japan",
      latitude: 35.6762,
      longitude: 139.6503,
      type: "Dog"
    },
    {
      name: "Coco",
      city: "Sydney",
      country: "Australia",
      latitude: -33.8688,
      longitude: 151.2093,
      type: "Bird"
    },
    {
      name: "Bella",
      city: "New York",
      country: "USA",
      latitude: 40.7128,
      longitude: -74.006,
      type: "Cat"
    },
    {
      name: "Max",
      city: "London",
      country: "United Kingdom",
      latitude: 51.5072,
      longitude: -0.1276,
      type: "Dog"
    },
    {
      name: "Nala",
      city: "Cape Town",
      country: "South Africa",
      latitude: -33.9249,
      longitude: 18.4241,
      type: "Cat"
    },
    {
      name: "Rio",
      city: "São Paulo",
      country: "Brazil",
      latitude: -23.5505,
      longitude: -46.6333,
      type: "Dog"
    },
    {
      name: "Kiko",
      city: "Manila",
      country: "Philippines",
      latitude: 14.5995,
      longitude: 120.9842,
      type: "Dog"
    },
    {
      name: "Leo",
      city: "Paris",
      country: "France",
      latitude: 48.8566,
      longitude: 2.3522,
      type: "Cat"
    },
    {
      name: "Olive",
      city: "Toronto",
      country: "Canada",
      latitude: 43.6532,
      longitude: -79.3832,
      type: "Rabbit"
    },
    {
      name: "Simba",
      city: "Dubai",
      country: "UAE",
      latitude: 25.2048,
      longitude: 55.2708,
      type: "Cat"
    }
  ];


  const state = {
    globe: null,
    pets: [],

    rotating: true,
    lite: false,
    sound: false,

    stars: [],
    mode: "all",
    quality: "high",

    clouds: null,
    sun: null,

    realtime: null,
    frameSamples: [],

    pulseTimer: null,
    clockTimer: null,
    audio: null
  };


  const sleep = (milliseconds) =>
    new Promise((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });


  const escapeHtml = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character])
    );


  function setBoot(percent, text) {
    if (ui.bootProgress) {
      ui.bootProgress.style.width = `${percent}%`;
    }

    if (ui.bootStatus) {
      ui.bootStatus.textContent = text;
    }
  }


  function toast(message) {
    if (!ui.toast) {
      return;
    }

    ui.toast.textContent = message;
    ui.toast.hidden = false;

    window.clearTimeout(toast.timer);

    toast.timer = window.setTimeout(() => {
      ui.toast.hidden = true;
    }, 2400);
  }


  function countUp(element, target) {
    if (!element) {
      return;
    }

    const currentText = String(
      element.textContent || ""
    );

    const start =
      Number(currentText.replace(/\D/g, "")) || 0;

    const begin = performance.now();
    const duration = 900;

    const tick = (now) => {
      const progress = Math.min(
        1,
        (now - begin) / duration
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      const value = Math.round(
        start + (target - start) * eased
      );

      element.textContent =
        value.toLocaleString("en-GB");

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    };

    window.requestAnimationFrame(tick);
  }


  function detectQuality() {
    const cores =
      navigator.hardwareConcurrency || 4;

    const memory =
      navigator.deviceMemory || 4;

    const pixels =
      window.innerWidth *
      window.innerHeight *
      (window.devicePixelRatio || 1);

    if (
      cores <= 2 ||
      memory <= 2 ||
      pixels > 7_000_000
    ) {
      return "lite";
    }

    if (
      cores >= 8 &&
      memory >= 8 &&
      pixels < 5_000_000
    ) {
      return "ultra";
    }

    return "high";
  }


  function setQuality(level, announce = false) {
    state.quality = level;
    state.lite = level === "lite";

    if (ui.app) {
      ui.app.dataset.quality = level;

      ui.app.classList.toggle(
        "is-lite",
        state.lite
      );
    }

    if (ui.quality) {
      ui.quality.textContent =
        level.toUpperCase();
    }

    if (state.globe) {
      state.globe
        .pointRadius(
          state.lite
            ? 0.2
            : level === "ultra"
              ? 0.38
              : 0.32
        )
        .showAtmosphere(!state.lite);
    }

    if (state.clouds) {
      state.clouds.visible =
        !state.lite;
    }

    if (announce) {
      const name =
        level.charAt(0).toUpperCase() +
        level.slice(1);

      toast(`${name} rendering enabled`);
    }
  }


  function initStars() {
    if (!ui.starCanvas) {
      return;
    }

    const canvas = ui.starCanvas;

    const context = canvas.getContext(
      "2d",
      {
        alpha: true
      }
    );

    if (!context) {
      return;
    }

    const resize = () => {
      const deviceScale = Math.min(
        window.devicePixelRatio || 1,
        state.lite ? 1 : 1.6
      );

      canvas.width =
        window.innerWidth * deviceScale;

      canvas.height =
        window.innerHeight * deviceScale;

      canvas.style.width =
        `${window.innerWidth}px`;

      canvas.style.height =
        `${window.innerHeight}px`;

      context.setTransform(
        deviceScale,
        0,
        0,
        deviceScale,
        0,
        0
      );

      const base =
        state.lite
          ? 70
          : state.quality === "ultra"
            ? 360
            : 240;

      const amount = Math.min(
        base,
        Math.round(
          window.innerWidth *
          window.innerHeight /
          4700
        )
      );

      state.stars = Array.from(
        {
          length: amount
        },
        () => ({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          radius: Math.random() * 1.35 + 0.12,
          alpha: Math.random() * 0.65 + 0.18,
          speed: Math.random() * 0.045 + 0.008,
          phase: Math.random() * Math.PI * 2
        })
      );
    };


    const draw = (time = 0) => {
      context.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
      );

      state.stars.forEach((star) => {
        const alpha = Math.max(
          0.08,
          Math.min(
            0.95,
            star.alpha +
            Math.sin(
              time *
              0.001 *
              star.speed *
              60 +
              star.phase
            ) *
            0.2
          )
        );

        context.beginPath();

        context.arc(
          star.x,
          star.y,
          star.radius,
          0,
          Math.PI * 2
        );

        context.fillStyle =
          `rgba(190, 218, 255, ${alpha})`;

        context.fill();
      });

      window.requestAnimationFrame(draw);
    };


    resize();

    window.addEventListener(
      "resize",
      resize,
      {
        passive: true
      }
    );

    draw();
  }


  async function loadPets() {
    const client =
      window.ThePetGridSupabase?.client;

    if (!client) {
      console.info(
        "World Experience: Supabase client unavailable. Using demonstration points."
      );

      return DEMO_PETS;
    }

    try {
      const {
        data,
        error
      } = await client
        .from("pets")
        .select(`
          id,
          name,
          type,
          city,
          country,
          latitude,
          longitude,
          image_url,
          created_at
        `)
        .not(
          "latitude",
          "is",
          null
        )
        .not(
          "longitude",
          "is",
          null
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(2500);

      if (error) {
        throw error;
      }

      const pets = (data || [])
        .map((pet) => ({
          ...pet,

          latitude:
            Number(pet.latitude),

          longitude:
            Number(pet.longitude),

          is_lost: false,
          is_memorial: false
        }))
        .filter((pet) =>
          Number.isFinite(pet.latitude) &&
          Number.isFinite(pet.longitude)
        );

      if (pets.length > 0) {
        return pets;
      }

      console.info(
        "World Experience: no pets with coordinates found. Using demonstration points."
      );

      return DEMO_PETS;
    } catch (error) {
      console.warn(
        "World Experience: using demonstration points.",
        error
      );

      return DEMO_PETS;
    }
  }


  function pointColor(point) {
    if (state.mode === "lost") {
      return point.is_lost
        ? "#ff526e"
        : "rgba(255, 82, 110, 0.035)";
    }

    if (state.mode === "memorial") {
      return point.is_memorial
        ? "#f1efff"
        : "rgba(231, 232, 255, 0.035)";
    }

    const palette = {
      Dog: "#68e8ff",
      dog: "#68e8ff",

      Cat: "#a77cff",
      cat: "#a77cff",

      Bird: "#ffc85d",
      bird: "#ffc85d",

      Rabbit: "#72ffb0",
      rabbit: "#72ffb0"
    };

    return (
      palette[point.type] ||
      "#ffffff"
    );
  }


  function pointAltitude(point) {
    if (point.is_lost) {
      return 0.2;
    }

    if (point.is_memorial) {
      return 0.16;
    }

    return 0.095;
  }


  function updateModeAtmosphere(mode) {
    if (!ui.app) {
      return;
    }

    ui.app.classList.toggle(
      "is-lost",
      mode === "lost"
    );

    ui.app.classList.toggle(
      "is-memorial",
      mode === "memorial"
    );

    if (state.globe) {
      state.globe.atmosphereColor(
        mode === "lost"
          ? "#ff526e"
          : mode === "memorial"
            ? "#b6b7ff"
            : "#5bc8ff"
      );
    }
  }


  function applyMode(mode) {
    state.mode = mode;

    ui.modes.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.worldMode === mode
      );
    });

    updateModeAtmosphere(mode);

    if (state.globe) {
      state.globe
        .pointColor(pointColor)
        .pointAltitude(pointAltitude)
        .pointsTransitionDuration(850);
    }

    const messages = {
      all: "The whole living world",
      pets: "Every light is a pet",
      lost: "Lost Pet Signal mode",
      memorial: "Memorial starlight mode"
    };

    toast(messages[mode]);
  }


  function buildCloudLayer(world) {
    if (
      !window.THREE ||
      state.lite
    ) {
      return;
    }

    const texture =
      new window.THREE.TextureLoader()
        .load(
          "https://unpkg.com/three-globe/example/img/earth-clouds.png"
        );

    const segments =
      state.quality === "ultra"
        ? 96
        : 64;

    const geometry =
      new window.THREE.SphereGeometry(
        100.55,
        segments,
        segments
      );

    const material =
      new window.THREE.MeshPhongMaterial({
        map: texture,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        blending:
          window.THREE.AdditiveBlending
      });

    const clouds =
      new window.THREE.Mesh(
        geometry,
        material
      );

    clouds.renderOrder = 2;

    world.scene().add(clouds);

    state.clouds = clouds;
  }


  function buildLighting(world) {
    if (!window.THREE) {
      return;
    }

    const material =
      world.globeMaterial();

    material.bumpScale = 8;
    material.shininess = 4;

    material.specular =
      new window.THREE.Color(
        "#2b4f75"
      );

    world
      .scene()
      .children
      .filter((object) => object.isLight)
      .forEach((light) => {
        if (
          light.type === "AmbientLight"
        ) {
          light.intensity = 0.62;
        }
      });

    const sun =
      new window.THREE.DirectionalLight(
        0xffffff,
        2.15
      );

    sun.position.set(
      -180,
      80,
      120
    );

    world.scene().add(sun);

    state.sun = sun;

    const rim =
      new window.THREE.DirectionalLight(
        0x5bc8ff,
        0.72
      );

    rim.position.set(
      140,
      -40,
      -120
    );

    world.scene().add(rim);
  }


  function animatePlanet() {
    const tick = () => {
      if (
        state.clouds &&
        state.rotating &&
        !state.lite
      ) {
        state.clouds.rotation.y += 0.00023;
      }

      if (state.sun) {
        const dayAngle =
          Date.now() /
          86400000 *
          Math.PI *
          2;

        state.sun.position.set(
          Math.cos(dayAngle) * 220,
          60,
          Math.sin(dayAngle) * 220
        );
      }

      window.requestAnimationFrame(tick);
    };

    tick();
  }


  function supportsWebGL() {
    try {
      const canvas =
        document.createElement("canvas");

      return Boolean(
        window.WebGLRenderingContext &&
        (
          canvas.getContext("webgl") ||
          canvas.getContext(
            "experimental-webgl"
          )
        )
      );
    } catch (error) {
      return false;
    }
  }


  function makeGlobe() {
    if (
      typeof window.Globe !== "function"
    ) {
      throw new Error(
        "Globe.GL library did not load."
      );
    }

    if (!supportsWebGL()) {
      throw new Error(
        "WebGL is not available in this browser."
      );
    }

    const world =
      window.Globe()(ui.stage)
        .width(window.innerWidth)
        .height(window.innerHeight)
        .backgroundColor(
          "rgba(0, 0, 0, 0)"
        )
        .globeImageUrl(
          "https://unpkg.com/three-globe/example/img/earth-night.jpg"
        )
        .bumpImageUrl(
          "https://unpkg.com/three-globe/example/img/earth-topology.png"
        )
        .showAtmosphere(true)
        .atmosphereColor("#5bc8ff")
        .atmosphereAltitude(0.21)
        .pointsData(state.pets)
        .pointLat("latitude")
        .pointLng("longitude")
        .pointColor(pointColor)
        .pointAltitude(pointAltitude)
        .pointRadius(
          state.lite
            ? 0.2
            : state.quality === "ultra"
              ? 0.38
              : 0.32
        )
        .pointsMerge(false)
        .pointsTransitionDuration(900)
        .pointLabel((point) => `
          <div
            style="
              padding: 10px 12px;
              background: rgba(3, 9, 24, 0.94);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 14px;
              font-family: system-ui, sans-serif;
              box-shadow: 0 18px 55px rgba(0, 0, 0, 0.42);
            "
          >
            <b>
              ${escapeHtml(point.name || "Pet")}
            </b>

            <br>

            <span style="color: #9fb3d8;">
              ${escapeHtml(
                [
                  point.city,
                  point.country
                ]
                  .filter(Boolean)
                  .join(", ")
              )}
            </span>
          </div>
        `)
        .onPointClick((point) => {
          world.pointOfView(
            {
              lat: Number(point.latitude),
              lng: Number(point.longitude),
              altitude: 0.72
            },
            1350
          );

          toast(
            `${point.name || "A pet"} · ` +
            `${point.city || point.country || "ThePetGrid"}`
          );

          playTone(
            520,
            0.08
          );
        })
        .onGlobeClick(
          ({
            lat,
            lng
          }) => {
            world.pointOfView(
              {
                lat,
                lng,
                altitude: 1.38
              },
              1050
            );
          }
        );


    const controls =
      world.controls();

    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.29;
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.minDistance = 118;
    controls.maxDistance = 430;


    world.pointOfView(
      {
        lat: 18,
        lng: 18,
        altitude: 2.25
      },
      0
    );


    state.globe = world;


    buildLighting(world);
    buildCloudLayer(world);
    animatePlanet();


    window.addEventListener(
      "resize",
      () => {
        world
          .width(window.innerWidth)
          .height(window.innerHeight);
      },
      {
        passive: true
      }
    );
  }


  function updateStats() {
    const countries = new Set(
      state.pets
        .map((pet) => pet.country)
        .filter(Boolean)
    );

    const cities = new Set(
      state.pets
        .map((pet) =>
          `${pet.city || ""}|${pet.country || ""}`
        )
        .filter(
          (value) =>
            !value.startsWith("|")
        )
    );

    countUp(
      ui.petCount,
      state.pets.length
    );

    countUp(
      ui.countryCount,
      countries.size
    );

    countUp(
      ui.cityCount,
      cities.size
    );

    const activeCities = [
      ...cities
    ]
      .slice(0, 3)
      .map((value) =>
        value.split("|")[0]
      )
      .filter(Boolean);

    if (
      activeCities.length &&
      ui.activePlace
    ) {
      ui.activePlace.textContent =
        activeCities.join(" · ");
    }
  }


  function updateClock() {
    if (!ui.clock) {
      return;
    }

    const time =
      new Intl.DateTimeFormat(
        "en-GB",
        {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
          hour12: false
        }
      ).format(new Date());

    ui.clock.textContent =
      `${time} UTC`;
  }


  function pulseRandomPet() {
    window.clearInterval(
      state.pulseTimer
    );

    state.pulseTimer =
      window.setInterval(() => {
        if (
          !state.pets.length ||
          document.hidden
        ) {
          return;
        }

        const pet =
          state.pets[
            Math.floor(
              Math.random() *
              state.pets.length
            )
          ];

        if (ui.liveSignalText) {
          ui.liveSignalText.textContent =
            `${pet.name || "A pet"} is glowing from ` +
            `${pet.city || pet.country || "the world"}`;
        }

        if (ui.liveSignal) {
          ui.liveSignal.hidden = false;
        }

        window.clearTimeout(
          pulseRandomPet.hide
        );

        pulseRandomPet.hide =
          window.setTimeout(() => {
            if (ui.liveSignal) {
              ui.liveSignal.hidden = true;
            }
          }, 4200);

      }, 8500);
  }


  function subscribeRealtime() {
    const client =
      window.ThePetGridSupabase?.client;

    if (!client?.channel) {
      return;
    }

    state.realtime =
      client
        .channel(
          "atlas-living-world"
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "pets"
          },
          (payload) => {
            const pet = payload.new;

            if (
              pet?.latitude == null ||
              pet?.longitude == null
            ) {
              return;
            }

            const normalizedPet = {
              ...pet,
              latitude:
                Number(pet.latitude),
              longitude:
                Number(pet.longitude),
              is_lost: false,
              is_memorial: false
            };

            if (
              !Number.isFinite(
                normalizedPet.latitude
              ) ||
              !Number.isFinite(
                normalizedPet.longitude
              )
            ) {
              return;
            }

            state.pets.unshift(
              normalizedPet
            );

            if (state.globe) {
              state.globe.pointsData(
                [...state.pets]
              );
            }

            updateStats();

            if (ui.liveSignalText) {
              ui.liveSignalText.textContent =
                `${pet.name || "A new pet"} joined from ` +
                `${pet.city || pet.country || "the world"}`;
            }

            if (ui.liveSignal) {
              ui.liveSignal.hidden = false;

              window.setTimeout(() => {
                ui.liveSignal.hidden = true;
              }, 6000);
            }

            playTone(
              660,
              0.12
            );
          }
        )
        .subscribe();
  }


  function monitorPerformance() {
    let frames = 0;
    let last = performance.now();

    const loop = (now) => {
      frames += 1;

      if (now - last >= 1000) {
        const fps = Math.round(
          frames *
          1000 /
          (now - last)
        );

        if (ui.fps) {
          ui.fps.textContent =
            `${fps} FPS`;
        }

        state.frameSamples.push(fps);

        if (
          state.frameSamples.length > 8
        ) {
          state.frameSamples.shift();
        }

        const average =
          state.frameSamples.reduce(
            (total, value) =>
              total + value,
            0
          ) /
          state.frameSamples.length;

        if (
          average < 32 &&
          state.quality !== "lite"
        ) {
          setQuality(
            "lite",
            true
          );
        } else if (
          average < 46 &&
          state.quality === "ultra"
        ) {
          setQuality(
            "high",
            true
          );
        }

        frames = 0;
        last = now;
      }

      window.requestAnimationFrame(loop);
    };

    window.requestAnimationFrame(loop);
  }


  function ensureAudio() {
    if (state.audio) {
      return state.audio;
    }

    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    state.audio =
      new AudioContextClass();

    return state.audio;
  }


  function playTone(
    frequency = 440,
    duration = 0.1
  ) {
    if (!state.sound) {
      return;
    }

    const context =
      ensureAudio();

    if (!context) {
      return;
    }

    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value =
      frequency;

    gain.gain.setValueAtTime(
      0.0001,
      context.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.035,
      context.currentTime + 0.015
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + duration
    );

    oscillator
      .connect(gain)
      .connect(context.destination);

    oscillator.start();

    oscillator.stop(
      context.currentTime +
      duration +
      0.02
    );
  }


  function bind() {
    ui.explore?.addEventListener(
      "click",
      () => {
        state.globe?.pointOfView(
          {
            lat: 20,
            lng: 12,
            altitude: 1.22
          },
          1800
        );

        playTone(
          420,
          0.16
        );
      }
    );


    ui.reset?.addEventListener(
      "click",
      () => {
        state.globe?.pointOfView(
          {
            lat: 18,
            lng: 18,
            altitude: 2.25
          },
          1400
        );
      }
    );


    ui.motion?.addEventListener(
      "click",
      () => {
        state.rotating =
          !state.rotating;

        if (state.globe) {
          state.globe
            .controls()
            .autoRotate =
              state.rotating;
        }

        ui.motion.setAttribute(
          "aria-pressed",
          String(!state.rotating)
        );

        ui.motion.textContent =
          state.rotating
            ? "Pause motion"
            : "Resume motion";
      }
    );


    ui.lite?.addEventListener(
      "click",
      () => {
        setQuality(
          state.lite
            ? "high"
            : "lite",
          true
        );

        ui.lite.setAttribute(
          "aria-pressed",
          String(state.lite)
        );

        ui.lite.textContent =
          state.lite
            ? "Full effects"
            : "Lite mode";
      }
    );


    ui.sound?.addEventListener(
      "click",
      () => {
        state.sound =
          !state.sound;

        ui.sound.setAttribute(
          "aria-pressed",
          String(state.sound)
        );

        ui.sound.textContent =
          state.sound
            ? "Sound on"
            : "Sound off";

        if (state.sound) {
          ensureAudio()?.resume();

          playTone(
            440,
            0.12
          );
        }

        toast(
          state.sound
            ? "Ambient interaction sound enabled"
            : "Sound disabled"
        );
      }
    );


    ui.modes.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          applyMode(
            button.dataset.worldMode
          );
        }
      );
    });
  }


  function showFallback(error) {
    console.error(
      "ThePetGrid World Experience:",
      error
    );

    if (ui.app) {
      ui.app.hidden = false;
    }

    if (ui.fallback) {
      ui.fallback.hidden = false;
    }

    if (ui.boot) {
      ui.boot.classList.add(
        "is-leaving"
      );
    }
  }


  async function init() {
    try {
      setBoot(
        12,
        "Calibrating Atlas Engine…"
      );

      state.quality =
        detectQuality();

      setQuality(
        state.quality
      );

      initStars();

      await sleep(300);


      setBoot(
        34,
        "Igniting the sun…"
      );

      await sleep(250);


      setBoot(
        52,
        "Finding living stories…"
      );

      state.pets =
        await loadPets();

      await sleep(220);


      setBoot(
        72,
        "Forming clouds and atmosphere…"
      );

      makeGlobe();
      updateStats();
      updateClock();

      state.clockTimer =
        window.setInterval(
          updateClock,
          30000
        );

      bind();
      subscribeRealtime();
      pulseRandomPet();
      monitorPerformance();

      await sleep(650);


      setBoot(
        100,
        "The planet is alive."
      );

      if (ui.app) {
        ui.app.hidden = false;
      }

      await sleep(650);


      if (ui.boot) {
        ui.boot.classList.add(
          "is-leaving"
        );

        window.setTimeout(() => {
          ui.boot?.remove();
        }, 1100);
      }

    } catch (error) {
      showFallback(error);
    }
  }


  init();

})();