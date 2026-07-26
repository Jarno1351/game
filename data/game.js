// game.js
const allMiniGameItems = {
    school: [
        { id: "water", name: "Water Bottle", icon: "💧", imagePath: "assets/images/items/water.png", isCorrect: true },
        { id: "game", name: "Video Game", icon: "🎮", imagePath: "assets/images/items/game.png", isCorrect: false },
        { id: "flashlight", name: "Flashlight", icon: "🔦", imagePath: "assets/images/items/flashlight.png", isCorrect: true },
        { id: "radio", name: "Emergency Radio", icon: "📻", imagePath: "assets/images/items/radio.png", isCorrect: true },
        { id: "candy", name: "Chocolate Bar", icon: "🍫", imagePath: "assets/images/items/candy.png", isCorrect: false },
        { id: "toy", name: "Plush Toy", icon: "🧸", imagePath: "assets/images/items/toy.png", isCorrect: false }
    ],
    home: [
        { id: "powerbank", name: "Power Bank", icon: "🔋", imagePath: "assets/images/items/powerbank.png", isCorrect: true },
        { id: "docs", name: "Important Files", icon: "📂", imagePath: "assets/images/items/docs.png", isCorrect: true },
        { id: "canned", name: "Canned Food", icon: "🥫", imagePath: "assets/images/items/food.png", isCorrect: true },
        { id: "icecream", name: "Ice Cream", icon: "🍦", imagePath: "assets/images/items/icecream.png", isCorrect: false },
        { id: "laptop", name: "Gaming Laptop", icon: "💻", imagePath: "assets/images/items/laptop.png", isCorrect: false }
    ],
    aftermath: [
        { id: "cord", name: "Wet Broken Cord", icon: "🔌", imagePath: "assets/images/items/cord.png", isCorrect: true },
        { id: "wetfood", name: "Spoiled Wet Food", icon: "🍏", imagePath: "assets/images/items/wetfood.png", isCorrect: true },
        { id: "debris", name: "Sharp Glass Debris", icon: "⚠️", imagePath: "assets/images/items/debris.png", isCorrect: true },
        { id: "cleanmug", name: "Clean Dry Mug", icon: "🥛", imagePath: "assets/images/items/mug.png", isCorrect: false },
        { id: "pillow", name: "Dry Sofa Pillow", icon: "🛋️", imagePath: "assets/images/items/pillow.png", isCorrect: false }
    ]
};

let miniGameItems = allMiniGameItems.school;

let gameState = {
    currentId: "start",
    playerName: "", 
    score: 0,
    badges: [],
    selectedItems: [],
    inventory: [],
    hazardTries: 0,
    helpedLeo: false,
    ignoredLeo: false,
    madeEvacMistake: false
};

window.addEventListener("DOMContentLoaded", async () => {
    const loadingOverlay = document.getElementById("loading-overlay");
    const progressBar = document.getElementById("loading-progress-bar");
    const progressText = document.getElementById("loading-progress-text");

    try {
        // Trigger the AssetLoader and pass a callback to update our new UI
        await AssetLoader.preloadAll((percentage) => {
            if (progressBar) progressBar.style.width = `${percentage}%`;
            if (progressText) progressText.innerText = `${percentage}%`;
        });
    } catch (error) {
        // Graceful error capture just in case the promise chain breaks
        console.error("Critical error during preloading:", error);
    } finally {
        // Enforce a tiny visual delay at 100% so it feels complete before fading
        setTimeout(() => {
            if (loadingOverlay) {
                loadingOverlay.classList.add("hidden-fade");
                // Wait for the CSS fade transition to finish before initializing the game
                setTimeout(() => {
                    loadingOverlay.style.display = "none";
                    initGame();
                }, 500); 
            } else {
                initGame();
            }
        }, 300);
    }
});

