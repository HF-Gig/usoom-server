import { MongoClient } from 'mongodb';

let dbConnection;

export const connectToDb = (cb) => {
  MongoClient.connect(process.env.MONGO_URI)
    .then((client) => {
      dbConnection = client.db('usoom');
      return cb();
    })
    .catch((err) => {
      console.log(err);
      return cb(err);
    });
};

export const getDb = () => dbConnection;