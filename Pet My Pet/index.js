let model = firebase.auth();
let db = firebase.firestore();


const app = Sammy('#site-content', function () {
    this.use('Handlebars', 'hbs');


    this.get('/login', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/login.hbs');
            });
    });

    this.post('/login', function (context) {
        let { email, password } = context.params;
        if(email =="" || password ==""){
            window.alert("There is an empty field");
            return;
        }
        model.signInWithEmailAndPassword(email, password)
            .then((res) => {
                createUserData(res.user);
            })
            .then(() => {
                this.redirect('/dashboard');
            })
            .catch((err) => {
                errorHandler(err.message);
            });
    })

    this.get('/register', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/register.hbs');
            });
    });

    this.post('/register', function (context) {
        let { email, password, confirmPass } = context.params;
        if(email == "" || password == "" || confirmPass ==""){
            window.alert("There is an empty field.");
            return;
        }

        model.createUserWithEmailAndPassword(email, password)
            .then((res) => {
                createUserData(res.user);        
            })
            .then(() => {
                this.redirect('/dashboard');
            })
            .catch((err) => {
                errorHandler(err.message);
            });

    });

    this.get('/logout', function (context) {
        model.signOut()
            .then(() => {
                localStorage.clear();
                this.redirect('/dashboard');
            });
    });

    this.get('/dashboard', function (context) {
        db.collection('pets')
            .get()
            .then((res) => {
                context.pets = res.docs.map((pet) => { return { id: pet.id, ...pet.data() } });
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/dashboard.hbs');
                    });
            })
            .catch(errorHandler);
    });

    this.get('/createPet', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/createPet.hbs')
            });
    });

    this.post('/createPet', function (context) {
        let { name, description, imageUrl, type } = context.params;

        if (name == "" || description == "" || imageUrl == "") {
            window.alert("There is an empty field.");
            return;
        }
        let pet = {
            name,
            description,
            imageUrl,
            author: getUserData().uid,
            type,
            likes: []
        }
        async function addPet(pet) {
            const { id } = await db.collection("pets").add(pet)
            db.collection('pets').doc(id).update({petId: id})
          }
          addPet(pet);
          this.redirect('./dashboard');
    });

    this.get('/details/:petId', function (context) {
        let { petId } = context.params;

        db.collection('pets')
            .doc(petId)
            .get()
            .then((res) => {
                let petData = res.data();
                let imCreator = petData.author === getUserData().uid;
                let iLikedIt = petData.likes.includes(getUserData().email);

                let numberLikes = petData.likes.length;
            
                context.pet = { id: petId, ...petData, imCreator, iLikedIt, numberLikes };
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/details.hbs')
                    });
            });
    });

    this.get('/editPet/:petId', function (context) {
        let { petId } = context.params;
        db.collection('pets')
            .doc(petId)
            .get()
            .then((res) => {
                context.pet = { id: petId, ...res.data() };
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/editPet.hbs');
                    });
            });
    });

    this.put('/editPet/:petId', function (context) {
        let { petId, name, description, imageUrl } = context.params;
        if(name =="" || description =="" || imageUrl ==""){
            window.alert("There is an empty field.");
            return;
        }

        let petData = { ...context.params };
        db.collection('pets')
            .doc(petId).update(petData)
            .then(() => {
                this.redirect(`./details/${petId}`);
            })
    });

    this.get('/delete/:petId', function (context) {
        let { petId } = context.params;
        let choose = window.confirm("Are you sure that you want to delete this pet?");
        if(!choose){
            this.redirect('./dashboard')
            return;
        }

        db.collection('pets').doc(petId)
        .delete()
        .then(() => {
            this.redirect('./dashboard');
        })
    });


    this.get('/myPets', function (context) {
        db.collection('pets')
            .get()
            .then((res) => {
                let result = []
                let petsData = res.docs.map((pet) => {
                    return { id: pet.id, ...pet.data() }
                });
                for (let pet of petsData) {
                    if (pet.author === getUserData().uid) {
                        result.push({ pet })
                    }
                }
                context.myPets = result;
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/myPets.hbs')
                    });
            })
            .catch(errorHandler);
    });

    this.get('/like/:petId', function(context){
        let { petId } = context.params;
        
        db.collection('pets')
        .doc(petId)
        .get()
        .then((res) =>{
            const petData = {...res.data()};
            petData.likes.push(getUserData().email);
            return db.collection('pets')
                        .doc(petId)
                        .set(petData);              
        })
        .then(()=>{
            this.redirect(`./details/${petId}`);
        });
    });




});

(() => {
    app.run('./dashboard');
})();

function extendContext(context) {
    let user = getUserData();
    context.loggedIn = Boolean(user);
    context.email = user ? user.email : "";
    return context.loadPartials({
        'header': './templates/partials/header.hbs',
        'footer': './templates/partials/footer.hbs'
    })
}

function createUserData(data) {
    let { email, uid } = data;
    localStorage.setItem('user', JSON.stringify({ email, uid }));
}

function getUserData() {
    let user = localStorage.getItem("user");
    return user ? JSON.parse(user) : "";
}

function errorHandler(error) {
console.log(error)
}