// ============================================
// LANDSCAPE ORIENTATION LOCK
// ============================================
function isMobileDevice() {
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}
// ==========================================
// BARRICADE PUZZLE UI METHODS (FIXED)
// ==========================================

// ==========================================
// BARRICADE PUZZLE UI METHODS (2D TETRIS UPGRADE)
// ==========================================

// ==========================================
// BARRICADE PUZZLE UI METHODS (SINGLE SVG OVERLAY FIX)
// ==========================================

function showBarricadePuzzle(node, onWin, onLose) {
    document.getElementById('choices-container').innerHTML = '';
    document.getElementById('interactive-grid-container').classList.add('hidden');
    document.getElementById('barricade-interactive-layer').classList.remove('hidden');
    document.getElementById('barricade-tray-container').classList.remove('hidden');

    const grid = document.getElementById('barricade-grid');
    const tray = document.getElementById('sandbag-supply-tray');
    const resetBtn = document.getElementById('btn-barricade-reset');

    let selectedBag = null;
    let placedCount = 0;
    const totalBags = node.availablePieces.length;
    const cols = node.gridCols || 3;
    const rows = node.gridRows || 3;
    const totalCells = cols * rows;
    
    let gridState = new Array(totalCells).fill(null);
    let placedPieces = []; // Tracks placed bags so we only draw 1 image per piece!

    // 1. Render Doorway Grid
    const renderGrid = () => {
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        
        // A. Render background clickable grid cells
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = `barricade-cell ${gridState[i] ? 'filled' : ''}`;
            
            // Explicit grid coordinates so overlays never push cells around
            const r = Math.floor(i / cols) + 1;
            const c = (i % cols) + 1;
            cell.style.gridRow = r;
            cell.style.gridColumn = c;
            
            cell.onclick = () => {
                if (!selectedBag || gridState[i]) return;
                
                const row = Math.floor(i / cols);
                const col = i % cols;
                
                let canPlace = true;
                let outOfBounds = false;

                for (const [rOffset, cOffset] of selectedBag.shape) {
                    const targetR = row + rOffset;
                    const targetC = col + cOffset;
                    
                    if (targetR < 0 || targetR >= rows || targetC < 0 || targetC >= cols) {
                        outOfBounds = true;
                        canPlace = false;
                        break;
                    }
                    
                    const targetIndex = targetR * cols + targetC;
                    if (gridState[targetIndex] !== null) {
                        canPlace = false;
                        break;
                    }
                }

                if (outOfBounds) {
                    showFeedbackModal("Out of Bounds!", "That shape doesn't fit within the doorway boundaries from this spot!", false);
                    return;
                }

                if (canPlace) {
                    for (const [rOffset, cOffset] of selectedBag.shape) {
                        const targetIndex = (row + rOffset) * cols + (col + cOffset);
                        gridState[targetIndex] = selectedBag.id;
                    }
                    
                    // Add to placed pieces list for single-SVG rendering
                    placedPieces.push({ bag: selectedBag, row: row, col: col });
                    
                    const bagEl = document.getElementById(`bag-${selectedBag.id}`);
                    if (bagEl) bagEl.classList.add('used');
                    
                    selectedBag = null;
                    placedCount++;
                    renderGrid();

                    if (placedCount === totalBags) {
                        setTimeout(() => {
                            hideBarricadePuzzle();
                            onWin();
                        }, 500);
                    }
                } else {
                    showFeedbackModal("Blocked!", "Another sandbag is already in the way there.", false);
                }
            };
            grid.appendChild(cell);
        }

        // B. Render ONE spanning SVG overlay for each placed piece!
        placedPieces.forEach(item => {
            let maxR = 0, maxC = 0;
            item.bag.shape.forEach(([dr, dc]) => {
                if (dr > maxR) maxR = dr;
                if (dc > maxC) maxC = dc;
            });
            const spanRows = maxR + 1;
            const spanCols = maxC + 1;

            const pieceEl = document.createElement('div');
            pieceEl.className = 'placed-piece-overlay';
            pieceEl.style.gridRow = `${item.row + 1} / span ${spanRows}`;
            pieceEl.style.gridColumn = `${item.col + 1} / span ${spanCols}`;
            
            const imgSrc = item.bag.imagePath || 'assets/images/svgs/sandbag_1.svg';
            pieceEl.innerHTML = `<img src="${imgSrc}" alt="${item.bag.name}" class="grid-sandbag-svg">`;
            grid.appendChild(pieceEl);
        });
    };

    // 2. Render Supply Tray
    const renderTray = () => {
        tray.innerHTML = '';
        node.availablePieces.forEach(bag => {
            const bagEl = document.createElement('div');
            bagEl.id = `bag-${bag.id}`;
            bagEl.className = 'sandbag-piece';
            
            bagEl.innerHTML = `
                <img src="${bag.imagePath || 'assets/images/svgs/sandbag_1.svg'}" alt="${bag.name}" class="sandbag-svg-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div class="emoji-fallback" style="display:none; font-size:1.5rem;">${bag.icon}</div>
                <h3>${bag.name}</h3>
            `;
            
            bagEl.onclick = () => {
                if (bagEl.classList.contains('used')) return;
                document.querySelectorAll('.sandbag-piece').forEach(el => el.classList.remove('selected'));
                bagEl.classList.add('selected');
                selectedBag = bag;
            };
            tray.appendChild(bagEl);
        });
    };

    resetBtn.onclick = () => {
        gridState = new Array(totalCells).fill(null);
        placedPieces = [];
        selectedBag = null;
        placedCount = 0;
        renderGrid();
        renderTray();
    };

    renderGrid();
    renderTray();
}

