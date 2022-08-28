const { Telegraf } = require('telegraf')
var Jimp = require("jimp");
var fs = require('fs')
var QrCode = require('qrcode-reader');
const path = require('path');
const request = require('request');
const express = require('express');
TOKEN = '5494797037:AAGCTca1rnbqNXD4p-K8PYSegOjrUgFoj4k'
const bot = new Telegraf(TOKEN)
const KSA_number = /^(009665|9665|\+9665|05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
const axios = require("axios");
const app = express();
const say = require('say')
let  step = 0,phone = 0, name = 0, SMScode = "000", buffer = 0, startTime = 0, EndTime = 0

const customer = '0006159c-996f-4187-9fa7-410d145982fd'
var dbconn = require('./db.config')



//---------------------------------------------------------------------------------------
bot.on('message', async (ctx) => {
    console.log(ctx.message.photo !== undefined)
    if (ctx.message.text == '/start') {
        step = 1
        bot.telegram.sendMessage(ctx.chat.id, 'Enter your mobile phone')
    }
    //---------------------------------------------------------------------------------------
    if (step == 1) {
        if (KSA_number.test(ctx.message.text)) {
            let str = ctx.message.text
            phone = '0' + str.substring(str.length - 9)
            name = ctx.chat.first_name
            bot.telegram.sendMessage(ctx.chat.id, 'Enter the code sent via SMS to ' + ctx.message.text)
            step = 2
        } else if (!KSA_number.test(ctx.message.text) && ctx.message.text !== '/start') {
            bot.telegram.sendMessage(ctx.chat.id, 'Wrong phone number!!!')
        }
    }
    //---------------------------------------------------------------------------------------
    if (step == 2) {
        if (ctx.message.text == SMScode) {
            FindUser(ctx.chat.id) 
           step = 3     
        } else if (ctx.message.text !== 000 && ctx.message.text !== phone) {
            bot.telegram.sendMessage(ctx.chat.id, 'Wrong code!!!')
        }
    }
    //---------------------------------------------------------------------------------------
    if (step == 3) {
        bot.telegram.sendMessage(ctx.chat.id, 'Welcome to you ' + name + ' in Spiders mobility', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Wallet Recharge', callback_data: 'Wallet' },
                    { text: 'Start ride', callback_data: 'Start ride' },
                    { text: 'Stop ride', callback_data: 'Stop ride' }
                    ]
                ]
            }
        })
    }
    //---------------------------------------------------------------------------------------
    bot.action('Start ride', async ctx => {
        step = 4
        bot.telegram.sendMessage(ctx.chat.id, "\nplease scan the barcode of the scooter")
        ctx.answerCbQuery()
    })
    //---------------------------------------------------------------------------------------
    if (step == 4) {
        console.log(ctx.message.photo !== 'undefined')
        if (ctx.message.photo !== undefined) {
            let fileId = ctx.message.photo[0].file_id
            const image = await bot.telegram.getFileLink(fileId);
            let downloadURL = image.href
            download(downloadURL, path.join(__dirname + '\\Photo', `${fileId}.jpg`), () => {
                console.log("done!!")
                ReadQR(__dirname + '\\Photo\\' + `${fileId}.jpg`, ctx.chat.id)
            })
        } else if (ctx.message.photo === undefined && ctx.message.text !== SMScode) {
            bot.telegram.sendMessage(ctx.chat.id, 'It is not image .. please scan the barcode of the scooter')
        }
    }
})
//---------------------------------------------------------------------------------------
bot.action('Stop ride', ctx => {
    if (startTime == 0) {
        bot.telegram.sendMessage(ctx.chat.id, "you dont't have active ride ")
    } else {
        EndTime = new Date()
        let totalTime = Math.ceil((EndTime - startTime) / 60000)
        startTime = 0
        bot.telegram.sendMessage(ctx.chat.id, "you end the ride .. The total ride time is " + totalTime)
        EditWallet(-totalTime, ctx.chat.id)
        IncrementTotalRides(ctx.chat.id)
        step=3
    }
    ctx.answerCbQuery()
})
//---------------------------------------------------------------------------------------
bot.action('Wallet', (ctx) => {  // this is a handler for a specific text, in this case it is "pay"
    step = 4
    bot.telegram.sendMessage(ctx.chat.id, 'Choose top-up amount', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '35 SAR with 10 SAR Bonus', callback_data: '35' }],
                [{ text: '80 SAR with 40 SAR Bonus', callback_data: '80' }],
                [{ text: '120 SAR with 80 SAR Bonus', callback_data: '120' }]
            ]
        }
    })
    bot.action('35', (ctx) => { ctx.replyWithInvoice(getInvoice(35, ctx.from.id)); ctx.answerCbQuery(); EditWallet(35, ctx.chat.id) })
    bot.action('80', (ctx) => { ctx.replyWithInvoice(getInvoice(80, ctx.from.id)); ctx.answerCbQuery(); EditWallet(80, ctx.chat.id) })
    bot.action('120', (ctx) => { ctx.replyWithInvoice(getInvoice(120, ctx.from.id)); ctx.answerCbQuery(); EditWallet(120, ctx.chat.id) })
    ctx.answerCbQuery()
})
//---------------------------------------------------------------------------------------
const download = (url, path, callback) => {
    request.head(url, (err, res, body) => {
        request(url).pipe(fs.createWriteStream(path)).on('close', callback);
    });
};
//---------------------------------------------------------------------------------------
function ReadQR(imagePath, chatId) {
    buffer = fs.readFileSync(imagePath)
    // Parse the image using Jimp.read() method
    Jimp.read(buffer, function (err, image) {
        if (err) {
            console.error(err);
        }
        // Creating an instance of qrcode-reader module
        let qrcode = new QrCode();
        qrcode.callback = function (err, value) {
            if (err) {
                console.error(err);
                bot.telegram.sendMessage(chatId, 'The QR code not clear.. please try again')
            } else {
                console.log(value)
                bot.telegram.sendMessage(chatId, 'You start the ride')
                startTime = new Date()
            }
        };
        // Decoding the QR code
        qrcode.decode(image.bitmap);
    });
}
//---------------------------------------------------------------------------------------
const getInvoice = (price, id) => {
    const invoice = {
        chat_id: id, // Unique identifier of the target chat or username of the target channel
        provider_token: '1877036958:TEST:0f9aac5c70d5685cfb50ebdf2e9a888204f31d98', // token issued via bot @SberbankPaymentBot
        start_parameter: '', // Unique parameter for deep links. If you leave this field blank, forwarded copies of the forwarded message will have a Pay button that allows multiple users to pay directly from the forwarded message using the same account. If not empty, redirected copies of the sent message will have a URL button with a deep link to the bot (instead of a payment button) with a value used as an initial parameter.
        title: 'Add balance to my wallet', // Product name, 1-32 characters
        description: 'Invoice at ' + new Date(), // Product description, 1-255 characters
        currency: 'SAR', // ISO 4217 Three-Letter Currency Code
        prices: [{ label: 'My wallet amount', amount: price * 100 }], // Price breakdown, serialized list of components in JSON format 100 kopecks * 100 = 100 rubles
        payload: { // The payload of the invoice, as determined by the bot, 1-128 bytes. This will not be visible to the user, use it for your internal processes.
            unique_id: `${id}_${Number(new Date())}`,
            provider_token: '1877036958:TEST:0f9aac5c70d5685cfb50ebdf2e9a888204f31d98'
        }
    }
    return invoice
}
//---------------------------------------------------------------------------------------
function InsertUser(chatId) {
    dbconn.query('insert into customersexcel set Name=?,Phone=?,Debt=0,TotalRides=0,Wallet=0', [name, phone], (err, res) => {
        if (err) {
            console.log(err)
        } 
        // else {
        //     bot.telegram.sendMessage(chatId, 'User added succsusfuly')
        // }
    })
}
//---------------------------------------------------------------------------------------
function FindUser(chatId) {
    dbconn.query('select * from customersexcel where phone=?', phone, (err, res) => {
        if (err) {
            console.log(err)
        } else {
            if (res == 0) { 
                InsertUser(chatId)
            }
            else {
                name=res[0].Name
                //bot.telegram.sendMessage(chatId, 'you already have account')   
            }
        }
    })
}
//---------------------------------------------------------------------------------------
function IncrementTotalRides(chatId) {
    dbconn.query('UPDATE customersexcel set TotalRides=TotalRides+1 where phone=?', phone, (err, res) => {
        if (err) {
            console.log(err)
        } else {
            console.log()
               // bot.telegram.sendMessage(chatId, 'your total rides is :'+res[0].TotalRides)   
        }
    })
}
//---------------------------------------------------------------------------------------
function EditWallet(price, chatId) {
    dbconn.query('select Wallet,Debt from customersexcel where phone=?', phone, (err, res) => {
        if (err) {
            console.log(err)
        } else {
            TotalWallet = ((res[0].Wallet) + price)+(res[0].Debt)
            if (TotalWallet >= 0) {
                dbconn.query('UPDATE customersexcel set Wallet=?,Debt=0 where phone=?', [TotalWallet, phone], (err, res) => {
                    if (err) {
                        console.log(err)
                    } else {
                        bot.telegram.sendMessage(chatId, "We updated Wallet successfully ... your balance is  " + TotalWallet)
                    }
                })
            }
            else {
                dbconn.query('UPDATE customersexcel set Debt=?,Wallet=0 where phone=?', [TotalWallet, phone], (err, res) => {
                    if (err) {
                        console.log(err)
                    } else {
                        bot.telegram.sendMessage(chatId, "You spent too much time ... your balance is " + TotalWallet)
                    }
                })
            }

        }
    })
}
//---------------------------------------------------------------------------------------
bot.launch()
//bot.startPolling();


// function Edit_Wallet(price, chat_id) {
//     dbconn.query('select Wallet_Amount from customer_wallet where id=?', [customer], (err, res) => {
//         if (err) {
//             console.log(err)
//         } else {
//             TotalWallet = (res[0].Wallet_Amount) + price
//             if (TotalWallet >= 0) {
//                 dbconn.query('UPDATE customer_wallet set Wallet_Amount=? where id=?', [TotalWallet, customer], (err, res) => {
//                     if (err) {
//                         console.log(err)
//                     } else {
//                         bot.telegram.sendMessage(chat_id, "We updated Wallet Amount successfully ... your balance is  " + TotalWallet)
//                     }
//                 })
//             }
//             else {
//                 dbconn.query('UPDATE customer_wallet set Debit_Amount=?, Wallet_Amount=? where id=?', [TotalWallet, 0, customer], (err, res) => {
//                     if (err) {
//                         console.log(err)
//                     } else {
//                         bot.telegram.sendMessage(chat_id, "You spent too much time ... your balance is " + TotalWallet)
//                     }
//                 })
//             }

//         }
//     })
// }
//---------------------------------------------------------------------------------------

