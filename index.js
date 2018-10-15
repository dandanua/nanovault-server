require('dotenv').config(); // Load variables from .env into the environment

const timestamps = require('./timestamps');

/** Configuration **/
const nanoNodeUrl = process.env.NANO_NODE_URL || `http://[::1]:55000`; // Nano node RPC url
const nanoWorkNodeUrl = process.env.NANO_WORK_NODE_URL || `http://[::1]:55000`; // Nano work node RPC url
const listeningPort = process.env.APP_PORT || 4200; // Port this app will listen on

const useRedisCache = !!process.env.USE_REDIS || false; // Change this if you are not running a Redis server.  Will use in memory cache instead.
const redisCacheUrl = process.env.REDIS_HOST || `172.31.25.214`; // Url to the redis server (If used)
const redisCacheTime = 60 * 60 * 24; // Store work for 24 Hours
const memoryCacheLength = 800; // How much work to store in memory (If used)

// import crypto libs
// const nacl = require('./nacl');
// const blake = require('blakejs');
const crypto = require('./crypto');
const BigNumber = require('bignumber.js');
const faucet = require('./faucet')


const express = require('express');
const request = require('request-promise-native');
const cors = require('cors');
const { promisify } = require('util');

const workCache = [];
let getCache, putCache;

// Set up the webserver
const app = express();
app.use(cors());
app.use(express.json());

// Serve the production copy of the wallet
app.use(express.static('static'));
app.get('/*', (req, res) => res.sendFile(`${__dirname}/static/index.html`));

app.post('/api/4clover', async (req, res) => {
  console.log('4clover body: ', req.body)

  // send further
  req.body.user = 'dcb_1y7u83jps7j1aqzgekqhwi6pr4z35dqz1icjegrkfcfqwmtzcrzk3abxgrdx'

  request({ method: 'get', uri: 'http://34.212.109.62:3333/games/lottery3x3?req='+JSON.stringify(req.body), 
  // headers: {
  //   'content-type': 'text/html; charset=UTF-8' 
  // },
  // json: false
})
  .then(async proxyRes => {
    console.log('proxyRes: ', proxyRes)
    //res.json(proxyRes)
    res.json(JSON.parse(proxyRes))
  })
  .catch(err => res.status(500).json(err.toString()));

  // try {
  //   let proxyRes = await request({ method: 'get', uri: 'http://34.212.109.62:3333/games/lottery3x3?req='+req.body, json: false}) 
  //   console.log('proxyRes: ', proxyRes)

  //   return res.json(JSON.parse(proxyRes)) // TODO kill kostyl'

  //   //return gateResponse;
  // } catch (error) {
  //     console.log(error);
  //     return res.json({error: error});
  // }

  //return res.json(req.body)
});

