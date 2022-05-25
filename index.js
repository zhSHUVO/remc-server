const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Not authorized" });
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden access" });
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const electronicsCollection = client
            .db("remc-database")
            .collection("electronics");

        const ordersCollection = client
            .db("remc-database")
            .collection("orders");

        const usersCollection = client.db("remc-database").collection("users");

        // user
        app.put("/user/:email", async (req, res) => {
            const user = req.body;
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
                expiresIn: "1h",
            });
            res.send({ result, token });
        });

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
        app.get("/orders", verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { userMail: email };
                const orders = await ordersCollection.find(query).toArray();
                res.send(orders);
            } else {
                return res.status(403).send({ message: "Forbidden access" });
            }
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

        // adding new product
        app.post("/product", async (req, res) => {
            const product = req.body;
            const result = await electronicsCollection.insertOne(product);
            res.send(result);
        });

        // delete product
        app.delete("(/product/:id)", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await electronicsCollection.deleteOne(query);
            res.send(result);
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
