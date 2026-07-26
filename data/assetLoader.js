const AssetLoader = (() => {
    const maxRetries = 3;
    const retryDelayMs = 1000;

    const loadedImages = new Map();
    const loadedAudio = new Map();

    const loadImage = async function(src, retriesLeft = maxRetries) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
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
    };

    const loadAudio = async function(src, retriesLeft = maxRetries) {
        return new Promise((resolve) => {
            const audio = new Audio();
            
            audio.oncanplaythrough = () => {
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

    // Updated to collect story, minigame items, and barricade SVGs
    function collectStoryImages() {
        const images = new Set();

        // A. Story Data Images
        if (typeof storyData !== "undefined") {
            Object.values(storyData).forEach(scene => {
                if (scene.imagePath) images.add(scene.imagePath);
                if (scene.image) images.add(scene.image);
                if (scene.background) images.add(scene.background);

                // Collect sandbag SVGs inside barricade puzzle nodes
                if (scene.availablePieces && Array.isArray(scene.availablePieces)) {
                    scene.availablePieces.forEach(piece => {
                        if (piece.imagePath) images.add(piece.imagePath);
                    });
                }
            });
        }

        // B. Minigame Items
        if (typeof allMiniGameItems !== "undefined") {
            Object.values(allMiniGameItems).forEach(category => {
                category.forEach(item => {
                    if (item.imagePath) images.add(item.imagePath);
                });
            });
        }

        // C. Standalone Default SVGs
        images.add('assets/images/svgs/sandbag_1.svg');

        return [...images];
    }

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

    async function preloadAll(onProgress) {
        const imageUrls = collectStoryImages(); 
        const audioUrls = collectAudio();
        
        let loadedCount = 0;
        const totalAssets = imageUrls.length + audioUrls.length;

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

    // Helper to fetch cached image element src
    function getImageSrc(src) {
        if (loadedImages.has(src)) {
            return loadedImages.get(src).src;
        }
        return src;
    }

    return {
        preloadAll,
        loadedImages,
        loadedAudio,
        getImageSrc
    };
})();