app.post('/api/web', async (req, res) => {
  console.log('body: ', req.body);

  // simple Echo
  if (req.body.action === 'echo') {
    data = req.body
    data.echo = 'success';

    return res.json(data);
  }

  // Registration
  if (req.body.action === 'registration') {
    newAccount = crypto.account.generateNewAccount();
    console.log('new account: ', newAccount);
    
    newAccount.action = 'registration';
    newAccount.email = req.body.email;
    // req.body.account = newAccount;
    // req.body.action = 'echo';
    // //console.log(req.body);
    
    //request({ method: 'post', uri: `http://localhost:4200/api/web`, body: req.body, json: true })
    request({ method: 'post', uri: `http://34.212.109.62:3333/req/`, body: newAccount, json: true })
    .then(async (proxyRes) => {
      console.log('proxyRes: ', proxyRes)

      if (proxyRes.success){
        try{
          const faucetUpdate = await faucet.updateFaucetAccount()
          console.log('faucetUpdate ', faucetUpdate)
          const faucetSend  = await faucet.sendMoney(newAccount.address, '1000000000000000000000000000000')
          console.log('faucetSend ', faucetSend)
          const faucetReceive  = await faucet.receiveFromFaucet(newAccount, faucetSend.hash, '1000000000000000000000000000000')
          console.log('faucetReceive ', faucetReceive)
        } catch (error) {
          console.log(error)
        }
      }

      res.json(proxyRes)
    })
    .catch(err => res.status(500).json(err.toString()));

  }

  // Account info (Login)
  if (req.body.action === 'account_info') {
    myReq = {}
    myReq.action = 'account_info';
    myReq.account = 'xrb' + req.body.address.slice(3);
    console.log(myReq);

    try {
      let proxyRes = await request({ method: 'post', uri: nanoNodeUrl, body: myReq, json: true }); 
      console.log('proxyRes: ', proxyRes)
      response = {}
      response.lastBlock = proxyRes.frontier
      response.balance = proxyRes.balance
      response.shortBalance = crypto.util.shortBalance(response.balance) 
      response.error = proxyRes.error

      if (proxyRes.error === 'Account not found'){
        response.lastBlock = '0000000000000000000000000000000000000000000000000000000000000000'
        response.balance = '0'
        response.shortBalance = crypto.util.shortBalance(response.balance) 
        response.error = undefined
      }

      res.json(response)
  
      //return gateResponse;
    } catch (error) {
        console.log(error);
        res.json({error: error});
    }

  }

  // Submit block (send or receive)
  if (req.body.action === 'submit') {
    myReq = {}
    myReq.action = 'process'
    myReq.block = req.body.block.replace(/dcb_/g, 'xrb_')

    console.log(myReq);

    try {
      let proxyRes = await request({ method: 'post', uri: nanoNodeUrl, body: myReq, json: true }); 
      console.log('proxyRes: ', proxyRes)
      response = {}
      response = proxyRes

      res.json(response)
  
      //return gateResponse;
    } catch (error) {
        console.log(error);
        res.json({error: error});
    }

  }

  // Block info   NOT NEEDED?
  if (req.body.action === 'block_info') {
  
    myReq = req.body;
    myReq.action = 'block';
    console.log(myReq);

    request({ method: 'post', uri: nanoNodeUrl, body: myReq, json: true })
    .then(async (proxyRes) => {
      console.log('proxyRes: ', proxyRes)
      //proxyRes = 
      // response = {
      //   lastBlock: proxyRes.frontier,
      //   balance: proxyRes.balance,
      // }
      res.json(proxyRes)
    })
    .catch(err => res.status(500).json(err.toString()));

  }

  // Incoming blocks (100 incoming transactions)
  if (req.body.action === 'incoming') {
    myReq = {};
    myReq.account = 'xrb' + req.body.address.slice(3);
    myReq.action = 'pending';
    myReq.source = true;
    myReq.count = 100;

    console.log(myReq);

    request({ method: 'post', uri: nanoNodeUrl, body: myReq, json: true })
    .then(async (proxyRes) => {
      console.log('proxyRes: ', proxyRes)
      
      // change dcb_
      blocks = proxyRes.blocks;
      Object.keys(blocks).forEach(function(hash) {
        blocks[hash].source = 'dcb' + blocks[hash].source.slice(3)  
      })

      res.json(proxyRes)
    })
    .catch(err => res.status(500).json(err.toString()));
  }

  // Work generate 
  if (req.body.action === 'work') {
    myReq = {}
    myReq.action = 'work_generate';
    myReq.hash = req.body.hash;
    console.log(myReq);

    request({ method: 'post', uri: nanoWorkNodeUrl, body: myReq, json: true })
    .then(async (proxyRes) => {
      console.log('proxyRes: ', proxyRes)
      res.json(proxyRes)
    })
    .catch(err => res.status(500).json(err.toString()));

  }

  // Clover Notify
  if (req.body.action === 'clover_deposit') {
    
    // TODO check send block
    // TODO submit receive block on blockchain
    // TODO amount / 10^20

    reqBody = {
      action: 'deposit',
      address: 'dcb_1y7u83jps7j1aqzgekqhwi6pr4z35dqz1icjegrkfcfqwmtzcrzk3abxgrdx',
      amount: '100000000'
    }
    
    request({ method: 'post', uri: `http://34.212.109.62:3333/req/`, body: reqBody, json: true })
    .then(async (proxyRes) => {
      console.log('proxyRes: ', proxyRes)
      res.json(proxyRes)
    })
    .catch(err => res.status(500).json(err.toString()));

  }

  if (req.body.action === 'clover_withdraw') {
    
    // TODO check withdraw block
    // TODO amount / 10^20

    reqBody = {
      action: 'withdraw',
      address: 'dcb_1y7u83jps7j1aqzgekqhwi6pr4z35dqz1icjegrkfcfqwmtzcrzk3abxgrdx',
      //amount: '1'
    }
    
    request({ method: 'post', uri: `http://34.212.109.62:3333/req/`, body: reqBody, json: true })
    .then(async (proxyRes) => {
      console.log('proxyRes: ', proxyRes)
      // TODO take amount from clover balance on blockchain
      res.json(proxyRes)
    })
    .catch(err => res.status(500).json(err.toString()));

  }


});

