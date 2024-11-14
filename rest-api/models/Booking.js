const mongoose = require('mongoose');

const Booking = new mongoose.Schema({
    place: {type:mongoose.Schema.Types.ObjectId, required:true, ref:"Place"},
    userId:{type:mongoose.Schema.Types.ObjectId, required:true, ref:"User"},
    name: {type:String, required:true},
    numberOfGuests: {type:Number, required:true},
    checkIn: {type:Date, required:true},
    checkOut: {type:Date, required:true},
    phone: {type:String, required:true},
    mail: {type:String, required:true},
    price: Number,
});

const BookingModel = mongoose.model('Booking', Booking);

module.exports = BookingModel;