
const { firebase, authentication, auth, getAuth } = require("../config/firebase")
const credentials = require("../serviceAccountKey.json");
const admin = require("firebase-admin");
// admin.initializeApp(
//   {
//     credential: admin.credential.cert(credentials),
//   }
// );
// const db = admin.firestore();
// let userDetails = db.collection("userDetails");
exports.login =  (req, res) => {
    if (!req.body.email || !req.body.password) {
        return res.status(422).json({
            email: "email is required",
            password: "password is required"
        });
    }
    

     auth.signInWithEmailAndPassword(authentication, req.body.email, req.body.password).then((response) => {
       return  res.json({
            status: 200,
            data: response,
        });
     }).catch((error) => {
        console.log(error, res)
      return  res.status(500).json({
            status: 500,
            data: error.message,
        });
  })
       
} 


exports.refreshToken = async (req, res) => {
    try {
      firebase.auth.getIdTokenResult()
//    let refreshToken =  req.headers.authorization.split("Bearer ")[1]
//    console.log(refreshToken, 'refreshTokenrefreshTokenrefreshTokenrefreshToken')

//      const decodedToken = await admin.auth().verifyIdToken(refreshToken);
//     const uid = decodedToken.uid;
//     const token = await admin.auth().createCustomToken(uid)
//     console.log(token, 'useruseruseruseruseruseruseruser')
//     const userCred = await auth.signInWithCustomToken(token)
//       console.log(userCred)
//         .then((userCredential) => {
//       // Signed in
//       var user = userCredential.user;

//         console.log(user, 'useruseruseruseruseruseruseruser', userCredential)
//           return res.status(200).json({data: token})
//       // ...
//     })
//     .catch((error) => {

//       var errorCode = error.code;
//       var errorMessage = error.message;
//       // ...
//     });
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};