function initGame(skipToStory = false) {
    if (!skipToStory) {
        gameState.playerName = "";
        showMainMenu();
        AudioManager.playMusic('mainMenu');
        return;
    }

    gameState.currentId = "start";
    gameState.score = 0;
    gameState.badges = [];
    gameState.selectedItems = [];
    gameState.inventory = [];
    gameState.hazardTries = 0;
    gameState.helpedLeo = false;
    gameState.ignoredLeo = false;
    gameState.madeEvacMistake = false;
    
    const slots = document.querySelectorAll(".badge-slot");
    slots.forEach(slot => {
        slot.innerText = "🔒";
        slot.classList.remove("unlocked");
    });
    document.getElementById("main-menu-overlay").classList.add("hidden");
    updateUI();
}

function advanceStory() {
    const currentNode = storyData[gameState.currentId];
    if (currentNode && currentNode.type === "story") {
        gameState.currentId = currentNode.nextId;
        updateUI();
    }
}

function handleChoice(choice) {
    gameState.score += choice.scoreModifier;
    if (gameState.score < 0) gameState.score = 0;
    if (choice.actionFlag === "helped_leo") gameState.helpedLeo = true;
    if (choice.actionFlag === "ignored_leo") gameState.ignoredLeo = true;
    if (choice.actionFlag === "evac_mistake") gameState.madeEvacMistake = true;

    if (choice.feedback) {
        const isPositive = choice.scoreModifier > 0;
        const titleText = isPositive ? "⭐ Safety Stars Earned!" : "⚠️ Safety Lesson";
        
        // Contextual modal sound triggers
        if (isPositive) {
            AudioManager.playSFX('modal_positive');
        } else {
            AudioManager.playSFX('modal_negative');
        }
        
        showFeedbackModal(titleText, choice.feedback, isPositive);
    }

    gameState.currentId = choice.nextId;

    if (gameState.currentId === "back_to_school_scene") {
        buildDynamicFinalChoices();
    }

    if (gameState.currentId === "victory_ending") {
        if (gameState.score >= 120) {
            storyData["victory_ending"].text = `🌟 PERFECT RUN!\nYour final score is ${gameState.score} Stars. You packed flawlessly, handled home hazards, protected your family, and shared resources with Leo.\nYou are a Certified Master Disaster Hero!`;
        } else {
            storyData["victory_ending"].text = `👍 SURVIVAL HERO!\nYour final score is ${gameState.score} Stars. You navigated the challenges, made it through safely, and contributed your experience back to the class.`;
        }
    }

    updateUI();
}

function submitPackChallenge() {
    const correctItems = gameState.selectedItems.filter(item => item.isCorrect);
    const wrongItems = gameState.selectedItems.filter(item => !item.isCorrect);
    
    let starBonus = correctItems.length * 10;
    gameState.score += starBonus;
    gameState.selectedItems.forEach(item => {
        if (!gameState.inventory.includes(item.id)) {
            gameState.inventory.push(item.id);
        }
    });
    
    let feedback = `🎒 Packing Results:\n\n`;
    if (correctItems.length > 0) {
        feedback += `✅ Safety Items: You picked ${correctItems.map(i => i.name).join(", ")}.\nThese are vital necessities for an emergency!\n\n`;
    }
    if (wrongItems.length > 0) {
        feedback += `❌ Unhelpful Items: You picked ${wrongItems.map(i => i.name).join(", ")}.\nDuring a flood, non-essential toys or melting food take up critical space and do not provide safety utility.\n\n`;
    }

    const isPerfectScore = (correctItems.length === 3 && wrongItems.length === 0);
    
    // Grid summary confirmation triggers
    if (isPerfectScore) {
        AudioManager.playSFX('modal_positive');
    } else {
        AudioManager.playSFX('modal_negative');
    }

    if (gameState.currentId === "backpack_game") {
        if (isPerfectScore) {
            feedback += "🏆 PERFECT BAG! You unlocked the Emergency Kit Expert badge!";
            unlockBadge("badge-kit", "Emergency Kit Expert");
        }
        gameState.currentId = "school_dismissal_scene";
    } else if (gameState.currentId === "home_kit_game") {
        if (isPerfectScore) {
            feedback += "🏆 PERFECT SHELF! You unlocked the Flood Safety Scout badge!";
            unlockBadge("badge-scout", "Flood Safety Scout");
        }
        gameState.currentId = "chapter2_nightfall";
    } else if (gameState.currentId === "hazard_game") {
        if (isPerfectScore) {
            feedback = "🏆 Flawless Sweep! You isolated the Wet Broken Cord, Spoiled Wet Food, and Sharp Glass Debris expertly.";
            unlockBadge("badge-helper", "Hazard Inspector");
        }
        gameState.currentId = "back_to_school_scene";
        buildDynamicFinalChoices();
    }

    showFeedbackModal("Challenge Complete!", feedback, isPerfectScore);
    gameState.selectedItems = []; 
    updateUI();
}

