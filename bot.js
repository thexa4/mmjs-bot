const Discord = require('discord.js');
const auth = require('./auth.json');
const fetch = require('node-fetch');

const client = new Discord.Client();
client.login(auth.token);

const helpMessage = 
`\`$join\` to enter your voice chat
\`$leave\` to leave the voicechat
\`$search\` to perform a search query (max 10)
\`$add [#|all]\` to add a search result(s) to the playlist
\`remove #\` to remove a track from the playlist
\`$skip\`  to go to the next song
\`$queue\` to see to current queue\`\`\``
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
    if(playlist.length === 0){
        curTextChannel.send("playlist is empty")
        return
    }
    console.log('start playback:' + trackToTitle(playlist[0]))
    connection.play(root + playlist[0].Path).on("finish", () => 
        nextSong()
    );
    curTextChannel.send(`Now playing:\`\`\`${trackToTitle(playlist[0])}\`\`\``)
}

function nextSong(){
    playlist.shift()
    play()
}

function addTrack(tracks){
    console.log(tracks)
    m = `Added to playlist:\`\`\``
    for(let n of tracks){
        m += `${trackToTitle(n)}\n`
        playlist.push(n)
    }
    m += '\`\`\`'
    curTextChannel.send(m)
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

        if(!message.guild){
            message.channel.send(`If you are not in a server i don't care about your message. Im not here for personal smalltalk, loner.`)
            return
        }

        var args = message.content.substring(1).split(' ');
        var cmd = args[0];
        args = args.splice(1);

        switch(cmd) {

            case 'help':
                message.channel.send(helpMessage)
            break;

            // search is dependent on the mmjs webserver
            case 'search':
                if (!message.guild.me.voice.channel) return message.channel.send("I'm not in a voice channel yet :(\nuse `$join`");
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
            
            case 'next':
            case 'skip':
                if (!message.guild.me.voice.channel) return message.channel.send("I'm not in a voice channel yet :(\nuse `$join`");
                
                if(playlist.length < 2){
                    message.channel.send("No new track to skip to")
                    return
                }
                
                message.channel.send("Skipping track")
                nextSong()
            break;

            case 'delete':
            case 'remove':
                if (!message.guild.me.voice.channel) return message.channel.send("I'm not in a voice channel yet :(\nuse `$join`");
                if (playlist.length === 0) message.channel.send("There's nothing in the playlist yet");
                
                let n = parseInt(args[0], 10)
                if (n == NaN) {
                    message.channel.send('Not a valid number')
                    return
                }

                if (n === 0){
                    message.channel.send(`Can't remove currently playing track`)
                    return
                }

                if(n > playlist.length - 1){
                    message.channel.send(`This item is not in the queue`)
                    return
                }

                playlist.splice(n, 1)

            break;

            case 'stop':
            case 'leave':
            case 'disconnect':
                if (!message.guild.me.voice.channel && connection == null) return message.channel.send("I'm not in even in a voice channel ¯\\_(ツ)_/¯ ");
                playlist = []
                if(connection != null) connection.disconnect()
                message.channel.send("Aight im boutta head out")
            break;

            case 'add':
                if (!message.guild.me.voice.channel) return message.channel.send("I'm not in a voice channel yet :(\nuse `$join`");
                let empty = false
                if(playlist.length === 0) empty = true

                // invalid command
                if (parseInt(args[0], 10) == NaN && args[0] != 'all') {
                    message.channel.send('Not a valid number or command')
                    return
                }

                // add everything
                if(args[0] == 'all') {
                    addTrack(searchresults)
                    return
                }

                // add numbers
                nums = []
                for(let a of args){
                    a = parseInt(a, 10)
                    if(a == NaN) continue
                    if (a < 0 || a > searchresults.length - 1) continue
                    nums.push(searchresults[a])
                }

                addTrack(nums)
                
                if(empty && playlist.length > 0){
                    play()
                }
            break;

            case 'connect':
            case 'start':
            case 'join':
                if (!message.member.voice.channel) return message.channel.send("You must be in a voice channel.");
                message.member.voice.channel.join().then(c => {
                    connection = c
                    message.channel.send(helpMessage);
                }).catch(e => console.log(e))

            break;

            case 'queue':
                if (!message.guild.me.voice.channel) return message.channel.send("I'm not in a voice channel yet :(\nuse `$join`");
                
                if(playlist.length === 0){
                    message.channel.send('Queue is empty')
                    return
                }
                
                let m = "Queue: ```"
                for(let [k, v] of Object.entries(playlist)){
                    if (k == 0) {
                        m += `${k}. (playing) ${trackToTitle(v)}\n`
                    } else {
                        m += `${k}. ${trackToTitle(v)}\n`
                    }
                }
                m += '```'
                message.channel.send(m)
            break;



         }
     }
});