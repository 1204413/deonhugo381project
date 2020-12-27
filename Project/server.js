//express
const express = require('express');
const session = require('cookie-session');
const app = express();
const formidable = require('express-formidable');
const fs = require('fs');

const SECRETKEY = 'I want to pass COMPS381F';

//const bodyParser = require('body-parser');
//const urlencodedParser = bodyParser.urlencoded({ extended: false })  

//connect mongodb
const MongoClient = require('mongodb').MongoClient;
const mongourl = '';//
const dbName = 'test';

const ObjectID = require('mongodb').ObjectID;

//use to check assert
const assert =require('assert');

//define user
const users = new Array(
	{name: 'student', password: ''},
	{name: 'demo', password: ''}
);

//Middleware
app.use(express.static('public'));
app.use(session({
	name: 'loginSession',
	keys: [SECRETKEY]
}));
app.use(formidable());

//Setting EJS
app.set('view engine', 'ejs');

//Search Restaurant
const searchRestaurant = (db, criteria, callback) => {
	let cursor = db.collection('restaurants').find(criteria);
	
	console.log(`searchRestaurant: ${JSON.stringify(criteria)}`);
	cursor.toArray((err, restaurants) => {
		assert.equal(null, err);
		console.log(`searchRestaurant : ${restaurants.length}`);
		callback(restaurants);
	});
}

const handle_Search=(res, req, criteria) => {

	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null, err);

		const db = client.db(dbName);
		console.log("Connected");
		searchRestaurant(db, criteria, (restaurants) => {
			client.close();
			console.log("Closed DB connection");
			res.status(200).render('list',{nRestaurants: restaurants.length, restaurants: restaurants});
		});
	});
}


//Create Restaurant
const createRestaurant = (db, Doc, callback) => {
	db.collection('restaurants').insertOne(Doc, (err, results) => {
		assert.equal(null, err);
		console.log("Insert one document");
		callback();//callback(results);
	});
}

const handle_Create = (req, res) => {
	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null, err);
		console.log("Connected successfully to server");
		const db = client.db(dbName);

		var Doc = {};
		Doc['name'] = req.fields.name;
		Doc['borough'] = req.fields.borough;
		Doc['cuisine'] = req.fields.cuisine;
		Doc['address'] = {};
		Doc['address']['street'] = req.fields.street;
		Doc['address']['building'] = req.fields.building;
		Doc['address']['zipcode'] = req.fields.zipcode;
		Doc['address']['coord'] = [req.fields.lon, req.fields.lat];
		Doc['Grades']= [];
		Doc['owner'] = req.session.username;
		if(req.files.photo.size >0){
			fs.readFile(req.files.photo.path, (err, data) => {
				assert.equal(null, err);
				Doc['photo']= new Buffer.from(data).toString('base64');
				Doc['mimetype'] = req.files.photo.type;
				createRestaurant(db, Doc, () => {
					client.close();
					console.log("Closed DB connection");
					res.status(200).render('success',{message: "Restaurant Create"});
				});
			});
		}else{
			createRestaurant(db, Doc, () => {
				client.close();
				res.status(200).render('success',{message: "Restaurant Create"});
			});	
		}
	});

}

//Show details
const handle_Details = (res, criteria) => {
	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null, err);
		console.log("Connected");
		const db = client.db(dbName);

		let restaurant_id = {}
		restaurant_id['_id'] = ObjectID(criteria._id)
		searchRestaurant(db, restaurant_id, (restaurants) => {
			client.close();
			console.log("Closed");
			res.status(200).render('details', {restaurant: restaurants[0]});
		});
	});
}
//Display All
const handle_Display = (res, req) => {
	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null, err);
		console.log("Connected");
		const db = client.db(dbName);

		searchRestaurant(db, null, (restaurants) => {
			client.close();
			console.log("Closed");
			res.status(200).render('index', {restaurants: restaurants});
		});
	});
}

//Handle Rate
const insertRate = (db, Doc, restaurant_id, callback) => {
	console.log(Doc);
	db.collection('restaurants').updateOne(restaurant_id, {
		$push : { Grades: Doc}
	}, (err, results) => {
		console.log(Doc);
		console.log(restaurant_id);
		assert.equal(null, err);
		console.log(results);
                callback(results);
            }
        );
}

