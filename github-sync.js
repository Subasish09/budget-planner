// GitHub Sync Module for Budget Planner
// Handles automatic synchronization of data files to GitHub

class GitHubSync {
    constructor() {
        this.owner = null;
        this.repo = null;
        this.token = null;
        this.baseUrl = 'https://api.github.com';
        this.initialized = false;
    }

    // Initialize with repository info
    init(owner, repo, token = null) {
        this.owner = owner;
        this.repo = repo;
        if (token) {
            this.saveToken(token);
        } else {
            this.loadToken();
        }
        this.initialized = true;
    }

    // Auto-detect repository from current URL
    autoDetectRepo() {
        // For GitHub Pages: username.github.io/repo-name
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;

        if (hostname.includes('github.io')) {
            const parts = hostname.split('.');
            this.owner = parts[0]; // username

            const pathParts = pathname.split('/').filter(p => p);
            if (pathParts.length > 0) {
                this.repo = pathParts[0]; // repo name
            }
        }

        return this.owner && this.repo;
    }

    // Save token to localStorage (encrypted)
    saveToken(token) {
        if (!token) return;

        // Basic obfuscation (Base64 encoding)
        const encoded = btoa(token);
        localStorage.setItem('github_sync_token', encoded);
        this.token = token;
    }

    // Load token from localStorage
    loadToken() {
        const encoded = localStorage.getItem('github_sync_token');
        if (encoded) {
            try {
                this.token = atob(encoded);
                return true;
            } catch (e) {
                console.error('Failed to decode token:', e);
                return false;
            }
        }
        return false;
    }

    // Check if token is configured
    hasToken() {
        return !!this.token;
    }

    // Clear token
    clearToken() {
        localStorage.removeItem('github_sync_token');
        this.token = null;
    }

    // Get authorization headers
    getHeaders() {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
        }

        return headers;
    }

    // Fetch file from GitHub
    async fetchFile(path) {
        if (!this.initialized) {
            throw new Error('GitHubSync not initialized. Call init() first.');
        }

        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null; // File doesn't exist
                }
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Decode Base64 content
            const content = atob(data.content);

            return {
                content: content,
                sha: data.sha,
                path: data.path
            };
        } catch (error) {
            console.error('Failed to fetch file from GitHub:', error);
            throw error;
        }
    }

    // Get file SHA (required for updates)
    async getFileSHA(path) {
        const file = await this.fetchFile(path);
        return file ? file.sha : null;
    }

    // Commit file to GitHub
    async commitFile(path, content, message = 'Update file') {
        if (!this.initialized) {
            throw new Error('GitHubSync not initialized. Call init() first.');
        }

        if (!this.hasToken()) {
            throw new Error('GitHub token not configured. Please set up sync in settings.');
        }

        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;

        try {
            // Get current file SHA (required for updates)
            const sha = await this.getFileSHA(path);

            // Encode content to Base64
            const encodedContent = btoa(unescape(encodeURIComponent(content)));

            const body = {
                message: message,
                content: encodedContent
            };

            // Include SHA if file exists (update), otherwise create new file
            if (sha) {
                body.sha = sha;
            }

            const response = await fetch(url, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
            }

            const data = await response.json();

            return {
                success: true,
                sha: data.content.sha,
                commit: data.commit
            };
        } catch (error) {
            console.error('Failed to commit file to GitHub:', error);
            throw error;
        }
    }

    // Test connection to GitHub
    async testConnection() {
        if (!this.initialized) {
            throw new Error('GitHubSync not initialized. Call init() first.');
        }

        try {
            const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`Cannot access repository: ${response.status}`);
            }

            const data = await response.json();

            return {
                success: true,
                repo: data.full_name,
                private: data.private
            };
        } catch (error) {
            console.error('Connection test failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
const githubSync = new GitHubSync();

// Auto-detect repository on load
if (githubSync.autoDetectRepo()) {
    githubSync.init(githubSync.owner, githubSync.repo);
    console.log(`GitHub Sync initialized: ${githubSync.owner}/${githubSync.repo}`);
}
