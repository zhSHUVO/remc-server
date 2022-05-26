const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

        const reviewsCollection = client
            .db("remc-database")
            .collection("reviews");

        const paymentsCollection = client
            .db("remc-database")
            .collection("payments");

        // send user to database
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
                expiresIn: "6h",
            });
            res.send({ result, token });
        });

        // make user admin
        app.put("/user/admin/:email", verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({
                email: requester,
            });
            if (requesterAccount.role === "admin") {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: "admin" },
                };
                const result = await usersCollection.updateOne(
                    filter,
                    updateDoc
                );
                res.send(result);
            } else {
                res.status(403).send({ message: "Forbidden" });
            }
        });

        // checking admin role
        app.get("/admin/:email", async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === "admin";
            res.send({ admin: isAdmin });
        });

        // load all users
        app.get("/users", verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        // delete user 
        app.delete("(/user/:id)", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });

        // load user profile
        app.get("/users/:email", async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            res.send(user);
        });

        // update user profile
        app.put("/update/users/:email", async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const data = req.body;
            console.log(data);
            const filter = { email: email };
            const updateDoc = {
                $set: {
                    name: data.name,
                    image: data.img,
                    education: data.education,
                    location: data.location,
                    number: data.number,
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            console.log(updateDoc);
            res.send(result);
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

        // update order status
        app.patch("/orders/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    transactionId: payment.transactionId,
                    status: "Paid",
                },
            };
            const updatedOrder = await ordersCollection.updateOne(
                filter,
                updateDoc
            );
            const result = await paymentsCollection.insertOne(payment);
            res.send(updatedOrder);
        });

        // order payment
        app.get("/orders/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await ordersCollection.findOne(query);
            res.send(order);
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

        // payment intent
        app.post("/create-payment-intent", verifyJWT, async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });

        // reviews
        app.post("/review", async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
        });

        // load all reviews
        app.get("/review", async (req, res) => {
            const review = await reviewsCollection.find().toArray();
            res.send(review);
        });

        // loading user reviews
        app.get("/reviews", verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const review = await reviewsCollection.find(query).toArray();
                res.send(review);
            } else {
                return res.status(403).send({ message: "Forbidden access" });
            }
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
