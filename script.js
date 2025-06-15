import { timePeriods } from './time-periods.js';

const passwordInput = document.getElementById('password-input');
const togglePassword = document.getElementById('toggle-password');
const strengthBar = document.getElementById('strength-bar');
const resultText = document.getElementById('result-text');
const timeToCrack = document.getElementById('time-to-crack');
const shareButton = document.getElementById('share-button');
const shareOptions = document.getElementById('share-options');

const critLength = document.getElementById('crit-length');
const critLower = document.getElementById('crit-lower');
const critUpper = document.getElementById('crit-upper');
const critNumber = document.getElementById('crit-number');
const critSymbol = document.getElementById('crit-symbol');

const guessesPerSecond = 10e9; // 10 billion guesses per second
const log10GuessesPerSecond = Math.log10(guessesPerSecond);

const charPools = {
    lower: 26,
    upper: 26,
    number: 10,
    symbol: 32, // Based on common symbols on a keyboard
};

togglePassword.addEventListener('click', () => {
    const isPasswordVisible = passwordInput.type === 'text';
    
    if (isPasswordVisible) {
        // Hide password
        passwordInput.type = 'password';
        togglePassword.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
        togglePassword.setAttribute('aria-label', 'Show password');
    } else {
        // Show password
        passwordInput.type = 'text';
        togglePassword.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>';
        togglePassword.setAttribute('aria-label', 'Hide password');
    }
});

passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    updateUI(password);
});

function calculateTimeToCrack(password) {
    if (!password) {
        return { log10_time: null, strength: 0 };
    }

    const length = password.length;
    
    // Advanced pattern detection
    const patterns = {
        hasLower: /[a-z]/.test(password),
        hasUpper: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSymbol: /[^a-zA-Z0-9]/.test(password),
        hasRepeating: /(.)\1{2,}/.test(password),
        hasSequential: checkSequential(password),
        hasCommonPatterns: checkCommonPatterns(password),
        hasDictionary: checkDictionaryWords(password)
    };

    // Calculate entropy more accurately
    let charset = 0;
    if (patterns.hasLower) charset += 26;
    if (patterns.hasUpper) charset += 26;
    if (patterns.hasNumber) charset += 10;
    if (patterns.hasSymbol) charset += 32;

    if (charset === 0) {
        return { log10_time: -Infinity, strength: 0 };
    }

    // Reduce effective length for patterns by applying only the most severe penalty.
    // This prevents harsh stacking of penalties that caused overly low scores.
    let penaltyFactor = 1.0;
    if (patterns.hasDictionary) {
        penaltyFactor = 0.4;
    } else if (patterns.hasCommonPatterns) {
        penaltyFactor = 0.5;
    } else if (patterns.hasSequential) {
        penaltyFactor = 0.6;
    } else if (patterns.hasRepeating) {
        penaltyFactor = 0.7;
    }
    
    let effectiveLength = Math.floor(length * penaltyFactor);

    // Don't let effective length drop below 1 for non-empty passwords.
    if (length > 0 && effectiveLength < 1) {
        effectiveLength = 1;
    }

    // Calculate log10 of time to crack to avoid BigInt overflow
    const log10_combinations = effectiveLength * Math.log10(charset);
    const log10_average_attempts = log10_combinations - Math.log10(2);
    
    const log10_seconds = log10_average_attempts - log10GuessesPerSecond;
    
    // Calculate strength percentage with a single, corresponding pattern penalty
    let strengthPenalty = 0;
    if (patterns.hasDictionary) {
        strengthPenalty = 30;
    } else if (patterns.hasCommonPatterns) {
        strengthPenalty = 25;
    } else if (patterns.hasSequential) {
        strengthPenalty = 20;
    } else if (patterns.hasRepeating) {
        strengthPenalty = 15;
    }

    let strength = Math.min(100, Math.max(0, 
        (effectiveLength * 8) + 
        (charset > 62 ? 20 : charset > 36 ? 10 : 0) -
        strengthPenalty
    ));

    return { log10_time: log10_seconds, strength };
}

function checkSequential(password) {
    const sequences = [
        'abcdefghijklmnopqrstuvwxyz',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        '0123456789',
        'qwertyuiop',
        'asdfghjkl',
        'zxcvbnm'
    ];
    
    for (const seq of sequences) {
        for (let i = 0; i <= seq.length - 3; i++) {
            if (password.includes(seq.substring(i, i + 3))) {
                return true;
            }
        }
    }
    return false;
}

function checkCommonPatterns(password) {
    const commonPatterns = [
        /123/,
        /abc/i,
        /password/i,
        /admin/i,
        /login/i,
        /user/i,
        /\d{4}/,
        /19\d{2}|20\d{2}/
    ];
    
    return commonPatterns.some(pattern => pattern.test(password));
}

function checkDictionaryWords(password) {
    const commonWords = [
        'password', 'admin', 'login', 'user', 'welcome', 'hello',
        'test', 'guest', 'root', 'administrator', 'pass', 'word',
        'love', 'money', 'home', 'work', 'life', 'time', 'year'
    ];
    
    const lowerPassword = password.toLowerCase();
    return commonWords.some(word => lowerPassword.includes(word));
}