function hideBarricadePuzzle() {
    document.getElementById('barricade-interactive-layer').classList.add('hidden');
    document.getElementById('barricade-tray-container').classList.add('hidden');
}

function lockLandscape() {

    if (!isMobileDevice()) {
        hideRotatePrompt();
        return;
    }

    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
    }

    function updateOrientationUI() {

        if (!isMobileDevice()) {
            hideRotatePrompt();
            return;
        }

        const isPortrait =
            window.matchMedia("(orientation: portrait)").matches;

        if (isPortrait) {
            showRotatePrompt();
        } else {
            hideRotatePrompt();
        }
    }

    updateOrientationUI();

    window.addEventListener("orientationchange", updateOrientationUI);
    window.addEventListener("resize", updateOrientationUI);
}


function showRotatePrompt() {
  let prompt = document.getElementById('rotate-prompt');
  if (!prompt) {
    prompt = document.createElement('div');
    prompt.id = 'rotate-prompt';
    prompt.innerHTML = `
      <div style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: #0d1b2a; z-index: 99999; display: flex;
        flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: sans-serif; text-align: center; padding: 20px;
      ">
        <div style="font-size: 4rem; margin-bottom: 20px;">📱↪️</div>
        <h2 style="margin: 0 0 10px 0;">Please Rotate Your Device</h2>
        <p style="margin: 0; opacity: 0.8;">This game works best in landscape mode</p>
      </div>
    `;
    document.body.appendChild(prompt);
  }
  prompt.style.display = 'flex';
}

function hideRotatePrompt() {
  const prompt = document.getElementById('rotate-prompt');
  if (prompt) prompt.style.display = 'none';
}

// Lock on load and re-attempt on visibility changes and user interaction
document.addEventListener('DOMContentLoaded', () => {
  console.log('UI: DOMContentLoaded fired');
  lockLandscape();                     // initial attempt (may need user gesture)
});

// Re-attempt lock on any user interaction (touch, click, key press)
// Most mobile browsers require a gesture to unlock orientation.
['click', 'touchstart', 'keydown'].forEach(evt => {
  window.addEventListener(evt, lockLandscape, { passive: true });
});

// When the page becomes visible again (e.g., returning from app switcher)
// try to lock again – some browsers lose the lock when hidden.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) lockLandscape();
});

// Also listen for pageshow (covers back-button navigation etc.)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) lockLandscape();
});
// data/ui.js
const DIALOGUE_TYPING_SPEED = 18;
const ENABLE_DIALOGUE_ANIMATION = false; 

let dialogueAnimationTracker = {
    timerId: null,
    fullText: "",
    currentIdx: 0,
    isAnimating: false,
    onCompleteCallback: null
};

