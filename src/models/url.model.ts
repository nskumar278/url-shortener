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
    }
  );

  return Url;
};