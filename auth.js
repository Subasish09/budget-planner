// Authentication & Privacy Lock Logic

const AUTH_CONFIG = {
    // Default PIN: 2502
    // Simple client-side check. For higher security, this should be server-side, 
    // but for a static site/privacy layer, this works as a deterrent.
    PIN: '2502',
    SESSION_KEY: 'budget_planner_auth_token'
};

class PrivacyLock {
    constructor() {
        this.isAuthenticated = false;
        this.overlay = null;
        this.input = null;
        this.errorMsg = null;

        // Initialize immediately on load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // Check session storage
        const sessionToken = sessionStorage.getItem(AUTH_CONFIG.SESSION_KEY);

        if (sessionToken === 'valid') {
            this.unlockContent();
        } else {
            this.lockContent();
            this.createOverlay();
        }
    }

    lockContent() {
        // Apply blur to main content wrapper or body elements
        // We exclude the auth overlay itself
        const bodyChildren = document.body.children;
        for (let i = 0; i < bodyChildren.length; i++) {
            const child = bodyChildren[i];
            if (child.id !== 'auth-overlay' && child.tagName !== 'SCRIPT') {
                child.classList.add('blurred-content');
            }
        }
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    unlockContent() {
        this.isAuthenticated = true;

        // Remove blur
        const blurredElements = document.querySelectorAll('.blurred-content');
        blurredElements.forEach(el => el.classList.remove('blurred-content'));

        // Remove overlay
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
            }, 300);
        }

        document.body.style.overflow = ''; // Restore scrolling

        // Set session
        sessionStorage.setItem(AUTH_CONFIG.SESSION_KEY, 'valid');
    }

    createOverlay() {
        if (document.getElementById('auth-overlay')) return;

        // Create container
        this.overlay = document.createElement('div');
        this.overlay.id = 'auth-overlay';

        // Inner HTML
        this.overlay.innerHTML = `
            <div class="auth-card">
                <div class="auth-icon">
                    <i class="fas fa-lock"></i>
                </div>
                <h2>Locked</h2>
                <p>Enter PIN to access your planner</p>
                
                <div class="pin-input-container">
                    <input type="password" id="auth-pin" maxlength="4" placeholder="0000" inputmode="numeric" />
                    <button id="auth-submit"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="auth-error" id="auth-error">Incorrect PIN</div>
                
                <div class="auth-footer">
                    <small><i class="fas fa-shield-alt"></i> Secure Session</small>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Elements
        this.input = document.getElementById('auth-pin');
        this.errorMsg = document.getElementById('auth-error');
        const submitBtn = document.getElementById('auth-submit');

        // Focus input
        setTimeout(() => this.input.focus(), 500);

        // Events
        submitBtn.addEventListener('click', () => this.validate());

        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.validate();
        });

        // Auto-submit on 4 chars
        this.input.addEventListener('input', (e) => {
            this.errorMsg.style.display = 'none';
            if (e.target.value.length === 4) {
                this.validate();
            }
        });
    }

    validate() {
        const value = this.input.value;
        if (value === AUTH_CONFIG.PIN) {
            this.unlockContent();
        } else {
            this.showError();
        }
    }

    showError() {
        this.errorMsg.style.display = 'block';
        this.input.value = '';
        this.input.classList.add('shake');
        setTimeout(() => this.input.classList.remove('shake'), 400);
    }
}

// Start system
const privacySystem = new PrivacyLock();
