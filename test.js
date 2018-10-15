const crypto = require('./crypto');
const BigNumber = require('bignumber.js');
const faucet = require('./faucet');

const express = require('express');
const request = require('request-promise-native');


//faucet.sendMoney('dcb_1dcbabuebyrdidjti9sy414da86qa47k5snqo44g54qs86994u6gnpjxm7ga', '2')


function generateNewAccount(seed){
    const seedBytes = crypto.hex.toUint8(seed);
    const secretKeyBytes = crypto.account.generateAccountSecretKeyBytes(seedBytes, 0);
    const keyPair = crypto.account.generateAccountKeyPair(secretKeyBytes);
    const publicKeyBytes = keyPair.publicKey; 
    const address = crypto.account.getPublicAccountID(publicKeyBytes);
  
    //const seedHex = fromUint8(seedBytes);
    const secretKeyHex = crypto.hex.fromUint8(secretKeyBytes);
    //const publicKeyHex = fromUint8(publicKeyBytes);
    
    newAccount = {
      address: address,
      publicKey: crypto.hex.fromUint8(publicKeyBytes),
      secretKey: secretKeyHex,
    }
  
    return newAccount  
}

// const faucet = {
//     publicKey: '351B54A266C7D96BEB8AC27224FB4AABA944CB035F7C96F54FFCA862B4C37522',
//     secretKey: '',
//     address: 'dcb_1fauckj8fjysfhoroimk6mxnocxbam7i8quwkutnzz7aecte8xb4m8k5wz46',
//     representative: 'dcb_1dcbabuebyrdidjti9sy414da86qa47k5snqo44g54qs86994u6gnpjxm7ga',
//     lastBlock: '835718F4DFBB235A593C79C13E35A4A90B5459A0634E8BA3AE335C938127453B', // TODO update
//     balance: new BigNumber('100000000000000000000000000000000000000'), // TODO update
// }

async function testSendMoney(account, toAddress, amount){
    // calc work
    let work

    let myReq = {}
    myReq.action = 'work'
    myReq.hash = account.lastBlock
    console.log(myReq)

    try {
        const gateResponse = await request({ method: 'post', uri: 'http://localhost:4200/api/web', body: myReq, json: true })
        console.log('gateResponse: ', gateResponse)
        work = gateResponse.work;
    } catch (error) {
        console.log(error)
        return {error: error}
    }

    console.log(work)
    
    // from block and submit
    const sendBlock = crypto.sign.formSendBlock(account, toAddress, amount, work)

    console.log(sendBlock)
    
    myReq = {}
    myReq.action = 'submit'
    myReq.block = JSON.stringify(sendBlock)

    console.log(myReq)

    try {
        const gateResponse = await request({ method: 'post', uri: 'http://localhost:4200/api/web', body: myReq, json: true })
        console.log('gateResponse: ', gateResponse)
    } catch (error) {
        console.log(error)
        return {error: error}
    }
    
}

//testSendMoney(faucet, 'dcb_1fauckj8fjysfhoroimk6mxnocxbam7i8quwkutnzz7aecte8xb4m8k5wz46', new BigNumber('1'))

async function getAccInfo(){
    myReq = {}
    myReq.action = 'account_info';
    myReq.address = 'xrb_1czo3f1ebcintrfmw94qkrcpyeonibfyjnithpa7j77wjec8fj15iubscsta';
    console.log(myReq);

    // request({ method: 'post', uri: 'http://localhost:4200/api/web', body: myReq, json: true })
    // .then(async (gateResponse) => {
    //   console.log('gateResponse: ', gateResponse)
    //   //res.json(proxyRes)
    // })

    try {
        let gateResponse = await request({ method: 'post', uri: 'http://localhost:4200/api/web', body: myReq, json: true }); 
        console.log('gateResponse: ', gateResponse)
        return gateResponse;
    } catch (error) {
        console.log(error);
        return {error: error};
    }
}

function testBigNUmber(){
    const input = '123'
    const a = input.split('.',2)[0]
    let b = input.split('.',2)[1]
    while (b.length < 8) b = b + '0'
    const amount = new BigNumber(a).multipliedBy('100000000').plus(b).multipliedBy('1000000000000') 
    console.log(amount.toString(10))
}

function testBigNUmber2(){

    let input = '12300000000000000000000000000000000'

    if (input.length <= 22) {
        input = '0.0' 
    } else {
        input = input.slice(0,-22)
        if (input.length <= 8){
            input = '0.' + ('00000000'+input).slice(-8)
        } else {
            input = input.slice(0,-8) + '.' + input.slice(-8)
        }
        while (input[input.length-1] == '0') input = input.slice(0,-1)
        if (input[input.length-1] == '.') input += '0'  
    }
    console.log(input)
}

//testBigNUmber2('45345')





async function testReceive(){
    const testAcc = {
        publicKey: '351B54A266C7D96BEB8AC27224FB4AABA944CB035F7C96F54FFCA862B4C37522',
        secretKey: '',
        address: 'dcb_1fauckj8fjysfhoroimk6mxnocxbam7i8quwkutnzz7aecte8xb4m8k5wz46',
        representative: 'dcb_1dcbabuebyrdidjti9sy414da86qa47k5snqo44g54qs86994u6gnpjxm7ga',
        lastBlock: '0000000000000000000000000000000000000000000000000000000000000000', // TODO update
        balance: new BigNumber('1000000000000000000000000000000000000'), // TODO update
    }

    receiveBlock = crypto.sign.formReceiveBlock(testAcc, '1CEE153E69A9FABC6A99EF9BAB90DE8DCB82628531CE01A6E729AEBA4D2DD13A', new BigNumber('1000000000000000000000000000000000000'), 'work')
    //console.log('receiveBlock ', receiveBlock)

    myReq = {}
    myReq.action = 'submit'
    myReq.block = JSON.stringify(receiveBlock)

    console.log('myReq ', myReq)

    try {
        const gateResponse = await request({ method: 'post', uri: 'http://localhost:80/api/web', body: myReq, json: true })
        console.log('gateResponse: ', gateResponse)
    } catch (error) {
        console.log(error)
        return {error: error}
    }
}

testReceive();






//getAccInfo();



//sendFromAccount(faucet, 'dcb_1fauckj8fjysfhoroimk6mxnocxbam7i8quwkutnzz7aecte8xb4m8k5wz46', 1);




// function signObjectData(dataObject, secretKey) 
// {


//     const context = blake.blake2bInit(32, null);
//     blake.blake2bUpdate(context, STATE_BLOCK_PREAMBLE);
//     Object.keys(dataObject).forEach(function(k) {
//         if(k==='balance'){
//             blake.blake2bUpdate(context, crypto.util.hex.toUint8(balance16));
//         } else
//         if(k!=='type'){
//             blake.blake2bUpdate(context, crypto.util.hex.toUint8(dataObject[k]));
//         }
//     });
//     const hashBytes = blake.blake2bFinal(context);

//     const signed = nacl.sign.detached(hashBytes, secretKey);
//     const signature = crypto.util.hex.fromUint8(signed);

//     return signature;
// }

// const sign = {
//     sign: signObjectData,
// }

