// web/src/utils/api.js

class ApiService {
    constructor() {
        this.baseURL = import.meta.env.VITE_API_BASE_URL;
        this.refreshURL = import.meta.env.VITE_REFRESH_TOKEN_API_URL;
        this.logoutURL = import.meta.env.VITE_LOGOUT_API_URL;
        this.isRefreshing = false;
        this.failedQueue = [];
        
        if (!this.baseURL) {
            console.error('VITE_API_BASE_URL is not set');
        }
    }

    // Process failed requests queue after token refresh
    processQueue(error, token = null) {
        this.failedQueue.forEach(({ resolve, reject }) => {
            if (error) {
                reject(error);
            } else {
                resolve(token);
            }
        });
        
        this.failedQueue = [];
    }

    // Check if user is authenticated by trying a simple API call
    async checkAuth() {
        try {
            const response = await fetch(`${this.baseURL}/user-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({})
            });
            
            if (response.status === 401) {
                return false;
            }
            
            return response.ok;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    // Refresh tokens
    async refreshTokens() {
        if (!this.refreshURL) {
            throw new Error('Refresh token URL not configured');
        }

        try {
            const response = await fetch(this.refreshURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Token refresh error:', error);
            throw error;
        }
    }

    // Main API call method with automatic token refresh
    async apiCall(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            
            // If request is successful, return response
            if (response.ok) {
                return response;
            }
            
            // If unauthorized, try to refresh token
            if (response.status === 401) {
                if (this.isRefreshing) {
                    // If already refreshing, wait for it to complete
                    return new Promise((resolve, reject) => {
                        this.failedQueue.push({ resolve, reject });
                    }).then(() => {
                        // Retry original request
                        return fetch(url, defaultOptions);
                    });
                }

                this.isRefreshing = true;

                try {
                    await this.refreshTokens();
                    this.isRefreshing = false;
                    this.processQueue(null);
                    
                    // Retry original request with refreshed token
                    return fetch(url, defaultOptions);
                } catch (refreshError) {
                    this.isRefreshing = false;
                    this.processQueue(refreshError);
                    
                    // Refresh failed, redirect to login or emit logout event
                    throw new Error('Authentication failed - please login again');
                }
            }
            
            return response;
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }

    // Logout method
    async logout() {
        try {
            if (this.logoutURL) {
                await fetch(this.logoutURL, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
            }
            console.log('Logout successful');
        } catch (error) {
            console.error('Logout error:', error);
            // Continue with logout even if server call fails
        }
    }

    // GET request
    async get(endpoint, options = {}) {
        return this.apiCall(endpoint, { method: 'GET', ...options });
    }

    // POST request
    async post(endpoint, data = {}, options = {}) {
        return this.apiCall(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options
        });
    }

    // PUT request
    async put(endpoint, data = {}, options = {}) {
        return this.apiCall(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
            ...options
        });
    }

    // DELETE request
    async delete(endpoint, options = {}) {
        return this.apiCall(endpoint, { method: 'DELETE', ...options });
    }

    // Дополнительные методы для веб-приложения
    
    // Верификация веб-аутентификации
    async verifyWebAuth(userData) {
        return this.post('/web-login', userData);
    }

    // Проверка статуса сессии
    async checkSessionStatus(sessionId) {
        return this.get(`/web-login?session=${sessionId}`);
    }

    // Глубокий анализ
    async getDeepAnalysis() {
        console.log('[ApiService] Calling POST /deep-analysis');
        return this.post('/deep-analysis');
    }
}

// Export singleton instance
export default new ApiService();