import { DataTypes, Model, Sequelize } from 'sequelize';

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  class Url extends Model {
    public id!: number;
    public originalUrl!: string;
    public shortUrlId!: string;
    public clickCount!: number;
    public createdAt!: Date;
    public updatedAt!: Date;
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