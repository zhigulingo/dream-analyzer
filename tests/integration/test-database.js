/**
 * Test Database Setup and Teardown
 * Manages test database state for integration tests
 */

const { createTestDatabaseClient, TestDataGenerator } = require('./test-environment');

class TestDatabase {
  constructor() {
    this.client = createTestDatabaseClient();
    this.createdUsers = [];
    this.createdAnalyses = [];
  }

  /**
   * Setup test database - create test tables if needed and clean data
   */
  async setup() {
    try {
      // Clean existing test data
      await this.cleanup();
      
      // Verify tables exist (in production they should already exist)
      await this._verifyTables();
      
      console.log('[TestDB] Database setup completed');
    } catch (error) {
      console.error('[TestDB] Setup failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    try {
      // Delete test analyses
      if (this.createdAnalyses.length > 0) {
        const { error: analysesError } = await this.client
          .from('analyses')
          .delete()
          .in('id', this.createdAnalyses);
        
        if (analysesError) {
          console.warn('[TestDB] Warning cleaning analyses:', analysesError);
        }
      }

      // Delete test users  
      if (this.createdUsers.length > 0) {
        const { error: usersError } = await this.client
          .from('users')
          .delete()
          .in('id', this.createdUsers);
        
        if (usersError) {
          console.warn('[TestDB] Warning cleaning users:', usersError);
        }
      }

      // Reset tracking arrays
      this.createdUsers = [];
      this.createdAnalyses = [];
      
      console.log('[TestDB] Cleanup completed');
    } catch (error) {
      console.error('[TestDB] Cleanup failed:', error);
      // Don't throw - cleanup should be best effort
    }
  }

  /**
   * Create test user
   */
  async createTestUser(userData = {}) {
    const defaultUser = TestDataGenerator.createTestUser(userData);
    
    const { data, error } = await this.client
      .from('users')
      .insert([defaultUser])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }

    this.createdUsers.push(data.id);
    return data;
  }

  /**
   * Create test analysis
   */
  async createTestAnalysis(userId, dreamText = null, analysis = null) {
    const analysisData = {
      user_id: userId,
      dream_text: dreamText || TestDataGenerator.createTestDream(),
      analysis: analysis || JSON.stringify(TestDataGenerator.createTestAnalysis()),
      created_at: new Date().toISOString()
    };

    const { data, error } = await this.client
      .from('analyses')
      .insert([analysisData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test analysis: ${error.message}`);
    }

    this.createdAnalyses.push(data.id);
    return data;
  }

  /**
   * Create user with multiple analyses for testing
   */
  async createUserWithAnalyses(userData = {}, analysisCount = 3) {
    const user = await this.createTestUser(userData);
    const analyses = [];

    for (let i = 0; i < analysisCount; i++) {
      const analysis = await this.createTestAnalysis(user.id);
      analyses.push(analysis);
    }

    return { user, analyses };
  }

  /**
   * Get user by tg_id
   */
  async getUserByTgId(tgId) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('tg_id', tgId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data;
  }

  /**
   * Get analyses for user
   */
  async getAnalysesForUser(userId, limit = 10) {
    const { data, error } = await this.client
      .from('analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get analyses: ${error.message}`);
    }

    return data;
  }

  /**
   * Update user credits
   */
  async updateUserCredits(tgId, credits) {
    const { data, error } = await this.client
      .from('users')
      .update({ deep_analysis_credits: credits })
      .eq('tg_id', tgId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update credits: ${error.message}`);
    }

    return data;
  }

  /**
   * Verify required tables exist
   */
  async _verifyTables() {
    // Check if users table exists
    const { data: usersTest, error: usersError } = await this.client
      .from('users')
      .select('id')
      .limit(1);

    if (usersError) {
      throw new Error(`Users table not accessible: ${usersError.message}`);
    }

    // Check if analyses table exists
    const { data: analysesTest, error: analysesError } = await this.client
      .from('analyses')
      .select('id')
      .limit(1);

    if (analysesError) {
      throw new Error(`Analyses table not accessible: ${analysesError.message}`);
    }
  }

  /**
   * Execute health check
   */
  async healthCheck() {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('count')
        .limit(1);

      return !error;
    } catch (error) {
      return false;
    }
  }
}

module.exports = TestDatabase;