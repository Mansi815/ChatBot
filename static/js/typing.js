class TypingAnimator {
    constructor(options = {}) {
        this.defaultOptions = {
            speed: 10,          // Characters per second
            variance: 5,        // Random variance in speed
            punctuationPause: 2 // Extra time multiplier for punctuation
        };
        
        this.options = { ...this.defaultOptions, ...options };
    }
    
    /**
     * Animate typing text into an element
     * @param {HTMLElement} element - Element to insert text into
     * @param {string} text - Text to type
     * @param {Function} callback - Optional callback when complete
     */
    animateTyping(element, text, callback = null) {
        let index = 0;
        let content = '';
        
        // Clear the element first
        element.textContent = '';
        
        const type = () => {
            if (index < text.length) {
                // Get the next character
                const char = text.charAt(index);
                content += char;
                element.textContent = content;
                
                // Determine the delay for the next character
                let delay = this.calculateDelay(char);
                
                // Move to next character
                index++;
                
                // Schedule the next character
                setTimeout(type, delay);
            } else if (callback) {
                // Complete - call the callback if provided
                callback();
            }
        };
        
        // Start typing
        type();
    }
    
    /**
     * Calculate delay for a character based on punctuation and randomness
     * @param {string} char - The character to calculate delay for
     * @returns {number} - Delay in milliseconds
     */
    calculateDelay(char) {
        // Base delay is inverse of speed (characters per second)
        const baseDelay = 1000 / this.options.speed;
        
        // Add randomness
        const randomVariance = Math.random() * this.options.variance * 20 - this.options.variance * 10;
        
        // Check for punctuation
        const isPunctuation = ['.', ',', '!', '?', ';', ':'].includes(char);
        const punctuationMultiplier = isPunctuation ? this.options.punctuationPause : 1;
        
        // Calculate final delay
        return baseDelay * punctuationMultiplier + randomVariance;
    }
}