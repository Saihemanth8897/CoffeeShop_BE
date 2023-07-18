const firebase = require("firebase/app");
const auth = require("firebase/auth");

const firebaseConfig = {
 apiKey: "AIzaSyBvPNoXwMFU5MmIIwmIZNx2b9iSambX0Y4",
  authDomain: "coffeeshop-7e7dd.firebaseapp.com",
  projectId: "coffeeshop-7e7dd",
  storageBucket: "coffeeshop-7e7dd.appspot.com",
  messagingSenderId: "41376393722",
  appId: "1:41376393722:web:e3e1f3b9abd6f45d725c43",
  measurementId: "G-CJKBY49658",
  databaseURL: "https://coffeeshop-7e7dd-default-rtdb.firebaseio.com/",
};

 

// Initialize Firebase
const ini = firebase.initializeApp(firebaseConfig);
const authentication = auth.getAuth(ini);
module.exports = { firebase,authentication, auth };