const handle_Rate = (req, res) => {
	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null, err);
		console.log("Connected successfully to server");
		const db = client.db(dbName);

		let restaurant_id = {};
		restaurant_id['_id'] = ObjectID(req.fields._id)
		console.log(restaurant_id);
		var Doc = {};
		var Grade = {"user" : req.session.username,"score": req.fields.score};
		insertRate(db, Grade , restaurant_id, (results) => {
			
			client.close();
			res.status(200).render('success', {message: "Rating"});
		});	
	});
}

//Handle Edit
const handle_Edit =(res, req) => {
	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null, err);
		console.log("Connected successfully to server");
		const db = client.db(dbName);

		let restaurant_id = {};
		console.log(req.query._id);
		restaurant_id = ObjectID(req.query._id);
		let cursor = db.collection('restaurants').find(restaurant_id);
		cursor.toArray((err, restaurant) => {
			client.close();
			assert.equal(null, err);
			console.log("Successfully get from db");
			console.log(restaurant);
			res.status(200).render('edit', {restaurant: restaurant[0]});
		});
	});
}

//Handle Update
const updateRestaurant = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

         db.collection('restaurants').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                assert.equal(err, null);
		client.close();
		console.log("after update one");
		console.log(results);
                callback(results);
            }
        );
    });
}

const handle_Update = (req, res) => {

	var restaurant_id ={};
	restaurant_id['_id'] = ObjectID(req.fields._id);
	var updateDoc = {};

	updateDoc['name'] = req.fields.name;
	updateDoc['borough'] = req.fields.borough;
	updateDoc['cuisine'] = req.fields.cuisine;
	updateDoc['address'] = {};
	updateDoc['address']['street'] = req.fields.street;
	updateDoc['address']['building'] = req.fields.building;
	updateDoc['address']['zipcode'] = req.fields.zipcode;
	updateDoc['address']['coord'] = [req.fields.lon, req.fields.lat];

		if(req.files.photo.size >0){
			console.log("photo size > 0");
			fs.readFile(req.files.photo.path, (err, data) => {
				assert.equal(null, err);
				updateDoc['photo']= new Buffer.from(data).toString('base64');
				updateDoc['mimetype'] = req.files.photo.type;
				updateRestaurant(restaurant_id, updateDoc, (results) => {
					console.log("Pass to update with photo");
					res.status(200).render('success',{message: "Restaurant Update"});
				});
			});
		}else{
			updateRestaurant(restaurant_id, updateDoc, (results) => {
				console.log("Pass to update with no photo");
				res.status(200).render('success',{message: "Restaurant Update"});
			});	
		}
	
}

//Delete Restaurant
const deleteRestaurant = (db, restaurant_id, callback) => {
	db.collection('restaurants').deleteOne(restaurant_id, (err, results) => {
		assert.equal(err,null);
		console.log(results);
		callback(results);
	});
};
const handle_Delete = (req, res) => {
	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null, err);
		console.log("Connected succuessfully to server");
		const db =client.db(dbName);
		var restaurant_id = {};
		restaurant_id['_id'] = ObjectID(req.query._id);
		deleteRestaurant(db, restaurant_id, (results) => {
			console.log("Delete success");
			res.status(200).render('success',{message: "Restaurant Delete"});
		});
	});
}

//Handle Duplicate
const searchName = (db, criteria, callback) => {
	let cursor = db.collection('restaurants').find(criteria);
	console.log(`findDocument: ${JSON.stringify(criteria)}`);
	console.log(criteria);
	cursor.toArray((err, restaurant) => {
		assert.equal(null, err);
		console.log(`findDocument: ${restaurant.length}`);
		callback(restaurant);
	});
}

const handle_Duplicate = (req, res, callback) => {
	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null, err);
		let restaurant_id = {};
		restaurant_id['_id'] = ObjectID(req.query._id)
		const db = client.db(dbName);
		console.log("Connected");
		var booleanName = false;
		searchName(db, restaurant_id, (restaurant) => {
			console.log(restaurant[0]);
			client.close();
			var booleanName = false;
			restaurant[0].Grades.forEach((grade) => {
				console.log(req.session.username);
				console.log(grade.user);
				if(req.session.username == grade.user){
					booleanName = true;
				}
			});
		});
		callback(booleanName);
	});
}



