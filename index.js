/* <-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-> SRILAKSHMI <-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-><-> */
const express = require("express");
const app = express();
const authData = require("./authControllers/auth");
const constants = require("./constants");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
app.use(express.json({ limit: "50mb" }));
const serverless = require("./server-less");
const cors = require("cors");
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const validateFirebaseIdToken = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    let idToken = req.headers.authorization.split("Bearer ")[1];
    try {
      let decodedIdToken = await admin.auth().verifyIdToken(idToken);
      req.decodedIdToken = decodedIdToken;
      return next();
    } catch (error) {
      console.error(error);
      res.status(401).json(constants.errors.unauthorised);
      return;
    }
  } else {
    res.status(401).json(constants.errors.unauthorised);

    return;
  }
};

//API end points start here
app.post("/api/signup", async (req, res) => {
  const signUp = await serverless.signUp(req, res);
  return signUp;
});
app.post("/api/login", async (req, res) => {
  const login = await serverless.login(req, res);
  return login;
});


// app.use(validateFirebaseIdToken);
app.put("/api/create/:category/item", async (req, res) => {
 let data = {type: req.params.category, addItem: req.body}
  const menu_data = serverless.insertMenuItem(data, res);
  return menu_data;
});

app.get("/api/userdata/:id", async (req, res) => {
  let data = { req: req.params.id };
  const getUser = serverless.getUser(data, res);
  return getUser;
});



app.get("/api/userdata", async (req, res) => {
  let data = { req: req };
  const getUserDet = await serverless.getAllUsers(data, res);
  return getUserDet;
});
app.get('/api/menu', async (req, res) => {
 const data =  await serverless.getMenuList(req, res)
 return data
})

app.get('/api/:categrotyType/items', async (req, res) => {
 const data =  await serverless.getItemsByCategory(req.params.categrotyType, res)
 return data
})

app.put('/api/:category', async (req, res) => {
 const data =  await serverless.updateMenuCategory(req, res)
 return data
})
app.post('/api/:category', async (req, res) => {
 const data =  await serverless.insertMenuCategory(req, res)
 return data
})

app.post("/api/menu", async (req, res) => {
  const menu_data = await serverless.menuData(req.body, res);
  return menu_data;
});



app.post("/api/menu/listItems/create/item", async (req, res) => {
  const menu_data = await serverless.categoryList(req.body, res);
  return menu_data;
});

app.put("/api/:menu/:menuCategory/:categories", async (req, res) => {
  let obj = {}
 obj[req.params.menuCategory] = new Object(req.params.categories = [req.body])
   let data = {collectionName: req.params.menu, data: obj}
  console.log(data)
  const menu_data = serverless.updateMenu(data, res);
  return menu_data;
});

//to get the item from list item by Id and section
app.get("/api/menu/listItems/:section/:itemid", async (req, res) => {
let data = {doc: req.params.section, itemid: req.params.itemid}
  const menu_data = await serverless.getItemFromListItemByDocItemId(data, res);
  return menu_data;
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`server is running on PORT ${PORT}.`);
});

exports.api = functions.https.onRequest(app);
