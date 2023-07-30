const admin = require("firebase-admin");
const authData = require("./authControllers/auth");
const credentials = require("./serviceAccountKey.json");
const functions = require("firebase-functions");
const firebase = require("firebase/auth");
const _ = require("loadsh");
let uuid = require("uuid");
const { error } = require("firebase-functions/logger");
admin.initializeApp({
  credential: admin.credential.cert(credentials),
});
const db = admin.firestore();
let userDetails = db.collection("userDetails");
let menu = db.collection("menu");
let listItems = db.collection("listItems");
function isEmptyObj(obj) {
  return Object.keys(obj).length === 0;
}
const insertNewItemsIfCollectionExists = async (collectionName, data) => {
  try {
    const collectionRef = db.collection(collectionName);

    for (const docId in data) {
      const documentRef = collectionRef.doc(docId);
      const docSnapshot = await documentRef.get();

      if (docSnapshot.exists) {
        const existingData = docSnapshot.data();
        console.log(existingData)
        if (collectionName === "menu") {
          if (Array.isArray(existingData.categories)) {
            // If the document already has a "categories" array, insert new categories into it
            await documentRef.update({
              categories: [...existingData.categories, ...data[docId]],
            });
            console.log(
              `New categories inserted into document "${docId}" in collection.`
            );
          } else {
            await documentRef.update({
              categories: data[docId],
            });
            console.log(
              `Categories set for document "${docId}" in collection.`
            );
          }
        } else if (collectionName === "listItems") {
          if (Array.isArray(existingData.data)) {
            await documentRef.update({
              data: [...existingData.data, data[docId]],
            });
            console.log(
              `New items inserted into document "${docId}" in collection.`
            );
          } else if (documentRef && documentRef.data) {
            await documentRef.update({
              data: [
                existingData.data,
                ...(Array.isArray(data[docId]) ? data[docId] : []),
              ],
            });
            console.log(`Items set for document "${docId}" in collection.`);
          } else if (
            collectionName === "listItems" &&
            !Array.isArray(data[docId])
          ) {
            await documentRef.update({
              data: [data[docId]],
            });
            console.log(`Items set for document "${docId}" in collection.`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error inserting new items:", error);
  }
};

const checkAndCreateCollection = async (collectionName, data) => {
  try {
    const collections = await db.listCollections();
    let collectionExists = false;

    for (const collection of collections) {
      if (collection.id === collectionName) {
        collectionExists = true;
        break;
      }
    }
console.log(collectionName, collectionExists)
    if (!collectionExists) {
      const collectionRef = db.collection(collectionName);

      for (const docId in data) {
        const documentRef = collectionRef.doc(docId);

        if (collectionName === "listItems") {
          await documentRef.set({
            data: Array.isArray(data[docId]) ? data[docId] : [data[docId]],
          });
        } else if (collectionName === "menu") {
          await documentRef.set({
            categories: Array.isArray(data[docId])
              ? data[docId]
              : [data[docId]],
          });
        }
      }
      console.log(`Collection "${collectionName}" created successfully.`);
    } else {
      console.log(`Collection "${collectionName}" already exists.`);
      await insertNewItemsIfCollectionExists(collectionName, data);
    }
  } catch (error) {
    console.error("Error checking and creating collection:", error);
  }
};
exports.updateMenu = async (req, res) => {
  try {
    console.log(req);
    let resp = await checkAndCreateCollection(req.collectionName, req.data);
    res.status(200).json({
      status: 200,
      data: resp,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      data: error,
    });
  }
};
exports.signUp = async (req, res) => {
  if (
    (!req.body.email || !req.body.password || !req.body.username,
    !req.body.role)
  ) {
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

// exports.refreshToken = async (req, res) => {
//   try {
//     let refreshToken = req.headers.authorization.split("Bearer ")[1];
//     // console.log(refreshToken, 'refreshTokenrefreshTokenrefreshTokenrefreshToken')

//     const decodedToken = await admin.auth().verifyIdToken(refreshToken);
//     const uid = decodedToken.uid;
//     const token = await admin.auth().createCustomToken(uid);
//     //  console.log(token, 'useruseruseruseruseruseruseruser')
//     const userCred = await firebase
//       .signInWithCustomToken(uid, token)
//       //   console.log(userCred)
//       .then((userCredential) => {
//         // Signed in
//         var user = userCredential.user;

//         //console.log(user, 'useruseruseruseruseruseruseruser', userCredential)
//         return res.status(200).json({ data: token });
//         // ...
//       })
//       .catch((error) => {
//         var errorCode = error.code;
//         var errorMessage = error.message;
//         // ...
//       });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json(err);
//   }
// };

exports.login = async (req, res) => {
  const snapshot = await userDetails
    .where("username", "==", req.body.username)
    .get();
  if (!snapshot.empty) {
    snapshot.forEach((doc) => {
      req.body["email"] = doc.data().emailId;
      console.log(doc.data(), "sd");
    });
    const resdata = await authData.login(req, res);
  } else {
    res
      .status(400)
      .json({ status: 400, data: null, message: "User not found" });
  }
};
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
exports.categoryList = async (req, res) => {
  try {
    let resp = await checkAndCreateCollection("listItems", req);
    res.status(200).json({
      status: 200,
      data: resp,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      data: error,
    });
  }
};
exports.menuData = async (req, res) => {
  try {
    let resp = await checkAndCreateCollection(
      Object.keys(req)[0],
      req[Object.keys(req)[0]]
    );
    res.status(200).json({
      status: 200,
      data: resp,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      data: error,
    });
  }

  //   if (req.type == "postquiz") {
  //     let doc = await menu
  //       .doc(req.req.drinks)
  //       .update({ data: req.data.body });
  // }
  // res.status(200).json(req.data.body);
};
exports.getMenuList = (req, res) => {
  menu
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        res.status(200).json({
          status: 200,
          data: null,
          message: "No documents found in the collection.",
        });
        console.log("No documents found in the collection.");
        return;
      }
      let data = {};
      snapshot.forEach((doc) => {
        data[doc.id] = doc.data();
        // doc.data() contains the document data
        console.log(doc.id, "=>", doc.data());
      });
      return res.status(200).json({
        status: 200,
        data: data,
        message: "No documents found in the collection.",
      });
    })
    .catch((err) => {
      console.error("Error getting documents", err);
      return res.status(500).json({
        status: 500,

        message: err,
      });
    });
};

exports.getItemsByCategory = (req, res) => {
  listItems
    .doc(req)
    .get()
    .then((data) => {
      return res.status(200).json({
        status: 200,
        data: data.data() ? data.data().data : null,
      });
    })
    .catch((error) => {
      return res.status(500).json({
        status: 500,

        message: err,
      });
    });
};

exports.updateMenuCategory = async (req, res) => {
  try {
    // Replace 'yourCollectionName' with the name of the collection you want to update

    // Update the document with the provided data

    let doc = await menu.doc(req.params.category).get();
    const currentArray = doc.data()["categories"];
    console.log(doc.data());
    if (!currentArray || !Array.isArray(currentArray)) {
      console.error("Invalid array field or no array exists in the document.");
      return;
    }

    // Find the index of the old value in the array
    const index = currentArray.indexOf((x) => x.id == req.body.id);

    if (index === -1) {
      console.error("The specified old value was not found in the array.");
      return;
    }

    // Update the array with the new value
    const newArray = [...currentArray];
    newArray[index] = req.body;

    // Update the document with the modified array
    await menu.doc(documentId).update({
      ["categories"]: newArray,
    });

    console.log("Document successfully updated.");
  } catch (error) {
    console.error("Error updating document:", error);
  }
};
exports.insertMenuCategory = async (req, res) => {
  try {
    // Replace 'yourCollectionName' with the name of the collection you want to update

    // Update the document with the provided data

    let doc = await menu.doc(req.params.category).get();
    const currentArray = doc.data()["categories"];
    console.log(doc.data());
    if (!currentArray || !Array.isArray(currentArray)) {
      console.error("Invalid array field or no array exists in the document.");
      return;
    }

    // Find the index of the item based on its ID in the array
    const index = currentArray.findIndex((x) => x.id == req.body.id);

    if (index === -1) {
      // If the item ID is not found, add the new item to the categories array
      const newArray = [...currentArray, req.body];
      
      // Update the document with the modified array
      await menu.doc(req.params.category).update({
        ["categories"]: newArray,
      });
      res.status(200).json({
        status: 200,
        data:"New item added to the categories"
      })
      console.log("New item added to the categories array.");
    } else {
      // If the item ID is found, update the existing item in the categories array
      const newArray = [...currentArray];
      newArray[index] = req.body;
      
      // Update the document with the modified array
      await menu.doc(req.params.category).update({
        ["categories"]: newArray,
      });
       res.status(200).json({
        status: 200,
        data:"Existing item updated in the categories array."
      })
      console.log("Existing item updated in the categories array.");
    }

    console.log("Document successfully updated.");
  } catch (error) {
    console.error("Error updating document:", error);
     res.status(500).json({
        status: 500,
        data:error
      })
  }
};

exports.insertMenuItem = async (req, res) => {
  try {
    let type = req.type;
    let obj = {};
    obj[type] = req.addItem;
    console.log("dsdf");
    let rest = await checkAndCreateCollection("listItems", obj);

    return res.status(200).json({
      status: 200,
      data: "Successfully created",
    });
    console.log(data.data());
  } catch (err) {
    return res.status(500).json({
      status: 500,
      message: err,
    });
  }
};