function updateUI() {
    console.log('UI: Simplified updateUI called');
    const currentNode = storyData[gameState.currentId];
    if (!currentNode) return;


    const artImage = document.getElementById("game-scene-art");
    const placeholder = document.getElementById("art-placeholder");

    if (currentNode.imagePath) {
        artImage.src = currentNode.imagePath;
        artImage.classList.remove("hidden");
        if (placeholder) placeholder.classList.add("hidden");

        artImage.onerror = () => {
            artImage.classList.add("hidden");
            if (placeholder) {
                placeholder.classList.remove("hidden");
                placeholder.innerText = `🎨 Art Panel: ${currentNode.imagePath}`;
            }
        };
    }

    document.getElementById("chapter-title").innerText = currentNode.title;
    document.getElementById("star-count").innerText = gameState.score;
    try {
        const storyTextEl = document.getElementById("story-text");
        console.log('UI: Found story-text element:', storyTextEl);
        if (storyTextEl) {
            storyTextEl.innerText = "TEST TEXT FROM TRY/CATCH";
            console.log('UI: Set story-text to:', storyTextEl.innerText);
        } else {
            console.log('UI: story-text element is null!');
        }
    } catch (e) {
        console.log('UI: Error setting story-text:', e);
    }

    const targetStoryTextEl = document.getElementById("story-text");
    const choicesContainer = document.getElementById("choices-container");
    const gridContainer = document.getElementById("interactive-grid-container");
    const hazardLayer = document.getElementById("hazard-interactive-layer");

    choicesContainer.innerHTML = "";
    choicesContainer.classList.add("hidden");
    gridContainer.classList.add("hidden");
    if (hazardLayer) hazardLayer.classList.add("hidden");
    document.getElementById("backpack-overlay-container").innerHTML = "";
    cancelActiveTypingAnimation();

    const postRevealAction = () => {
        if (currentNode.type === "story") {
            choicesContainer.classList.remove("hidden");
            const nextBtn = document.createElement("button");
            nextBtn.className = "choice-btn";
            nextBtn.innerText = "Next ▶";
            nextBtn.onclick = () => {
                AudioManager.playSFX('next');
                advanceStory();
            };
            choicesContainer.appendChild(nextBtn);
            return;
        }

        if (currentNode.type === "choice") {
            choicesContainer.classList.remove("hidden");
            currentNode.choices.forEach(choice => {
                const btn = document.createElement("button");
                btn.className = "choice-btn";
                btn.innerText = choice.text;

                if (choice.nextId === "start") {
                    btn.onclick = () => {
                        AudioManager.playSFX('back');
                        initGame();
                    };
                } else if (choice.requiredItem && !gameState.inventory.includes(choice.requiredItem)) {
                    btn.disabled = true;
                    btn.style.opacity = "0.4";
                    btn.style.cursor = "not-allowed";
                } else {
                    btn.onclick = () => {
                        AudioManager.playSFX('next');
                        handleChoice(choice);
                    };
                }

                choicesContainer.appendChild(btn);
            });
            return;
        }
        if (currentNode.type === "barricade_puzzle") {
            startBarricadeChallenge(currentNode);
            return;
        }
        if (currentNode.type === "minigame") {
            if (gameState.currentId === "hazard_game") {
                hazardLayer.classList.remove("hidden");
                setupHazardPlayground();
            } else {
                if (gameState.currentId === "home_kit_game") {
                    miniGameItems = allMiniGameItems.home;
                    document.querySelector(".grid-instructions").innerText = "🏡 Click 3 items to secure your home:";
                } else {
                    miniGameItems = allMiniGameItems.school;
                    document.querySelector(".grid-instructions").innerText = "🎒 Click 3 items to pack your bag:";
                }
                gridContainer.classList.remove("hidden");
                setupItemsGrid();
            }
            return;
        }

        if (currentNode.type === "task") {
            choicesContainer.classList.remove("hidden");
            if (typeof renderTaskUI === 'function') renderTaskUI();
            else renderTaskCompleteButton();
            return;
        }
    };



    if (ENABLE_DIALOGUE_ANIMATION && (currentNode.type === "story" || currentNode.type === "choice" || currentNode.type === "minigame" || currentNode.type === "task")) {
        console.log('UI: If branch, starting typewriter for text:', currentNode.text);
        triggerDialogueTypewriter(targetStoryTextEl, currentNode.text, postRevealAction);
    } else {
        console.log('UI: Else branch, setting story-text to:', "ELSE_BRANCH_TEST");
        targetStoryTextEl.innerText = currentNode.text;
        console.log('UI: After setting, element text is:', targetStoryTextEl.innerText);
        postRevealAction();
    }
}


