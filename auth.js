/* 
Author: Unique Ratliff
Date: 11/26/2020
Description: An interactive message board that allows for user
    account functionality
 */

import { v4 as uuidv4 } from 'uuid';
import {dbPromise } from './index';


//Takes a user and returns a token
export const grantAuthToken = async (userId) => {
    const db = await dbPromise;
    const tokenString = uuidv4();
    await db.run('INSERT INTO AuthTokens (token, userId) VALUES (?, ?);',
    tokenString, userId);

    return tokenString;
}

//Takes a token and returns a user
export const searchUserFromAuthToken = async (authToken) => {
    const db = await dbPromise;
    const token = await db.get('SELECT * FROM AuthTokens WHERE token=?;', authToken);
    if(!token) {
        return null;
    }
    const user = await db.get('SELECT id, email, username FROM Users WHERE id=?', token.userId);

    return user;
}