function formatTime(log10_seconds) {
    if (log10_seconds === null || !isFinite(log10_seconds)) {
        return 'Enter a password to begin';
    }
    
    if (log10_seconds < 0) {
        return "Instantly";
    }

    for (const period of timePeriods) {
        if (log10_seconds >= period.log10s) {
            const count_log = log10_seconds - period.log10s;

            // Handle numbers that would overflow standard JS number type
            if (count_log > 308) {
                return `roughly 10^${Math.floor(count_log)} ${period.label}`;
            }
            
            const count = Math.pow(10, count_log);
            // Use toPrecision(3) for a nice adaptive formatting.
            // Wrap with Number() to trim trailing zeros (e.g., 1.20 -> 1.2)
            return `${Number(count.toPrecision(3))} ${period.label}`;
        }
    }
    
    return 'Instantly'; // Fallback
}

function updateUI(password) {
    const { log10_time, strength } = calculateTimeToCrack(password);

    // Update strength bar
    strengthBar.style.width = `${Math.min(Math.max(strength, 0), 100)}%`;
    if (strength < 20) strengthBar.style.backgroundColor = '#ff4136'; // Red
    else if (strength < 40) strengthBar.style.backgroundColor = '#ff851b'; // Orange
    else if (strength < 60) strengthBar.style.backgroundColor = '#ffdc00'; // Yellow
    else if (strength < 80) strengthBar.style.backgroundColor = '#a3d900'; // Light Green
    else strengthBar.style.backgroundColor = '#2ecc40'; // Strong Green

    // Update time to crack text
    timeToCrack.textContent = formatTime(log10_time);
    
    if (password.length === 0) {
        resultText.textContent = "Your password is...";
        timeToCrack.textContent = "Enter a password to begin";
        strengthBar.style.width = '0%';
        shareButton.disabled = true;
        shareButton.style.opacity = "0.5";
    } else if (strength < 40) {
        resultText.textContent = 'This password is very weak';
        shareButton.disabled = false;
        shareButton.style.opacity = "1";
    } else if (strength < 60) {
        resultText.textContent = 'This password is weak';
        shareButton.disabled = false;
        shareButton.style.opacity = "1";
    } else if (strength < 80) {
        resultText.textContent = 'This password is good';
        shareButton.disabled = false;
        shareButton.style.opacity = "1";
    } else {
        resultText.textContent = 'This password is very strong';
        shareButton.disabled = false;
        shareButton.style.opacity = "1";
    }
    
    // Update checklist
    updateChecklist(password);
}

function updateChecklist(password) {
    critLength.classList.toggle('met', password.length >= 8);
    critLower.classList.toggle('met', /[a-z]/.test(password));
    critUpper.classList.toggle('met', /[A-Z]/.test(password));
    critNumber.classList.toggle('met', /[0-9]/.test(password));
    critSymbol.classList.toggle('met', /[^a-zA-Z0-9]/.test(password));
}

// Initialize sharing functionality
function initializeSharing() {
    shareButton.addEventListener('click', () => {
        shareOptions.classList.toggle('hidden');
    });

    // Close share options when clicking outside
    document.addEventListener('click', (e) => {
        if (!shareButton.contains(e.target) && !shareOptions.contains(e.target)) {
            shareOptions.classList.add('hidden');
        }
    });

    // Handle share option clicks
    const shareOptionButtons = document.querySelectorAll('.share-option');
    shareOptionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const platform = button.getAttribute('data-platform');
            shareResult(platform);
        });
    });
}

function shareResult(platform) {
    try {
        // Get password input value and time to crack
        const password = passwordInput.value;
        const crackTime = timeToCrack.textContent;
        const strengthDescription = resultText.textContent;
        
        // Create share text with better formatting
        const shareText = `🔐 Password Strength Check Results\n\n${strengthDescription}!\n\n⏱️ Time to crack: ${crackTime}\n\n🛡️ Test your password security at:\nhttps://websim.com/@Not_available/password-strength-estimator\n\nStay safe online! 💪`;
        
        const encodedText = encodeURIComponent(shareText);
        const url = encodeURIComponent(window.location.href);
        
        // Define share URLs for different platforms
        const shareUrls = {
            whatsapp: `https://wa.me/?text=${encodedText}`,
            telegram: `https://t.me/share/url?url=${url}&text=${encodedText}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodedText}`,
            email: `mailto:?subject=Password%20Strength%20Check%20Results&body=${encodedText}`
        };
        
        // Handle sharing based on platform
        if (shareUrls[platform]) {
            // Open share URL in new window
            window.open(shareUrls[platform], '_blank');
        } else {
            throw new Error(`Unknown platform: ${platform}`);
        }
    } catch (error) {
        console.error("Sharing failed:", error);
        showToast('Sharing failed. Please try another method.');
    }
    
    // Hide share options after selecting
    shareOptions.classList.add('hidden');
}

function showToast(message) {
    // Create toast element if it doesn't exist
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    // Set message and show toast
    toast.textContent = message;
    toast.classList.add('visible');
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

// Close modal when pressing escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        shareOptions.classList.add('hidden');
    }
});

// Fix to prevent clicks inside share options from closing it
shareOptions.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Initialize sharing on page load
initializeSharing();

// Initial state
updateUI('');
// Set initial eye icon to show state (password hidden)
togglePassword.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
togglePassword.setAttribute('aria-label', 'Show password');