function triggerDialogueTypewriter(element, textString, callback) {

    cancelActiveTypingAnimation();

    // Expose for VoiceOverManager hook (defined in voiceOverManager.js)
    // Must be attached to window so voiceOverManager can detect it.
    window.triggerDialogueTypewriter = triggerDialogueTypewriter;
    dialogueAnimationTracker.fullText = textString;
    dialogueAnimationTracker.currentIdx = 0;
    dialogueAnimationTracker.isAnimating = true;
    dialogueAnimationTracker.onCompleteCallback = callback;
    element.innerHTML = "";
    
    function typeNextCharacter() {
        if (!dialogueAnimationTracker.isAnimating) return;
        if (dialogueAnimationTracker.currentIdx <= dialogueAnimationTracker.fullText.length) {
            const revealedChunk = dialogueAnimationTracker.fullText.substring(0, dialogueAnimationTracker.currentIdx);
            const hiddenChunk = dialogueAnimationTracker.fullText.substring(dialogueAnimationTracker.currentIdx);
            element.innerHTML = `${escapeHTMLSymbols(revealedChunk)}<span style="opacity: 0; user-select: none;">${escapeHTMLSymbols(hiddenChunk)}</span>`;
            
            dialogueAnimationTracker.currentIdx++;
            dialogueAnimationTracker.timerId = setTimeout(typeNextCharacter, DIALOGUE_TYPING_SPEED);
        } else {
            finalizeDialogueReveal(element);
        }
    }

    typeNextCharacter();
}

function finalizeDialogueReveal(element) {
    if (!dialogueAnimationTracker.isAnimating) return;
    
    cancelActiveTypingAnimation();
    element.innerHTML = escapeHTMLSymbols(dialogueAnimationTracker.fullText);
    
    if (dialogueAnimationTracker.onCompleteCallback) {
        dialogueAnimationTracker.onCompleteCallback();
        dialogueAnimationTracker.onCompleteCallback = null;
    }
}

function skipActiveDialogueReveal() {
    // Expose for VoiceOverManager hook/debug (safe no-op)

    const textEl = document.getElementById("story-text");
    if (dialogueAnimationTracker.isAnimating && textEl) {
        finalizeDialogueReveal(textEl);
        return true;
    }
    return false;
}

function cancelActiveTypingAnimation() {
    if (dialogueAnimationTracker.timerId) {
        clearTimeout(dialogueAnimationTracker.timerId);
        dialogueAnimationTracker.timerId = null;
    }
    dialogueAnimationTracker.isAnimating = false;
}

function escapeHTMLSymbols(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.addEventListener("DOMContentLoaded", () => {
    const textFrameBox = document.getElementById("action-panel") || document.getElementById("story-container");
    if (textFrameBox) {
        textFrameBox.addEventListener("click", (e) => {
            if (e.target.classList.contains("choice-btn") || e.target.closest("#interactive-grid-container") || e.target.closest("#hazard-interactive-layer")) return;
            skipActiveDialogueReveal();
        });
    }

    window.addEventListener("keydown", (event) => {
        if (event.key === " " || event.key === "Enter") {
            const didSkip = skipActiveDialogueReveal();
            if (didSkip) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }, true);
});

function setupItemsGrid() {
    const grid = document.getElementById("items-grid");
    grid.innerHTML = "";
    miniGameItems.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "grid-item";
        
        if (gameState.selectedItems.some(i => i.id === item.id)) {
            itemDiv.classList.add("selected");
        }
        
        itemDiv.innerHTML = `
            <img src="${item.imagePath}" onerror="this.style.display='none';" alt="${item.name}">
            <div class="emoji-fallback" style="font-size:1.6rem;">${item.icon}</div>
            <h3>${item.name}</h3>
        `;
        
        itemDiv.addEventListener("click", () => {
            AudioManager.playSFX('next');
            const index = gameState.selectedItems.findIndex(i => i.id === item.id);
            if (index > -1) {
                 gameState.selectedItems.splice(index, 1);
            } else {
                if (gameState.selectedItems.length >= 3) return;
                gameState.selectedItems.push(item);
            }
            
            setupItemsGrid(); 
            updateGridUI();
        });
        
        grid.appendChild(itemDiv);
    });
    
    updateGridUI();
}

