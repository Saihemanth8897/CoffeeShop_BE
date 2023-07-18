const admin = require("firebase-admin");
const authData = require("./authControllers/auth");
const credentials = require("./serviceAccountKey.json");
const functions = require("firebase-functions");
const firebase = require("firebase/auth");
const _ = require('loadsh')
let uuid = require("uuid");
admin.initializeApp(
  {
    credential: admin.credential.cert(credentials),
  }
);
const db = admin.firestore();
let userDetails = db.collection("userDetails");

exports.signUp = async (req, res) => {
  if (!req.body.email || !req.body.password || !req.body.username, !req.body.role) {
    return res.status(422).json({
      email: "email is required",
      password: "password is required",
      username: "User Name Required",
    });
  }
  const reqsignUp = {
    email: req.body.email,
    password: req.body.password,
    emailVerified: false,
    disabled: false,
  };
  let userID = uuid();
  let userDetailsData = {
    emailId: req.body.email,
    username: req.body.username,
    role: req.body.role,
    id: userID,
    lastUpdatedTime: new Date().toUTCString(),
  };
  try {
    admin
      .auth()
      .createUser(reqsignUp)
      .then(async (data) => {
        userDetailsData.id = data.uid;
        await userDetails.doc(data.uid).create(userDetailsData);
        res.status(200).json(data);
      })
      .catch((error) => {
        return res.status(500).json({
          status: 500,
          data: error.message,
        });
      });
  } catch (error) {
    return res.status(400).json({
      status: 400,
      data: error.message,
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    let refreshToken = req.headers.authorization.split("Bearer ")[1];
    // console.log(refreshToken, 'refreshTokenrefreshTokenrefreshTokenrefreshToken')

    const decodedToken = await admin.auth().verifyIdToken(refreshToken);
    const uid = decodedToken.uid;
    const token = await admin.auth().createCustomToken(uid);
    //  console.log(token, 'useruseruseruseruseruseruseruser')
    const userCred = await firebase
      .signInWithCustomToken(uid, token)
      //   console.log(userCred)
      .then((userCredential) => {
        // Signed in
        var user = userCredential.user;

        //console.log(user, 'useruseruseruseruseruseruseruser', userCredential)
        return res.status(200).json({ data: token });
        // ...
      })
      .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        // ...
      });
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};
exports.login = async (req, res) => {
const resdata = await authData.login(req, res)

}
exports.getAllUsers = async (req, res) => {
  let data = [];
  userDetails
    .get()
    .then((result) => {
      result.forEach((item) => {
        const { emailId, id, username, lastUpdatedTime } = item.data();
        const requiredData = { emailId, id, username, lastUpdatedTime };
        data.push(requiredData);
      });
      res.status(200).json(data);
    })
    .catch((error) => {
      return res.status(400).json({
        status: 400,
        data: error.message,
      });
    });
};


