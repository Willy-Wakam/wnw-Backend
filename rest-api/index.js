const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const app = express();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const download = require('image-downloader');
const multer = require('multer');
const fs = require('fs');
const Place = require('./models/Place.js')
const Booking = require('./models/Booking.js')
require('dotenv').config();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'jscbshcshssdsuegfezefbekwr3zzz23'

app.use(express.json());
app.use(cookieParser());
// Allow all uploads to be displayed in the frontend side
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(cors({
    credentials: true,
    origin: 'https://wnw-app.onrender.com',
    allowOrigin: true,
}));


mongoose.connect(process.env.MONGO_URL);


app.post('/register', async (req, res) => {

    const {name, email, password} = req.body;

    try {
        const user = await User.create({
            name,
            email,
            // yarn add bcryptjs
            password: bcrypt.hashSync(password, bcryptSalt),
        });
        res.json(user);
        
    } catch (error) {
        console.log(error);
    }
});


app.post('/login', async (req, res) => {
    const {email, password} = req.body;

   const user = await User.findOne({email})

   if(user && user !== null) {
        const passOK = bcrypt.compareSync(password, user.password);
        if(passOK) {
            // yarn add jsonwebtoken
            jwt.sign({
                email: user.email,
                id: user._id
            }, jwtSecret, {}, (err, token) => {
                if(err) throw err;
                res.cookie('token', token, {sameSite: 'none', secure: true}).json(user);
            })
        }
        else res.json({responseStatus: 'Password not Ok'})
    }
   else res.json({responseStatus:'User not found'})

})


app.get('/profile', (req, res) => {

    // yarn add cookie-parser
    const {token} = req.cookies;
    if(token){
        jwt.verify(token, jwtSecret, {}, async (err, result) => {
            if(err) throw err;
            const {name,email,_id} = await User.findOne(result._id)
            res.json({name,email,_id});
        });
    } else    res.json(null);
})


app.post('/logout', (req, res) => {
    res.cookie('token', '', {sameSite: 'none', secure: true}).json('Logged out succesful')
})

app.get('/users', async (req, res) => {
    res.json(await User.find());
})


app.post('/upload-by-link', async (req, res) => {
    // yarn add image-downloader
    const {link} = req.body;
    const newName = 'photo_' + Date.now() + '.jpg';
    await download.image({
        url: link,
        dest: __dirname + '/uploads/' + newName
    });
    res.json({newName});
})

const photosMiddleware = multer({dest: 'uploads'});

app.post('/upload', photosMiddleware.array('photos', 100), (req, res) => {
    const uploadedPhotos = []
    for (let i = 0; i < req.files.length; i++) {
        const {path, originalname} = req.files[i];
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        const newPath = (path + '.' + ext);
        fs.renameSync(path, newPath);       
        uploadedPhotos.push({
            newName: newPath.replace('uploads\\', '')
        }); 
    }

    res.json(uploadedPhotos);
});


app.post('/places', async (req, res) => {
    const {token} = req.cookies;
    const {title, address, addedPhotos, 
        extraInfo, description, perks, 
        checkin, checkout, guests, price} = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, result) => {
        if(err) throw err; 
        const placeDoc = await Place.create({
            owner: result.id,
            title,
            address,
            description,
            extraInfo,
            photos: addedPhotos,
            checkIn: checkin,
            checkOut: checkout,
            perks,
            maxGuests: guests,
            price
        });
        res.json(placeDoc);
    });

});


app.get('/user-places', async(req, res) => {
    const {token} = req.cookies;
    if(token){
        jwt.verify(token, jwtSecret, {}, async (err, result) => {
            if(err) throw err;
            const {id} = result;
            res.json( await Place.find({owner: id}));
        });
    }
});

app.get('/places', async(req, res) => {
    res.json( await Place.find());
})


app.get('/places/:id', async(req, res) => {
    const {id} = req.params;
    res.json( await Place.findById(id));
})


app.put('/places/', async(req, res) => {
    const {token} = req.cookies;
    const {id, title, address, addedPhotos, 
        extraInfo, description, perks, 
        checkin, checkout, guests, price} = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, result) => {
        const placeDoc = await Place.findById(id);
        if(err) throw err;
        if(result.id === placeDoc.owner.toString() ){
            placeDoc.set({
                    title,
                    address,
                    description,
                    extraInfo,
                    photos: addedPhotos,
                    checkIn: checkin,
                    checkOut: checkout,
                    perks,
                    maxGuests: guests,
                    price
                })
            await placeDoc.save();
            res.json(placeDoc);
        }
    });

})

app.post('/bookings', async (req, res) => {
    const {token} = req.cookies;
    const {
        place, numberOfGuests, checkIn, checkOut, name, phone, mail, price
    } = req.body;

    jwt.verify(token, jwtSecret, {}, async (err, result) => {
        if(err) throw err; 
        const newBooking = await Booking.create({
            place,
            userId: result.id,
            numberOfGuests,
            name,
            checkIn, checkOut, phone, mail, price
        });
        res.json(newBooking);
    });

})

function compareByDate(a, b) {
    const dateA = Date.parse(a.checkOut);
    const dateB = Date.parse(b.checkOut)
    return dateB - dateA;
  }


app.get('/user-bookings', async(req, res) => {
    const {token} = req.cookies;
    jwt.verify(token, jwtSecret, {}, async (err, result) => {
        if(err) throw err;
        const {id} = result;
        let bookingList = await Booking.find({userId: id}).populate('place')
        bookingList.sort(compareByDate)
        res.json(bookingList);
    });
});
// Port for listening on api request
app.listen(4000)