function buildDynamicFinalChoices() {
    const dynamicChoices = [];
    if (gameState.inventory.includes("flashlight") && gameState.inventory.includes("radio")) {
        dynamicChoices.push({
            text: "🔦 'Packing functional items like Flashlights and Radios means you will never be lost or uninformed in blackouts!'",
            nextId: "victory_ending",
            scoreModifier: 15,
            feedback: "Incredible reflection! Your classmates are writing down your item list."
        });
    }

    if (gameState.inventory.includes("canned") || gameState.inventory.includes("powerbank")) {
        dynamicChoices.push({
            text: "🥫 'Securing Canned Food and charged Power Banks ahead of time keeps our home completely resilient!'",
            nextId: "victory_ending",
            scoreModifier: 15,
            feedback: "Spot on! Real home preparation cuts out severe resource anxiety during blackouts."
        });
    }

    if (gameState.helpedLeo) {
        dynamicChoices.push({
            text: "🤝 'An emergency isn't just about yourself. Sharing tools with vulnerable friends keeps the entire community safe!'",
            nextId: "victory_ending",
            scoreModifier: 20,
            feedback: "Beautiful insight! Your teacher praises your empathy and leadership skills."
        });
    }

    if (!gameState.madeEvacMistake) {
        dynamicChoices.push({
            text: "⛰️ 'Moving early to higher structural levels completely nullifies the physical dangers of rushing current!'",
            nextId: "victory_ending",
            scoreModifier: 15,
            feedback: "Perfect! Tactical position mapping saves lives during rapid flash flooding."
        });
    }

    if (dynamicChoices.length === 0) {
        storyData["back_to_school_scene"].text = "A few days later, schools reopen. Everyone gathers in a circle to share their safety insights. When the teacher looks at you, you realize your careless, selfish choices left you with absolutely nothing meaningful to share...";
        storyData["back_to_school_scene"].choices = [
            {
                text: "😔 (Look down at your shoes) 'I didn't take the warnings seriously and had no tools or empathy to offer anyone.'",
                nextId: "bad_reflection_ending",
                scoreModifier: 0,
                feedback: "A tough but painful realization. Failing to prepare and look out for others isolates you completely when hard times hit."
            }
        ];
    } else {
        if (dynamicChoices.length < 3) {
            dynamicChoices.push({
                text: "📢 'Always maintain strict attention and follow safety plans assigned by emergency staff or parents.'",
                nextId: "victory_ending",
                scoreModifier: 10,
                feedback: "Correct! Structured discipline is the root pillar of safety execution."
            });
        }
        if (dynamicChoices.length < 3) {
            dynamicChoices.push({
                text: "🏡 'Inspecting your home for hazards like broken cords or debris after a flood stops bad secondary accidents.'",
                nextId: "victory_ending",
                scoreModifier: 10,
                feedback: "Excellent! Recognizing structural aftermath dangers keeps recovery clean and secure."
            });
        }

        storyData["back_to_school_scene"].text = "A few days later, schools reopen! Everyone gathers in a circle to share what they learned during the flood event. What lesson does your experience reflect?";
        storyData["back_to_school_scene"].choices = dynamicChoices;
    }
}

function unlockBadge(domId, badgeName) {
    if (!gameState.badges.includes(badgeName)) {
        gameState.badges.push(badgeName);
        const slot = document.getElementById(domId);
        if (slot) {
            slot.innerText = "🏅";
            slot.classList.add("unlocked");
            slot.setAttribute("title", badgeName);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("modal-close-btn").addEventListener("click", () => {
        document.getElementById("feedback-modal").classList.add("hidden");
    });

    document.getElementById("submit-grid-btn").onclick = () => {
        submitPackChallenge();
    };
});

