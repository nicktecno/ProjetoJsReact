// Para conectar a aplicação com banco de dados e carregar os models, temos
// que criar um o arquivo index.js na pasta database.
import Sequelize from 'sequelize';
import mongoose from 'mongoose';

import User from '../app/models/User';
import File from '../app/models/File';
import Appointment from '../app/models/Appointment';

import databaseConfig from '../config/database';

const models = [User, File, Appointment];

class Database {
  constructor() {
    this.init();
    this.mongo();
  }

  init() {
    this.connection = new Sequelize(databaseConfig);

    models
      .map((model) => model.init(this.connection))
      .map(
        (model) => model.associate && model.associate(this.connection.models)
      );
  }

  mongo() {
    this.mongoConnection = mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true, // estou utilizando um formato novo na string de conexão
      useFindAndModify: true, // para poder buscar e atualizar os registros
      useUnifiedTopology: true, // DeprecationWarning apareceu no console então eu estou usando, conforme a recomendação do mongo
    });
  }
}
export default new Database();
