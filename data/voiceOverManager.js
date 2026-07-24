// ============================================
// VOICE OVER MANAGER - MOBILE OPTIMIZED
// ============================================

class VoiceOverManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.currentUtterance = null;
        this.isSpeaking = false;
        this.isEnabled = true;
        this.lastSpokenText = '';
        this.userInteracted = false;
        this.voicesLoaded = false;
        this.pendingText = null;
        this.voiceLoadAttempts = 0;
        this.maxVoiceLoadAttempts = 10;
        this._lastVoiceCount = 0;
        this._isTypingAnimationActive = false;

        this.characters = {
            narrator: { 
                rate: 0.82, pitch: 1.05, volume: 1.0, voice: null, color: '#4CAF50',
                preferredVoices: ['Google US English', 'Samantha', 'Karen', 'Microsoft Zira', 'Victoria', 'Google UK English Female']
            },
            teacher: { 
                rate: 0.88, pitch: 1.15, volume: 1.0, voice: null, color: '#e67e22',
                preferredVoices: ['Samantha', 'Karen', 'Victoria', 'Microsoft Zira', 'Google US English', 'Google UK English Female']
            },
            parent: { 
                rate: 0.85, pitch: 0.98, volume: 1.0, voice: null, color: '#3498db',
                preferredVoices: ['Alex', 'Google UK English Male', 'Daniel', 'Microsoft David', 'Google US English']
            },
            friend: { 
                rate: 0.95, pitch: 1.25, volume: 1.0, voice: null, color: '#9b59b6',
                preferredVoices: ['Karen', 'Zira', 'Samantha', 'Google UK English Female', 'Microsoft Zira']
            },
            emergency: { 
                rate: 0.78, pitch: 0.92, volume: 1.0, voice: null, color: '#e74c3c',
                preferredVoices: ['Alex', 'Microsoft David', 'Daniel', 'Google UK English Male', 'Google US English']
            }
        };

        this.currentCharacter = 'narrator';
        this.init();
    }

    init() {
        if (window.location.protocol === 'file:') {
            console.warn('⚠️ VOICE OVER DISABLED - Use a local server');
            this.isEnabled = false;
            return;
        }

        console.log('🎙️ Voice Over initializing...');

        if (!('speechSynthesis' in window)) {
            console.error('❌ Speech Synthesis NOT supported');
            this.isEnabled = false;
            return;
        }

        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.selectAllVoices();
        }

        this.selectAllVoices();
        setTimeout(() => this.selectAllVoices(), 500);
        setTimeout(() => this.selectAllVoices(), 1500);

        this.setupUserInteractionTracking();
        this.updateVoiceStatusUI();
    }

    setupUserInteractionTracking() {
        const unlockVoice = (e) => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                console.log('✅ VOICE UNLOCKED!');
                this.updateVoiceStatusUI();

                if (this.pendingText) {
                    const trySpeak = (attempts = 0) => {
                        if (this.voicesLoaded || attempts > 5) {
                            this.speak(this.pendingText.text, this.pendingText.character);
                            this.pendingText = null;
                        } else {
                            setTimeout(() => trySpeak(attempts + 1), 200);
                        }
                    };
                    trySpeak();
                }
            }
        };

        // Aggressive unlocking for mobile
        document.addEventListener('click', unlockVoice, { capture: true, passive: true });
        document.addEventListener('touchstart', unlockVoice, { capture: true, passive: true });
        document.addEventListener('touchend', unlockVoice, { capture: true, passive: true });
        document.addEventListener('keydown', unlockVoice, { capture: true, passive: true });

    }

    updateVoiceStatusUI() {
        const indicator = document.getElementById("voice-status-indicator");
        if (!indicator) return;
        
        indicator.classList.remove('locked', 'speaking', 'active');
        if (!this.isEnabled) {
            indicator.style.display = 'none';
            return;
        }
        
        indicator.style.display = 'none';
        indicator.classList.add('active');
        
        if (this.isSpeaking) {
            indicator.classList.add('speaking');
            indicator.innerHTML = '🔊 Speaking...';
        } else if (!this.userInteracted) {
            indicator.classList.add('locked');
            indicator.innerHTML = '🔒 Tap screen to enable voice';
        } else {
            indicator.innerHTML = '✅ Voice Ready';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 3000);
        }
    }

    onTypingStart(text = null, character = null) {
        this._isTypingAnimationActive = true;

        // Avoid duplicate speech triggers for the same text while typing.
        if (text) {
            const cleanText = this.cleanTextForSpeech(text);
            if (this.isSpeaking && cleanText === this.lastSpokenText) return;
        }

        // Cancel anything currently speaking so voice begins in sync with the new text.
        this.stop();

        // Start speaking immediately so it matches the moment text reveal begins.
        // If voice is locked, speak() will set pendingText (so we don't lose sync).
        if (text && text.length > 5) {
            this.speak(text, character);
        }
    }


    onTypingComplete(text, character) {
        // Typing complete no longer triggers speech; speech already started at reveal.
        this._isTypingAnimationActive = false;
    }



    selectAllVoices() {
        const voices = this.synth.getVoices();
        if (voices.length === 0) {
            this.voiceLoadAttempts++;
            if (this.voiceLoadAttempts < this.maxVoiceLoadAttempts) {
                setTimeout(() => this.selectAllVoices(), 300);
            }
            return;
        }

        if (this.voicesLoaded && this._lastVoiceCount === voices.length) return;
        this._lastVoiceCount = voices.length;
        this.voicesLoaded = true;
        this.voiceLoadAttempts = 0;
        console.log(`✅ ${voices.length} voices loaded`);

        for (const [charName, config] of Object.entries(this.characters)) {
            config.voice = this.findVoice(voices, config.preferredVoices);
        }
    }

    findVoice(voices, preferredNames) {
        if (!voices || voices.length === 0) return null;
        for (const name of preferredNames) {
            const found = voices.find(v => v.name === name);
            if (found) return found;
        }
        const englishVoice = voices.find(v => v.lang && v.lang.startsWith('en'));
        return englishVoice || voices[0] || null;
    }

    detectCharacter(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('teacher') || lowerText.includes('class') || lowerText.includes('principal') || lowerText.includes('lesson') || lowerText.includes('school')) return 'teacher';
        if (lowerText.includes('mom') || lowerText.includes('dad') || lowerText.includes('parents') || lowerText.includes('family') || lowerText.includes('honey')) return 'parent';
        if (lowerText.includes('leo') || lowerText.includes('friend') || lowerText.includes('classmate')) return 'friend';
        if (lowerText.includes('warning') || lowerText.includes('alert') || lowerText.includes('emergency') || lowerText.includes('danger')) return 'emergency';
        return 'narrator';
    }

    speak(text, character = null) {
        if (!this.isEnabled) return;
        if (!text || text.trim() === '') return;
        if (!this.synth) return;
        if (window.location.protocol === 'file:') return;

        // Mobile: show status
        this.updateVoiceStatusUI();

        if (!this.userInteracted) {
            console.log('⏳ Voice locked. Tap to unlock!');
            this.pendingText = { text, character };
            return;
        }

        if (this._isTypingAnimationActive) return;

        if (!character) character = this.detectCharacter(text);
        this.currentCharacter = character;

        const cleanText = this.cleanTextForSpeech(text);
        if (cleanText === this.lastSpokenText && this.isSpeaking) return;
        this.lastSpokenText = cleanText;

        this.stop();
        if (!cleanText) return;

        const charConfig = this.characters[character] || this.characters.narrator;
        if (!charConfig.voice && !this.voicesLoaded) this.selectAllVoices();

        console.log(`🎭 [${character.toUpperCase()}]: "${cleanText.substring(0, 60)}..."`);

        setTimeout(() => {
            if (!cleanText) return;
            this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
            if (charConfig.voice) this.currentUtterance.voice = charConfig.voice;
            this.currentUtterance.rate = charConfig.rate;
            this.currentUtterance.pitch = charConfig.pitch;
            this.currentUtterance.volume = charConfig.volume;

            this.currentUtterance.onstart = () => {
                this.isSpeaking = true;
                this.highlightText(true, charConfig.color);
                this.updateVoiceStatusUI();
            };
            this.currentUtterance.onend = () => {
                this.isSpeaking = false;
                this.highlightText(false);
                this.updateVoiceStatusUI();
            };
            this.currentUtterance.onerror = (e) => {
                console.error('Speech error:', e.error);
                this.isSpeaking = false;
                this.highlightText(false);
                this.updateVoiceStatusUI();
            };

            try {
                this.synth.speak(this.currentUtterance);
            } catch (err) {
                console.error('Speak failed:', err);
            }
        }, 50);
    }

    cleanTextForSpeech(text) {
        return text
            .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
            .replace(/\[.*?\]/g, '')
            .replace(/\(.*?\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    stop() {
        if (this.synth && this.synth.speaking) this.synth.cancel();
        this.isSpeaking = false;
    }

    toggle() {
        this.isEnabled = !this.isEnabled;
        if (!this.isEnabled) this.stop();
        return this.isEnabled;
    }

    readAgain() {
        this.userInteracted = true;
        this.updateVoiceStatusUI();
        const storyText = document.getElementById('story-text');
        if (storyText && storyText.textContent) {
            this.lastSpokenText = '';
            this.speak(storyText.textContent);
        }
    }

    highlightText(active, color = '#4CAF50') {
        const storyText = document.getElementById('story-text');
        if (storyText) {
            if (active) {
                storyText.style.color = color;
                storyText.style.fontWeight = 'bold';
                storyText.style.textShadow = `0 0 15px ${color}40`;
            } else {
                storyText.style.color = '';
                storyText.style.fontWeight = '';
                storyText.style.textShadow = '';
            }
        }
    }
}

const voiceOver = new VoiceOverManager();
window.voiceOver = voiceOver;

// ============================================
// UI INTEGRATION
// ============================================

function addReadStoryButton() {
    if (document.getElementById('read-story-fallback-btn')) return;
    const storyContainer = document.getElementById('story-container');
    if (!storyContainer) {
        setTimeout(addReadStoryButton, 500);
        return;
    }
    const btn = document.createElement('button');
    btn.id = 'read-story-fallback-btn';
    btn.innerHTML = '🔊 Read';
    btn.style.cssText = `
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:8px 14px;
        border:none;
        border-radius:20px;
        cursor:pointer;
        font-size:12px;
        font-weight:bold;
        background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
        color:white;
    `;
    btn.onclick = () => {
        voiceOver.userInteracted = true;
        voiceOver.updateVoiceStatusUI();
        voiceOver.readAgain();
    };
    let toolbar = storyContainer.querySelector(".story-toolbar");

    if (!toolbar) {
        toolbar = document.createElement("div");
        toolbar.className = "story-toolbar";

        // Place it at the very top of the story container
        storyContainer.prepend(toolbar);
    }

    // Put the Read button inside the toolbar
    toolbar.appendChild(btn);
}

function setupTextHooks() {
    // Disabled: MutationObserver-based speaking can race the typewriter animation and cause lag/desync.
    // Speech is now triggered directly from the typewriter start hook (hookTypingAnimation).
}


function hookUpdateUI() {
    // Disabled: updateUI-based delayed speaking can re-trigger speech and introduce drift.
    // Speech is now triggered directly from the typewriter start hook (hookTypingAnimation).
}


function hookTypingAnimation() {
    // Ensure voice hook is installed even if typewriter function was renamed/replaced.
    const maxAttempts = 80; // ~20 seconds at 250ms
    let attempts = 0;

    const installHook = () => {
        const candidate = window.triggerDialogueTypewriter || window.triggerDialogueTypewriter; // keep for clarity
        const typewriterFn = (typeof window.triggerDialogueTypewriter === 'function')
            ? window.triggerDialogueTypewriter
            : (typeof window.triggerDialogueTypewriterInternal === 'function' ? window.triggerDialogueTypewriterInternal : null);

        if (typeof typewriterFn === 'function') {
            // Avoid double-wrapping
            if (typewriterFn.__voiceOverWrapped) return true;

            const originalTrigger = typewriterFn;
            const wrapped = function(element, textString, callback) {
                voiceOver.onTypingStart(textString);
                const wrappedCallback = () => {
                    voiceOver.onTypingComplete(textString);
                    if (callback) callback();
                };
                return originalTrigger.call(this, element, textString, wrappedCallback);
            };
            wrapped.__voiceOverWrapped = true;

            // Put wrapped back on the expected global name
            window.triggerDialogueTypewriter = wrapped;

            // Also keep internal alias if anything else looks it up
            window.triggerDialogueTypewriterInternal = wrapped;

            console.log('✅ VoiceOver hooked into triggerDialogueTypewriter');
            return true;
        }
        return false;
    };

    const tryHook = () => {
        attempts++;
        const ok = installHook();
        if (ok) return;

        if (attempts < maxAttempts) {
            setTimeout(tryHook, 250);
        } else {
            console.warn('⚠️ VoiceOver could not hook triggerDialogueTypewriter (function not found)');
        }
    };

    tryHook();
}



function hookGameStart() {
    if (typeof initGame === 'function') {
        const originalInitGame = window.initGame;
        window.initGame = function(skipToStory = false) {
            const result = originalInitGame.apply(this, arguments);
            if (skipToStory) {
                voiceOver.userInteracted = true;
                voiceOver.updateVoiceStatusUI();
            }
            return result;
        };
    } else {
        setTimeout(hookGameStart, 500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addReadStoryButton, 400);
    setTimeout(setupTextHooks, 500);
    setTimeout(hookUpdateUI, 600);
    setTimeout(hookTypingAnimation, 700);
    setTimeout(hookGameStart, 800);
});