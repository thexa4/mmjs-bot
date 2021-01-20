const Discord = require('discord.js');
const auth = require('./auth.json');
const fetch = require('node-fetch');

const client = new Discord.Client();
client.login(auth.token);

const helpMessage = `\`\`\`$join to enter your voice chat
$leave to leave the voicechat
$search to perform a search query (max 10)
$add <number> to add a search result to the playlist
$skip to go to the next song
$queue to see to current queue\`\`\``
const root = process.argv[2]

let curTextChannel = null
let connection = null

// variables to hold the playlist search results
let playlist = []
let searchresults = []

client.on('ready', function (evt) {
    console.log("bot started")
});

function play(){
    console.log(playlist)
    if(playlist.length === 0){
        curTextChannel.send("playlist is empty")
        return
    }
    connection.play(root + playlist[0].Path).on("finish", () => 
        nextSong()
    );
    curTextChannel.send(`Now playing:\`\`\`${trackToTitle(playlist[0])}\`\`\``)
}

function nextSong(){
    playlist.shift()
    play()
}

function trackToTitle(data){
    if(data.Title.Valid && data.Artist.Valid)
        return `${data.Artist.String} - ${data.Title.String}`
    else
        return data.Path
}

client.on('message', message => {

    curTextChannel = message.channel

    if (message.content.substring(0, 1) == '$') {

        var args = message.content.substring(1).split(' ');
        var cmd = args[0];
        args = args.splice(1);

        switch(cmd) {

            case 'help':
                console.log(root)
                message.channel.send(helpMessage)
            break;

            case 'search':
                fetch(`http://localhost:8080/search?query=${encodeURI(args.join(" "))}`)
                .then(res => res.json())
                .then(data => {
                    if(Object.entries(data).length == 0){
                        message.channel.send('No entries found :(')
                        return
                    }
                    searchresults = data
                    let m = "Add to playlist by entering `$add <number>`: ```"
                    for(let [k, v] of Object.entries(data)){
                        m += `${k}. ${trackToTitle(v)}\n`
                    }
                    m += '```'
                    message.channel.send(m)
                })
                .catch(res => {
                    message.channel.send(`Something went wrong\n\n${res}`)
                })
            break;
            
            case 'skip':
                message.channel.send("skipping track")
                nextSong()
            break;

            case 'stop':
            case 'leave':
                playlist = []
                if(connection != null) connection.disconnect()
            break;

            case 'add':
                n = parseInt(args[0], 10)
                if (n == NaN) {
                    message.channel.send('Not a valid number')
                    return
                }
                if (n < 0 || n > searchresults.length - 1){
                    message.channel.send('Number not in last search results')
                    return
                }
                playlist.push(searchresults[n])
                message.channel.send(`Added to playlist:\`\`\`${trackToTitle(searchresults[n])}\`\`\``)
                if(playlist.length === 1){
                    play()
                }
            break;

            case 'join':
                if (!message.member.voice.channel) return message.channel.send("You must be in a voice channel.");
                if (message.guild.me.voice.channel) {
                    message.channel.send("I'm already here");
                }

                message.member.voice.channel.join().then(c => {
                    connection = c
                    message.channel.send(helpMessage);
                }).catch(e => console.log(e))

            break;

            case 'queue':
                let m = "now in the queue: ```"
                for(let [k, v] of Object.entries(playlist)){
                    if (k == 0) {
                        m += `${k}.\t(playing) ${trackToTitle(v)}\n`
                    } else {
                        m += `${k}.\t${trackToTitle(v)}\n`
                    }
                }
                m += '```'
                message.channel.send(m)
            break;



         }
     }
});