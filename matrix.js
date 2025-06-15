// The Matrix rain effect, created from scratch.
const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

let columns;
let drops;
const fontSize = 16;
// A string of characters to be used for the rain effect.
const characters = '开看看考客空快苦科控扣课库卡坤咳铠坎砍恳慷他她它题体天听头通图台推痛讨团套谈探1234567890';

// Function to set up the canvas and the initial state of the drops.
function setup() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    columns = Math.floor(canvas.width / fontSize);
    drops = [];
    for (let i = 0; i < columns; i++) {
        // Start each column at a random y-position for a more natural look.
        drops[i] = Math.floor(Math.random() * canvas.height / fontSize);
    }
}

// Debounce function to prevent too many resize events
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Function to draw each frame of the animation.
function draw() {
    // Use a semi-transparent background to create a fading trail effect for the characters.
    ctx.fillStyle = 'rgba(26, 26, 26, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0f0'; // Set the color of the characters to the theme's green.
    ctx.font = `${fontSize}px monospace`;

    // Loop through each column of drops.
    for (let i = 0; i < drops.length; i++) {
        // Pick a random character from the string.
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        // Draw the character at its current position.
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset the drop to the top if it goes off-screen, with a small random chance.
        // This makes the rain appear continuous and varied.
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        // Move the drop down for the next frame.
        drops[i]++;
    }
}

// The main animation loop.
function animate() {
    draw();
    requestAnimationFrame(animate);
}

// Add an event listener to re-run setup on window resize to make the effect responsive.
window.addEventListener('resize', debounce(setup, 200));

// Initial setup and start of the animation.
document.addEventListener('DOMContentLoaded', () => {
    setup();
    animate();
});