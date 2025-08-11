import { DataTypes, Model, Sequelize } from 'sequelize';

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  class Url extends Model {
    declare id: number;
    declare originalUrl: string;
    declare shortUrlId: string;
    declare clickCount: number;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  Url.init(
    {
      id: {
        type: dataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      originalUrl: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      shortUrlId: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      clickCount: {
        type: dataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'Url',
      tableName: 'urls',
      underscored: true,
      indexes: [
        {
          // Unique index on short_url_id to ensure no duplicate short URLs
          fields: ['short_url_id'],
          unique: true,
          name: 'idx_urls_short_url_id'
        },
        {
          // Index on original_url for duplicate detection during URL creation
          fields: ['original_url'],
          unique: true,
          name: 'idx_urls_original_url'
        },
        {
          // Composite index for analytics queries (click_count + created_at)
          fields: ['click_count', 'created_at'],
          name: 'idx_urls_click_count_created_at'
        },
        {
          // Index on created_at for time-based queries and pagination
          fields: ['created_at'],
          name: 'idx_urls_created_at'
        },
        {
          // Index on updated_at for recently modified URLs
          fields: ['updated_at'],
          name: 'idx_urls_updated_at'
        },
      ]
    }
  );

  return Url;
};