function updateGridUI() {
    document.getElementById("packed-count").innerText = gameState.selectedItems.length;
    const submitBtn = document.getElementById("submit-grid-btn");
    if (gameState.selectedItems.length === 3) {
        submitBtn.removeAttribute("disabled");
        submitBtn.style.opacity = "1";
    } else {
        submitBtn.setAttribute("disabled", "true");
        submitBtn.style.opacity = "0.5";
    }

    const artOverlay = document.getElementById("backpack-overlay-container");
    artOverlay.innerHTML = "";
    gameState.selectedItems.forEach(item => {
        const itemSticker = document.createElement("div");
        itemSticker.className = "overlay-packed-item";
        itemSticker.innerText = item.icon;
        artOverlay.appendChild(itemSticker);
    });
}

function renderTaskUI() {
    const node = storyData[gameState.currentId];

    // Generic fallback
    if (!node || !node.taskType) {
        renderTaskCompleteButton();
        return;
    }

    if (node.taskType === 'quick_tap') {
        renderQuickTapTask(node);
        return;
    }

    // TODO: implement more task types
    renderTaskCompleteButton();
}

function renderQuickTapTask(node) {
    // node.tapGoal (default 5)
    const goal = node.tapGoal || 5;
    const remaining = { count: goal };

    const choicesContainer = document.getElementById("choices-container");
    if (!choicesContainer) return;
    choicesContainer.innerHTML = "";

    const counterWrap = document.createElement('div');
    counterWrap.style.fontWeight = 'bold';
    counterWrap.style.color = 'var(--accent-color)';
    counterWrap.style.marginBottom = '10px';
    counterWrap.innerText = `Tap ${goal} times!`;

    const tapBtn = document.createElement('button');
    tapBtn.className = 'choice-btn primary-hero-btn';
    tapBtn.innerText = '👉 Tap!';

    const progressLine = document.createElement('div');
    progressLine.style.marginTop = '8px';
    progressLine.style.fontWeight = 'bold';
    progressLine.style.color = '#c8e0ff';
    progressLine.innerText = `Remaining: ${goal}`;

    const update = () => {
        progressLine.innerText = `Remaining: ${remaining.count}`;
        if (remaining.count <= 0) {
            choicesContainer.innerHTML = '';
            if (node.scoreModifier) {
                gameState.score += node.scoreModifier;
                if (gameState.score < 0) gameState.score = 0;
            }
            // auto-advance
            const doneBtn = document.createElement('button');
            doneBtn.className = 'choice-btn primary-hero-btn';
            doneBtn.innerText = '✅ Great job!';
            doneBtn.onclick = () => {
                AudioManager.playSFX('next');
                if (node.nextId) {
                    gameState.currentId = node.nextId;
                    updateUI();
                } else {
                    advanceStory();
                }
            };
            choicesContainer.appendChild(doneBtn);
        }
    };

    tapBtn.onclick = () => {
        if (remaining.count <= 0) return;
        remaining.count -= 1;
        AudioManager.playSFX('next');
        update();
    };

    choicesContainer.appendChild(counterWrap);
    choicesContainer.appendChild(tapBtn);
    choicesContainer.appendChild(progressLine);
} 


function renderTaskCompleteButton() {
    const choicesContainer = document.getElementById("choices-container");
    if (!choicesContainer) return;
    choicesContainer.innerHTML = "";

    const btn = document.createElement("button");
    btn.className = "choice-btn primary-hero-btn";
    btn.innerText = "✅ Complete Task";
    btn.onclick = () => {
        AudioManager.playSFX('next');
        const node = storyData[gameState.currentId];
        if (node && node.nextId) {
            gameState.currentId = node.nextId;
            updateUI();
        } else {
            advanceStory();
        }
    };
    choicesContainer.appendChild(btn);
}

