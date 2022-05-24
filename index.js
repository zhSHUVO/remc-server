const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sl9pe.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

async function run() {
    try {
        await client.connect();
        const electronicsCollection = client
            .db("remc-database")
            .collection("electronics");

        const ordersCollection = client
            .db("remc-database")
            .collection("orders");

        // loading all electronics
        app.get("/product", async (req, res) => {
            const query = {};
            const cursor = await electronicsCollection.find(query);
            const electronics = await cursor.toArray();
            res.send(electronics);
        });

        // load one electronics
        app.get("/product/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const electronic = await electronicsCollection.findOne(query);
            res.send(electronic);
        });

        // store orders
        app.post("/orders", async (req, res) => {
            const orders = req.body;
            const result = await ordersCollection.insertOne(orders);
            res.send(result);
        });

        // loading user orders
        app.get("/orders", async (req, res) => {
            const email = req.query.email;
            const query = { userMail: email };
            const orders = await ordersCollection.find(query).toArray();
            res.send(orders);
        });

        // delete user orders
        app.delete("(/orders/:id)", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        });

        // loading all orders
        app.get("/allorders", async (req, res) => {
            const query = {};
            const cursor = await ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        
    } finally {
    }
}

run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("REMC data server is running");
});

app.listen(port, () => {
    console.log(`REMC app listening on port ${port}`);
});
