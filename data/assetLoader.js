// =============================================
// Asset Loader
// =============================================

const AssetLoader = (() => {

    const loadedImages = new Map();
    const loadedAudio = new Map();

    let totalAssets = 0;
    let loadedAssets = 0;

    function updateProgress(callback) {
        loadedAssets++;

        if (callback) {
            callback(
                Math.round((loadedAssets / totalAssets) * 100)
            );
        }
    }

    // -----------------------------------------
    // Collect every story image automatically
    // -----------------------------------------

    function collectStoryImages() {

        const images = new Set();

        if (typeof storyData !== "undefined") {

            Object.values(storyData).forEach(scene => {

                if (scene.imagePath)
                    images.add(scene.imagePath);

                if (scene.image)
                    images.add(scene.image);

                if (scene.background)
                    images.add(scene.background);

            });

        }

        return [...images];

    }

    // -----------------------------------------
    // Collect audio from AudioManager manifest
    // -----------------------------------------

    function collectAudio() {

        const audio = [];

        if (typeof AudioManager !== "undefined"
            && AudioManager.manifest) {

            Object.values(AudioManager.manifest).forEach(group => {

                if (typeof group === "string") {

                    audio.push(group);

                }

                else if (typeof group === "object") {

                    Object.values(group).forEach(value => {

                        if (typeof value === "string")
                            audio.push(value);

                    });

                }

            });

        }

        return audio;

    }

    // -----------------------------------------

    async function preloadAll(onProgress) {

        const imageList = collectStoryImages();
        const audioList = collectAudio();

        totalAssets =
            imageList.length +
            audioList.length;

        loadedAssets = 0;

        const promises = [];

        // Images

        imageList.forEach(src => {

            promises.push(new Promise(resolve => {

                const img = new Image();

                img.onload = () => {

                    loadedImages.set(src, img);

                    updateProgress(onProgress);

                    resolve();

                };

                img.onerror = () => {

                    console.warn("Image failed:", src);

                    updateProgress(onProgress);

                    resolve();

                };

                img.src = src;

            }));

        });

        // Audio

        audioList.forEach(src => {

            promises.push(new Promise(resolve => {

                const audio = new Audio();

                audio.preload = "auto";

                audio.oncanplaythrough = () => {

                    loadedAudio.set(src, audio);

                    updateProgress(onProgress);

                    resolve();

                };

                audio.onerror = () => {

                    console.warn("Audio failed:", src);

                    updateProgress(onProgress);

                    resolve();

                };

                audio.src = src;

            }));

        });

        await Promise.all(promises);

        await document.fonts.ready;

        console.log("✅ Assets Preloaded");

    }

    return {

        preloadAll,

        loadedImages,

        loadedAudio

    };

})();