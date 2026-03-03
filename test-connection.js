import mongoose from 'mongoose';
import 'dotenv/config';

const CONNECTION_STRING = process.env.MONGODB_CONNECTION_STRING;
const DB_NAME = "test-db";

async function testConnection() {
    try {
        console.log(`Connecting to database: ${DB_NAME}...`);
        
        // Connect using compatibility options for Mongoose 5.x and Cosmos DB 3.6
        await mongoose.connect(CONNECTION_STRING, {
            dbName: DB_NAME,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            retryWrites: false
        });

        console.log("Successfully connected to Azure Cosmos DB for MongoDB (ESM/Mongoose)!");

        const TestSchema = new mongoose.Schema({
            name: String,
            status: String,
            timestamp: { type: Date, default: Date.now }
        });
        
        // Use a unique model name to avoid OverwriteModelError
        const TestModel = mongoose.models.Test || mongoose.model('Test', TestSchema);

        const newDoc = new TestModel({
            name: "ESM Test",
            status: "Success"
        });
        const savedDoc = await newDoc.save();
        console.log("Created Document:", savedDoc);

        const foundDoc = await TestModel.findById(savedDoc._id);
        console.log("Found Document ID:", foundDoc._id);

        await TestModel.findByIdAndDelete(savedDoc._id);
        console.log("Cleaned up test document.");

        console.log("All Node.js/MERN ESM tests passed!");
        process.exit(0);

    } catch (err) {
        console.error("Connection Error:", err);
        process.exit(1);
    }
}

testConnection();
