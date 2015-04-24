"use strict";

var mongoose = require("mongoose");
var color = require("../color");

// create mongodb schema for our lectures
var DishSchema = new mongoose.Schema({
    dishName: String,
    category: String,
    date: Date,
    priceInternal: Number,
    priceExternal: Number,
    attributes: [String],
    allergens: [String],
    additives: [String]
}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

// create model from our schema & export it
module.exports = mongoose.model("Dish", DishSchema, "dishes");
