const AssetLoader = (() => {
    // 1. Module-scoped settings (using const, not object labels)
    const maxRetries = 3;
    const retryDelayMs = 1000;

    // 2. Asset storage maps
    const loadedImages = new Map();
    const loadedAudio = new Map();

    // 3. Resilient Image Loader (removed "this.")
    const loadImage = async function(src, retriesLeft = maxRetries) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                // Save to map so the game can access it later
                loadedImages.set(src, img);
                resolve(img);
            };
            
            img.onerror = () => {
                if (retriesLeft > 0) {
                    console.warn(`⚠️ Failed to load image: ${src}. Retrying... (${retriesLeft} attempts left)`);
                    setTimeout(() => {
                        loadImage(src, retriesLeft - 1).then(resolve);
                    }, retryDelayMs);
                } else {
                    console.error(`❌ Giving up on image: ${src} after maximum retries.`);
                    resolve(null); 
                }
            };
            
            img.src = src;
        });
    }; // Removed trailing comma

    // 4. Resilient Audio Loader (removed "this.")
    const loadAudio = async function(src, retriesLeft = maxRetries) {
        return new Promise((resolve) => {
            const audio = new Audio();
            
            audio.oncanplaythrough = () => {
                // Save to map so the game can access it later
                loadedAudio.set(src, audio);
                resolve(audio);
            };
            
            audio.onerror = () => {
                if (retriesLeft > 0) {
                    console.warn(`⚠️ Failed to load audio: ${src}. Retrying... (${retriesLeft} attempts left)`);
                    setTimeout(() => {
                        loadAudio(src, retriesLeft - 1).then(resolve);
                    }, retryDelayMs);
                } else {
                    console.error(`❌ Giving up on audio: ${src} after maximum retries.`);
                    resolve(null);
                }
            };
            
            audio.src = src;
            audio.load();
        });
    };

    // 5. Collect every story image automatically
    function collectStoryImages() {
        const images = new Set();
        if (typeof storyData !== "undefined") {
            Object.values(storyData).forEach(scene => {
                if (scene.imagePath) images.add(scene.imagePath);
                if (scene.image) images.add(scene.image);
                if (scene.background) images.add(scene.background);
            });
        }
        return [...images];
    }

    // 6. Collect audio from AudioManager manifest
    function collectAudio() {
        const audio = [];
        if (typeof AudioManager !== "undefined" && AudioManager.manifest) {
            Object.values(AudioManager.manifest).forEach(group => {
                if (typeof group === "string") {
                    audio.push(group);
                } else if (typeof group === "object") {
                    Object.values(group).forEach(value => {
                        if (typeof value === "string") audio.push(value);
                    });
                }
            });
        }
        return audio;
    }

    // 7. Preload All Assets
    async function preloadAll(onProgress) {
        // Connected the collectors directly instead of empty arrays
        const imageUrls = collectStoryImages(); 
        const audioUrls = collectAudio();
        
        let loadedCount = 0;
        const totalAssets = imageUrls.length + audioUrls.length;

        // Prevent division by zero if no assets exist
        if (totalAssets === 0) {
            if (onProgress) onProgress(100);
            return [];
        }

        const updateProgress = () => {
            loadedCount++;
            if (onProgress) {
                const percentage = Math.floor((loadedCount / totalAssets) * 100);
                onProgress(percentage);
            }
        };

        const imagePromises = imageUrls.map(url => 
            loadImage(url).then(result => {
                updateProgress();
                return { url, asset: result, type: 'image' };
            })
        );

        const audioPromises = audioUrls.map(url => 
            loadAudio(url).then(result => {
                updateProgress();
                return { url, asset: result, type: 'audio' };
            })
        );

        const allAssets = await Promise.all([...imagePromises, ...audioPromises]);
        return allAssets.filter(item => item.asset !== null);
    }

    return {
        preloadAll,
        loadedImages,
        loadedAudio
    };
})();