function setupHazardPlayground() {
    const hazardLayer = document.getElementById("hazard-interactive-layer");
    hazardLayer.innerHTML = "";
    if (gameState.selectedItems.length === 0 && !hazardLayer.dataset.listening) {
        gameState.hazardTries = 0;
        hazardLayer.dataset.listening = "true";
        hazardLayer.addEventListener("click", (e) => {
            if (e.target.classList.contains("hazard-hitbox")) return;
            
            gameState.hazardTries++;
            AudioManager.playSFX('back');
            
            if (gameState.hazardTries >= 5) {
                delete hazardLayer.dataset.listening;
                gameState.selectedItems = [];
                gameState.currentId = "hazard_failure_scene";
                
                // Triggers structural failure prompt
                AudioManager.playSFX('modal_negative');
                showFeedbackModal("Too Many Mistakes!", "You ran out of inspection attempts! Walking blindly around storm damage can result in accidents.", false);
                updateUI();
            } else {
                 showFeedbackModal("Careful!", `That spot is safe, but keep looking! Attempts left: ${5 - gameState.hazardTries}`, false);
            }
        });
    }

    const hazards = allMiniGameItems.aftermath.filter(item => item.isCorrect);
    const coordinates = {
        "cord":   { top: 52, left: 0, width: 32, height: 32 },
        "wetfood": { top: 64, left: 44, width: 44, height: 12},
        "debris":  { top: 72, left: 73, width: 35, height: 20 }
    };
    hazards.forEach(hazard => {
        const coord = coordinates[hazard.id];
        if (!coord) return;

        const hitbox = document.createElement("button");
        hitbox.className = "hazard-hitbox";
        hitbox.style.top = coord.top + "%";
        hitbox.style.left = coord.left + "%";
        hitbox.style.width = coord.width + "%";
        hitbox.style.height = coord.height + "%";

        const alreadyFound = gameState.selectedItems.some(item => item.id === hazard.id);
        if (alreadyFound) {
            drawVisualFeedback(hazardLayer, coord, hazard.name);
            hitbox.style.pointerEvents = "none";
        }

        hitbox.addEventListener("click", (e) => {
            e.stopPropagation(); 
            AudioManager.playSFX('next');
            gameState.selectedItems.push(hazard);
            hitbox.style.pointerEvents = "none";

            drawVisualFeedback(hazardLayer, coord, hazard.name);
            if (gameState.selectedItems.length === 3) {
                delete hazardLayer.dataset.listening;
                setTimeout(() => {
                    submitPackChallenge();
                }, 1400);
            }
        });

        hazardLayer.appendChild(hitbox);
    });
}

function drawVisualFeedback(parent, coord, hazardName) {
    const centerLeft = (coord.left + (coord.width / 2)) + "%";
    const centerTop = (coord.top + (coord.height / 2)) + "%";

    const circle = document.createElement("div");
    circle.className = "hazard-paint-circle";
    circle.style.left = centerLeft;
    circle.style.top = centerTop;
    circle.style.width = coord.width + "%"; 
    circle.style.height = coord.width + "%";
    const label = document.createElement("div");
    label.className = "hazard-pop-label";
    label.style.left = centerLeft;
    label.style.top = centerTop;
    label.innerText = "⚠️ " + hazardName;

    parent.appendChild(circle);
    parent.appendChild(label);
}

function positionStoryContainer() {
    const storyEl = document.getElementById("story-container");
    const actionEl = document.getElementById("action-panel");
    const isHazardScene = gameState.currentId === "hazard_game";
    const isBarracadeScene = gameState.currentId === "basement_barricade_game";

    if (isBarracadeScene) {
        storyEl.style.bottom = "";
        console.log("HI this is barracade")
        storyEl.classList.add("story-top-mode");
   
        let timeLeft = 3;

        const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            storyEl.classList.add("action-panel--hidden");
            clearInterval(timer)
        } }, 1000); 

    } else {
        storyEl.classList.remove("action-panel--hidden");
        storyEl.classList.remove("story-top-mode");
        storyEl.style.top = "";
        const actionHeight = actionEl.offsetHeight;
        const spacing = window.innerWidth <= 768 ? 4 : 12;
        storyEl.style.bottom = (actionHeight + spacing) + "px";
    }

    if (isHazardScene) {
        // Task 2: hide action panel, push story to top
        actionEl.classList.add("action-panel--hidden");
        storyEl.classList.add("story-top-mode");
        storyEl.style.bottom = "";
        if (window.matchMedia("(max-height: 600px)").matches) {
            let timeLeft = 5;

            const timer = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                storyEl.classList.add("action-panel--hidden");
                console.log("HI")
                clearInterval(timer)
            } }, 1000); 
        }
    } else {
        // Task 1: restore action panel, position story just above it
        actionEl.classList.remove("action-panel--hidden");
        storyEl.classList.remove("action-panel--hidden");
        storyEl.classList.remove("story-top-mode");
        storyEl.style.top = "";
        const actionHeight = actionEl.offsetHeight;
        const spacing = window.innerWidth <= 768 ? 4 : 12;
        storyEl.style.bottom = (actionHeight + spacing) + "px";
    }
}

