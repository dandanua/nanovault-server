const crypto = require('./crypto');
const BigNumber = require('bignumber.js');

const request = require('request-promise-native');

let faucetAccount = {
    publicKey: '351B54A266C7D96BEB8AC27224FB4AABA944CB035F7C96F54FFCA862B4C37522',
    secretKey: '',
    address: 'dcb_1fauckj8fjysfhoroimk6mxnocxbam7i8quwkutnzz7aecte8xb4m8k5wz46',
    representative: 'dcb_1dcbabuebyrdidjti9sy414da86qa47k5snqo44g54qs86994u6gnpjxm7ga',
    lastBlock: '95BA6E4A3572B93943619A68E86DC4BC2034D0C93A15BD55CB344AAE39716920',
    balance: new BigNumber('99999999999999994900000000000000000000'),
}

const API_URL = 'http://localhost:80/api/web'

async function updateFaucetAccount(){

    myReq = {}
    myReq.action = 'account_info'
    myReq.address = faucetAccount.address

    //console.log(myReq)

    try {
        const gateResponse = await request({ method: 'post', uri: API_URL, body: myReq, json: true })
        console.log('gateResponse: ', gateResponse)

        //update last block and balance if all good
        faucetAccount.lastBlock = gateResponse.lastBlock
        faucetAccount.balance = new BigNumber(gateResponse.balance)
    } catch (error) {
        console.log(error)
        return {error: error}
    }

    console.log('faucetAccount' , faucetAccount)
}

//moduleInit()


async function sendMoney(address, amountStr){
    console.log('Started faucet sending money')
    const amount = new BigNumber(amountStr)
    // calc work
    let work

    let myReq = {}
    myReq.action = 'work'
    myReq.hash = faucetAccount.lastBlock
    console.log(myReq)

    try {
        const gateResponse = await request({ method: 'post', uri: API_URL, body: myReq, json: true })
        console.log('gateResponse: ', gateResponse)
        work = gateResponse.work;
    } catch (error) {
        console.log(error)
        return {error: error}
    }

    console.log('work', work)
    
    // form block and submit
    const sendBlock = crypto.sign.formSendBlock(faucetAccount, address, amount, work)

    //console.log(sendBlock)
    
    //return

    myReq = {}
    myReq.action = 'submit'
    myReq.block = JSON.stringify(sendBlock)

    console.log(myReq)

    try {
        const gateResponse = await request({ method: 'post', uri: API_URL, body: myReq, json: true })
        console.log('gateResponse: ', gateResponse)

        //update last block and balance if all good
        if (gateResponse.hash){
            faucetAccount.lastBlock = gateResponse.hash
            faucetAccount.balance = new BigNumber(faucetAccount.balance).minus(amount)
        }

        console.log('faucetAccount after send', faucetAccount)

        return gateResponse
    } catch (error) {
        console.log(error)
        return {error: error}
    }

    
}

async function receiveFromFaucet(userAccount, sourceBlockHash, amountStr){
    console.log('Started faucet accepting money by user')

    const amount = new BigNumber(amountStr)
    // calc work
    let work

    let myReq = {}
    myReq.action = 'work'
    myReq.hash = userAccount.lastBlock
    if (myReq.hash == '0000000000000000000000000000000000000000000000000000000000000000') 
        myReq.hash = userAccount.publicKey // public key is source for unopened accounts
    console.log(myReq)

    try {
        const gateResponse = await request({ method: 'post', uri: API_URL, body: myReq, json: true })
        console.log('gateResponse: ', gateResponse)
        work = gateResponse.work;
    } catch (error) {
        console.log(error)
        return {error: error}
    }

    console.log('work', work)
    
    // form block and receive
    const receiveBlock = crypto.sign.formReceiveBlock(userAccount, sourceBlockHash, amount, work)


    myReq = {}
    myReq.action = 'submit'
    myReq.block = JSON.stringify(receiveBlock)

    console.log(myReq)

    try {
        const gateResponse = await request({ method: 'post', uri: API_URL, body: myReq, json: true })
        console.log('gateResponse: ', gateResponse)

        //update last block and balance if all good
        // not needed?
        if (gateResponse.hash){
            userAccount.lastBlock = gateResponse.hash
            userAccount.balance = new BigNumber(userAccount.balance).plus(amount)
        }
        return gateResponse
    } catch (error) {
        console.log(error)
        return {error: error}
    }

    //console.log(faucetAccount)
}

const faucet = { 
    updateFaucetAccount: updateFaucetAccount,
    sendMoney: sendMoney,
    receiveFromFaucet: receiveFromFaucet,
}

module.exports = faucet;