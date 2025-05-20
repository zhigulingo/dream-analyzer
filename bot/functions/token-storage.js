// token-storage.js - Simple token storage for auth flow
// This is a workaround for Netlify functions where global state doesn't persist between invocations

// In-memory storage for the current execution
const _tokens = {};

// Read token storage from environment
const loadTokensFromStorage = () => {
    try {
        // Try to load from environment variable first
        if (process.env.AUTH_TOKENS) {
            const parsed = JSON.parse(process.env.AUTH_TOKENS);
            Object.assign(_tokens, parsed);
            console.log('[token-storage] Loaded tokens from environment variable');
        }
        
        // In a production system, you would use a proper database instead
    } catch (error) {
        console.error('[token-storage] Error loading tokens:', error);
    }
};

// Save tokens to storage
const saveTokensToStorage = () => {
    try {
        // In a real system, this would save to a database
        // For now, just log that we would save
        console.log('[token-storage] Would save tokens to persistent storage');
        console.log('[token-storage] Current tokens:', JSON.stringify(_tokens));
    } catch (error) {
        console.error('[token-storage] Error saving tokens:', error);
    }
};

// Store a token
const storeToken = (sessionId, token) => {
    if (!sessionId) {
        console.error('[token-storage] Cannot store token: No session ID provided');
        return false;
    }
    
    loadTokensFromStorage(); // Load any existing tokens
    _tokens[sessionId] = token;
    saveTokensToStorage();
    return true;
};

// Get a token
const getToken = (sessionId) => {
    if (!sessionId) {
        return null;
    }
    
    loadTokensFromStorage(); // Ensure we have the latest tokens
    return _tokens[sessionId] || null;
};

// Remove a token
const removeToken = (sessionId) => {
    if (!sessionId) {
        return false;
    }
    
    loadTokensFromStorage();
    if (_tokens[sessionId]) {
        delete _tokens[sessionId];
        saveTokensToStorage();
        return true;
    }
    return false;
};

// Check if a token exists
const hasToken = (sessionId) => {
    loadTokensFromStorage();
    return !!_tokens[sessionId];
};

// Get all tokens (for debugging)
const getAllTokens = () => {
    loadTokensFromStorage();
    return { ..._tokens };
};

module.exports = {
    storeToken,
    getToken,
    removeToken,
    hasToken,
    getAllTokens
}; 