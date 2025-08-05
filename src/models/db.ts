import fs from 'fs';
import path from 'path';
import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';
import process from 'process';

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.ts')[env];

interface DB {
  [key: string]: ModelStatic<Model> | Sequelize | typeof Sequelize;
  sequelize: Sequelize;
  Sequelize: typeof Sequelize;
}

const db: DB = {} as DB;

const sequelize = new Sequelize(
  config.database, 
  config.username, 
  config.password, 
  config
);

fs
  .readdirSync(__dirname)
  .filter((file: string) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      (file.slice(-3) === '.ts' || file.slice(-3) === '.js') &&
      file.indexOf('.test.') === -1 &&
      file !== 'db.ts'
    );
  })
  .forEach((file: string) => {
    const model = require(path.join(__dirname, file)).default(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName: string) => {
  const model = db[modelName];
  if (modelName !== 'sequelize' && modelName !== 'Sequelize' && (model as any).associate) {
    (model as any).associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
