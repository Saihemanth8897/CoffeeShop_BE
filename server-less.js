const admin = require("firebase-admin");
const authData = require("./authControllers/auth");
const credentials = require("./serviceAccountKey.json");

let uuid = require("uuid");
admin.initializeApp({
  credential: admin.credential.cert(credentials),
});
const db = admin.firestore();
let userDetails = db.collection("userDetails");
let menu = db.collection("menu");
let listItems = db.collection("listItems");
let customer_orders = db.collection("customerOrders");
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
            isExistedItem = existingData.data.findIndex(
              (x) => x.itemid === data[docId].itemid
            );
            if (isExistedItem == -1) {
              await documentRef.update({
                data: [...existingData.data, data[docId]],
              });
            } else {
              existingData.data[isExistedItem] = data[docId];
              await documentRef.update({
                data: [...existingData.data],
              });
            }

            console.log(
              `New items inserted into document "${docId}" in collection.`
            );
          } else if (existingData.data) {
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
      } else {
        // If the document does not exist, create a new document with the provided data
        if (collectionName === "menu") {
          await documentRef.set({
            categories: Array.isArray(data[docId])
              ? data[docId]
              : [data[docId]],
          });
          console.log(
            `New document "${docId}" created with categories in collection.`
          );
        } else if (collectionName === "listItems") {
          await documentRef.set({
            data: Array.isArray(data[docId]) ? data[docId] : [data[docId]],
          });
          console.log(
            `New document "${docId}" created with items in collection.`
          );
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
    displayName: req.body.username,
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
     const snapshot = await userDetails
    .where("username", "==", req.body.username)
    .get();
  if (snapshot.empty) {
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
  }else{
     return res.status(400).json({
      status: 400,
      data: "User name is already taken. Please choose other username",
    });
  }
   
  } catch (error) {
    return res.status(400).json({
      status: 400,
      data: error.message,
    });
  }
};

exports.login = async (req, res) => {
  const snapshot = await userDetails
    .where("username", "==", req.body.username)
    .get();
     //console.log(snapshot)
  if (!snapshot.empty) {
    
    snapshot.forEach((doc) => {
      req.body["email"] = doc.data().emailId;
       req.body["userdetails"] = doc.data()
    
    });
    const resdata = await authData.login(req, res);
    console.log(resdata)
   
    // resdata.data()['data']['userdetails'] = doc.data()
    // return res.status(200).json({
    //   status: 200,
    //   data: resdata.data
    // })
   // const userData = await snapshot.docs[resdata.data.user.uid].data();
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
    let doc = await menu.doc(req.params.category).get();
    const currentArray = doc.data()["categories"];
    if (!currentArray || !Array.isArray(currentArray)) {
      await menu.doc(req.params.categor).update({
        ["categories"]: res.body,
      });
      console.error("Invalid array field or no array exists in the document.");
      res.status(200).json({
        status: 200,
        data: "New item added to the categories",
      });
      return;
    }

    const index = currentArray.indexOf((x) => x.id == req.body.id);

    if (index === -1) {
      console.error("The specified old value was not found in the array.");
      return;
    }

    const newArray = [...currentArray];
    newArray[index] = req.body;

    await menu.doc(req.params.category).update({
      ["categories"]: newArray,
    });

    console.log("Document successfully updated.");
  } catch (error) {
    console.error("Error updating document:", error);
  }
};

exports.insertMenuCategory = async (req, res) => {
  try {
    let doc = await menu.doc(req.params.category).get();
    const currentArray = doc.data()["categories"];
    if (!currentArray || !Array.isArray(currentArray)) {
      const categoriesArray = req.body; // Replace with the correct property containing the categories array in req.body

      await menu.doc(req.params.category).update({
        categories: [categoriesArray],
      });

      console.error("Invalid array field or no array exists in the document.");
      res.status(200).json({
        status: 200,
        data: "New item added to the categories",
      });
      return;
    }

    // Find the index of the item based on its ID in the array
    const index = currentArray.findIndex((x) => x.id == req.body.id);

    if (index === -1) {
      // If the item ID is not found, add the new item to the categories array
      const newArray = [...currentArray, req.body];

      // Update the document with the modified array
      await menu.doc(req.params.category).update({
        categories: newArray,
      });
      res.status(200).json({
        status: 200,
        data: "New item added to the categories",
      });
      console.log("New item added to the categories array.");
    } else {
      // If the item ID is found, update the existing item in the categories array
      const newArray = [...currentArray];
      newArray[index] = req.body;

      // Update the document with the modified array
      await menu.doc(req.params.category).update({
        categories: newArray,
      });
      res.status(200).json({
        status: 200,
        data: "Existing item updated in the categories array.",
      });
      console.log("Existing item updated in the categories array.");
    }

    console.log("Document successfully updated.");
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({
      status: 500,
      data: error,
    });
  }
};

