import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};
console.log('MongoDB URI:', uri);


let client;
let clientPromise;


if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  console.log('Development mode');
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
  console.log('Connecting t');
} else {
  client = new MongoClient(uri, options);
  
  clientPromise = client.connect();
  // console.log('Connecting t');
}

export default clientPromise;