//Main code
app.get('/', (req,res) => {
	console.log(req.session);
	if (!req.session.authenticated) {    // user not logged in!
		console.log("before redirect");
		res.redirect('/login');
	} else {
		console.log("login success");
		res.redirect('/index');
		
	}
});

app.get('/login', (req,res) => {
	res.status(200).render('login');
});

app.post('/login', (req,res) => {
	users.forEach((user) => {
		console.log("checking password");
		//&& user.password == req.fields.password
		if (user.name == req.fields.name) {
			// correct user name + password
			// store the following name/value pairs in cookie session
			req.session.authenticated = true;        // 'authenticated': true
			req.session.username = req.fields.name;	 // 'username': req.body.name
		}
	});
	res.redirect('/');
});

app.get('/index', (req, res)=>{
	if (!req.session.authenticated) {    // user not logged in!
		console.log("before redirect");
		res.redirect('/login');
	} else {
		handle_Display(res, req);
	}
	//res.status(200).render('index');
});

app.get('/create', (req, res) => {
	if (!req.session.authenticated) {
		console.log("before redirect");
		res.redirect('/login');
	} else {
		res.status(200).render('create');
	}
});

app.post('/create', (req, res) => {
	//console.log(req.fields);
	handle_Create(req, res);
	
});

app.get('/search', (req, res)=>{
	console.log(req.query);
	handle_Search(res, req, req.query);
});

app.get('/details', (req, res)=>{
	handle_Details(res, req.query);
});

app.get('/edit', (req, res)=>{
	if(req.session.username == req.query.owner){
		handle_Edit(res, req);
	}else{
		res.status(200).render('accessDenied',{message: "Only owner can update restaurant", _id: req.query._id});
	}
});

app.post('/update', (req, res)=>{
	handle_Update(req, res);
});

//delete
app.get('/delete', (req, res)=>{
	if(req.session.username==req.query.owner){
		handle_Delete(req, res);
	}else{
		res.status(200).render('accessDenied', {message: "Only owner can do this",_id: req.query._id});
	}
});


//Map page
app.get("/map", (req,res) => {
	console.log(req.query.lat);
	console.log(req.query.lon);
	res.render("leaflet.ejs", {
		lat:req.query.lat,
		lon:req.query.lon,
		zoom:req.query.zoom ? req.query.zoom : 15
	});
	res.end();
});

//Rating page
app.get('/rate', (req, res) => {
	//console.log(req.session.username);
	//console.log(req.query.owner);
	if(req.session.username == req.query.owner){
		res.status(200).render('accessDenied',{message:"You Can't Rate Your Restaurant", _id: req.query._id});
	}else{
		handle_Duplicate(req, res, (callback) =>{
			console.log(callback);
			if(callback){
				res.status(200).render('accessDenied', {message: "You can only rate once!", _id: req.query._id});
			}else{
				res.status(200).render('rate', {_id: req.query._id, name: req.query.name});
			}
		});
	}
});

app.post('/rate', (req, res) => {
	console.log(req.fields);
	console.log("Received Rate");
	handle_Rate(req, res);
});

//Logout-clear cookie-session
app.get('/logout', (req,res) => {
	req.session = null;
	res.redirect('/');
});

app.get('/api/restaurant/name/:name', (req, res)=>{
	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null, err);
		restaurant = {};
		restaurant['name'] = req.params.name;
		const db = client.db(dbName);
		searchRestaurant(db, restaurant, (result) => {
			client.close();
			res.status(200).json(result);
		});
	});
});

app.get('/api/restaurant/borough/:borough', (req, res)=>{
	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null, err);
		restaurant = {};
		restaurant['borough'] = req.params.borough;
		const db = client.db(dbName);
		searchRestaurant(db, restaurant, (result) => {
			client.close();
			res.status(200).json(result);
		});
	});
});

app.get('/api/restaurant/cuisine/:cuisine', (req, res)=>{
	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null, err);
		restaurant = {};
		restaurant['cuisine'] = req.params.cuisine;
		const db = client.db(dbName);
		searchRestaurant(db, restaurant, (result) => {
			client.close();
			res.status(200).json(result);
		});
	});
});

//Error 404 Wrong Page
app.get('/*', (req,res) => {

    res.status(404).render('error', {message: `${req.path} - Unknown request!` });
})

//Listen to PORT
app.listen(process.env.PORT||8099);