exports.insertMenuItem = async (req, res) => {
  try {
    let type = req.type;
    console.log(type)
    let obj = {};
    obj[type] = req.addItem;
    let rest = await checkAndCreateCollection("listItems", obj);

    return res.status(200).json({
      status: 200,
      data: "Successfully created",
    });
  } catch (err) {
    return res.status(500).json({
      status: 500,
      message: err,
    });
  }
};

// exports.updateMenuItem = aync(req, res)=> {
//   try {
//     let itemData = await listItems.doc(req.doc).get();
//   }
// }

exports.getItemFromListItemByDocItemId = async (req, res) => {
  try {
    let dataList = await listItems.doc(req.doc).get();

    dataList = await dataList.data();
    let result = await dataList.data.filter((x) => x.itemid == req.itemid);
    if (result) {
      return await res.status(200).json({
        status: 200,
        data: result[0],
        message: "data Fetched Successfully",
      });
    } else {
      return await res.status(400).json({
        status: 400,
        data: null,
        message: "No data Found",
      });
    }
  } catch (err) {
    return await res.status(500).json({
      status: 500,
      data: null,
      message: err,
    });
  }
};

async function UpdateTheQuantity(req) { //itemInfo
    await req.body.orderedItems.forEach(async (product) => {
           const docRef = db.collection("listItems").doc(product.category_id);
    const doc = await docRef.get();
      const currentData = doc.exists ? doc.data().data : [];
      if (currentData.length > 0) {
          const itemToUpdate = currentData.find((item) => item.itemid === product.itemId);

          if (!itemToUpdate) {
            console.error(`Item "${product.name}" not found in the menu.`);
            return;
          }
        const sizeObjectToUpdateIndex = itemToUpdate.sizes.findIndex((sizeObj) => sizeObj.size === product.itemInfo.size);
        if (Number(itemToUpdate.sizes[sizeObjectToUpdateIndex].inStockQty) >= Number(product.itemInfo.isSelected)) {
           itemToUpdate.sizes[sizeObjectToUpdateIndex].inStockQty = String(Number(itemToUpdate.sizes[sizeObjectToUpdateIndex].inStockQty) - Number(product.itemInfo.isSelected))
          const itemToUpdateIdx = currentData.findIndex((item) => item.itemid === product.itemId);
          currentData[itemToUpdateIdx] = itemToUpdate
          await docRef.set({ data: currentData });
          console.log('item updated')
        
        } else {
           console.error(`Item "${product.name}" not found in the menu.`);
            return throwError(`${product.name}" is have only available ${itemToUpdate.sizes[sizeObjectToUpdateIndex].inStockQty} Items InStoct.`)
        }

      }
       
          })
}

// exports.CreateUpdateNotificationList = async (req, res) => {
  
//    try {
//     const collections = await db.listCollections();
//     let collectionExists = false;

//     for (const collection of collections) {
//       if (collection.id === "notificationList") {
//         collectionExists = true;
//         break;
//       }
//     }
//     if (!collectionExists) {
//     console.log('dsfgd')
//       const collectionRef = db.collection("notificationList");
//       console.log('asfd')
//       const docRef = collectionRef.doc("list")
//       docRef.set({
//           data:[
//           req.body
//           ]})
//         .then(async (result) => { //category_id
          
//           res.status(200).json({
//             status: 200,
//             data: null,
//             message: "Your order was Notifies To Manager successfully!",
//           });
//         })
//         .catch((err) => {
//           res.status(500).json({
//             status: 500,
//             data: null,
//             message: err,
//           });
//         });
//     } else {
//       const collectionRef = db.collection("notificationList");

//       const documentRef = collectionRef.doc("list");
//       const docSnapshot = await documentRef.get();

//       if (docSnapshot.exists) {
//         const existingData = docSnapshot.data();
//         if (existingData.data && existingData.data.length > 0) {
//           await documentRef.update([...existingData.data, req.body]); //update
//         } else {
//           await documentRef.update([req.body]);
//         }
//       } else {
//          const existingData = docSnapshot.data();
       
//         if (existingData.data && existingData.data > 0) {
//           await documentRef.set([...existingData.data, req.body]);
//         } else {
//           await documentRef.set([req.body]);
//         }
//       }
   
//       res.status(200).json({
//         status: 200,
//         data: null,
//         message: "Your order was placed successfully!",
//       });
//     }
//    } catch (err) {
//      console.log('er', err)
//     res.status(500).json({
//       status: 500,
//       data: null,
//       message: err,
//     });
//   }
// }

