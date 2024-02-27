      // Import the functions you need from the SDKs you need
      import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
      import { getAuth, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
      import { getDatabase, ref, set, child, get, push, increment, onValue, update } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js'
      import { getStorage, ref as storageRef, getDownloadURL, listAll, uploadBytes  } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js'
      import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js'
 
      const vapidKey = 'BNm_XFcD3OEB8txsriK-56ctLoMnZV2PsTKs6qpitcn6zrJhcS3vUU1nif7-bQPuPfeKDNOEZx9Vu9z_NzlRHlA';

      const firebaseConfig = {
        apiKey: "AIzaSyCo7VJ_rskVkgvi6gSUEj3A2cegIG4D0Rc",
        authDomain: "gdeyamama-41094.firebaseapp.com",
        projectId: "gdeyamama-41094",
        storageBucket: "gdeyamama-41094.appspot.com",
        messagingSenderId: "462554712065",
        appId: "1:462554712065:web:cf4a4c318c34b38b851800",
        databaseURL: "https://gdeyamama-41094-default-rtdb.europe-west1.firebasedatabase.app",
        storageBucket: 'gs://gdeyamama-41094.appspot.com',
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
        increment: async (count = 1) => {
          return increment(count);
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

      window.pushMsg = {
        getToken: async () => {
          return await getToken(messaging, { vapidKey });
        },
        send: async (msg) => {
          const formData = new FormData();
          formData.append('deviceId', msg.deviceId);
          formData.append('title', msg.title);
          formData.append('body', msg.body);
          formData.append('icon', msg.icon);
          formData.append('site', msg.site);
          fetch(`https://fednik.ru/shtorm/webpush/gdeyamama.php`, {
            method: 'POST',
            body: formData
          })
        }
      }

      onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        const event = new CustomEvent("authStateChange1", { detail: { user } });
        window.dispatchEvent(event)
        // ...
      })

 
       
      window.auth = {
        user: null,
        login: () => {
          return setPersistence(auth, browserLocalPersistence).then(() => {
            const provider = new GoogleAuthProvider();

            const e = localStorage.getItem('last-g-user');
            if (e) {
              provider.setCustomParameters({
                'login_hint': e
              });
            }


            return signInWithPopup(auth,provider);
          })
        },
        logout: () => {
          localStorage.removeItem('last-g-user');
          return signOut(auth);
        },
        loginListeners: [],
        logoutListeners: []
      }

      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const event = new CustomEvent("authStateChange", { detail: { user } });
          window.dispatchEvent(event)

          localStorage.setItem('last-g-user', user.email)

          console.info('onAuthStateChanged', user)
          window.auth.user = user;
          const cur = await window.db.get(`users/${user.uid}`)
          if (!cur) {
            await window.db.set(`users/${user.uid}`, { name: user.displayName, photo: user.photoURL, email: user.email, lastLogin: new Date().toISOString() });
          }
          
          window.auth.loginListeners.forEach((cb) => cb.call(cb, user))
        } else {
          const event = new CustomEvent("authStateChange", { detail: { user: null } });
          window.dispatchEvent(event)
          window.auth.user = null;
          console.log('onAuthStateChanged NO', user);
          window.auth.logoutListeners.forEach((cb) => cb.call(cb))
        }
      });