function showFeedbackModal(title, text, isPositive) {
    const modal = document.getElementById("feedback-modal");
    document.getElementById("modal-title").innerText = title;
    document.getElementById("modal-text").innerText = text;
    document.getElementById("modal-icon").innerText = isPositive ? "⭐" : "⚠️";
    document.getElementById("modal-title").style.color = isPositive ? "var(--safe-green)" : "var(--danger-red)";
    modal.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("modal-close-btn").addEventListener("click", () => {
        AudioManager.playSFX('back');
        document.getElementById("feedback-modal").classList.add("hidden");
    });
});

function showMainMenu() {
    document.getElementById("main-menu-overlay").classList.remove("hidden");
    document.getElementById("leaderboard-view").classList.add("hidden");
    document.getElementById("menu-home-screen").classList.remove("hidden");
}

function openLeaderboard() {
    document.getElementById("menu-home-screen").classList.add("hidden");
    const container = document.getElementById("leaderboard-view");
    container.classList.remove("hidden");

    const listElement = document.getElementById("leaderboard-rows");
    listElement.innerHTML = "";

    const entries = LeaderboardSystem.getEntries();
    if (entries.length === 0) {
        listElement.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">No heroes logged today yet. Be the first! 🌟</td></tr>`;
        return;
    }

    entries.forEach((entry, index) => {
        const row = document.createElement("tr");
        const formattedDate = new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${entry.name}</strong></td>
            <td>⭐ ${entry.score}</td>
            <td>${formattedDate}</td>
        `;
        listElement.appendChild(row);
    });
}

function handlePlayClick() {
    const inputElement = document.getElementById("hero-name-input");
    const errorBubble = document.getElementById("name-validation-error");
    
    inputElement.value = "";
    errorBubble.classList.add("hidden");

    document.getElementById("menu-home-screen").classList.add("hidden");
    document.getElementById("leaderboard-view").classList.add("hidden");
    const nameModal = document.getElementById("name-prompt-modal");
    nameModal.classList.remove("hidden");
    
    setTimeout(() => inputElement.focus(), 50);
}

function dismissNameModal() {
    document.getElementById("name-prompt-modal").classList.add("hidden");
    document.getElementById("menu-home-screen").classList.remove("hidden");
}

function validateAndSubmitName() {
    const inputElement = document.getElementById("hero-name-input");
    const errorBubble = document.getElementById("name-validation-error");
    
    const sanitizedName = inputElement.value.trim();
    if (!sanitizedName) {
        AudioManager.playSFX('back');
        errorBubble.classList.remove("hidden");
        errorBubble.style.animation = 'none';
        errorBubble.offsetHeight;
        errorBubble.style.animation = '';
        inputElement.focus();
        return;
    }

    gameState.playerName = sanitizedName;
    document.getElementById("name-prompt-modal").classList.add("hidden");
    AudioManager.playMusic('gameplay');
    initGame(true);
}

const originalUpdateUI = updateUI;
updateUI = function() {
    originalUpdateUI();
    
    const currentId = gameState.currentId;
    const choicesContainer = document.getElementById("choices-container");
    const isVictory = (currentId === "victory_ending" || currentId === "bad_reflection_ending");
    const isGameOver = (currentId === "bad_ending_summary" || currentId === "hazard_failure_scene");
    
    if (isVictory || isGameOver) {
        const clearAndRenderButtons = () => {
            choicesContainer.innerHTML = "";
            if (isGameOver) {
                // Immediate music pause followed by dedicated melancholy melody loop
                AudioManager.stopMusic(false); 
                AudioManager.playSFX('gameover');

                const retryBtn = document.createElement("button");
                retryBtn.className = "choice-btn";
                retryBtn.innerText = "Try Again (Choose Safely!)";
                retryBtn.onclick = () => {
                    AudioManager.playSFX('next');
                    AudioManager.playMusic('gameplay');
                    initGame(true);
                };
                choicesContainer.appendChild(retryBtn);
            } else if (isVictory) {
                AudioManager.playSFX('victory');
                const qualified = LeaderboardSystem.qualifiesForTop20(gameState.score);
                const extraMsg = qualified 
                    ? "\n\n🎉 Congratulations! You made it into today's Top 20 Flood Safety Heroes!" 
                    : "";
                if (gameState.score >= 120) {
                    document.getElementById("story-text").innerText = `🌟 PERFECT RUN!\nYour final score is ${gameState.score} Stars.\nYou packed flawlessly, handled home hazards, protected your family, and shared resources with Leo.\nYou are a Certified Master Disaster Hero!${extraMsg}`;
                } else {
                    document.getElementById("story-text").innerText = `👍 SURVIVAL HERO!\nYour final score is ${gameState.score} Stars.\nYou navigated the challenges, made it through safely, and contributed your experience back to the class.${extraMsg}`;
                }

                const nodeChoices = storyData[currentId].choices || [];
                nodeChoices.forEach(choice => {
                    const btn = document.createElement("button");
                    btn.className = "choice-btn";
                    btn.innerText = choice.text;
                    btn.onclick = () => {
                        AudioManager.playSFX('next');
                        if (choice.nextId === "start") {
                            AudioManager.playMusic('gameplay');
                            initGame(true);
                        } else {
                            handleChoice(choice);
                        }
                     };
                    choicesContainer.appendChild(btn);
                });
            }

            const mainMenuBtn = document.createElement("button");
            mainMenuBtn.className = "choice-btn menu-return-btn";
            mainMenuBtn.innerText = "🏠 Return to Main Menu";
            mainMenuBtn.onclick = () => {
                AudioManager.playSFX('back');
                AudioManager.playMusic('mainMenu');
                if (typeof LeaderboardSystem !== 'undefined') {
                    LeaderboardSystem.submitScore(gameState.playerName, gameState.score);
                }
                initGame(false); 
            };
            choicesContainer.appendChild(mainMenuBtn);
            choicesContainer.classList.remove("hidden");
        };

        if (dialogueAnimationTracker.isAnimating) {
            dialogueAnimationTracker.onCompleteCallback = clearAndRenderButtons;
        } else {
            clearAndRenderButtons();
        }
    }

    positionStoryContainer();
};


document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-menu-play").onclick = () => {
        AudioManager.playSFX('next');
        handlePlayClick();
    };
    document.getElementById("btn-menu-leaderboard").onclick = () => {
        AudioManager.playSFX('next');
        openLeaderboard();
    };
    document.getElementById("btn-menu-back").onclick = () => {
        AudioManager.playSFX('back');
        showMainMenu();
    };
    document.getElementById("btn-modal-start").onclick = () => {
        AudioManager.playSFX('next');
        validateAndSubmitName();
    };
    document.getElementById("btn-modal-cancel").onclick = () => {
        AudioManager.playSFX('back');
        dismissNameModal();
    };
    document.getElementById("name-prompt-modal").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            AudioManager.playSFX('next');
            validateAndSubmitName();
        } else if (event.key === "Escape") {
            event.preventDefault();
            AudioManager.playSFX('back');
            dismissNameModal();
        }
    });
    document.getElementById("submit-grid-btn").onclick = () => {
        submitPackChallenge();
    };

    // Main Menu top-right rounded corner audio toggle trigger
    const musicToggleBtn = document.getElementById("btn-toggle-music");
    if (musicToggleBtn) {
        musicToggleBtn.onclick = () => {
            AudioManager.playSFX('next');
            var stateCheck = AudioManager.toggleMuteMusic();
            
            if (musicToggleBtn.innerText.includes("Mute")) {
                musicToggleBtn.innerText = "🔊 Unmute Music";
            } else {
                musicToggleBtn.innerText = "🎵 Mute Music";
            }
        };
    }
    const actionPanelEl = document.getElementById("action-panel");
    if (actionPanelEl && window.ResizeObserver) {
        new ResizeObserver(() => positionStoryContainer()).observe(actionPanelEl);
    }
    // Layout consistency: removed the viewport-width-based override of
    // positionStoryContainer that caused Chrome to render a different layout
    // when window.innerWidth <= 768 (responsive/device emulation).
    // (The base positionStoryContainer() remains in effect.)
});  // <-- THIS CLOSES THE DOMContentLoaded EVENT LISTENER
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', {
    message,
    source,
    line: lineno,
    col: colno,
    error: error
  });
  return false;
};
