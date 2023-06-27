const Buffer = require('buffer').Buffer
const driver = require('bigchaindb-driver')
const base58 = require('bs58')
const cryptoconditions = require('crypto-conditions')
const sha3 = require('js-sha3')

const API_PATH = 'http://localhost:9984/api/v1/'  //the other url was not working
const conn = new driver.Connection(API_PATH)

function sha256Hash(data) {
    return sha3.sha3_256
        .create()
        .update(data)
        .hex()
}

const nameSpace = 'rbac-bdb-demo'

async function createAppAndAddAdmin(admin1) {

    // create admin user type - this is the asset representing the group of admins
    const adminGroupAsset = {
        ns: `${nameSpace}.admin`,
        name: 'adminGroup'
    }

    const adminGroupMetadata = {
        can_link: [admin1.publicKey]
    }

    const adminGroupId = (await createNewThresAsset(admin1, adminGroupAsset, adminGroupMetadata)).id
    console.log('AdminGroup: ' + adminGroupId)

    // create admin user instance - this is a single user with admin role represented by an asset
    const adminUserMetadata = {
        event: 'admin Assigned',
        date: new Date(),
        timestamp: Date.now(),
        publicKey: admin1.publicKey,
        eventData: {
            userType: 'admin'
        }
    }

    const adminUserId = (await createSystemAdmin(admin1, adminGroupId, admin1.publicKey, adminUserMetadata)).id
    console.log('AdminUser1: ' + adminUserId)

    // create app - the umbrella asset for representing the app
    const appAsset = {
        ns: nameSpace,
        name: nameSpace
    }

    const appMetadata = {
        can_link: adminGroupId
    }

    const appId = (await createNewAsset(admin1, appAsset, appMetadata)).id
    console.log('App: ' + appId)

    // create types

    // user types

    // tribes - user groups
    const tribe1Id = (await createType(admin1, 'studentGroup', appId, adminGroupId)).id
    console.log('StudentGroup: ' + tribe1Id)

    const tribe2Id = (await createType(admin1, 'requestGroup', appId, adminGroupId)).id
    console.log('requestGroup: ' + tribe2Id)

    const tribe5Id = (await createType(admin1, 'issuedGroup', appId, adminGroupId)).id
    console.log('requestGroup: ' + tribe5Id)

    const tribe3Id = (await createBurnGroup(admin1, 'burnGroup', appId, adminGroupId)).id
    console.log('burnGroup: ' + tribe3Id)

    const tribe4Id = (await createType(admin1, 'bookGroup', appId, adminGroupId)).id
    console.log('bookGroup: ' + tribe4Id)
}

async function createSystemAdmin(adminKeyPair, userTypeId,  userPublicKey, userMetadata) {
    const asset = {
        ns: `${nameSpace}.admin`,
        link: userTypeId,
        createdBy: adminKeyPair.publicKey,
        type: 'admin',
        keyword: 'UserAsset'
    }

    const metadata = {
        event: 'admin Added',
        date: new Date(),
        timestamp: Date.now(),
        publicKey: adminKeyPair.publicKey,
        eventData: {
            userType: 'admin'
        }
    }

    const instanceTx = await createNewAsset(adminKeyPair, asset, metadata)
    await transferAsset(instanceTx, adminKeyPair, userPublicKey, userMetadata)
    return instanceTx
}

async function createAdmin(adminPublicKey, adminPrivateKey, userPublicKey) {
    let userTypeId;
    try {
        console.log(adminPublicKey)
        const assets = await conn.searchAssets('adminGroup');
        if (assets.length > 0) {
            userTypeId = assets[0].id;
            console.log('Asset ID:', userTypeId);
            const transactions = await conn.listTransactions(userTypeId);
            let transaction;
            let metadata;
            let prevMetadata;
            if (transactions.length > 0) {
                transaction = transactions[transactions.length - 1];
                metadata = transaction.metadata;
                prevMetadata = JSON.parse(JSON.stringify(transaction.metadata));
                console.log(prevMetadata);
                console.log(metadata);
            } else {
                console.log('Asset not found.');
            }
            metadata.can_link.push(userPublicKey);
            let subConditions = [];
            metadata.can_link.forEach(publicKey => {
                const subCondition = driver.Transaction.makeEd25519Condition(publicKey, false);
                subConditions.push(subCondition);
            });
            let condition = driver.Transaction.makeThresholdCondition(1, subConditions)
            let output = driver.Transaction.makeOutput(condition)
            output.public_keys = metadata.can_link;
            let transactionTx = driver.Transaction.makeTransferTransaction(
                [{ tx: transaction, output_index: 0 }],
                [output],
                metadata   
                );
            let fulfillment = new cryptoconditions.ThresholdSha256()
            fulfillment.threshold = 1
            const serializedTransaction = driver.Transaction.serializeTransactionIntoCanonicalString(transactionTx)
            let fullf = driver.Transaction.makeEd25519Condition(adminPublicKey, false);
            const transactionUniqueFulfillment1 = transactionTx.inputs[0].fulfills ? serializedTransaction
                .concat(transactionTx.inputs[0].fulfills.transaction_id)
                .concat(transactionTx.inputs[0].fulfills.output_index) : serializedTransaction
            const transactionHash1 = sha256Hash(transactionUniqueFulfillment1)
            fullf.sign(Buffer.from(transactionHash1, 'hex'), new Buffer.from(base58.decode(adminPrivateKey)))
            fulfillment.addSubfulfillment(fullf.serializeUri())

            prevMetadata.can_link.forEach(publicKey => {
                if(adminPublicKey != publicKey) {
                    let fullf = driver.Transaction.makeEd25519Condition(publicKey, false);
                    fulfillment.addSubconditionUri(fullf.getConditionUri())
                }
            });
            console.log(prevMetadata);
            console.log(metadata);
            const fulfillmentUri = fulfillment.serializeUri()
            console.log(fulfillmentUri);
            transactionTx.inputs[0].fulfillment = fulfillmentUri
            transactionTx.id = await sha256Hash( driver.Transaction.serializeTransactionIntoCanonicalString(transactionTx))
            console.log(transactionTx.id)
            await conn.postTransactionCommit(transactionTx)
            .then(res => {
                console.log('Transfer Transaction', transactionTx.id, 'accepted');
            })
            .catch(error => {
                console.error('Error during postTransactionCommit:', error);
            });
        } else {
            console.log('No asset found with the given name.');
        }
    } catch (error) {
        console.error('Error searching assets:', error);
    }
    let adminKeyPair = new driver.Ed25519Keypair();
    adminKeyPair.publicKey = adminPublicKey;
    adminKeyPair.privateKey = adminPrivateKey;

    const asset = { 
        ns: `${nameSpace}.admin`,
        link: userTypeId,
        createdBy: adminKeyPair.publicKey,
        type: 'admin',
        keyword: 'UserAsset'
    }

    const metadata = {
        event: 'admin Added',
        date: new Date(),
        timestamp: Date.now(),
        publicKey: adminKeyPair.publicKey,
        eventData: {
            userType: 'admin'
        }
    }

    const adminUserMetadata = {
        event: 'admin Assigned',
        date: new Date(),
        timestamp: Date.now(),
        publicKey: adminKeyPair.publicKey,
        eventData: {
            userType: 'admin'
        }
    }   

    const instanceTx = await createNewAsset(adminKeyPair, asset, metadata)
    await transferAsset(instanceTx, adminKeyPair, userPublicKey, adminUserMetadata)
    return instanceTx
}