exports.CreateUpdateNotificationList = async (req, res) => {
  try {
    console.log(req.body)
    const collections = await db.listCollections();
    let collectionExists = false;

    for (const collection of collections) {
      if (collection.id === "notificationList") {
        collectionExists = true;
        break;
      }
    }

    if (!collectionExists) {
      const collectionRef = await db.collection("notificationList");
      const docRef = await collectionRef.doc("list");

      // await docRef.set({
      //   data: [req.body],
      // });
      
       await docRef.create({
            data:req.body ? [req.body]:[],
          })

      return res.status(200).json({
        status: 200,
        data: null,
        message: "Your order was Notifies To Manager successfully!",
      });
    } else {
      const collectionRef = db.collection("notificationList");
      const documentRef = await collectionRef.doc("list");
      const docSnapshot = await documentRef.get();

      if (docSnapshot.exists) {
        const existingData = docSnapshot.data();
        let newData = [];

        if (existingData && existingData.data && existingData.data.length > 0) {
          newData = [...existingData.data, req.body];
        } else {
          newData = [req.body];
        }

        await documentRef.update({
          data: newData,
        });
      } else {
        // If the document doesn't exist, create a new one with the given data
        await documentRef.set({
          data: [req.body],
        });
      }

      res.status(200).json({
        status: 200,
        data: null,
        message: "Your order was placed successfully!",
      });
    }
  } catch (err) {
    console.log('Error:', err);
    res.status(500).json({
      status: 500,
      data: null,
      message: "Internal Server Error",
    });
  }
}

exports.getNotificationsCount = async (req, res) => {
  try {
   
    const collectionRef = db.collection("notificationList");
    const result = await collectionRef.doc("list").get();
    if (result.exists) {
     
      return res.status(200).json({
        status: 200,
        data: result.data().data.length,
        message: 'Notifications are available'
      });
    } else {
      return res.status(200).json({
        status: 200,
        data: null,
        message: 'No Notifications are available'
      });
    }
  } catch (error) {
    return res.status(400).json({
      status: 400,
      data: null,
      message: error.message,
    });
  }
}

exports.getNotifications = async (req, res) => {
  try {
    const collections = await db.listCollections();
    let collectionExists = false;

    for (const collection of collections) {
      if (collection.id === "notificationList") {
        collectionExists = true;
        break;
      }
    }
      const collectionRef = db.collection("notificationList");
    if (!collectionExists) {
      await collectionRef.doc("list").set([])
       return  res.status(200).json({
            status: 200,
            data: [],
           message: 'No Notifications are available'
          })
    } else {
     

      const documentRef = collectionRef.doc("list");
      const docSnapshot = await documentRef.get();

      if (docSnapshot.exists) {
        const existingData = docSnapshot.data();
        if (existingData.data) {
         await collectionRef.doc("list").set({
              data: []
            })
          return  res.status(200).json({
            status: 200,
            data: existingData.data,
           message: 'data fetched'
          }) 
        }
      } else {
         return  res.status(200).json({
            status: 200,
            data: [],
           message: 'No Notifications are available'
          })
      }
    }
  }
  catch (err) {
    res.status(500).json({
      status: 500, 
      message: err
    })
  }
}
exports.createOrder = async (req, res) => {
  try {
    const collections = await db.listCollections();
    let collectionExists = false;

    for (const collection of collections) {
      if (collection.id === "customerOrders") {
        collectionExists = true;
        break;
      }
    }
    if (!collectionExists) {
      console.log('ad')
      const collectionRef = db.collection("customerOrders");

      collectionRef
        .doc("list")
        .set({
          data: [req.body],
        })
        .then(async (result) => { //category_id
          await UpdateTheQuantity(req)
          res.status(200).json({
            status: 200,
            data: null,
            message: "Your order was placed successfully!",
          });
        })
        .catch((err) => {
          res.status(500).json({
            status: 500,
            data: null,
            message: err+'j',
          });
        });
    } else {
      const collectionRef = db.collection("customerOrders");

      const documentRef = collectionRef.doc("list");
      const docSnapshot = await documentRef.get();

      if (docSnapshot.exists) {
        const existingData = docSnapshot.data();
        if (existingData.data && existingData.data.length > 0) {
          await documentRef.update({
            data: [...existingData.data, req.body],
          }); //update
        } else {
          await documentRef.update({
            data: [req.body],
          });
        }
      } else {
         const existingData = docSnapshot.data();
       
        if (existingData.data && existingData.data.length > 0) {
          await documentRef.set({
            data: [...existingData.data, req.body],
          });
        } else {
          await documentRef.set({
            data: [req.body],
          });
        }
      }
     await UpdateTheQuantity(req)
      res.status(200).json({
        status: 200,
        data: null,
        message: "Your order was placed successfully!",
      });
    }
  } catch (err) {
    res.status(500).json({
      status: 500,
      data: null,
      message: err,
    });
  }
};
exports.getOrdersByOrder = async (req, res) => {
  try {
    await customer_orders
      .doc("list")
      .get()
      .then((result) => {
   
        res.status(200).json({
          status: 200,
          data: result.data().data,
         
        });
      })
     
  } catch (err) {
    res.status(400).json({
      status: 400,
      data: null,
      message: err,
    });
  }
};