// Allow certain requests to the Nano RPC and cache work requests
app.post('/api/node-api', async (req, res) => {
  const allowedActions = [
    //'registration',

    'account_history',
    'account_info',
    'accounts_frontiers',
    'accounts_balances',
    'accounts_pending',
    'block',
    'blocks',
    'block_count',
    'blocks_info',
    'delegators_count',
    'pending',
    'process',
    'representatives_online',
    'validate_account_number',
    'work_generate',
  ];
  if (!req.body.action || allowedActions.indexOf(req.body.action) === -1) {
    return res.status(500).json({ error: `Action ${req.body.action} not allowed` });
  }

  let workRequest = false;
  let representativeRequest = false;
  let repCacheKey = `online-representatives`;

  // Registration
  // if (req.body.action === 'registration') {
  //   console.log(req.body);
  //   testAccGen();
  //   return res.json({ success: true });
  // }

  // Cache work requests
  if (req.body.action === 'work_generate') {
    console.log(req.body);
    if (!req.body.hash) return res.status(500).json({ error: `Requires valid hash to perform work` });

    const cachedWork = useRedisCache ? await getCache(req.body.hash) : getCache(req.body.hash); // Only redis is an async operation
    if (cachedWork && cachedWork.length) {
      return res.json({ work: cachedWork });
    }
    workRequest = true;
  }

  // Cache the online representatives request
  if (req.body.action === 'representatives_online') {
    const cachedValue = useRedisCache ? await getCache(repCacheKey) : getCache(repCacheKey); // Only redis is an async operation
    if (cachedValue && cachedValue.length) {
      return res.json(JSON.parse(cachedValue));
    }
    representativeRequest = true;
  }

  // Send the request to the Nano node and return the response
  // console.log(req.body);

  request({ method: 'post', uri: (workRequest || representativeRequest) ? nanoWorkNodeUrl : nanoNodeUrl, body: req.body, json: true })
    .then(async (proxyRes) => {
      if (proxyRes) {
        if (workRequest && proxyRes.work) {
          putCache(req.body.hash, proxyRes.work);
        }
        if (representativeRequest && proxyRes.representatives) {
          putCache(repCacheKey, JSON.stringify(proxyRes), 5 * 60); // Cache online representatives for 5 minutes
        }
      }

      // Add timestamps to certain requests
      if (req.body.action === 'account_history') {
        proxyRes = await timestamps.mapAccountHistory(proxyRes);
      }
      if (req.body.action === 'blocks_info') {
        proxyRes = await timestamps.mapBlocksInfo(req.body.hashes, proxyRes);
      }
      if (req.body.action === 'pending') {
        proxyRes = await timestamps.mapPending(proxyRes);
      }
      res.json(proxyRes)
    })
    .catch(err => res.status(500).json(err.toString()));
});

app.listen(listeningPort, () => console.log(`App listening on port ${listeningPort}!`));

// Configure the cache functions to work based on if we are using redis or not
if (useRedisCache) {
  const cacheClient = require('redis').createClient({
    host: redisCacheUrl,
  });
  cacheClient.on('ready', () => console.log(`Redis Work Cache: Connected`));
  cacheClient.on('error', (err) => console.log(`Redis Work Cache: Error`, err));
  cacheClient.on('end', () => console.log(`Redis Work Cache: Connection closed`));

  getCache = promisify(cacheClient.get).bind(cacheClient);
  putCache = (hash, work, time) => {
    cacheClient.set(hash, work, 'EX', time || redisCacheTime); // Store the work for 24 hours
  };
} else {
  getCache = hash => {
    const existingHash = workCache.find(w => w.hash === hash);
    return existingHash ? existingHash.work : null;
  };
  putCache = (hash, work, time) => {
    if (time) return; // If a specific time is specified, don't cache at all for now
    workCache.push({ hash, work });
    if (workCache.length >= memoryCacheLength) workCache.shift(); // If the list is too long, prune it.
  };
}