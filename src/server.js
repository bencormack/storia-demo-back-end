import express from "express";
import { db, connectToDb } from "./db.js";
import fs from 'fs';
import admin from 'firebase-admin';

import 'dotenv/config';

const credentials = JSON.parse(
    fs.readFileSync('./credentials.json')
);
admin.initializeApp({
    credential: admin.credential.cert(credentials)
});

// let posts = [{
//     username: 'ben@bencormack.com',
//     title: 'My first post',
//     date: '22/4/2023',
//     time: '0',
//     copy: 'This is the body copy for the post'
// }, {
//     username: 'ben@bencormack.com',
//     title: 'My second post',
//     date: '22/4/2023',
//     time: '100',
//     copy: 'This is the body copy for the post'
// }];

const expressApp = express();
expressApp.use(express.json()); 

// TODO - remove this when not needed
expressApp.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

expressApp.use(async (req, res, next) => {
    const { authtoken } = req.headers;

    if (authtoken) {
        try {
            req.user = await admin.auth().verifyIdToken(authtoken);
        } catch(e) {
            res.sendStatus(400);
            return;
        }
    }

    req.user = req.user || {};
    
    next();
});

// Get the details for a specific post
expressApp.post('/getPost', async (req, res) => {
    const { title } = req.body;
    const { uid } = req.user;

    const post = await db.collection('posts').findOne({ title: title });

    if (post) {
        res.json(post);
    } else {
        res.sendStatus(404);
    }
    
});

// Get all posts
expressApp.get('/getAllPosts', async (req, res) => {
    const allPostsList = await db.collection('posts').find().toArray();

    if (allPostsList) {
        res.json(allPostsList);
    } else {
        res.sendStatus(404);
    }
    
});

// Check user is logged in
expressApp.use((req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.sendStatus(401);
    }
});

// Get your posts
expressApp.post('/getYourPosts', async (req, res) => {
    const { username } = req.body;

    const formattedUsername = username.replaceAll('"','');

    const allPostsList = await db.collection('posts').find({ username: formattedUsername }).toArray();

    if (allPostsList) {
        res.json(allPostsList);
    } else {
        res.sendStatus(404);
    }
    
});

// Add a new post
expressApp.post('/addPost', async (req, res) => {
    const { title, copy } = req.body;
    const { email } = req.user;
    const d = new Date().getDate() + '/' + (new Date().getMonth() + 1) + '/' + new Date().getFullYear();
    const t = new Date().getTime();
    const post = await db.collection('posts').insertOne({
                                                    username: email,
                                                    title: title,
                                                    date: d,
                                                    time: t,
                                                    copy: copy
                                                });

    // TODO - return the full array of posts rather than just a confirmation
    if (post) {
        res.json(post);
    } else {
        res.sendStatus(404);
    }
});

// Delete a post
expressApp.post('/deletePost', async (req, res) => {
    const { title } = req.body;
    const post = await db.collection('posts').deleteOne({
                                                    title: title
                                                });

    // TODO - return the full array of posts rather than just a confirmation
    if (post) {
        res.json(post);
    } else {
        res.sendStatus(404);
    }
});

connectToDb(() => {
    expressApp.listen(8000, () => {
        console.log('Server active : port 8000');
    })
})