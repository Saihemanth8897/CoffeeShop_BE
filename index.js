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

app.post("/api/signup", async (req, res) => {
  console.log('saoi==========')
  const signUp = await serverless.signUp(req, res);
  return signUp;
});
app.post("/api/login", async (req, res) => {
  const login = await serverless.login(req, res);
  return login;
});

// app.get('/signOut', async (req, res) => {
//     const resData = await serverless.signOut(req, res);
//     return resData;
// })

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
app.use(validateFirebaseIdToken);


app.get("/api/userdata/:id", async (req, res) => {
  let data = { req: req.params.id };
  const getUser = serverless.getUser(data, res);
  return getUser;
});



app.post("/api/refresh-token", async (req, res) => {
  const userData = authData.refreshToken(req, res);
  return userData;
});



app.get("/api/userdata", async (req, res) => {
  let data = { req: req };
  const getUserDet = serverless.getAllUsers(data, res);
  return getUserDet;
});

app.get("/api/quizAnswers/:id", async (req, res) => {
  let data = { uid: req.params.id };
  const result = serverless.getUserQuizAnswers(data, res);
  return result;
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`server is running on PORT ${PORT}.`);
});

exports.api = functions.https.onRequest(app);
