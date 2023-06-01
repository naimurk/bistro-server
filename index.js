const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000;
require('dotenv').config()
const jwt = require('jsonwebtoken');

// midleware 
app.use(cors())
app.use(express.json());

// verify token midleware
const verifyJwt = (req, res, next) => {
  const authorization = req.headers?.authorization;
  // console.log('authorization', authorization);
  if (!authorization) {
    res.status(404).send({ error: true, message: 'no token' })
  }
  else {
    const token = authorization.split(' ')[1];
    // console.log( 'token',token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        res.status(403).send({ error: true, message: 'unauthorized access' })
      }
      else {
        req.decoded = decoded
        // console.log(req.decoded.email);
        next()
      }
    })
  }
}


// database connection is here

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.50l1tkw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const menuCollection = client.db('bistroBoss').collection('menu')
    const reviewsCollection = client.db('bistroBoss').collection('reviews')
    const cartsCollection = client.db('bistroBoss').collection('carts')
    const userCollection = client.db('bistroBoss').collection('user')


    // TOKEN CREATE API
   try {
    app.post('/jwt', (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token })
    })
    
   } catch (error) {
    res.send(error)
   }


    // menu 
    try {

      app.get('/menu', async (req, res) => {
        const result = await menuCollection.find().toArray()
        res.send(result)
      })
      
    } catch (error) {

      res.send(error)
      
    }


    // reviews
    try {
      app.get('/reviews', async (req, res) => {
        const result = await reviewsCollection.find().toArray()
        res.send(result)
      })
    } 
    catch (error) {
      res.send(error)
    }



    // cart collection 

    try {
      app.get('/carts', verifyJwt, async (req, res) => {
        const email = req.query.email;
        // console.log(email);
        if (!email) {
          res.send([]);
        }
        const decodedEmail = req.decoded.email;
        if (email !== decodedEmail) {
          res.status(403).send({ error: true, message: 'forbidden access' })
        }
        else {
          const query = { Useremail: email }
        const result = await cartsCollection.find(query).toArray();
        res.send(result);
        }
      })
    } catch (error) {
      res.send(error)
    }
   


   try {
    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartsCollection.insertOne(item);
      res.send(result)
    })
   } catch (error) {
    res.send(error)
   }

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id
      const query = { foodId: id }
      const result = await cartsCollection.deleteOne(query)
      res.send(result)
    })

    // ----------user collection ----------------//
  
   try {
    app.post('/users', async (req, res) => {
      

      const user = req.body;
    // console.log(user.email);
    const query = { email: user.email }
    const existingUser = await userCollection.findOne(query)
    // console.log('existing user', existingUser);
    if (existingUser) {
      res.send({ message: 'user already exist' })
    }
    else {
      const result = await userCollection.insertOne(user);
      res.send(result)
    }
      
     

  })
   }
    catch (error) {
    res.send(error)
   }

    app.get('/all-users', async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    // (_________ is Admin apis_______)
   try {
    app.get('/users/isAdmin/:email', verifyJwt, async (req, res) => {
      const email = req.params?.email;
      console.log('decoded email',req.decoded.email);
      console.log(email);
     
     if (email) {

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

     else {
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const result = { admin: user?.email == 'Admin' }
      res.send(result)
     }
     }

     else {
      res.send({email : 'email not found'})
     }


    })
   } catch (error) {
    res.send(error)
   }

    // make user admin ;
   try {
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'Admin'
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result)

    })

   } catch (error) {
    res.send(error)
   }



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('bistro is running ')
})

app.listen(port, () => {
  console.log(port, "port is okay");
})