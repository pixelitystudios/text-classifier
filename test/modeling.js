const cheerio = require('cheerio')
const fs = require('fs')
var emojiStrip = require('emoji-strip')



const path = './data/input/messages.json'

fs.readFile(path, 'utf8', function(err, messages){
    messages = JSON.parse(messages)
    let conversation = ''

    messages.intents.map(x => {
        conversation += '' + x.patterns[0] + '----$----' + x.responses[0] + '\n'
        conversation += '----\n'
    })

    fs.writeFile('./data/output/conversation.txt', conversation, function(err){

    })
})