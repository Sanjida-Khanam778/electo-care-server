const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://electronics-repair-9c5bf.web.app",
    "https://electronics-repair-9c5bf.firebaseapp.com",
  ],
  credentials: true,
};
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vdkyx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.user = decoded;
  });
  next();
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollection = client.db("serviceDB").collection("services");
    const bookedServiceCollection = client
      .db("serviceDB")
      .collection("bookedServices");
    // create token
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/addService", verifyToken, async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });

    app.get("/services", async (req, res) => {
      const result = await serviceCollection.find().limit(6).toArray();
      res.send(result);
    });

    app.get("/allServices", async (req, res) => {
      const search = req.query.search;
      console.log(search);
      const query = { title: { $regex: search, $options: "i" } };
      const result = await serviceCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/service/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });

    app.get("/services/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.user?.email;
      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = { email: email };
      const result = await serviceCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/updateService/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedData = {
        $set: {
          image: data.image,
          price: data.price,
          title: data.title,
          area: data.area,
          description: data.description,
        },
      };
      const options = { upsert: true };
      const result = await serviceCollection.updateOne(
        query,
        updatedData,
        options
      );
      res.send(result);
    });

    app.delete("/service/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/bookedServices/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.user?.email;
      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = { userEmail: email };
      const result = await bookedServiceCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/myServicesToDo/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.user?.email;
      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = { email: email };
      const result = await bookedServiceCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookedService", verifyToken, async (req, res) => {
      const bookedData = req.body;
      const result = await bookedServiceCollection.insertOne(bookedData);
      res.send(result);
    });

    app.put("/bookedService/:id", verifyToken, async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updated = {
        $set: {
          status: data.status,
        },
      };
      const options = { upsert: true };
      const result = await bookedServiceCollection.updateOne(
        query,
        updated,
        options
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Running Server");
});

app.listen(port, () => {
  console.log("running on port:", port);
});
