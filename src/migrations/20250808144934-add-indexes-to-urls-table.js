'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addIndex('urls', ['short_url_id'], {
      name: 'idx_urls_short_url_id',
      unique: true
    });

    // Add index on original_url for duplicate detection during URL creation
    await queryInterface.addIndex('urls', ['original_url'], {
      name: 'idx_urls_original_url',
      unique: true
    });

    // Add composite index for analytics queries (click_count + created_at)
    await queryInterface.addIndex('urls', ['click_count', 'created_at'], {
      name: 'idx_urls_click_count_created_at'
    });

    // Add index on created_at for time-based queries and pagination
    await queryInterface.addIndex('urls', ['created_at'], {
      name: 'idx_urls_created_at'
    });

    // Add index on updated_at for recently modified URLs
    await queryInterface.addIndex('urls', ['updated_at'], {
      name: 'idx_urls_updated_at'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove indexes in reverse order
    await queryInterface.removeIndex('urls', 'idx_urls_updated_at');
    await queryInterface.removeIndex('urls', 'idx_urls_created_at');
    await queryInterface.removeIndex('urls', 'idx_urls_click_count_created_at');
    await queryInterface.removeIndex('urls', 'idx_urls_original_url');
    await queryInterface.removeIndex('urls', 'idx_urls_short_url_id');
  }
};
