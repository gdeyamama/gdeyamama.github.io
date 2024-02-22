      // Import the functions you need from the SDKs you need
      import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
      import { getAuth, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
      import { getDatabase, ref, set, child, get, push, increment, onValue } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js'
      import { getStorage, ref as storageRef, getDownloadURL, listAll, uploadBytes  } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js'

      const firebaseConfig = {
        apiKey: "AIzaSyCo7VJ_rskVkgvi6gSUEj3A2cegIG4D0Rc",
        authDomain: "gdeyamama-41094.firebaseapp.com",
        projectId: "gdeyamama-41094",
        storageBucket: "gdeyamama-41094.appspot.com",
        messagingSenderId: "462554712065",
        appId: "1:462554712065:web:cf4a4c318c34b38b851800",
        databaseURL: "https://gdeyamama-41094-default-rtdb.europe-west1.firebasedatabase.app",
        storageBucket: 'gs://gdeyamama-41094.appspot.com'
      };
    
      // Initialize Firebase
      const app = await initializeApp(firebaseConfig);
        
      const database = getDatabase(app);
        
      const auth = getAuth(app);

      const storage = getStorage(app);
      const messaging = getMessaging(app);

      //console.log('auth.currentUser', auth.currentUser)

      window.db = {
        set: async (path, data) => {
          return await set(ref(database, path), data);
        },
        get: async (path) => {
          const snapshot = await get(child(ref(database), path));
          if (snapshot.exists()) {
            return snapshot.val()
          }

          return null;
        },
        update: async (pathValueMap) => {
          return update(ref(database), pathValueMap);
        },
        getUniqueKey: async (path) => {
          return await push(child(ref(database), path)).key
        },

        addListener: (path, cb) => {
          const r = ref(database, path);
          onValue(r, (snapshot) => {
            const data = snapshot.val();
            cb(data);
          });
        },
        removeListener: (path) => {

        },
        
      }

      window.cloudStorage = {
        addFile: async (path, file) => {
          const fileRef = storageRef(storage, path);
          return await uploadBytes(fileRef, file);
        },
        getFileUrl: async (path) => {
            const fileRef = storageRef(storage, path);
            return await getDownloadURL(fileRef)
        },
        listFiles: async (path) => {
            const fileRef = storageRef(storage, path);
            const { items } = await listAll(fileRef);
            return items
        },
      }
       
      window.auth = {
        user: null,
        login: () => {
          setPersistence(auth, browserLocalPersistence).then(() => {
            const provider = new GoogleAuthProvider();
            return signInWithPopup(auth,provider);
          })
        },
        logout: () => {
          signOut(auth);
        },
        loginListeners: [],
        logoutListeners: []
      }

      onAuthStateChanged(auth, (user) => {
        if (user) {
          window.auth.user = user;
          window.db.set(`users/${user.uid}`, { name: user.displayName, photo: user.photoURL, email: user.email, lastLogin: new Date().toISOString() })
          window.auth.loginListeners.forEach((cb) => cb.call(cb, user))
        } else {
          window.auth.user = null;
          console.log('onAuthStateChanged NO', user);
          window.auth.logoutListeners.forEach((cb) => cb.call(cb))
        }
      });