async function createStudent(studentKeyPair, name, id, email) {

    let userTypeId;
    try {
        const assets = await conn.searchAssets('studentGroup');
        if (assets.length > 0) {
            userTypeId = assets[0].id;
            console.log('Asset ID:', userTypeId);
        } else {
            console.log('No asset found with the given name.');
        }
    } catch (error) {
        console.error('Error searching assets:', error);
    }

    const asset = {
        ns: `${nameSpace}.student`,
        link: userTypeId,
        createdBy: studentKeyPair.publicKey,
        type: 'student',
        keyword: 'UserAsset',
        name: name,
        id: id, 
        email: email
    }

    const metadata = {
        event: 'student Added',
        date: new Date(),
        timestamp: Date.now(),
        publicKey: studentKeyPair.publicKey,
        eventData: {
            userType: 'student'
        }
    }

    const instanceTx = await createNewAsset(studentKeyPair, asset, metadata)
    return instanceTx
}

async function createType(admin1, typeName, appId, canLinkAssetId) {
    const asset = {
        ns: `${nameSpace}.${typeName}`,
        link: appId,
        name: typeName
    }

    const metadata = {
        can_link: canLinkAssetId
    }

    return await createNewAsset(admin1, asset, metadata)
}

async function createBurnGroup(admin1, typeName, appId, canLinkAssetId) {

    const keypair = new driver.Ed25519Keypair();

    const asset = {
        ns: `${nameSpace}.${typeName}`,
        link: appId,
        name: typeName,
        publicKey: keypair.publicKey
    }

    const metadata = {
        can_link: canLinkAssetId
    }

    return await createNewAsset(keypair, asset, metadata)
}

async function createTypeInstance(keypair, typeName, typeId, metadata) {
    const asset = {
        ns: `${nameSpace}.${typeName}`,
        link: typeId
    }

    return await createNewAsset(keypair, asset, metadata)
}

async function createNewAsset(keypair, asset, metadata) {

    let condition = driver.Transaction.makeEd25519Condition(keypair.publicKey, true)

    let output = driver.Transaction.makeOutput(condition)
    output.public_keys = [keypair.publicKey]

    const transaction = driver.Transaction.makeCreateTransaction(
        asset,
        metadata,
        [ driver.Transaction.makeOutput(
               driver.Transaction.makeEd25519Condition(keypair.publicKey))
       ],
        keypair.publicKey
    )

    const txSigned = driver.Transaction.signTransaction(transaction, keypair.privateKey)
    return await conn.postTransactionCommit(txSigned)
}


async function createNewThresAsset(keypair, asset, metadata) {

    let condition = driver.Transaction.makeEd25519Condition(keypair.publicKey, false)
    const thresholdCondition = driver.Transaction.makeThresholdCondition(1, [condition])
    console.log(thresholdCondition)
    let output = driver.Transaction.makeOutput(thresholdCondition);
    output.public_keys = [keypair.publicKey]

    const transaction = driver.Transaction.makeCreateTransaction(
        asset,
        metadata,
        [output],
        keypair.publicKey
    )

    const txSigned = driver.Transaction.signTransaction(transaction, keypair.privateKey)
    return await conn.postTransactionCommit(txSigned)
}


async function transferAsset(tx, fromKeyPair, toPublicKey, metadata) {

    let condition = driver.Transaction.makeEd25519Condition(toPublicKey)

    let output = driver.Transaction.makeOutput(condition)
    output.public_keys = [toPublicKey]

    const txTransfer = driver.Transaction.makeTransferTransaction(
        [{tx: tx,output_index:0}],
        [output],
        metadata
    )

    const txSigned = driver.Transaction.signTransaction(txTransfer, fromKeyPair.privateKey)
    return await conn.postTransactionCommit(txSigned)
}

// createAppAndAddAdmin();

module.exports = { createAppAndAddAdmin, createAdmin, createStudent };
